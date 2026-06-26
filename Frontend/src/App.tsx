import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BottomTabBar from './components/BottomTabBar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ChangePassword from './pages/ChangePassword'
import SchedulePage from './pages/SchedulePage'
import SettingsPage from './pages/SettingsPage'
import StaffTab from './pages/staff/StaffTab'
import StaffCreate from './pages/staff/StaffCreate'
import StaffEdit from './pages/staff/StaffEdit'
import MenuPage from './pages/menu/MenuPage'
import MenuCategoryPage from './pages/menu/MenuCategoryPage'
import MenuItemRecipePage from './pages/menu/MenuItemRecipePage'
import TablesPage from './pages/TablesPage'
import ReportsPage from './pages/ReportsPage'
import ReservationsPage from './pages/reservations/ReservationsPage'
import OrdersPage from './pages/orders/OrdersPage'
import KitchenPage from './pages/KitchenPage'
import OrderDetailPage from './pages/orders/OrderDetailPage'
import CreateOrderLayout from './pages/orders/create/CreateOrderLayout'
import SelectTablePage from './pages/orders/create/SelectTablePage'
import OrderCategoriesPage from './pages/orders/create/OrderCategoriesPage'
import OrderCategoryItemsPage from './pages/orders/create/OrderCategoryItemsPage'
import OrderReviewPage from './pages/orders/create/OrderReviewPage'
import CashRegisterPage from './pages/CashRegisterPage'
import ActivityLogPage from './pages/ActivityLogPage'
import ClientsPage from './pages/clients/ClientsPage'
import ClientForm from './pages/clients/ClientForm'
import ClientDetailPage from './pages/clients/ClientDetailPage'
import WarehousePage from './pages/warehouse/WarehousePage'
import WarehouseCreate from './pages/warehouse/WarehouseCreate'
import WarehouseEdit from './pages/warehouse/WarehouseEdit'
import WarehouseProductDetail from './pages/warehouse/WarehouseProductDetail'
import RequireAuth, { RedirectIfAuthed } from './components/RequireAuth'

/**
 * Scrolls every page-level scroll container (and the window) to the top when
 * the route changes. Each page mounts a fresh `<main>` so its own scroll is 0,
 * but if any element already exists with scrollTop > 0 (e.g. CartBar's parent,
 * #root in older browsers) we reset it here. Belt-and-braces.
 *
 * Important: do this on the LOCATION_KEY changing, not the pathname — that way
 * a `replace` navigation to the same path still resets scroll.
 */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Defer to next frame so the new page's <main> is mounted first.
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('main').forEach(m => {
        m.scrollTop = 0
      })
      document.getElementById('root')?.scrollTo({ top: 0 })
      window.scrollTo({ top: 0 })
    })
  }, [pathname])
  return null
}

function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  // Hide the bottom tab bar on focused flows (auth + multi-step / detail pages).
  const hideOnPrefix = ['/login', '/register', '/change-password', '/orders/new']
  const isOrderDetail = /^\/orders\/[^/]+$/.test(pathname)            // /orders/:id
  const isOrderAddItems = /^\/orders\/[^/]+\/add-items/.test(pathname) // /orders/:id/add-items/*
  const isMenuCategory = /^\/menu\/categories\/[^/]+/.test(pathname)   // /menu/categories/:id...
  const isMenuItemRecipe = /^\/menu\/items\/[^/]+\/recipe/.test(pathname) // /menu/items/:id/recipe
  const showTabBar =
    !hideOnPrefix.some(p => pathname.startsWith(p)) &&
    !isOrderDetail &&
    !isOrderAddItems &&
    !isMenuCategory &&
    !isMenuItemRecipe

  return (
    <div className="flex flex-col h-full">
      <ScrollToTop />
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      {showTabBar && <BottomTabBar />}
    </div>
  )
}

export default function App() {
  return (
    <AppShell>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthed>
            <Register />
          </RedirectIfAuthed>
        }
      />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePassword />
          </RequireAuth>
        }
      />

      <Route
        path="/staff"
        element={
          <RequireAuth>
            <StaffTab />
          </RequireAuth>
        }
      />
      <Route
        path="/schedule"
        element={
          <RequireAuth>
            <SchedulePage />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/staff/new"
        element={
          <RequireAuth>
            <StaffCreate />
          </RequireAuth>
        }
      />
      <Route
        path="/staff/:id/edit"
        element={
          <RequireAuth>
            <StaffEdit />
          </RequireAuth>
        }
      />

      <Route
        path="/menu"
        element={
          <RequireAuth>
            <MenuPage />
          </RequireAuth>
        }
      />
      <Route
        path="/menu/categories/:id"
        element={
          <RequireAuth>
            <MenuCategoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/menu/items/:id/recipe"
        element={
          <RequireAuth>
            <MenuItemRecipePage />
          </RequireAuth>
        }
      />
      <Route
        path="/tables"
        element={
          <RequireAuth>
            <TablesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/reservations"
        element={
          <RequireAuth>
            <ReservationsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/reports"
        element={
          <RequireAuth>
            <ReportsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/orders"
        element={
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/kitchen"
        element={
          <RequireAuth>
            <KitchenPage />
          </RequireAuth>
        }
      />
      <Route
        path="/orders/new"
        element={
          <RequireAuth>
            <CreateOrderLayout />
          </RequireAuth>
        }
      >
        <Route index element={<SelectTablePage />} />
        <Route path="menu" element={<OrderCategoriesPage />} />
        <Route path="menu/:categoryId" element={<OrderCategoryItemsPage />} />
        <Route path="review" element={<OrderReviewPage />} />
      </Route>
      <Route
        path="/orders/:id/add-items"
        element={
          <RequireAuth>
            <CreateOrderLayout />
          </RequireAuth>
        }
      >
        <Route index element={<OrderCategoriesPage />} />
        <Route path="menu/:categoryId" element={<OrderCategoryItemsPage />} />
        <Route path="review" element={<OrderReviewPage />} />
      </Route>
      <Route
        path="/orders/:id"
        element={
          <RequireAuth>
            <OrderDetailPage />
          </RequireAuth>
        }
      />

      <Route
        path="/cash-register"
        element={
          <RequireAuth>
            <CashRegisterPage />
          </RequireAuth>
        }
      />
      <Route
        path="/activity-log"
        element={
          <RequireAuth>
            <ActivityLogPage />
          </RequireAuth>
        }
      />
      <Route
        path="/clients"
        element={
          <RequireAuth>
            <ClientsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/clients/new"
        element={
          <RequireAuth>
            <ClientForm mode="create" />
          </RequireAuth>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <RequireAuth>
            <ClientDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/clients/:id/edit"
        element={
          <RequireAuth>
            <ClientForm mode="edit" />
          </RequireAuth>
        }
      />
      <Route
        path="/warehouse"
        element={
          <RequireAuth>
            <WarehousePage />
          </RequireAuth>
        }
      />
      <Route
        path="/warehouse/new"
        element={
          <RequireAuth>
            <WarehouseCreate />
          </RequireAuth>
        }
      />
      <Route
        path="/warehouse/:id"
        element={
          <RequireAuth>
            <WarehouseProductDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/warehouse/:id/edit"
        element={
          <RequireAuth>
            <WarehouseEdit />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </AppShell>
  )
}
