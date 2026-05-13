import { auth } from './auth'
import { getTelegram } from './telegram'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

// ---- Auth ----

export interface AuthResponse {
  token: string
  userId: string
  restaurantId: string
  firstName: string
  lastName: string
  roleName: string
  permissions: string[]
  status: UserStatus
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  fatherName: string
  email: string
  password: string
  restaurantName: string
}

export interface LoginRequest {
  email: string
  password: string
}

// ---- Staff ----

export type UserStatus = 'Active' | 'Inactive' | 'PendingPasswordChange'

export interface StaffMember {
  id: string
  firstName: string
  lastName: string
  fatherName: string
  email: string
  phone: string | null
  roleName: string
  roleId: string
  status: UserStatus
  createdAt: string
}

export interface Role {
  id: string
  name: string
  isDefault: boolean
  permissions: string[]
}

export interface CreateStaffRequest {
  firstName: string
  lastName: string
  fatherName: string
  email: string
  temporaryPassword: string
  roleId: string
  phone?: string
}

export interface UpdateStaffRequest {
  firstName: string
  lastName: string
  fatherName: string
  phone?: string
  roleId?: string
}

// ---- Restaurant ----

export interface RestaurantInfo {
  id: string
  name: string
  legalName: string
  currency: string
  address: string | null
  phone: string | null
  logoUrl: string | null
}

export interface UpdateRestaurantRequest {
  name: string
  legalName: string
  currency: string
  address?: string
  phone?: string
}

// ---- Error ----

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ---- Core ----

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')

  const token = auth.getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const initData = getTelegram()?.initData
  if (initData) headers.set('X-Telegram-Init-Data', initData)

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (!res.ok) {
    const message = await extractError(res)
    throw new ApiError(res.status, message)
  }

  return res.status === 204 ? (undefined as T) : await res.json()
}

async function extractError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body.error ?? body.title ?? body.message ?? res.statusText
  } catch {
    return res.statusText || `HTTP ${res.status}`
  }
}

// ---- API ----

export const api = {
  auth: {
    login: (data: LoginRequest) =>
      request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

    register: (data: RegisterRequest) =>
      request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<void>('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  },

  staff: {
    getAll: () =>
      request<StaffMember[]>('/api/staff'),

    getById: (id: string) =>
      request<StaffMember>(`/api/staff/${id}`),

    getRoles: () =>
      request<Role[]>('/api/staff/roles'),

    create: (data: CreateStaffRequest) =>
      request<StaffMember>('/api/staff', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: UpdateStaffRequest) =>
      request<StaffMember>(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    deactivate: (id: string) =>
      request<void>(`/api/staff/${id}`, { method: 'DELETE' }),
  },

  restaurant: {
    getMe: () =>
      request<RestaurantInfo>('/api/restaurants/me'),

    updateMe: (data: UpdateRestaurantRequest) =>
      request<RestaurantInfo>('/api/restaurants/me', { method: 'PUT', body: JSON.stringify(data) }),
  },
}
