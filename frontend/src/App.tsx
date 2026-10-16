import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuth, getRoleDefaultRoute } from './context/AuthContext';

import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

import Home from './pages/public/Home';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import BlogList from './pages/public/BlogList';
import BlogDetail from './pages/public/BlogDetail';
import Packages from './pages/public/Packages';
import PackageDetail from './pages/public/PackageDetail';
import Destinations from './pages/public/Destinations';
import DestinationDetail from './pages/public/DestinationDetail';
import QuotationReview from './pages/public/QuotationReview';
import Login from './pages/public/Login';
import AdminSetup from './pages/public/AdminSetup';

import Dashboard from './pages/admin/Dashboard';
import CEODashboard from './pages/admin/CEODashboard';
import EnquiryDashboard from './pages/admin/crm/EnquiryDashboard';
import EnquiryDetail from './pages/admin/crm/EnquiryDetail';
import HRDashboard from './pages/admin/hr/HRDashboard';
import EmployeeList from './pages/admin/hr/EmployeeList';
import DepartmentList from './pages/admin/hr/DepartmentList';
import DesignationList from './pages/admin/hr/DesignationList';
import AttendanceManagement from './pages/admin/hr/AttendanceManagement';
import LeaveManagement from './pages/admin/hr/LeaveManagement';
import PackageManagement from './pages/admin/PackageManagement';
import BlogManagement from './pages/admin/BlogManagement';
import Settings from './pages/admin/Settings';
import HomePageManagement from './pages/admin/website/HomePageManagement';
import FooterManagement from './pages/admin/website/FooterManagement';
import PayrollManagement from './pages/admin/hr/PayrollManagement';

import SalesDashboard from './pages/admin/crm/SalesDashboard';
import LeadKanbanBoard from './pages/admin/crm/LeadKanbanBoard';
import LeadDetails from './pages/admin/crm/LeadDetails';
import CustomerManagement from './pages/admin/crm/CustomerManagement';
import CustomerDetail from './pages/admin/crm/CustomerDetail';
import QuotationBuilder from './pages/admin/crm/QuotationBuilder';
import FeedbackEnquiries from './pages/admin/crm/FeedbackEnquiries';

import AccountingDashboard from './pages/admin/accounting/AccountingDashboard';
import PaymentManagement from './pages/admin/accounting/PaymentManagement';
import RefundManagement from './pages/admin/accounting/RefundManagement';
import { RevenueManagement } from './pages/admin/accounting/RevenueManagement';
import GSTManagement from './pages/admin/accounting/GSTManagement';
import ExpenseDashboard from './pages/admin/accounting/ExpenseDashboard';
import ExpenseManagement from './pages/admin/accounting/ExpenseManagement';
import ExpenseCategories from './pages/admin/accounting/ExpenseCategories';
import ProfitLossDashboard from './pages/admin/accounting/ProfitLossDashboard';
import ProfitLossStatement from './pages/admin/accounting/ProfitLossStatement';
import PayrollAccountingDashboard from './pages/admin/accounting/PayrollAccountingDashboard';
import FinancialReports from './pages/admin/accounting/FinancialReports';

import OperationsDashboard from './pages/admin/operations/OperationsDashboard';
import TourManagement from './pages/admin/operations/TourManagement';
import TourDetails from './pages/admin/operations/TourDetails';
import HotelManagement from './pages/admin/operations/HotelManagement';
import FlightTicketManagement from './pages/admin/operations/FlightTicketManagement';
import TrainTicketManagement from './pages/admin/operations/TrainTicketManagement';
import BusTicketManagement from './pages/admin/operations/BusTicketManagement';
import TransportManagement from './pages/admin/operations/TransportManagement';
import VendorManagement from './pages/admin/operations/VendorManagement';
import OperationalCostManagement from './pages/admin/operations/OperationalCostManagement';
import DocumentManagement from './pages/admin/operations/DocumentManagement';
import OperationsReports from './pages/admin/operations/OperationsReports';
import GroupTourManagement from './pages/admin/operations/GroupTourManagement';

// Security & RBAC Module
import UserManagement from './pages/admin/security/UserManagement';
import RoleManagement from './pages/admin/security/RoleManagement';
import AuditLogViewer from './pages/admin/security/AuditLogViewer';
import SecuritySettingsPage from './pages/admin/security/SecuritySettingsPage';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import api from './services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// Role-based index redirect for /admin — sends each user to their correct dashboard
function AdminIndexRedirect() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (location.search.includes('view=desk')) {
    return null;
  }

  const target = getRoleDefaultRoute(user.roleName, user.permissions);
  // Only redirect away from /admin if the target is a specific sub-route
  if (target && target !== '/admin') {
    return <Navigate to={target} replace />;
  }

  // Fallback to the generic dashboard
  return <Dashboard />;
}

