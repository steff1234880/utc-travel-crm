import { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, FileText, Settings, ArrowLeft, 
  Building2, UserCircle, Wallet, Briefcase, TrendingUp, Columns, 
  UserSquare2, PieChart, CreditCard, Receipt, RefreshCcw, Compass, 
  MapPin, Building, Plane, Train, Bus, ShieldCheck, KeyRound, LogOut, Lock, MessageSquare, LayoutTemplate,
  Menu, X, ChevronDown, ChevronRight, LayoutGrid, Download, Sparkles, MessageCircle, ArrowRight, Clock, CalendarCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationsDropdown } from '../components/admin/NotificationsDropdown';
import QuickAttendanceWidget from '../components/admin/QuickAttendanceWidget';

interface NavSubItem {
  name: string;
  path: string;
  icon: any;
  module?: string;
  roles?: string[];
}

interface NavCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  badgeColor: string;
  items: NavSubItem[];
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasModuleAccess, hasRole } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showAllModulesInSidebar, setShowAllModulesInSidebar] = useState(false);

  // 12 Main Categories matching UTC Travel luxury brand identity
  const categories: NavCategory[] = useMemo(() => [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Executive overview, company KPIs, and business metrics',
      icon: LayoutDashboard,
      badgeColor: 'bg-[#fdf2f4] text-[#8b182b] border border-[#f8d0d6]',
      items: [
        { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard, module: 'Dashboard' },
        { name: 'CEO Dashboard', path: '/admin/ceo-dashboard', icon: LayoutDashboard, module: 'Dashboard', roles: ['CEO / Super Admin', 'SUPER_ADMIN', 'Admin'] }
      ]
    },
    {
      id: 'crm_enquiries',
      name: 'CRM & Enquiries',
      description: 'Leads, deals, customer queries, and feedback activity',
      icon: MessageSquare,
      badgeColor: 'bg-rose-50 text-rose-700 border border-rose-100',
      items: [
        { name: 'Enquiries', path: '/admin/enquiries', icon: Users, module: 'Enquiries' },
        { name: 'Feedback Enquiries', path: '/admin/feedback-enquiries', icon: MessageSquare, module: 'Settings', roles: ['CEO / Super Admin', 'SUPER_ADMIN', 'Admin', 'ADMIN'] }
      ]
    },
    {
      id: 'sales_quotations',
      name: 'Sales & Quotations',
      description: 'Sales pipeline, deal tracking, and custom tour quotations',
      icon: TrendingUp,
      badgeColor: 'bg-red-50 text-[#8b182b] border border-red-100',
      items: [
        { name: 'Sales CRM', path: '/admin/crm/dashboard', icon: TrendingUp, module: 'Sales CRM' },
        { name: 'Sales Pipeline', path: '/admin/crm/pipeline', icon: Columns, module: 'Sales CRM' }
      ]
    },
    {
      id: 'bookings_reservations',
      name: 'Bookings & Reservations',
      description: 'Hotel reservations, flights, trains, buses, and transport',
      icon: Building,
      badgeColor: 'bg-sky-50 text-sky-700 border border-sky-100',
      items: [
        { name: 'Hotel Reservations', path: '/admin/operations/hotels', icon: Building, module: 'Hotels' },
        { name: 'Transport Reservations', path: '/admin/operations/transport', icon: Bus, module: 'Tickets' },
        { name: 'Flight Tickets', path: '/admin/operations/flights', icon: Plane, module: 'Tickets' },
        { name: 'Train Tickets', path: '/admin/operations/trains', icon: Train, module: 'Tickets' },
        { name: 'Bus Tickets', path: '/admin/operations/buses', icon: Bus, module: 'Tickets' }
      ]
    },
    {
      id: 'customers',
      name: 'Customers',
      description: 'Organizations, client directories, and customer accounts',
      icon: UserSquare2,
      badgeColor: 'bg-pink-50 text-[#8b182b] border border-pink-100',
      items: [
        { name: 'Customers', path: '/admin/crm/customers', icon: UserSquare2, module: 'Customers' }
      ]
    },
    {
      id: 'packages_tours',
      name: 'Packages & Tours',
      description: 'Tour catalog, package itineraries, and group tour management',
      icon: Package,
      badgeColor: 'bg-emerald-50 text-emerald-800 border border-emerald-100',
      items: [
        { name: 'Package Management', path: '/admin/packages', icon: Package, module: 'Packages' },
        { name: 'Tour Management', path: '/admin/operations/tours', icon: MapPin, module: 'Operations' },
        { name: 'Group Tours', path: '/admin/operations/group-tours', icon: Users, module: 'Operations' }
      ]
    },
    {
      id: 'operations_travel',
      name: 'Operations & Travel',
      description: 'Travel coordination, vendor logistics, and tour documentation',
      icon: Compass,
      badgeColor: 'bg-teal-50 text-teal-800 border border-teal-100',
      items: [
        { name: 'Operations Dashboard', path: '/admin/operations', icon: Compass, module: 'Operations' },
        { name: 'Vendor Management', path: '/admin/operations/vendors', icon: Building2, module: 'Vendors' },
        { name: 'Operational Costs', path: '/admin/operations/costs', icon: Receipt, module: 'Operations' },
        { name: 'Operations Documents', path: '/admin/operations/documents', icon: FileText, module: 'Operations' }
      ]
    },
    {
      id: 'accounting_finance',
      name: 'Accounting',
      description: 'Ledger, bank transactions, payments, refunds, and P&L',
      icon: CreditCard,
      badgeColor: 'bg-emerald-50 text-emerald-800 border border-emerald-100',
      items: [
        { name: 'Accounting Dashboard', path: '/admin/accounting', icon: PieChart, module: 'Accounting' },
        { name: 'Payments', path: '/admin/accounting/payments', icon: CreditCard, module: 'Payments' },
        { name: 'Refunds', path: '/admin/accounting/refunds', icon: RefreshCcw, module: 'Accounting' },
        { name: 'Expenses', path: '/admin/accounting/expenses', icon: Receipt, module: 'Expenses' },
        { name: 'Profit & Loss', path: '/admin/accounting/pnl/dashboard', icon: TrendingUp, module: 'Accounting' }
      ]
    },
    {
      id: 'hr_employees',
      name: 'HRMS',
      description: 'Employees, departments, designations, and staff records',
      icon: Building2,
      badgeColor: 'bg-purple-50 text-purple-700 border border-purple-100',
      items: [
        { name: 'HR Dashboard', path: '/admin/hr', icon: Building2, module: 'HR' },
        { name: 'Attendance', path: '/admin/attendance', icon: Clock },
        { name: 'Leaves', path: '/admin/leaves', icon: CalendarCheck },
        { name: 'Departments', path: '/admin/departments', icon: Building2, module: 'HR' },
        { name: 'Designations', path: '/admin/designations', icon: Briefcase, module: 'HR' },
        { name: 'Employees', path: '/admin/employees', icon: UserCircle, module: 'Employees' }
      ]
    },
    {
      id: 'payroll',
      name: 'Payroll',
      description: 'Monthly payroll processing, salary structures, and ledgers',
      icon: Wallet,
      badgeColor: 'bg-amber-50 text-amber-800 border border-amber-100',
      items: [
        { name: 'Payroll', path: '/admin/payroll', icon: Wallet, module: 'Salary' },
        { name: 'Payroll Ledger', path: '/admin/accounting/payroll', icon: Wallet, module: 'Salary' }
      ]
    },
    {
      id: 'reports_analytics',
      name: 'Reports & Analytics',
      description: 'Operational analytics, revenue insights, and audits',
      icon: PieChart,
      badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      items: [
        { name: 'Operations Reports', path: '/admin/operations/reports', icon: PieChart, module: 'Reports' },
        { name: 'Financial Reports', path: '/admin/accounting/reports', icon: FileText, module: 'Reports' }
      ]
    },
    {
      id: 'admin_security',
      name: 'Settings',
      description: 'Common, CRM, security RBAC, and system configuration',
      icon: Settings,
      badgeColor: 'bg-slate-100 text-slate-800 border border-slate-200',
      items: [
        { name: 'Settings', path: '/admin/settings', icon: Settings, module: 'System Settings' },
        { name: 'User Management', path: '/admin/security/users', icon: Users, module: 'User Management', roles: ['CEO / Super Admin', 'SUPER_ADMIN', 'Admin', 'HR Manager'] },
        { name: 'Roles & Permissions', path: '/admin/security/roles', icon: ShieldCheck, module: 'User Management', roles: ['CEO / Super Admin', 'SUPER_ADMIN', 'Admin'] },
        { name: 'Audit Logs', path: '/admin/security/audit-logs', icon: FileText, module: 'Audit Logs', roles: ['CEO / Super Admin', 'SUPER_ADMIN', 'Admin'] },
        { name: 'Security Policies', path: '/admin/security/settings', icon: Lock, module: 'System Settings', roles: ['CEO / Super Admin', 'SUPER_ADMIN', 'Admin'] },
        { name: 'Home Page Management', path: '/admin/website/homepage', icon: Compass, module: 'Website Management' },
        { name: 'Footer Management', path: '/admin/website/footer', icon: LayoutTemplate, module: 'Website Management' },
        { name: 'Blog', path: '/admin/blog', icon: FileText, module: 'Website Management' }
      ]
    }
  ], []);

  const canAccessItem = (item: NavSubItem) => {
    if (user && (
      user.roleName?.toUpperCase().includes('ADMIN') ||
      user.roleName?.toUpperCase().includes('SUPER') ||
      user.roleName?.toUpperCase().includes('CEO')
    )) {
      return true;
    }

    if (item.roles) {
      return hasRole(item.roles);
    }
    if (item.module) {
      return hasModuleAccess(item.module);
    }
    return true;
  };

  const isItemActive = (path: string) => {
    return path === '/admin'
      ? (location.pathname === '/admin' || location.pathname === '/admin/' || location.pathname === '/admin/dashboard')
      : (location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path)));
  };

  const filteredCategories = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      items: cat.items.filter(canAccessItem)
    })).filter((cat) => cat.items.length > 0);
  }, [categories, user]);

  // Determine if viewing the Main Desk
  const searchParams = new URLSearchParams(location.search);
  const isDeskView = searchParams.get('view') === 'desk' || location.pathname === '/admin/desk';

  // Identify current active module workspace
  const activeCategory = useMemo(() => {
    return filteredCategories.find(cat => 
      cat.items.some(item => isItemActive(item.path))
    );
  }, [filteredCategories, location.pathname]);

  const activeItem = useMemo(() => {
    return activeCategory?.items.find(item => isItemActive(item.path));
  }, [activeCategory, location.pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="crm-theme min-h-screen bg-[#f4f5f7] font-sans text-slate-800 flex flex-col">
      {/* ========================================================= */}
      {/* 1. MAIN DESK (MATCHES SCREENSHOT 1 & WEBSITE BRANDING)   */}
      {/* ========================================================= */}
      {isDeskView ? (
        <div className="min-h-screen bg-[#f4f5f7] flex flex-col">
          {/* Top Bar matching website visual identity */}
          <header className="p-4 sm:p-6 lg:px-10 lg:pt-8 flex flex-wrap items-center justify-between gap-4">
            {/* UTC Logo Card on Left with website official branding */}
            <div className="bg-white rounded-2xl px-5 py-3 shadow-xs border border-slate-200/80 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#8b182b] text-white flex items-center justify-center font-black text-xl shadow-md shadow-[#8b182b]/30 shrink-0">
                UTC
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-[#8b182b] leading-none">Universal Travel Company</span>
                  <Plane className="w-3.5 h-3.5 text-amber-500 fill-amber-500 -mt-1 -rotate-12" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mt-1">Enterprise CRM Desk</span>
              </div>
            </div>

            {/* Action Pills on Right */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <QuickAttendanceWidget variant="compact" />

              <Link 
                to="/admin/settings"
                className="inline-flex items-center px-3.5 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                Settings
              </Link>

              {user && (
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 bg-white border border-slate-200/80 rounded-xl text-slate-500 hover:text-[#8b182b] hover:bg-rose-50 shadow-2xs transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </header>

          {/* Module Cards Grid matching Screenshot 1 */}
          <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 max-w-[1600px] w-full mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredCategories.map((cat) => (
                <Link
                  key={cat.id}
                  to={cat.items[0]?.path}
                  className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 hover:shadow-xl hover:shadow-[#8b182b]/5 hover:border-[#8b182b]/40 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between text-left group cursor-pointer"
                >
                  <div>
                    {/* Pastel Icon Badge */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105 shadow-2xs ${cat.badgeColor}`}>
                      <cat.icon className="w-6 h-6" />
                    </div>

                    {/* Module Title */}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#8b182b] transition-colors leading-snug">
                      {cat.name}
                    </h3>

                    {/* Module Description */}
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {cat.description}
                    </p>
                  </div>

                  {/* Card Bottom Indicator */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">{cat.items.length} {cat.items.length === 1 ? 'section' : 'sections'}</span>
                    <span className="text-xs font-bold text-[#8b182b] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </main>
        </div>
      ) : (
        /* ========================================================= */
        /* 2. INDIVIDUAL MODULE WORKSPACE LAYOUT                     */
        /* ========================================================= */
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8f9fa]">
          {/* Mobile Top Header */}
          <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white text-slate-800 border-b border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open menu"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${activeCategory?.badgeColor || 'bg-rose-50 text-[#8b182b]'}`}>
                  {activeCategory ? <activeCategory.icon className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                </div>
                <span className="font-bold text-sm text-slate-900 truncate">{activeCategory?.name || 'Workspace'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                to="/admin?view=desk"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-[#8b182b] text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Desk</span>
              </Link>
            </div>
          </header>

          {/* Mobile Backdrop */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Left Sidebar Navigation matching Screenshot 2 */}
          <aside 
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col shadow-xl lg:shadow-none transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shrink-0 ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Module Workspace Header matching website branding */}
            <div className="p-5 pb-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${activeCategory?.badgeColor || 'bg-rose-50 text-[#8b182b]'}`}>
                  {activeCategory ? <activeCategory.icon className="w-6 h-6" /> : <LayoutGrid className="w-6 h-6" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 leading-tight truncate">
                    {activeCategory?.name || 'Workspace'}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Workspace</p>
                </div>
              </div>

              {/* UTC Brand Badge with plane */}
              <div className="flex items-center gap-1 text-xs font-black text-[#8b182b] bg-rose-50 border border-rose-100 px-2 py-1 rounded-md shrink-0">
                <span>UTC</span>
                <Plane className="w-3 h-3 text-amber-500 fill-amber-500 -mt-1 -rotate-12" />
              </div>
            </div>

            {/* Back to Desk Link matching Screenshot 2 */}
            <div className="px-5 py-3 border-b border-slate-100">
              <Link
                to="/admin?view=desk"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="flex items-center gap-2.5 text-sm font-semibold text-slate-600 hover:text-[#8b182b] transition-colors py-1 group"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-[#8b182b] transition-colors" />
                <span>Back to Desk</span>
              </Link>
            </div>

            {/* Quick Attendance Widget in Sidebar */}
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
              <QuickAttendanceWidget variant="compact" className="w-full justify-between" />
            </div>

            {/* Current Workspace Navigation Items matching Screenshot 2 */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {activeCategory?.items.map((item) => {
                const isActive = isItemActive(item.path);

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`relative flex items-center px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      isActive
                        ? 'bg-[#fcecef] text-slate-900 font-bold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1.5 before:bg-[#8b182b] before:rounded-r-md'
                        : 'text-slate-600 hover:text-[#8b182b] hover:bg-rose-50/50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg mr-3 shrink-0 ${isActive ? 'bg-[#f8d0d6] text-[#8b182b]' : 'text-slate-400'}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}

              {/* Quick Switch to Other Workspaces Toggle */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAllModulesInSidebar(!showAllModulesInSidebar)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
                >
                  <span>All Workspaces</span>
                  {showAllModulesInSidebar ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {showAllModulesInSidebar && (
                  <div className="space-y-0.5 mt-1">
                    {filteredCategories.filter(c => c.id !== activeCategory?.id).map((otherCat) => (
                      <Link
                        key={otherCat.id}
                        to={otherCat.items[0]?.path}
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-[#8b182b] hover:bg-rose-50/50 transition-colors"
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${otherCat.badgeColor}`}>
                          <otherCat.icon className="w-3 h-3" />
                        </div>
                        <span className="truncate">{otherCat.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
              {user && (
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                  <div className="truncate pr-2">
                    <p className="font-bold text-slate-800 truncate">{user.email}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">{user.roleName || 'Staff'}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-[#8b182b] hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
              <Link 
                to="/" 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="flex items-center text-xs font-semibold text-slate-500 hover:text-[#8b182b] transition-colors py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                Back to Website
              </Link>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden bg-[#f8f9fa] flex flex-col">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  );
}
