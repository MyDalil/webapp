import { fail } from '@/lib/site'

// L’administration se fait désormais dans /admin (Payload, sur Neon).
const denied = () => fail('Administration disponible sur /admin.', 401)
export const GET = denied
export const POST = denied
