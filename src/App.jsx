import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TruckList from './pages/TruckList';
import TruckDetail from './pages/TruckDetail';
import TruckCreate from './pages/TruckCreate';
import TruckBulkImport from './pages/TruckBulkImport';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import ProjectCreate from './pages/ProjectCreate';
import WorkOrderUpload from './pages/WorkOrderUpload';
import WarrantyDashboard from './pages/WarrantyDashboard';
import PartsCatalog from './pages/PartsCatalog';
import PartsQueue from './pages/PartsQueue';
import VehicleReadyQueue from './pages/VehicleReadyQueue';
import OfficePipeline from './pages/OfficePipelineKanban';
import ShopDashboard from './pages/ShopDashboard';
import WorkOrderMessages from './pages/WorkOrderMessages';
import ETABoard from './pages/ETABoard';
import WalkInEstimate from './pages/WalkInEstimate';
import InvoiceList from './pages/InvoiceList';
import InvoiceDetail from './pages/InvoiceDetail';
import InvoiceCreate from './pages/InvoiceCreate';
import PMDashboard from './pages/PMDashboard';
import PMTemplates from './pages/PMTemplates';
import EstimateList from './pages/EstimateList';
import EstimateCreate from './pages/EstimateCreate';
import EstimateCreateStandalone from './pages/EstimateCreateStandalone';
import EstimateDetail from './pages/EstimateDetail';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import CustomerCreate from './pages/CustomerCreate';
import Reports from './pages/Reports';
import DiagnosticTemplates from './pages/DiagnosticTemplates';
import WorkOrderBoard from './pages/WorkOrderBoard';
import Settings from './pages/Settings';
import ActivityFeed from './pages/ActivityFeed';
import TeamManagement from './pages/TeamManagement';
import CompaniesManagement from './pages/CompaniesManagement';
import FleetAnalytics from './pages/FleetAnalytics';
import WarrantyClaimCreate from './pages/WarrantyClaimCreate';
import WarrantyClaimsList from './pages/WarrantyClaimsList';
import EnrichImport from './pages/EnrichImport';
import RevenueReport from './pages/RevenueReport';
import WorkOrderStatusReport from './pages/WorkOrderStatusReport';
import FleetHealthReport from './pages/FleetHealthReport';
import CustomerValueReport from './pages/CustomerValueReport';
import TechnicianMobile from './pages/TechnicianMobile';
import NonBillableTime from './pages/NonBillableTime';
import SupervisorDashboard from './pages/SupervisorDashboard';
import ShiftHandoff from './pages/ShiftHandoff';

import SafetyManagement from './pages/SafetyManagement';
import ShopOperations from './pages/ShopOperations';
import InventoryManagement from './pages/InventoryManagement';
import Calendar from './pages/Calendar';
import KnowledgeBase from './pages/KnowledgeBase';
import KnowledgeSubmit from './pages/KnowledgeSubmit';
import KnowledgeCuratorQueue from './pages/KnowledgeCuratorQueue';
import EnrichImportEnhanced from './pages/EnrichImportEnhanced';
import WorkOrderReview from './pages/WorkOrderReview';
import WorkOrderCompletions from './pages/WorkOrderCompletions';
import WorkOrderCompletionDetail from './pages/WorkOrderCompletionDetail';
import RagFeeder from './pages/RagFeeder';
import SetupPassword from './pages/SetupPassword';
import ResetPassword from './pages/ResetPassword';
import StandaloneDiagnostic from './pages/StandaloneDiagnostic';
import DiagnosticSessions from './pages/DiagnosticSessions';
import RoleGuard from './components/RoleGuard';
import './App.css';

