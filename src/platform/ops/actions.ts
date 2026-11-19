import 'server-only'
import type { ActionDef } from '@/platform/actions/types'
import { payload } from '@/platform/http'
import { aiConfigured } from '@/platform/ai/claude'
import { staffAiGate } from '@/platform/ai/budget'
import { translateDoc } from '@/platform/i18n/translate'
import { TARGET_LANGS, TRANSLATABLE, type TargetLang } from '@/platform/i18n/core'
import { generateAlt, mediaWithoutAlt } from '@/platform/storage/alt'
import { importCsv, type ImportInput } from './importCsv'
import { securityReport } from './security'
import { restoreFromTrash, restorePrevious } from './restore'
import { requireRole, OpsError } from './context'

/** Actions d’exploitation de DALIL (socle) : import, contrôle, restauration, traduction, textes alternatifs. */
export const opsActions: ActionDef[] = [
  {
    name: 'importer_csv',
    title: 'Importer des adresses (CSV)',
    description:
      'Importe un fichier CSV d’adresses dans l’annuaire. Par défaut SIMULATION : rapport des fiches à créer, des doublons (téléphone, nom + commune, moins de 50 m) et des erreurs par ligne, sans rien écrire. Avec confirmer: true, crée les fiches EN BROUILLON (jamais publiées). Traitement par lots de 150 lignes : si la réponse contient suite (nombre), relancer avec depuis = suite ; relance sûre (les fiches déjà créées sont reconnues comme doublons). Fichier de 1 Mo au plus. Colonnes reconnues : nom, secteur, catégorie, wilaya, ville/commune, quartier, adresse, latitude, longitude, téléphone, whatsapp, email, site, facebook, instagram, présentation, source. Séparateur « ; » ou « , ».',
    module: 'platform',
    access: 'staff',
    readOnly: false,
    input: {
      type: 'object',
      required: ['collection', 'csv'],
      properties: {
        collection: { type: 'string', enum: ['places'] },
        csv: { type: 'string', description: 'Contenu du fichier CSV (UTF-8).' },
        wilaya: { type: 'string', description: 'Wilaya par défaut (nom ou code) si la colonne est absente.' },
        confirmer: { type: 'boolean', default: false, description: 'false = simulation ; true = création en brouillon.' },
        depuis: { type: 'integer', minimum: 0, description: 'Reprise : indice de la première ligne du lot (valeur « suite » de la réponse précédente). 0 par défaut.' },
      },
    },
    run: async (input: ImportInput, ctx) => importCsv(await payload(), input, ctx),
  },
  {
    name: 'controle_securite',
    title: 'Contrôle de sécurité',
    description:
      'Rapport en une commande : fiches publiées sans téléphone, adresse ou coordonnées ; doublons probables ; photos sans texte alternatif ; photos à contrôler ; erreurs récentes ; dernière sauvegarde ; nombre de clés MCP ; variables critiques absentes ; comptes de l’équipe et rôles. Lecture seule, aucune valeur secrète.',
    module: 'platform',
    access: 'staff',
    readOnly: true,
    input: { type: 'object', properties: {} },
    run: async (_input: unknown, ctx) => {
      requireRole(ctx, 'staff')
      return securityReport(await payload())
    },
  },
  {
    name: 'restaurer',
    title: 'Revenir à la version précédente',
    description:
      'Rétablit la version précédente d’un document (adresse, praticien, annonce…). Collections à versions : version Payload précédente (ou versionId donné). Autres : valeurs précédentes du journal d’audit si elles sont complètes, sinon refus expliqué. La restauration est enregistrée comme une nouvelle action ; rien n’est effacé.',
    module: 'platform',
    access: 'admin',
    readOnly: false,
    input: {
      type: 'object',
      required: ['collection', 'id'],
      properties: { collection: { type: 'string', description: 'Slug de la collection, ex. places.' }, id: { type: ['number', 'string'] }, versionId: { type: 'string', description: 'Facultatif : version précise à restaurer.' } },
    },
    run: async (input: { collection: string; id: number | string; versionId?: string }, ctx) => restorePrevious(await payload(), input, ctx),
  },
  {
    name: 'restaurer_corbeille',
    title: 'Restaurer depuis la corbeille',
    description: 'Sans id : liste les documents mis à la corbeille (30 jours) d’une collection. Avec id : remet le document en place, dans l’état où il était.',
    module: 'platform',
    access: 'admin',
    readOnly: false,
    input: { type: 'object', required: ['collection'], properties: { collection: { type: 'string', description: 'Slug de la collection, ex. places.' }, id: { type: ['number', 'string'] } } },
    run: async (input: { collection: string; id?: number | string }, ctx) => restoreFromTrash(await payload(), input, ctx),
  },
  {
    name: 'traduire',
    title: 'Traduire une fiche',
    description: `Traduit les textes publics d’une fiche du français vers l’anglais et l’arabe (Claude Haiku), sans jamais traduire noms, adresses ni horaires. Ne retraduit pas un texte inchangé. Collections : ${Object.keys(TRANSLATABLE).join(', ')}. Respecte le plafond mensuel de l’IA.`,
    module: 'platform',
    access: 'staff',
    readOnly: false,
    input: {
      type: 'object',
      required: ['collection', 'id'],
      properties: { collection: { type: 'string', enum: Object.keys(TRANSLATABLE) }, id: { type: ['number', 'string'] }, langues: { type: 'array', items: { type: 'string', enum: ['en', 'ar'] } } },
    },
    run: async (input: { collection: string; id: number | string; langues?: TargetLang[] }, ctx) => {
      requireRole(ctx, 'staff')
      if (!TRANSLATABLE[input.collection]) throw new OpsError(`Collection non traduisible : ${input.collection}.`)
      if (!aiConfigured()) throw new OpsError('IA non configurée (ANTHROPIC_API_KEY).')
      const langs = (input.langues?.length ? input.langues : TARGET_LANGS).filter((l): l is TargetLang => l === 'en' || l === 'ar')
      return translateDoc(await payload(), input.collection, input.id, langs)
    },
  },
  {
    name: 'texte_alternatif',
    title: 'Texte alternatif des photos',
    description:
      'Rédige le texte alternatif d’une photo (français, 125 caractères au plus, descriptif, sans inventer de nom de lieu) et l’enregistre. Avec tous: true, traite jusqu’à 20 photos sans texte alternatif. lieu : nom du lieu fourni par l’équipe, seul nom que l’IA peut citer.',
    module: 'platform',
    access: 'staff',
    readOnly: false,
    input: { type: 'object', properties: { id: { type: 'number' }, tous: { type: 'boolean', default: false }, lieu: { type: 'string' }, remplacer: { type: 'boolean', default: false, description: 'Réécrire un texte existant.' } } },
    run: async (input: { id?: number; tous?: boolean; lieu?: string; remplacer?: boolean }, ctx) => {
      requireRole(ctx, 'staff')
      const p = await payload()
      const gate = await staffAiGate()
      if (!gate.ok) throw new OpsError(gate.reason === 'off' ? 'IA non configurée (ANTHROPIC_API_KEY).' : 'Plafond mensuel de l’IA atteint.')
      if (input.id != null) return { resultats: [await generateAlt(p, input.id, { context: input.lieu, force: input.remplacer })] }
      if (!input.tous) throw new OpsError('Indiquez une photo (id) ou tous: true.')
      const ids = await mediaWithoutAlt(p, 20)
      const resultats = []
      for (const id of ids) {
        const r = await generateAlt(p, id)
        resultats.push(r)
        if (r.ignore === 'IA indisponible ou plafond atteint') break
      }
      return { traitees: resultats.length, resultats, reste: ids.length === 20 ? 'Relancer pour le lot suivant.' : null }
    },
  },
]
