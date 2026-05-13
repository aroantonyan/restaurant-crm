import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTelegram } from '../lib/telegram'

export function useBackButton() {
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    const btn = getTelegram()?.BackButton
    if (!btn) return

    const handler = () => navigateRef.current(-1)
    btn.show()
    btn.onClick(handler)

    return () => {
      btn.offClick(handler)
      btn.hide()
    }
  }, [])
}
