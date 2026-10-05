// Préfixe la feuille de style du prototype par `.legacy` et branche ses variables sur les tokens de la maquette.
import fs from 'fs'
import postcss from 'postcss'
import prefixer from 'postcss-prefix-selector'

const src = fs.readFileSync('legacy/assets/index-Bcg7QTMV.css', 'utf8')
const out = postcss([
  // supprime les blocs de variables du prototype (remplacés plus bas)
  {
    postcssPlugin: 'drop-legacy-tokens',
    Rule(rule) {
      if ((rule.selector === ':root' || rule.selector === 'html.dark') && rule.nodes.some((n) => n.prop === '--primary')) rule.remove()
    },
  },
  prefixer({
    prefix: '.legacy',
    transform(prefix, selector) {
      if (selector.startsWith('html.dark')) return selector.replace(/^html\.dark/, 'html[data-theme="dark"] ' + prefix)
      if (/^(:root|:host|html|body)\b/.test(selector)) return selector.replace(/^(:root|:host|html|body)(,\s*:host)?/, prefix)
      if (selector.startsWith('::')) return `${prefix} ${selector}`
      if (selector === '*' || selector.startsWith('*')) return `${prefix} ${selector}`
      return `${prefix} ${selector}`
    },
  }),
]).process(src, { from: undefined }).css

const tokens = `/* Généré par scripts/scope-legacy-css.mjs — ne pas modifier à la main. */
.legacy{--primary:var(--green);--primary-dark:color-mix(in srgb,var(--green) 78%,#000);--primary-soft:var(--green-soft);--secondary:var(--navy);--tertiary:var(--gold);--neutral:var(--bg);--ink:var(--text);--border:var(--line);--border-dark:color-mix(in srgb,var(--line) 70%,var(--text));--blue-soft:var(--surface-3);--heading:Manrope,Inter,system-ui,sans-serif;--body:Inter,system-ui,sans-serif;font-family:var(--body);color:var(--text)}
`
fs.writeFileSync('src/styles/legacy.css', tokens + out)
console.log('legacy.css', (tokens + out).length)
