import 'server-only'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/** Outils communs aux routes /api : accès Payload, réponses JSON, validation simple. */

export const payload = () => getPayload({ config })

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } })
export const fail = (error: string, status = 400) => json({ error }, status)

export const isEmail = (v: unknown): v is string => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
export const clean = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

