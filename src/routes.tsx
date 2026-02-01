import type { ReactNode } from 'react';
import About from './pages/About';
import AdminClients from './pages/admin/AdminClients';
import AdminClientProfile from './pages/admin/ClientProfile';
// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEmailMarketing from './pages/admin/AdminEmailMarketing';
import AdminEmailSettings from './pages/admin/AdminEmailSettings';
import AdminFinancial from './pages/admin/AdminFinancial';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPopup from './pages/admin/AdminPopup';
import AdminSettings from './pages/admin/AdminSettings';
import AdminSiteSettings from './pages/admin/AdminSiteSettings';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AIKnowledgeAdmin from './pages/admin/AIKnowledgeAdmin';
import WarrantySearch from './pages/admin/WarrantySearch';
import WarrantyList from './pages/admin/WarrantyList';
import BudgetApproval from './pages/BudgetApproval';
import ChangePassword from './pages/ChangePassword';
import CompleteProfile from './pages/CompleteProfile';
import Contact from './pages/Contact';
// Client pages
import ClientDashboard from './pages/client/ClientDashboard';
import ClientOrderDetail from './pages/client/ClientOrderDetail';
import ClientProfile from './pages/client/ClientProfile';
import ForgotPassword from './pages/ForgotPassword';
// Public pages
import Home from './pages/Home';
import InitializeAdmin from './pages/InitializeAdmin';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Services from './pages/Services';
import TrackOrder from './pages/TrackOrder';
import AuthCallback from './pages/AuthCallback';
import Privacy from './pages/Privacy';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  // Public routes
  {
    name: 'Home',
    path: '/',
    element: <Home />,
  },
  {
    name: 'Services',
    path: '/services',
    element: <Services />,
  },
  {
    name: 'About',
    path: '/about',
    element: <About />,
  },
  {
    name: 'Contact',
    path: '/contact',
    element: <Contact />,
  },
  {
    name: 'Privacy',
    path: '/privacy',
    element: <Privacy />,
  },
  {
    name: 'Track Order',
    path: '/rastrear-os',
    element: <TrackOrder />,
  },
  {
    name: 'Login',
    path: '/login',
    element: <Login />,
  },
  {
    name: 'Register',
    path: '/register',
    element: <Register />,
  },
  {
    name: 'Initialize Admin',
    path: '/init-admin',
    element: <InitializeAdmin />,
  },
  {
    name: 'Budget Approval',
    path: '/approve/:token',
    element: <BudgetApproval />,
  },
  {
    name: 'Change Password',
    path: '/change-password',
    element: <ChangePassword />,
  },
  {
    name: 'Forgot Password',
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    name: 'Reset Password',
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    name: 'AuthCallback',
    path: '/auth/callback',
    element: <AuthCallback />,
    visible: false,
  },
  {
    name: 'Complete Profile',
    path: '/complete-profile',
    element: <CompleteProfile />,
    visible: false,
  },
  
  // Client routes
  {
    name: 'Client Dashboard',
    path: '/client',
    element: <ClientDashboard />,
  },
  {
    name: 'Client Order Detail',
    path: '/client/orders/:id',
    element: <ClientOrderDetail />,
  },
  {
    name: 'Client Profile',
    path: '/client/profile',
    element: <ClientProfile />,
  },
  
  // Admin routes
  {
    name: 'Admin Dashboard',
    path: '/admin',
    element: <AdminDashboard />,
  },
  {
    name: 'Admin Orders',
    path: '/admin/orders',
    element: <AdminOrders />,
  },
  {
    name: 'Admin Order Detail',
    path: '/admin/orders/:id',
    element: <AdminOrderDetail />,
  },
  {
    name: 'Admin Clients',
    path: '/admin/clients',
    element: <AdminClients />,
  },
  {
    name: 'Client Profile',
    path: '/admin/clients/:id',
    element: <AdminClientProfile />,
  },
  {
    name: 'Admin User Management',
    path: '/admin/users',
    element: <AdminUserManagement />,
  },
  {
    name: 'Admin Site Settings',
    path: '/admin/settings',
    element: <AdminSiteSettings />,
  },
  {
    name: 'Admin WhatsApp Settings',
    path: '/admin/whatsapp-settings',
    element: <AdminSettings />,
  },
  {
    name: 'Admin Analytics',
    path: '/admin/analytics',
    element: <AdminAnalytics />,
  },
  {
    name: 'AI Knowledge Engine',
    path: '/admin/ai-knowledge',
    element: <AIKnowledgeAdmin />,
  },
  {
    name: 'Admin Popup',
    path: '/admin/popup',
    element: <AdminPopup />,
  },
  {
    name: 'Admin Email Marketing',
    path: '/admin/email-marketing',
    element: <AdminEmailMarketing />,
  },
  {
    name: 'Admin Email Settings',
    path: '/admin/email-settings',
    element: <AdminEmailSettings />,
  },
  {
    name: 'Admin Financial',
    path: '/admin/financial',
    element: <AdminFinancial />,
  },
  {
    name: 'Warranty Search',
    path: '/admin/warranty-search',
    element: <WarrantySearch />,
  },
  {
    name: 'Warranty List',
    path: '/admin/warranty-list',
    element: <WarrantyList />,
  },
];

export default routes;
