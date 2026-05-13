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

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
