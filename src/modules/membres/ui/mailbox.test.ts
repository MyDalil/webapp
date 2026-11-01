import { describe, expect, it } from 'vitest'
import { mailboxOf } from './mailbox'

describe('ouvrir la boîte mail', () => {
  it('reconnaît les messageries courantes', () => {
    expect(mailboxOf('a@gmail.com')?.label).toBe('Gmail')
    expect(mailboxOf('a@hotmail.fr')?.label).toBe('Outlook')
    expect(mailboxOf('a@yahoo.fr')?.label).toBe('Yahoo Mail')
    expect(mailboxOf('a@icloud.com')?.label).toBe('iCloud Mail')
    expect(mailboxOf('A@Orange.fr')?.label).toBe('Mail Orange')
  })
  it('fournisseur inconnu : rien d’inventé', () => {
    expect(mailboxOf('contact@entreprise.dz')).toBeNull()
  })
})
