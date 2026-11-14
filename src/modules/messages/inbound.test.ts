import { describe, expect, it } from 'vitest'
import { addressOf, appendThread, inboundToSubmission, plainText, replySubject } from './inbound'

describe('boîte unique : emails reçus', () => {
  it('lit l’adresse de l’expéditeur', () => {
    expect(addressOf('Amina B. <Amina@Example.com>')).toBe('amina@example.com')
    expect(addressOf('amina@example.com')).toBe('amina@example.com')
    expect(addressOf('pas une adresse')).toBeNull()
  })

  it('crée une demande « email » sans HTML, idempotente par message_id', () => {
    const r = inboundToSubmission({ id: 'r1', message_id: '<m1@x>', from: 'A <a@example.com>', to: ['salam@mydalil.com'], subject: ' Question ', html: '<p>Bonjour<br>Merci</p><script>x()</script>' })
    expect('data' in r && r.data).toMatchObject({ kind: 'email', status: 'new', subject: 'Question', email: 'a@example.com', externalId: '<m1@x>' })
    expect('data' in r && (r.data.data as { text: string }).text).toBe('Bonjour\nMerci')
  })

  it('ignore le domaine DALIL : pas de boucle', () => {
    expect(inboundToSubmission({ id: 'r2', from: 'DALIL <salam@mydalil.com>' })).toEqual({ skip: 'expéditeur du domaine DALIL (boucle évitée)' })
    expect(inboundToSubmission({ id: 'r3', from: 'x@preview.mydalil.com' })).toHaveProperty('skip')
  })

  it('objet absent : « (sans objet) »', () => {
    const r = inboundToSubmission({ id: 'r4', from: 'a@example.com', text: 'x' })
    expect('data' in r && r.data.subject).toBe('(sans objet)')
  })

  it('texte : priorité à la version texte, longueur plafonnée', () => {
    expect(plainText({ text: 'Bonjour', html: '<b>autre</b>' })).toBe('Bonjour')
    expect(plainText({ text: 'a'.repeat(30_000) })).toHaveLength(20_000)
  })
})

describe('boîte unique : réponses', () => {
  it('fil : ajoute à la fin, 50 au plus', () => {
    const e = { at: 't', by: 'Rad', text: 'ok', delivered: true }
    expect(appendThread(null, e)).toEqual([e])
    expect(appendThread(Array(50).fill(e), { ...e, text: 'dernier' }).at(-1)?.text).toBe('dernier')
    expect(appendThread(Array(50).fill(e), e)).toHaveLength(50)
  })

  it('objet : « Re : » une seule fois', () => {
    expect(replySubject('Question')).toBe('Re : Question')
    expect(replySubject('RE: Question')).toBe('RE: Question')
  })
})
