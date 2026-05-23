import { useEffect, type ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { auth } from '../lib/auth'
import { connectRealtime } from '../lib/realtime'

export default function RequireAuth({ children }: { children: ReactElement }) {
  const location = useLocation()
  const session = auth.getSession()

  // Open the SignalR connection for any authed page. The realtime module
  // is a no-op if already connected, so this is safe to call repeatedly.
  useEffect(() => {
    if (session) connectRealtime()
  }, [session])

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  if (session.status === 'PendingPasswordChange' && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return children
}

export function RedirectIfAuthed({ children }: { children: ReactElement }) {
  return auth.getSession() ? <Navigate to="/dashboard" replace /> : children
}
