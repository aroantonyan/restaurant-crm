import { auth } from './auth'
import { getTelegram } from './telegram'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

// ---- Auth ----

export interface AuthResponse {
  token: string
  userId: string
  restaurantId: string
  restaurantName: string
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

// ---- Menu ----

export interface MenuItemDto {
  id: string
  categoryId: string
  categoryName: string
  name: string
  description: string | null
  price: number
  photoUrl: string | null
  isAvailable: boolean
}

export interface MenuCategoryDto {
  id: string
  name: string
  sortOrder: number
  items: MenuItemDto[]
}

export interface CreateCategoryRequest { name: string; sortOrder?: number }
export interface UpdateCategoryRequest { name: string; sortOrder: number }
export interface CreateMenuItemRequest { categoryId: string; name: string; description?: string; price: number; photoUrl?: string; isAvailable?: boolean }
export interface UpdateMenuItemRequest { categoryId: string; name: string; description?: string; price: number; photoUrl?: string; isAvailable: boolean }

// ---- Tables ----

export interface TableDto { id: string; number: number; capacity: number; status: string }
export interface CreateTableRequest { number: number; capacity?: number }
export interface UpdateTableRequest { number: number; capacity: number }

// ---- Orders ----

export interface OrderItemDto { id: string; menuItemId: string; menuItemName: string; price: number; quantity: number; status: string; notes: string | null }
export interface OrderDto { id: string; tableId: string; tableNumber: number; status: string; createdBy: string; createdAt: string; items: OrderItemDto[]; total: number }
export interface CreateOrderRequest { tableId: string; items: Array<{ menuItemId: string; quantity: number; notes?: string }> }
export interface AddOrderItemRequest { menuItemId: string; quantity: number; notes?: string }

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
    if (res.status === 401 && auth.getToken()) {
      auth.clear()
      window.location.replace('/login')
    }
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

  menu: {
    getAll: () => request<MenuCategoryDto[]>('/api/menu'),
    createCategory: (data: CreateCategoryRequest) => request<MenuCategoryDto>('/api/menu/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id: string, data: UpdateCategoryRequest) => request<MenuCategoryDto>(`/api/menu/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id: string) => request<void>(`/api/menu/categories/${id}`, { method: 'DELETE' }),
    createItem: (data: CreateMenuItemRequest) => request<MenuItemDto>('/api/menu/items', { method: 'POST', body: JSON.stringify(data) }),
    updateItem: (id: string, data: UpdateMenuItemRequest) => request<MenuItemDto>(`/api/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleItem: (id: string) => request<MenuItemDto>(`/api/menu/items/${id}/toggle`, { method: 'PATCH' }),
    deleteItem: (id: string) => request<void>(`/api/menu/items/${id}`, { method: 'DELETE' }),
  },

  tables: {
    getAll: () => request<TableDto[]>('/api/tables'),
    create: (data: CreateTableRequest) => request<TableDto>('/api/tables', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateTableRequest) => request<TableDto>(`/api/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/tables/${id}`, { method: 'DELETE' }),
  },

  orders: {
    getAll: () => request<OrderDto[]>('/api/orders'),
    getById: (id: string) => request<OrderDto>(`/api/orders/${id}`),
    create: (data: CreateOrderRequest) => request<OrderDto>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
    addItem: (orderId: string, data: AddOrderItemRequest) => request<OrderDto>(`/api/orders/${orderId}/items`, { method: 'POST', body: JSON.stringify(data) }),
    removeItem: (orderId: string, itemId: string) => request<OrderDto>(`/api/orders/${orderId}/items/${itemId}`, { method: 'DELETE' }),
    updateStatus: (id: string, status: string) => request<OrderDto>(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    updateItemStatus: (orderId: string, itemId: string, status: string) => request<OrderDto>(`/api/orders/${orderId}/items/${itemId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
}
