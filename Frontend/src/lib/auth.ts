import type { AuthResponse } from './api'

const TOKEN_KEY = 'auth_token'
const SESSION_KEY = 'auth_session'
const REFRESH_KEY = 'auth_refresh'

export type UserStatus = 'Active' | 'Inactive' | 'PendingPasswordChange'

export interface AuthSession {
  userId: string
  restaurantId: string
  restaurantName: string
  currency: string
  firstName: string
  lastName: string
  roleName: string
  permissions: string[]
  status: UserStatus
}

export const auth = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_KEY),
  getSession: (): AuthSession | null => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!Array.isArray(session.permissions) || !session.status) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  },
  set: (token: string, session: AuthSession): void => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  },
  setStatus: (status: UserStatus): void => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return
    const session = JSON.parse(raw) as AuthSession
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, status }))
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
  /** Persists a session from any auth response (login / register / refresh). */
  setFromResponse: (res: AuthResponse): void => {
    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem(REFRESH_KEY, res.refreshToken)
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      userId:         res.userId,
      restaurantId:   res.restaurantId,
      restaurantName: res.restaurantName,
      currency:       res.currency,
      firstName:      res.firstName,
      lastName:       res.lastName,
      roleName:       res.roleName,
      permissions:    res.permissions,
      status:         res.status,
    } satisfies AuthSession))
  },
}
