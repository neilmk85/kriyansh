import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import CustomerLanding from '@/pages/CustomerLanding'
import CustomerAuth from '@/pages/CustomerAuth'
import CustomerProfile from '@/pages/CustomerProfile'
import CustomerHome from '@/pages/CustomerHome'
import CustomerBooking from '@/pages/CustomerBooking'
import CustomerBookingOptions from '@/pages/CustomerBookingOptions'
import CustomerMembership from '@/pages/CustomerMembership'
import CustomerAccount from '@/pages/CustomerAccount'
import CustomerGiftCard from '@/pages/CustomerGiftCard'
import Dashboard from '@/pages/Dashboard'
import Appointments from '@/pages/Appointments'
import Clients from '@/pages/Clients'
import Services from '@/pages/Services'
import Staff from '@/pages/Staff'
import AddStaffMember from '@/pages/AddStaffMember'
import StaffShifts from '@/pages/StaffShifts'
import StaffTimesheets from '@/pages/StaffTimesheets'
import StaffPayrun from '@/pages/StaffPayrun'
import POS from '@/pages/POS'
import Settings from '@/pages/Settings'
import BookingPage from '@/pages/BookingPage'
import CheckIn from '@/pages/CheckIn'
import Loyalty from '@/pages/Loyalty'
import Inventory from '@/pages/Inventory'
import Memberships from '@/pages/Memberships'
import Packages from '@/pages/Packages'
import Marketing from '@/pages/Marketing'
import StaffPerformance from '@/pages/StaffPerformance'
import Optimizer from '@/pages/Optimizer'
import Forms from '@/pages/Forms'
import GiftCards from '@/pages/GiftCards'
import MembershipForm from '@/pages/MembershipForm'
import Products from '@/pages/Products'
import ClientSegments from '@/pages/ClientSegments'
import CustomerReview from '@/pages/CustomerReview'
import Reports from '@/pages/Reports'
import Purchases from '@/pages/Purchases'
import NewPurchaseOrder from '@/pages/NewPurchaseOrder'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"   element={<Login />} />
            <Route path="/welcome" element={<CustomerLanding />} />
            <Route path="/auth"    element={<CustomerAuth />} />
            <Route path="/profile" element={<CustomerProfile />} />
            <Route path="/home"    element={<CustomerHome />} />
            <Route path="/book"         element={<CustomerBooking />} />
            <Route path="/book-options"  element={<CustomerBookingOptions />} />
            <Route path="/membership"    element={<CustomerMembership />} />
            <Route path="/account"       element={<CustomerAccount />} />
            <Route path="/gift"          element={<CustomerGiftCard />} />
            <Route path="/review/:token" element={<CustomerReview />} />
            <Route path="/booking"                    element={<BookingPage />} />
            <Route path="/checkin/:appointmentId"     element={<CheckIn />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="clients"          element={<Clients />} />
              <Route path="clients/segments" element={<ClientSegments />} />
              <Route path="services"     element={<Services />} />
              <Route path="staff"            element={<Staff />} />
              <Route path="staff/add"        element={<AddStaffMember />} />
              <Route path="staff/shifts"     element={<StaffShifts />} />
              <Route path="staff/timesheets" element={<StaffTimesheets />} />
              <Route path="staff/payrun"     element={<StaffPayrun />} />
              <Route path="loyalty"      element={<Loyalty />} />
              <Route path="inventory"    element={<Inventory />} />
              <Route path="memberships"       element={<Memberships />} />
              <Route path="memberships/add"   element={<MembershipForm />} />
              <Route path="memberships/:id/edit" element={<MembershipForm />} />
              <Route path="packages"    element={<Packages />} />
              <Route path="gift-cards"  element={<GiftCards />} />
              <Route path="products"    element={<Products />} />
              <Route path="marketing"         element={<Marketing />} />
              <Route path="staff-performance" element={<StaffPerformance />} />
              <Route path="optimizer"         element={<Optimizer />} />
              <Route path="forms"            element={<Forms />} />
              <Route path="reports"      element={<Reports />} />
              <Route path="purchases"           element={<Purchases />} />
              <Route path="purchases/new-order" element={<NewPurchaseOrder />} />
              <Route path="pos"          element={<POS />} />
              <Route path="settings"     element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
