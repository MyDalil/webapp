import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, Config, GlobalAfterChangeHook, Payload, PayloadRequest, Plugin } from 'payload'
import { actorOf } from '@/platform/access'

type Channel = 'admin' | 'telegram' | 'api' | 'agent' | 'cron'
export type AuditEntry = { action: string; summary: string; target?: string; targetId?: string | number; changes?: Record<string, unknown>; channel?: Channel }

/** Collections bruyantes ou techniques : pas de ligne d’audit automatique. */
const SKIP = new Set(['audit-log', 'visitor-sessions', 'ai-usage', 'payload-preferences', 'payload-migrations', 'payload-locked-documents', 'payload-jobs'])
/** Champs jamais recopiés dans le journal. */
const SECRET = new Set(['password', 'hash', 'salt', 'resetPasswordToken', 'resetPasswordExpiration', 'apiKey', 'apiKeyIndex', 'enableAPIKey', 'sessions', 'loginAttempts', 'lockUntil', 'updatedAt', 'createdAt'])

/** Valeur telle quelle si courte, sinon texte tronqué à 300 caractères. */
const short = (v: unknown) => {
  if (v === null || v === undefined) return v
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > 300 ? `${s.slice(0, 300)}…` : v
}

/** Différences champ par champ (premier niveau), sans les secrets. */
export function diff(before: Record<string, unknown> | undefined, after: Record<string, unknown>) {
  const out: Record<string, { avant: unknown; après: unknown }> = {}
  for (const k of new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])) {
    if (SECRET.has(k) || k.startsWith('_') && k !== '_status') continue
    const a = JSON.stringify(before?.[k] ?? null)
    const b = JSON.stringify(after?.[k] ?? null)
    if (a !== b) out[k] = { avant: short(before?.[k]), après: short(after?.[k]) }
  }
  return out
}

const channelOf = (req: PayloadRequest): Channel => {
  const c = (req.context?.channel as Channel | undefined) ?? undefined
  if (c) return c
  if ((req.user as { collection?: string } | null)?.collection === 'agents') return 'agent'
  return req.user ? 'admin' : 'api'
}

/** Écrit une ligne. Ne fait jamais échouer l’action d’origine. */
export async function audit(payload: Payload, req: PayloadRequest | undefined, entry: AuditEntry) {
  const actor = actorOf(req?.user)
  try {
    await payload.create({
      collection: 'audit-log',
      overrideAccess: true,
      // Hors de la transaction de l’action observée : un échec du journal ne doit jamais l’annuler.
      context: { skipAudit: true },
      data: {
        actorKind: actor.kind,
        actorLabel: actor.label,
        actorId: actor.id,
        action: entry.action,
        summary: entry.summary.slice(0, 400),
        target: entry.target,
        targetId: entry.targetId === undefined ? undefined : String(entry.targetId),
        changes: entry.changes,
        channel: entry.channel ?? (req ? channelOf(req) : 'cron'),
      },
    })
  } catch (e) {
    console.error('[audit] écriture impossible', e)
  }
}

const titleOf = (doc: Record<string, unknown>, collection: CollectionConfig) => {
  const key = (collection.admin?.useAsTitle as string | undefined) ?? 'id'
  return String(doc?.[key] ?? doc?.id ?? '')
}

const afterChange = (collection: CollectionConfig): CollectionAfterChangeHook => async ({ doc, previousDoc, operation, req }) => {
  if (req.context?.skipAudit) return doc
  const changes = operation === 'update' ? diff(previousDoc, doc) : undefined
  if (operation === 'update' && changes && !Object.keys(changes).length) return doc
  const label = typeof collection.labels?.singular === 'string' ? collection.labels.singular : collection.slug
  await audit(req.payload, req, {
    action: operation === 'create' ? 'création' : 'modification',
    summary: `${operation === 'create' ? 'a créé' : 'a modifié'} ${label} « ${titleOf(doc, collection)} »${changes ? ` (${Object.keys(changes).join(', ')})` : ''}`,
    target: collection.slug,
    targetId: doc.id,
    changes,
  })
  return doc
}

const afterDelete = (collection: CollectionConfig): CollectionAfterDeleteHook => async ({ doc, req }) => {
  if (req.context?.skipAudit) return doc
  const label = typeof collection.labels?.singular === 'string' ? collection.labels.singular : collection.slug
  await audit(req.payload, req, { action: 'suppression', summary: `a supprimé ${label} « ${titleOf(doc, collection)} »`, target: collection.slug, targetId: doc.id })
  return doc
}

/** Greffe l’audit sur toutes les collections et réglages globaux (sauf exclusions). */
export const auditPlugin: Plugin = (config: Config): Config => ({
  ...config,
  collections: (config.collections ?? []).map((c) =>
    SKIP.has(c.slug)
      ? c
      : {
          ...c,
          hooks: {
            ...c.hooks,
            afterChange: [...(c.hooks?.afterChange ?? []), afterChange(c)],
            afterDelete: [...(c.hooks?.afterDelete ?? []), afterDelete(c)],
            ...(c.auth
              ? { afterLogin: [...(c.hooks?.afterLogin ?? []), async ({ req, user }) => { if (c.slug === 'users') await audit(req.payload, { ...req, user: { ...user, collection: 'users' } } as PayloadRequest, { action: 'connexion', summary: 's’est connecté à /admin', target: 'users', targetId: user.id }); return user }] }
              : {}),
          },
        },
  ),
  globals: (config.globals ?? []).map((g) => ({
    ...g,
    hooks: {
      ...g.hooks,
      afterChange: [
        ...(g.hooks?.afterChange ?? []),
        (async ({ doc, previousDoc, req }) => {
          if (req.context?.skipAudit) return doc
          const changes = diff(previousDoc, doc)
          if (!Object.keys(changes).length) return doc
          const label = typeof g.label === 'string' ? g.label : g.slug
          await audit(req.payload, req, { action: 'réglage', summary: `a modifié ${label} (${Object.keys(changes).join(', ')})`, target: g.slug, changes })
          return doc
        }) as GlobalAfterChangeHook,
      ],
    },
  })),
})