// Loading component for auth state
const AuthLoading = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Protected route - redirects to login if not authenticated
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <AuthLoading />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public route - redirects to dashboard if already authenticated
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <AuthLoading />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  // Show loading while checking auth state
  if (loading) {
    return <AuthLoading />;
  }

  return (
    <Routes>
      {/* Public routes - redirect to dashboard if authenticated */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/setup-password" element={
        <SetupPassword />
      } />
      <Route path="/reset-password" element={
        <ResetPassword />
      } />
      
      {/* Root route - redirect based on auth state */}
      <Route path="/" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
      } />
      
      {/* Dashboard route */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/trucks"
        element={
          <PrivateRoute>
            <TruckList />
          </PrivateRoute>
        }
      />
      <Route
        path="/trucks/new"
        element={
          <PrivateRoute>
            <TruckCreate />
          </PrivateRoute>
        }
      />
      <Route
        path="/trucks/bulk-import"
        element={
          <PrivateRoute>
            <TruckBulkImport />
          </PrivateRoute>
        }
      />
      <Route
        path="/trucks/:id"
        element={
          <PrivateRoute>
            <TruckDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <PrivateRoute>
            <ProjectList />
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/new"
        element={
          <PrivateRoute>
            <ProjectCreate />
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <PrivateRoute>
            <ProjectDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/:projectId/review"
        element={
          <PrivateRoute>
            <WorkOrderReview />
          </PrivateRoute>
        }
      />
      <Route
        path="/work-orders/completions"
        element={
          <PrivateRoute>
            <WorkOrderCompletions />
          </PrivateRoute>
        }
      />
      <Route
        path="/work-orders/completions/:completionId"
        element={
          <PrivateRoute>
            <WorkOrderCompletionDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/work-orders/upload"
        element={
          <PrivateRoute>
            <WorkOrderUpload />
          </PrivateRoute>
        }
      />
      <Route
        path="/warranty"
        element={
          <PrivateRoute>
            <WarrantyDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/parts"
        element={
          <PrivateRoute>
            <PartsCatalog />
          </PrivateRoute>
        }
      />
      <Route
        path="/parts/queue"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['office_manager', 'shop_supervisor', 'company_admin', 'master_admin']}>
              <PartsQueue />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/vehicle-ready/queue"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['office_manager', 'company_admin', 'master_admin']}>
              <VehicleReadyQueue />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/office/pipeline"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['office_manager', 'company_admin', 'master_admin']}>
              <OfficePipeline />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/shop/dashboard"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['shop_supervisor', 'company_admin', 'master_admin']}>
              <ShopDashboard />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/:projectId/messages"
        element={
          <PrivateRoute>
            <WorkOrderMessages />
          </PrivateRoute>
        }
      />
      <Route
        path="/office/eta-board"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['office_manager', 'company_admin', 'master_admin']}>
              <ETABoard />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/walk-in"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['office_manager', 'company_admin', 'master_admin']}>
              <WalkInEstimate />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <PrivateRoute>
            <RoleGuard requiredPermission={{ resource: 'invoices', action: 'read' }}>
              <InvoiceList />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/invoices/:id"
        element={
          <PrivateRoute>
            <InvoiceDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/invoices/create/:projectId"
        element={
          <PrivateRoute>
            <InvoiceCreate />
          </PrivateRoute>
        }
      />
      <Route
        path="/pm"
        element={
          <PrivateRoute>
            <PMDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/pm/templates"
        element={
          <PrivateRoute>
            <PMTemplates />
          </PrivateRoute>
        }
      />
      <Route
        path="/estimates"
        element={
          <PrivateRoute>
            <EstimateList />
          </PrivateRoute>
        }
      />
      <Route
        path="/estimates/create"
        element={
          <PrivateRoute>
            <EstimateCreateStandalone />
          </PrivateRoute>
        }
      />
      <Route
        path="/estimates/:id"
        element={
          <PrivateRoute>
            <EstimateDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/estimates/create/:projectId"
        element={
          <PrivateRoute>
            <EstimateCreate />
          </PrivateRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <PrivateRoute>
            <CustomerList />
          </PrivateRoute>
        }
      />
      <Route
        path="/customers/new"
        element={
          <PrivateRoute>
            <CustomerCreate />
          </PrivateRoute>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <PrivateRoute>
            <CustomerDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/customers/:id/edit"
        element={
          <PrivateRoute>
            <CustomerCreate />
          </PrivateRoute>
        }
      />
      <Route
        path="/templates"
        element={
          <PrivateRoute>
            <DiagnosticTemplates />
          </PrivateRoute>
        }
      />
      <Route
        path="/board"
        element={
          <PrivateRoute>
            <WorkOrderBoard />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <PrivateRoute>
            <ActivityFeed />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <PrivateRoute>
            <ActivityFeed />
          </PrivateRoute>
        }
      />
      <Route
        path="/team"
        element={
          <PrivateRoute>
            <TeamManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/companies"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['master_admin']}>
              <CompaniesManagement />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/rag-feeder"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['master_admin']}>
              <RagFeeder />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <PrivateRoute>
            <FleetAnalytics />
          </PrivateRoute>
        }
      />
      <Route
        path="/warranty"
        element={
          <PrivateRoute>
            <WarrantyClaimsList />
          </PrivateRoute>
        }
      />
      <Route
        path="/warranty/claims/create/:projectId"
        element={
          <PrivateRoute>
            <WarrantyClaimCreate />
          </PrivateRoute>
        }
      />
      <Route
        path="/trucks/enrich-import"
        element={
          <PrivateRoute>
            <EnrichImportEnhanced />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/revenue"
        element={
          <PrivateRoute>
            <RevenueReport />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/work-orders"
        element={
          <PrivateRoute>
            <WorkOrderStatusReport />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/fleet-health"
        element={
          <PrivateRoute>
            <FleetHealthReport />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/customer-value"
        element={
          <PrivateRoute>
            <CustomerValueReport />
          </PrivateRoute>
        }
      />
      <Route
        path="/technician/mobile"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['technician', 'shop_supervisor', 'company_admin', 'master_admin']}>
              <TechnicianMobile />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/technician/tasks"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['technician', 'shop_supervisor', 'company_admin', 'master_admin']}>
              <TechnicianMobile />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/time-tracking/non-billable"
        element={
          <PrivateRoute>
            <NonBillableTime />
          </PrivateRoute>
        }
      />
      <Route
        path="/supervisor/dashboard"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['shop_supervisor', 'company_admin', 'master_admin']}>
              <SupervisorDashboard />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/shift-handoff"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['technician', 'shop_supervisor', 'company_admin', 'master_admin']}>
              <ShiftHandoff />
            </RoleGuard>
          </PrivateRoute>
        }
      />
      <Route
        path="/safety"
        element={
          <PrivateRoute>
            <SafetyManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/shop-operations"
        element={
          <PrivateRoute>
            <ShopOperations />
          </PrivateRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <PrivateRoute>
            <InventoryManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <PrivateRoute>
            <Calendar />
          </PrivateRoute>
        }
      />
      <Route
        path="/knowledge-base"
        element={
          <PrivateRoute>
            <KnowledgeBase />
          </PrivateRoute>
        }
      />
      <Route
        path="/knowledge/submit"
        element={
          <PrivateRoute>
            <KnowledgeSubmit />
          </PrivateRoute>
        }
      />
      <Route
        path="/knowledge/curator"
        element={
          <PrivateRoute>
            <RoleGuard requiredPermission={{ resource: 'knowledge', action: 'curate' }}>
              <KnowledgeCuratorQueue />
            </RoleGuard>
          </PrivateRoute>
        }
      />

      <Route
        path="/standalone-diagnostic"
        element={
          <PrivateRoute>
            <StandaloneDiagnostic />
          </PrivateRoute>
        }
      />
      <Route
        path="/diagnostic-sessions"
        element={
          <PrivateRoute>
            <DiagnosticSessions />
          </PrivateRoute>
        }
      />

      {/* Catch-all route - redirect unknown routes */}
      <Route path="*" element={
        <PrivateRoute>
          <Navigate to="/dashboard" replace />
        </PrivateRoute>
      } />

    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <KeyboardShortcuts />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