function App() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

      if (token) {
        try {
          await api.get('/auth/me');
        } catch (e: any) {
          if (e.response && (e.response.status === 401 || e.response.status === 403)) {
            localStorage.removeItem('token');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user_profile');
          }
        }
      }

      setAuthReady(true);
    };

    initAuth();
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-sm font-medium text-slate-400">Initializing Security & Authentication Context...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="packages" element={<Packages />} />
              <Route path="packages/:slug" element={<PackageDetail />} />
              <Route path="destinations" element={<Destinations />} />
              <Route path="destinations/:slug" element={<DestinationDetail />} />
              <Route path="blog" element={<BlogList />} />
              <Route path="blog/:slug" element={<BlogDetail />} />
            </Route>

            {/* Public Standalone Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/setup-admin" element={<AdminSetup />} />
            <Route path="/quote/:id" element={<QuotationReview />} />

            {/* Admin Routes — top-level auth guard: any unauthenticated direct URL → /login */}
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminIndexRedirect />} />
              <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="ceo-dashboard" element={<ProtectedRoute requiredRole={['CEO / Super Admin', 'SUPER_ADMIN', 'Admin']}><CEODashboard /></ProtectedRoute>} />
              
              {/* Enquiries */}
              <Route path="enquiries" element={<ProtectedRoute requiredModule="Enquiries"><EnquiryDashboard /></ProtectedRoute>} />
              <Route path="enquiries/:id" element={<ProtectedRoute requiredModule="Enquiries"><EnquiryDetail /></ProtectedRoute>} />
              <Route path="feedback-enquiries" element={<ProtectedRoute requiredRole={['CEO / Super Admin', 'SUPER_ADMIN', 'Admin', 'ADMIN']}><FeedbackEnquiries /></ProtectedRoute>} />

              {/* HR */}
              <Route path="hr" element={<ProtectedRoute requiredModule="HR"><HRDashboard /></ProtectedRoute>} />
              <Route path="attendance" element={<ProtectedRoute><AttendanceManagement /></ProtectedRoute>} />
              <Route path="leaves" element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>} />
              <Route path="departments" element={<ProtectedRoute requiredModule="HR"><DepartmentList /></ProtectedRoute>} />
              <Route path="designations" element={<ProtectedRoute requiredModule="HR"><DesignationList /></ProtectedRoute>} />
              <Route path="employees" element={<ProtectedRoute requiredModule="Employees"><EmployeeList /></ProtectedRoute>} />
              <Route path="payroll" element={<ProtectedRoute requiredModule="Salary"><PayrollManagement /></ProtectedRoute>} />
              
              {/* Website & Catalog */}
              <Route path="packages" element={<ProtectedRoute requiredModule="Packages"><PackageManagement /></ProtectedRoute>} />
              <Route path="blog" element={<ProtectedRoute requiredModule="Website Management"><BlogManagement /></ProtectedRoute>} />
              <Route path="website/homepage" element={<ProtectedRoute requiredModule="Website Management"><HomePageManagement /></ProtectedRoute>} />
              <Route path="website/footer" element={<ProtectedRoute requiredModule="Website Management"><FooterManagement /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute requiredModule="System Settings"><Settings /></ProtectedRoute>} />

              {/* Sales CRM */}
              <Route path="crm/dashboard" element={<ProtectedRoute requiredModule="Sales CRM"><SalesDashboard /></ProtectedRoute>} />
              <Route path="crm/pipeline" element={<ProtectedRoute requiredModule="Sales CRM"><LeadKanbanBoard /></ProtectedRoute>} />
              <Route path="crm/leads/:id" element={<ProtectedRoute requiredModule="Sales CRM"><LeadDetails /></ProtectedRoute>} />
              <Route path="crm/leads/:id/quote" element={<ProtectedRoute requiredModule="Quotations"><QuotationBuilder /></ProtectedRoute>} />
              <Route path="crm/leads/:id/quote/:quoteId" element={<ProtectedRoute requiredModule="Quotations"><QuotationBuilder /></ProtectedRoute>} />
              <Route path="crm/customers" element={<ProtectedRoute requiredModule="Customers"><CustomerManagement /></ProtectedRoute>} />
              <Route path="crm/customers/:id" element={<ProtectedRoute requiredModule="Customers"><CustomerDetail /></ProtectedRoute>} />
              
              {/* Operations Core */}
              <Route path="operations" element={<ProtectedRoute requiredModule="Operations"><OperationsDashboard /></ProtectedRoute>} />
              <Route path="operations/tours" element={<ProtectedRoute requiredModule="Operations"><TourManagement /></ProtectedRoute>} />
              <Route path="operations/group-tours" element={<ProtectedRoute requiredModule="Operations"><GroupTourManagement /></ProtectedRoute>} />
              <Route path="operations/tours/:id" element={<ProtectedRoute requiredModule="Operations"><TourDetails /></ProtectedRoute>} />
              <Route path="operations/flights" element={<ProtectedRoute requiredModule="Tickets"><FlightTicketManagement /></ProtectedRoute>} />
              <Route path="operations/trains" element={<ProtectedRoute requiredModule="Tickets"><TrainTicketManagement /></ProtectedRoute>} />
              <Route path="operations/buses" element={<ProtectedRoute requiredModule="Tickets"><BusTicketManagement /></ProtectedRoute>} />
              <Route path="operations/hotels" element={<ProtectedRoute requiredModule="Hotels"><HotelManagement /></ProtectedRoute>} />
              <Route path="operations/transport" element={<ProtectedRoute requiredModule="Tickets"><TransportManagement /></ProtectedRoute>} />
              <Route path="operations/vendors" element={<ProtectedRoute requiredModule="Vendors"><VendorManagement /></ProtectedRoute>} />
              <Route path="operations/costs" element={<ProtectedRoute requiredModule="Operations"><OperationalCostManagement /></ProtectedRoute>} />
              <Route path="operations/documents" element={<ProtectedRoute requiredModule="Operations"><DocumentManagement /></ProtectedRoute>} />
              <Route path="operations/reports" element={<ProtectedRoute requiredModule="Reports"><OperationsReports /></ProtectedRoute>} />

              {/* Accounting */}
              <Route path="accounting" element={<ProtectedRoute requiredModule="Accounting"><AccountingDashboard /></ProtectedRoute>} />
              <Route path="accounting/payments" element={<ProtectedRoute requiredModule="Payments"><PaymentManagement /></ProtectedRoute>} />
              <Route path="accounting/refunds" element={<ProtectedRoute requiredModule="Accounting"><RefundManagement /></ProtectedRoute>} />
              <Route path="accounting/revenue" element={<ProtectedRoute requiredModule="Accounting"><RevenueManagement /></ProtectedRoute>} />
              <Route path="accounting/gst" element={<ProtectedRoute requiredModule="Accounting"><GSTManagement /></ProtectedRoute>} />
              <Route path="accounting/expenses/dashboard" element={<ProtectedRoute requiredModule="Expenses"><ExpenseDashboard /></ProtectedRoute>} />
              <Route path="accounting/expenses" element={<ProtectedRoute requiredModule="Expenses"><ExpenseManagement /></ProtectedRoute>} />
              <Route path="accounting/expenses/categories" element={<ProtectedRoute requiredModule="Expenses"><ExpenseCategories /></ProtectedRoute>} />
              <Route path="accounting/pnl/dashboard" element={<ProtectedRoute requiredModule="Accounting"><ProfitLossDashboard /></ProtectedRoute>} />
              <Route path="accounting/pnl/statement" element={<ProtectedRoute requiredModule="Accounting"><ProfitLossStatement /></ProtectedRoute>} />
              <Route path="accounting/payroll" element={<ProtectedRoute requiredModule="Salary"><PayrollAccountingDashboard /></ProtectedRoute>} />
              <Route path="accounting/reports" element={<ProtectedRoute requiredModule="Reports"><FinancialReports /></ProtectedRoute>} />

              {/* Security & RBAC Module */}
              <Route path="security/users" element={<ProtectedRoute requiredModule="User Management"><UserManagement /></ProtectedRoute>} />
              <Route path="security/roles" element={<ProtectedRoute requiredModule="User Management"><RoleManagement /></ProtectedRoute>} />
              <Route path="security/audit-logs" element={<ProtectedRoute requiredModule="Audit Logs"><AuditLogViewer /></ProtectedRoute>} />
              <Route path="security/settings" element={<ProtectedRoute requiredModule="System Settings"><SecuritySettingsPage /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
