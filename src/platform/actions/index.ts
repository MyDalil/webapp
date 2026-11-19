/** Outils communs des actions DALIL (le contrat est dans types.ts). */
export * from './types'
export { validateInput, type Validation } from './validate'
export { allowed, principalFromUser, siteContext, contextFor, principalLabel, PUBLIC } from './context'
export { absoluteUrl, slugFrom, SITE_BASE } from './url'
export { reqContextOf } from './reqContext'
export { ActionError, createRunner, type ActionErrorCode } from './run'
export { S, wilayaCode, wilayaLabel, limitOf, matchesWords } from './fields'
export { handleBody, handleMessage, toolOf, negotiate, PROTOCOL_VERSIONS, type McpTools } from './mcp'
