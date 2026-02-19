import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  Zap, Upload, Truck, FileText, Users, Camera, 
  Clock, Package, DollarSign, BarChart3, MessageSquare, StickyNote
} from 'lucide-react';
import QuickStartModal from './QuickStartModal';
import QuickNoteModal from './QuickNoteModal';

const QuickActionsPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [quickStartMode, setQuickStartMode] = useState('diagnostic');
  const [showQuickNote, setShowQuickNote] = useState(false);
  
  const role = user?.role || 'technician';
  
  // Shop Floor Actions (Technicians, Supervisors)
  const shopFloorActions = [
    {
      icon: Zap,
      label: 'Scan & Diagnose',
      color: 'bg-[#289790] hover:bg-[#1E7083]',
      onClick: () => {
        setQuickStartMode('scan');
        setShowQuickStart(true);
      },
      description: 'Scan work order & diagnose'
    },
    {
      icon: Upload,
      label: 'Scan Work Order',
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: () => {
        setQuickStartMode('scan');
        setShowQuickStart(true);
      },
      description: 'Upload PDF to create WO'
    },
    {
      icon: Clock,
      label: 'My Tasks',
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => navigate('/technician/tasks'),
      description: 'View assigned work'
    },
    {
      icon: Camera,
      label: 'Quick Photo',
      color: 'bg-purple-600 hover:bg-purple-700',
      onClick: () => {
        // TODO: Open camera modal
        alert('Photo capture coming soon!');
      },
      description: 'Capture parts/damage'
    },
  ];
  
  // Back Office Actions (Office Managers, Admins)
  const backOfficeActions = [
    {
      icon: Zap,
      label: 'Quick AI Diagnostic',
      color: 'bg-[#289790] hover:bg-[#1E7083]',
      onClick: () => {
        setQuickStartMode('quickai');
        setShowQuickStart(true);
      },
      description: 'AI-powered diagnosis'
    },
    {
      icon: Truck,
      label: 'Add Truck',
      color: 'bg-[#124481] hover:bg-[#0d3461]',
      onClick: () => navigate('/trucks/new'),
      description: 'Register new vehicle'
    },
    {
      icon: Users,
      label: 'Add Customer',
      color: 'bg-green-600 hover:bg-green-700',
      onClick: () => navigate('/customers/new'),
      description: 'Create customer profile'
    },
    {
      icon: DollarSign,
      label: 'Create Invoice',
      color: 'bg-emerald-600 hover:bg-emerald-700',
      onClick: () => navigate('/invoices/new'),
      description: 'Bill a work order'
    },
    {
      icon: FileText,
      label: 'Create Estimate',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      onClick: () => navigate('/estimates/new'),
      description: 'Quote a job'
    },
    {
      icon: Package,
      label: 'Manage Inventory',
      color: 'bg-amber-600 hover:bg-amber-700',
      onClick: () => navigate('/inventory'),
      description: 'Track parts & stock'
    },
    {
      icon: BarChart3,
      label: 'View Reports',
      color: 'bg-cyan-600 hover:bg-cyan-700',
      onClick: () => navigate('/reports'),
      description: 'Analytics & insights'
    },
    {
      icon: Upload,
      label: 'Bulk Import',
      color: 'bg-violet-600 hover:bg-violet-700',
      onClick: () => navigate('/trucks/enrich-import'),
      description: 'Import from Enrich'
    },
    {
      icon: StickyNote,
      label: 'Quick Note',
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => setShowQuickNote(true),
      description: 'Add note to truck'
    },
  ];
  
  // Select actions based on role
  const isShopFloor = ['technician', 'shop_supervisor'].includes(role);
  const actions = isShopFloor ? shopFloorActions : backOfficeActions;
  
  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#124481] to-[#289790] text-white">
          <CardTitle className="text-lg">
            ⚡ Quick Actions {isShopFloor ? '(Shop Floor)' : '(Back Office)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                className={`${action.color} text-white flex flex-col items-center justify-center h-24 p-2 group relative`}
              >
                <action.icon className="h-6 w-6 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-center leading-tight">
                  {action.label}
                </span>
                <span className="text-[10px] opacity-80 mt-0.5">
                  {action.description}
                </span>
              </Button>
            ))}
          </div>
          
          {!isShopFloor && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <strong>💡 Tip:</strong> Use keyboard shortcuts for faster access. Press <kbd className="px-2 py-1 bg-white rounded border">Ctrl+K</kbd> to open command palette.
            </div>
          )}
        </CardContent>
      </Card>
      
      <QuickStartModal 
        isOpen={showQuickStart}
        onClose={() => setShowQuickStart(false)}
        mode={quickStartMode}
      />
      
      {showQuickNote && (
        <QuickNoteModal
          isOpen={showQuickNote}
          onClose={() => setShowQuickNote(false)}
        />
      )}
    </>
  );
};

export default QuickActionsPanel;
