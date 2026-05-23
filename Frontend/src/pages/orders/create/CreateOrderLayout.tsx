import { Outlet } from 'react-router-dom'
import { OrderDraftProvider } from './OrderDraftContext'

// Wraps the order-creation flow so all sub-routes share one draft.
// State is held in React; navigating to a sibling page keeps the cart intact.
// Navigating away from /orders/new entirely unmounts the provider — fresh start next time.
export default function CreateOrderLayout() {
  return (
    <OrderDraftProvider>
      <Outlet />
    </OrderDraftProvider>
  )
}
