const TOKEN_KEY = 'auth_token'
const SESSION_KEY = 'auth_session'

export type UserStatus = 'Active' | 'Inactive' | 'PendingPasswordChange'

export interface AuthSession {
  userId: string
  restaurantId: string
  restaurantName: string
  firstName: string
  lastName: string
  roleName: string
  permissions: string[]
  status: UserStatus
}

export const auth = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
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
  },
}
