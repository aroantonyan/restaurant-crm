import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { auth } from '../lib/auth'

export default function RequireAuth({ children }: { children: ReactElement }) {
  const location = useLocation()
  const session = auth.getSession()
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  if (session.status === 'PendingPasswordChange' && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return children
}

export function RedirectIfAuthed({ children }: { children: ReactElement }) {
  return auth.getSession() ? <Navigate to="/dashboard" replace /> : children
}
