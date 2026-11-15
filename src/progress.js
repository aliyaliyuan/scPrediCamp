import { useCallback, useState } from 'react'

const KEY = 'scpx-done'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

// Completed lessons, remembered in this browser only.
export function useProgress() {
  const [done, setDone] = useState(read)
  const complete = useCallback((n) => {
    setDone((d) => {
      const next = { ...d, [n]: true }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
  }, [])
  return { done, complete }
}
