/** IA de DALIL (réduite, encadrée) : nettoyage simple sans IA, reformulation et compréhension par Claude Haiku avec quotas. */
export { simpleClean } from './clean'
export { AI_MODEL, aiConfigured, callClaude, type AiReply } from './claude'
export { aiGate, recordAi, monthSpentMicros, DAILY_QUOTA, MONTHLY_BUDGET_MICROS, MAX_INPUT_CHARS, type AiGate } from './budget'
export { aiReformulate } from './reformulate'
