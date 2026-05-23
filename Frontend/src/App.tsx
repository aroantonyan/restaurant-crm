import { Navigate, Route, Routes } from 'react-router-dom'
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

export default function App() {
  return (
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
  )
}
