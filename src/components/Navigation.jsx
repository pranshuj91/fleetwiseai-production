import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useImpersonation } from '../hooks/useImpersonation';
import { Button } from '../components/ui/button';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';
import QuickStartModal from './QuickStartModal';
import ImpersonationBanner from './ImpersonationBanner';
import { 
  Truck, FileText, Package, DollarSign, Wrench, ChevronDown,
  LayoutDashboard, Plus, Upload, Calendar, Users, BarChart3, Zap, 
  Settings as SettingsIcon, TrendingUp, Activity, Clock, CheckCircle,
  Shield, BookOpen, Menu, X, Building2, Database, Bot
} from 'lucide-react';

const Navigation = () => {
  const { user, profile, logout } = useAuth();
  const { hasPermission, isAdmin, isTechnician, isOfficeManager, isShopSupervisor, getRole, isMasterAdmin, isActualMasterAdmin, isImpersonating } = usePermissions();
  const { impersonatedUser, getEffectiveProfile } = useImpersonation();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [quickStartMode, setQuickStartMode] = useState('diagnostic');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get effective profile for display - uses impersonated user when impersonating
  const effectiveProfile = getEffectiveProfile();
  
  // Consistent user display: full_name > username > email > 'User'
  const displayName = effectiveProfile?.full_name || effectiveProfile?.username || effectiveProfile?.email?.split('@')[0] || profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'User';
  
  // Use the effective role (respects impersonation)
  const role = getRole() || 'company_admin';

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  const NavDropdown = ({ label, icon: Icon, items }) => {
    const isOpen = openDropdown === label;
    
    return (
      <div className="relative">
        <Button 
          variant="ghost" 
          className="text-white hover:bg-[#1E7083] flex items-center gap-1"
          onClick={() => toggleDropdown(label)}
        >
          <Icon className="h-4 w-4" />
          {label}
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
        
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={closeDropdown}
            />
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg py-2 min-w-[200px] z-20">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    navigate(item.path);
                    closeDropdown();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Impersonation Banner - Shows when Super Admin is impersonating a user */}
      <ImpersonationBanner />
      
      <nav className="bg-[#124481] text-white shadow-lg" data-testid="navigation">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6 flex-shrink-0">
            {/* Logo */}
            <div 
              className="flex items-center space-x-2 cursor-pointer" 
              onClick={() => navigate('/')}
              data-testid="logo-container"
            >
              <img 
                src="https://customer-assets.emergentagent.com/job_535fa594-ede0-4625-8569-0b32ef57eae8/artifacts/f51bwilu_Fleetwise%20Logo%20H%402x%20%281%29.png" 
                alt="Fleetwise AI" 
                className="h-8 w-auto"
              />
            </div>

            {/* Hamburger Menu for iPad/Mobile */}
            <Button
              variant="ghost"
              className="md:hidden text-white hover:bg-[#1E7083]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>

            {/* Navigation Links - ROLE-BASED FILTERING */}
            <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-1 absolute md:relative top-16 md:top-0 left-0 right-0 bg-[#124481] md:bg-transparent p-4 md:p-0 z-50 shadow-lg md:shadow-none`}>
              {/* Dashboard - Always first */}
              <Button 
                variant="ghost" 
                className="text-white hover:bg-[#1E7083] font-medium"
                onClick={() => navigate('/')}
                title="Dashboard"
              >
                <LayoutDashboard className="h-4 w-4 mr-1" />
                Dashboard
              </Button>

              <div className="h-6 w-px bg-white/30 mx-1" />

              {/* TECHNICIAN - Hands-on work */}
              {isTechnician() && (
                <>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#1E7083] font-medium"
                    onClick={() => {
                      setQuickStartMode('diagnostic');
                      setShowQuickStart(true);
                    }}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Diagnostics
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#1E7083] font-medium"
                    onClick={() => navigate('/work-orders/completions')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    My Work
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#1E7083] font-medium"
                    onClick={() => navigate('/trucks')}
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Trucks
                  </Button>

                  <NavDropdown
                    label="More"
                    icon={Plus}
                    items={[
                      { label: 'Diagnostic Sessions', path: '/diagnostic-sessions', icon: Bot },
                      { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
                      { label: 'Submit Knowledge', path: '/knowledge/submit', icon: Plus },
                      { label: 'Safety Reports', path: '/safety', icon: Shield },
                      { label: 'Non-Billable Time', path: '/time-tracking/non-billable', icon: Clock },
                    ]}
                  />
                </>
              )}

              {/* SHOP SUPERVISOR - Shop floor management */}
              {isShopSupervisor() && (
                <>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#1E7083] font-medium"
                    onClick={() => navigate('/supervisor/dashboard')}
                  >
                    <Activity className="h-4 w-4 mr-1" />
                    Shop Floor
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#1E7083] font-medium"
                    onClick={() => navigate('/projects')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Work Orders
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#1E7083] font-medium"
                    onClick={() => navigate('/parts/queue')}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Parts Queue
                  </Button>

                  <NavDropdown
                    label="Operations"
                    icon={Wrench}
                    items={[
                      { label: 'Safety Management', path: '/safety', icon: Shield },
                      { label: 'Shop Operations', path: '/shop-operations', icon: Wrench },
                      { label: 'Shift Handoff', path: '/shift-handoff', icon: Clock },
                       { label: isMasterAdmin() ? 'User Management' : 'Team Management', path: '/team', icon: Users },
                      { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
                    ]}
                  />
                </>
              )}

              {/* OFFICE MANAGER - Front office & customer-facing */}
              {isOfficeManager() && (
                <>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#1E7083] font-medium"
                    onClick={() => navigate('/office/pipeline')}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Pipeline
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#1E7083] font-medium"
                    onClick={() => navigate('/customers')}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Customers
                  </Button>

                  <NavDropdown
                    label="Estimates & Invoices"
                    icon={DollarSign}
                    items={[
                      { label: 'Walk-In Estimates', path: '/walk-in-estimate', icon: Plus },
                      { label: 'All Estimates', path: '/estimates', icon: FileText },
                      { label: 'Invoices', path: '/invoices', icon: DollarSign },
                    ]}
                  />

                  <NavDropdown
                    label="Operations"
                    icon={Wrench}
                    items={[
                      { label: 'ETA Board', path: '/office/eta-board', icon: Clock },
                      { label: 'Vehicle Ready Queue', path: '/vehicle-ready/queue', icon: CheckCircle },
                      { label: 'Parts Queue', path: '/parts/queue', icon: Package },
                      { label: 'Work Orders', path: '/projects', icon: FileText },
                      { label: 'Fleet', path: '/trucks', icon: Truck },
                      { label: 'Parts Catalog', path: '/parts', icon: Package },
                      { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
                      { label: 'Submit Knowledge', path: '/knowledge/submit', icon: Plus },
                      { label: 'Knowledge Curator', path: '/knowledge/curator', icon: BookOpen },
                    ]}
                  />
                </>
              )}

              {/* SUPER ADMIN - System-level access only */}
              {role === 'master_admin' && (
                <>
                  <NavDropdown
                    label="System"
                    icon={SettingsIcon}
                    items={[
                      { label: 'User Management', path: '/team', icon: Users },
                      { label: 'Companies', path: '/companies', icon: Building2 },
                      { label: 'RAG Feeder', path: '/rag-feeder', icon: Database },
                      { label: 'Knowledge Curator', path: '/knowledge/curator', icon: BookOpen },
                    ]}
                  />
                </>
              )}

              {/* COMPANY ADMIN - Full company access */}
              {isAdmin() && role !== 'master_admin' && (
                <>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#1E7083] font-medium"
                    onClick={() => navigate('/projects')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Work Orders
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#1E7083] font-medium"
                    onClick={() => navigate('/trucks')}
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Fleet
                  </Button>

                  <NavDropdown
                    label="More"
                    icon={Plus}
                    items={[
                      { label: 'Diagnostic Sessions', path: '/diagnostic-sessions', icon: Bot },
                      { label: 'Warranty Recovery', path: '/warranty', icon: DollarSign },
                      { label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
                      { label: 'Office Pipeline', path: '/office/pipeline', icon: TrendingUp },
                      { label: 'Completed Work Orders', path: '/work-orders/completions', icon: CheckCircle },
                      { label: 'Knowledge Curator', path: '/knowledge/curator', icon: BookOpen },
                      { label: 'Customers', path: '/customers', icon: Users },
                      { label: 'Invoices', path: '/invoices', icon: DollarSign },
                      { label: 'Estimates', path: '/estimates', icon: FileText },
                      { label: 'Parts Catalog', path: '/parts', icon: Package },
                      { label: 'Team Management', path: '/team', icon: Users },
                      { label: 'Calendar', path: '/calendar', icon: Calendar },
                    ]}
                  />
                </>
              )}

              {/* Divider and Scan button - only for non-Super Admin */}
              {role !== 'master_admin' && (
                <>
                  <div className="h-6 w-px bg-white/30 mx-1" />
                  
                  {/* Quick Diagnostic Scan - Show for roles with diagnostic access */}
                  {hasPermission('diagnostics', 'generate') && (
                    <Button 
                      variant="ghost" 
                      className="text-white hover:bg-[#1E7083] bg-[#289790]"
                      onClick={() => {
                        setQuickStartMode('diagnostic');
                        setShowQuickStart(true);
                      }}
                      title="Scan Work Order & Diagnose"
                      data-scan-trigger="true"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Scan
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Global Search */}
          <div className="hidden lg:block flex-1 max-w-xl">
            <GlobalSearch />
          </div>

          {/* User Section */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <NotificationCenter />
            
            
            {/* User Info with Role Badge */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium text-white leading-tight">{displayName}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  role === 'master_admin' ? 'bg-amber-500 text-white' :
                  role === 'company_admin' ? 'bg-purple-500 text-white' :
                  role === 'office_manager' ? 'bg-blue-500 text-white' :
                  role === 'shop_supervisor' ? 'bg-teal-500 text-white' :
                  'bg-green-500 text-white'
                }`}>
                  {role === 'master_admin' ? 'Super Admin' :
                   role === 'company_admin' ? 'Company Admin' :
                   role === 'office_manager' ? 'Office Manager' :
                   role === 'shop_supervisor' ? 'Shop Supervisor' :
                   'Technician'}
                </span>
              </div>
            </div>
            
            {/* User Menu - based on effective role, not actual role */}
            <NavDropdown
              label=""
              icon={Users}
              items={
                role === 'master_admin'
                  ? [
                      { label: 'Users', path: '/team', icon: Users },
                      { label: 'Companies', path: '/companies', icon: Building2 },
                      { label: 'Settings', path: '/settings', icon: SettingsIcon },
                    ]
                  : isAdmin()
                  ? [
                      { label: 'Team', path: '/team', icon: Users },
                      { label: 'Settings', path: '/settings', icon: SettingsIcon },
                      { label: 'Shift Handoff', path: '/shift-handoff', icon: Clock },
                      { label: 'Import PDF', path: '/work-orders/upload', icon: Upload },
                      { label: 'Enrich Import', path: '/trucks/enrich-import', icon: Upload },
                    ]
                  : [
                      // Non-admin roles get limited menu items
                      { label: 'Settings', path: '/settings', icon: SettingsIcon },
                      { label: 'Shift Handoff', path: '/shift-handoff', icon: Clock },
                    ]
              }
            />
            
            <Button 
              variant="outline" 
              size="sm"
              className="bg-transparent border-white text-white hover:bg-[#1E7083] hover:border-white"
              onClick={logout}
              data-testid="logout-button"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
      
      {/* Quick Start Modal */}
      <QuickStartModal 
        isOpen={showQuickStart}
        onClose={() => setShowQuickStart(false)}
        mode={quickStartMode}
      />
    </nav>
    </>
  );
};

export default Navigation;
