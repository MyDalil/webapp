'use client'

import { useEffect, useRef, useState } from 'react'

export function Toast() {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setMsg(null), 2600)
    }
    window.addEventListener('dalil:toast', on)
    return () => window.removeEventListener('dalil:toast', on)
  }, [])
  return (
    <div className="toast" role="status" aria-live="polite" hidden={!msg}>
      {msg}
    </div>
  )
}
