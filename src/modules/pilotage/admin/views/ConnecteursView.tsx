import type { AdminViewServerProps } from 'payload'
import { TOOLS } from '@/modules/agents'
import { Act } from './Act'
import { CockpitPage, Head, Section } from './CockpitPage'

/** Variables lues : présence seulement, jamais la valeur (règle 7 : secrets dans Vercel). */
const SERVICES = [
  { key: 'anthropic', env: ['ANTHROPIC_API_KEY'], label: 'Anthropic (Claude)', use: 'Moteur des agents' },
  { key: 'openai', env: ['OPENAI_API_KEY'], label: 'OpenAI', use: 'Moteur des agents (option)' },
  { key: 'telegram', env: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET'], label: 'Telegram', use: 'Notifications, commandes, canal' },
  { key: 'resend', env: ['RESEND_API_KEY'], label: 'Resend', use: 'Emails depuis salam@mydalil.com' },
  { key: 'blob', env: ['BLOB_READ_WRITE_TOKEN'], label: 'Vercel Blob', use: 'Photos et médias' },
  { key: 'cron', env: ['CRON_SECRET'], label: 'Tâches planifiées', use: 'File des agents, publications' },
  { key: 'db', env: ['DALIL_DATABASE_URL'], label: 'Neon Postgres', use: 'Base de données' },
] as const

/** Outils encore « non branché » dans runtime/tools.ts : ils le disent et ne simulent jamais un succès. */
const NOT_WIRED = new Set(['translate', 'suggest-tags', 'fix-broken-links', 'web-search'])

export function ConnecteursView(props: AdminViewServerProps) {
  return (
    <CockpitPage {...props} render={async ({ tr }) => {
      const has = (k: string) => Boolean(process.env[k])
      return (
        <>
          <Head title={tr('nav.connecteurs', 'Connecteurs')} sub={tr('con.sub', 'Services reliés au site. Les clés se gèrent dans Vercel ; ici, seulement leur présence.')} />
          <Section id="svc" title={tr('con.services', 'Services')}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              {SERVICES.map((s) => {
                const missing = s.env.filter((e) => !has(e))
                return (
                  <div key={s.key} style={{ border: '1px solid var(--dl-ln)', borderRadius: 12, padding: 12, display: 'grid', gap: 6 }}>
                    <div className="dl-row dl-sb"><b>{s.label}</b><span className={missing.length ? 'dl-pill wa' : 'dl-pill ok'}>{missing.length ? tr('con.missing', 'À configurer') : tr('con.ok', 'Configuré')}</span></div>
                    <span className="dl-mu" style={{ fontSize: 12.5 }}>{tr(`con.use.${s.key}`, s.use)}</span>
                    {missing.length ? <code className="dl-mu" style={{ fontSize: 11.5 }}>{missing.join(', ')}</code> : null}
                    {s.key === 'telegram' && !missing.length ? <Act path="/api/telegram/setup" method="POST" label={tr('con.webhook', 'Brancher le webhook')} /> : null}
                  </div>
                )
              })}
            </div>
          </Section>
          <Section id="tools" title={tr('con.tools', 'Outils des agents')} sub={tr('con.tools.sub', 'Un outil non branché répond « non branché » et ne fait rien.')}>
            <div className="dl-row dl-wr" style={{ gap: 6 }}>
              {TOOLS.map((t) => <span key={t.value} className={NOT_WIRED.has(t.value) ? 'dl-pill' : 'dl-pill ok'} title={NOT_WIRED.has(t.value) ? tr('con.notwired', 'Non branché') : tr('con.wired', 'Branché')}>{t.label}{NOT_WIRED.has(t.value) ? ` · ${tr('con.notwired', 'non branché')}` : ''}</span>)}
            </div>
          </Section>
        </>
      )
    }} />
  )
}
