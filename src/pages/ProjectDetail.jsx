import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import PartSelectorModal from '../components/PartSelectorModal';
import LaborEntryModal from '../components/LaborEntryModal';
import PartsRequestModal from '../components/PartsRequestModal';
import ROPacketModal from '../components/ROPacketModal';
import AssignRONumberModal from '../components/AssignRONumberModal';
import ScanPDFModal from '../components/ScanPDFModal';
import WorkOrderTasks from '../components/WorkOrderTasks';
import WarrantyManagement from '../components/WarrantyManagement';
import { projectAPI, truckAPI, warrantyAPI, partsAPI, laborAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  ArrowLeft, Truck as TruckIcon, FileText, 
  Lightbulb, CheckCircle2, Loader2, AlertCircle,
  Download, DollarSign, Package, Wrench, Plus, Trash2, CheckCircle, ScanLine, FileDown
} from 'lucide-react';
import { generateSummaryPDF } from '../lib/generateSummaryPDF';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { BACKEND_URL } from '../lib/config';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromWorkOrderCreation = location.state?.fromWorkOrderCreation || false;
  const [project, setProject] = useState(null);
  const [truck, setTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diagnosticActive, setDiagnosticActive] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticSteps, setDiagnosticSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [techNotes, setTechNotes] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [difficultyLevel, setDifficultyLevel] = useState(null);
  const [dataQuestions, setDataQuestions] = useState([]);
  // DISABLED: Voice features temporarily removed
  // const [autoSpeakText, setAutoSpeakText] = useState('');
  
  // Summary and Warranty states
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [warrantyAnalysis, setWarrantyAnalysis] = useState(null);

  // Parts and Labor states
  const [parts, setParts] = useState([]);
  const [labor, setLabor] = useState([]);
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [showLaborEntry, setShowLaborEntry] = useState(false);
  const [showPartsRequest, setShowPartsRequest] = useState(false);

  // Status change modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // RO Packet modal state
  const [showROPacketModal, setShowROPacketModal] = useState(false);

  // Assign RO Number modal state
  const [showAssignROModal, setShowAssignROModal] = useState(false);

  // Scan PDF modal state
  const [showScanPDFModal, setShowScanPDFModal] = useState(false);

  const STATUS_OPTIONS = [
    { value: 'extracted', label: 'Extracted', color: 'bg-yellow-500' },
    { value: 'reviewed', label: 'Reviewed', color: 'bg-blue-500' },
    { value: 'linked', label: 'Linked', color: 'bg-purple-500' },
    { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  ];

  const handleStatusChange = async () => {
    if (!selectedStatus || selectedStatus === project.status) {
      setShowStatusModal(false);
      return;
    }

    setStatusLoading(true);
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: selectedStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setProject(prev => ({ ...prev, status: selectedStatus }));
      toast.success(`Status updated to ${STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}`);
      setShowStatusModal(false);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await projectAPI.get(id);
        setProject(response.data);
        
        if (response.data.truck_id) {
          try {
            const truckRes = await truckAPI.get(response.data.truck_id);
            setTruck(truckRes.data);
          } catch (truckError) {
            console.warn('Truck not found:', response.data.truck_id);
            // Truck doesn't exist - continue without truck data
            setTruck(null);
          }
        }
        
        // Fetch parts and labor for this work order
        try {
          const [partsRes, laborRes] = await Promise.all([
            projectAPI.getParts(id),
            projectAPI.getLabor(id),
          ]);
          setParts(partsRes.data || []);
          setLabor(laborRes.data || []);
        } catch (plError) {
          console.warn('Error fetching parts/labor:', plError);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const startAIDiagnostic = async () => {
    setDiagnosticLoading(true);
    try {
      const response = await diagnosticsAPI.generate({
        project_id: id,
        current_step: currentStep,
        tech_notes: techNotes
      });

      // Ensure response.data exists and has the expected structure
      if (response && response.data) {
        setDiagnosticSteps(response.data.steps || []);
        setEstimatedTime(response.data.estimated_time_minutes || null);
        setDifficultyLevel(response.data.difficulty_level || null);
        setDataQuestions(response.data.data_capture_questions || []);
        setDiagnosticActive(true);
        setCurrentStep(0);

        // DISABLED: Auto-speak feature temporarily disabled due to TTS service unavailability
        // if (response.data.steps && response.data.steps.length > 0) {
        //   const firstStep = response.data.steps[0];
        //   if (firstStep && firstStep.title && firstStep.description) {
        //     setAutoSpeakText(`Step 1: ${firstStep.title}. ${firstStep.description}`);
        //   }
        // }
      } else {
        // Invalid response structure
        setDiagnosticSteps([]);
        setDiagnosticActive(false);
      }
    } catch (error) {
      console.error('Error generating diagnostic:', error);
      
      // Silently handle errors - diagnostic steps will be empty and UI will show appropriate message
      setDiagnosticSteps([]);
      setDiagnosticActive(false);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  // DISABLED: Voice features temporarily removed
  // const handleVoiceTranscript = (transcript) => {
  //   setTechNotes(prev => prev ? `${prev} ${transcript}` : transcript);
  // };

  const saveNotes = async () => {
    if (techNotes.trim()) {
      try {
        await diagnosticsAPI.saveNotes(id, currentStep + 1, techNotes);
      } catch (error) {
        console.error('Error saving notes:', error);
      }
    }
  };

  const nextStep = () => {
    saveNotes();
    if (currentStep < diagnosticSteps.length - 1) {
      const nextStepNum = currentStep + 1;
      setCurrentStep(nextStepNum);
      setTechNotes('');
      // DISABLED: Voice features temporarily removed
      // const step = diagnosticSteps[nextStepNum];
      // setAutoSpeakText(`Step ${nextStepNum + 1}: ${step.title}. ${step.description}`);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setTechNotes('');
    }
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    try {
      // IMPORTANT: Fetch ALL data fresh from database in real-time
      // Do NOT use cached/stale state data
      
      // 1. Fetch fresh work order data
      const { data: freshWorkOrder, error: woError } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (woError) {
        console.error('Error fetching work order:', woError);
        toast.error('Failed to fetch work order data');
        return;
      }
      
      if (!freshWorkOrder) {
        toast.error('Work order not found');
        return;
      }
      
      // 2. Fetch fresh truck data if truck_id exists
      let freshTruck = null;
      if (freshWorkOrder.truck_id) {
        const { data: truckData, error: truckError } = await supabase
          .from('trucks')
          .select('*')
          .eq('id', freshWorkOrder.truck_id)
          .maybeSingle();
        
        if (!truckError && truckData) {
          freshTruck = truckData;
        }
      }
      
      // 3. Fetch fresh tasks for this work order
      const { data: tasks, error: tasksError } = await supabase
        .from('work_order_tasks')
        .select('*')
        .eq('work_order_id', id)
        .order('created_at', { ascending: true });
      
      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      }
      
      // 4. Fetch fresh company details
      let companyName = null;
      if (freshWorkOrder.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', freshWorkOrder.company_id)
          .maybeSingle();
        
        companyName = companyData?.name || null;
      }
      
      // 5. Fetch fresh business profile for branding
      let businessProfile = null;
      if (freshWorkOrder.company_id) {
        const { data: profileData } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('company_id', freshWorkOrder.company_id)
          .maybeSingle();
        
        businessProfile = profileData;
        
        // Ensure display_name matches company name (sync if needed)
        if (businessProfile && companyName && businessProfile.display_name !== companyName) {
          await supabase
            .from('business_profiles')
            .update({ display_name: companyName, updated_at: new Date().toISOString() })
            .eq('company_id', freshWorkOrder.company_id);
          
          businessProfile.display_name = companyName;
        }
      }

      // Build vehicle info from fresh truck data
      const vehicleInfo = freshTruck ? {
        year: freshTruck.year,
        make: freshTruck.make,
        model: freshTruck.model,
        vin: freshTruck.vin,
        engine: freshTruck.engine?.model || freshTruck.engine?.manufacturer || null,
        odometer: freshTruck.odometer_miles,
        unit_id: freshTruck.unit_id || freshTruck.truck_number
      } : null;

      // Build complaint from fresh work order and tasks
      const complaintsFromTasks = (tasks || [])
        .filter(t => t.complaint)
        .map(t => t.complaint)
        .join('; ');
      const fullComplaint = [freshWorkOrder.complaint, complaintsFromTasks]
        .filter(Boolean)
        .join('; ') || 'No complaint recorded';

      // Call the generate-ro-diagnostic edge function with fresh data
      const { data, error } = await supabase.functions.invoke('generate-ro-diagnostic', {
        body: {
          workOrderId: id,
          companyId: freshWorkOrder.company_id,
          vehicleInfo,
          complaint: fullComplaint,
          faultCodes: freshWorkOrder.fault_codes || [],
          tasks: (tasks || []).map(t => ({
            title: t.title,
            description: t.description,
            status: t.status,
            complaint: t.complaint,
            cause: t.cause,
            correction: t.correction
          }))
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to generate AI summary');
        return;
      }

      // Store the structured response with fresh data
      setSummary({
        ...data,
        tasks: tasks || [],
        vehicleInfo,
        workOrderNumber: freshWorkOrder.work_order_number,
        customerName: freshWorkOrder.customer_name,
        status: freshWorkOrder.status,
        complaint: fullComplaint,
        faultCodes: freshWorkOrder.fault_codes || [],
        // Store business profile for PDF generation
        businessProfile,
        companyId: freshWorkOrder.company_id
      });
      
      // Also update local project state with fresh data
      setProject(freshWorkOrder);
      if (freshTruck) {
        setTruck(freshTruck);
      }
      
      toast.success('AI Summary generated successfully');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const analyzeWarranty = async () => {
    setWarrantyLoading(true);
    try {
      const response = await warrantyAPI.analyze(id);
      setWarrantyAnalysis(response.data);
    } catch (error) {
      console.error('Error analyzing warranty:', error);
      // Silently handle error - warranty analysis will remain null
    } finally {
      setWarrantyLoading(false);
    }
  };

  const handleRemovePart = async (partId) => {
    if (!window.confirm('Remove this part from the work order?')) return;
    
    try {
      await projectAPI.deletePart(partId);
      // Remove from local state
      setParts(prev => prev.filter(p => p.id !== partId));
      toast.success('Part removed');
    } catch (error) {
      console.error('Error removing part:', error);
      toast.error('Failed to remove part');
    }
  };

  const handleRemoveLabor = async (laborId) => {
    if (!window.confirm('Remove this labor item from the work order?')) return;
    
    try {
      await projectAPI.deleteLabor(laborId);
      // Remove from local state
      setLabor(prev => prev.filter(l => l.id !== laborId));
      toast.success('Labor entry removed');
    } catch (error) {
      console.error('Error removing labor:', error);
      toast.error('Failed to remove labor item');
    }
  };

  const handlePartsSuccess = async () => {
    setShowPartSelector(false);
    // Refresh project data
    const response = await projectAPI.get(id);
    setProject(response.data);
  };

  const handleLaborSuccess = async () => {
    setShowLaborEntry(false);
    // Refresh project data
    const response = await projectAPI.get(id);
    setProject(response.data);
  };

  const handlePartsRequestSuccess = async () => {
    setShowPartsRequest(false);
    // Refresh project data to show any updates
    const response = await projectAPI.get(id);
    setProject(response.data);
  };

  const proposeVehicleReady = async () => {
    if (!window.confirm('Propose this vehicle as ready for customer pickup? Office will review and confirm.')) {
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/${id}/propose-ready`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to propose vehicle ready');

      alert('Vehicle ready proposal submitted! Office will review and confirm with customer.');
      
      // Refresh project
      const projectResponse = await projectAPI.get(id);
      setProject(projectResponse.data);
    } catch (error) {
      console.error('Error proposing vehicle ready:', error);
      alert('Failed to propose vehicle ready');
    }
  };

  const confirmVehicleReady = async () => {
    if (!window.confirm('Confirm this vehicle is ready and notify customer?')) {
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/${id}/confirm-ready`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to confirm vehicle ready');

      alert('Vehicle confirmed ready! Customer has been notified.');
      
      // Refresh project
      const projectResponse = await projectAPI.get(id);
      setProject(projectResponse.data);
    } catch (error) {
      console.error('Error confirming vehicle ready:', error);
      alert('Failed to confirm vehicle ready');
    }
  };

  const calculatePartsTotal = () => {
    if (!parts || parts.length === 0) return 0;
    return parts.reduce((sum, part) => sum + (parseFloat(part.extended_price) || (parseFloat(part.unit_price) || 0) * (part.quantity || 1)), 0);
  };

  const calculateLaborTotal = () => {
    if (!labor || labor.length === 0) return 0;
    return labor.reduce((sum, l) => sum + (parseFloat(l.total) || (parseFloat(l.hours) || 0) * (parseFloat(l.rate) || 0)), 0);
  };

  const calculateGrandTotal = () => {
    return calculatePartsTotal() + calculateLaborTotal();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'reviewed': return 'bg-blue-500';
      case 'extracted': return 'bg-yellow-500';
      case 'linked': return 'bg-purple-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#289790] border-t-transparent"></div>
          {fromWorkOrderCreation && (
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">Setting up your work order...</p>
              <p className="text-sm text-gray-600">Loading vehicle data and diagnostic tools</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
              <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeStep = diagnosticSteps && diagnosticSteps.length > 0 ? diagnosticSteps[currentStep] : null;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="project-detail-page">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl print:px-0 print:py-0 print:max-w-full">
        <div className="mb-6 print:hidden">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/projects')}
            className="mb-4"
            data-testid="back-button"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="project-title">
                Work Order: {project.work_order_number || project.id.slice(0, 8)}
              </h1>
              <p className="text-gray-600">
                {truck?.truck_number || project.truck?.truck_number ? `Truck #${truck?.truck_number || project.truck?.truck_number}` : 'No truck number'} - {project.customer_name || 'Unknown Customer'}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Badge className={getStatusColor(project.status)} data-testid="status-badge">
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          
          {/* Workflow Actions Section - Horizontal Bar */}
          <div className="mt-4 flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
            <div className="flex items-center text-gray-700 font-medium">
              <Wrench className="mr-2 h-5 w-5 text-[#1E7083]" />
              Workflow Actions:
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-[#1E7083] text-[#1E7083] hover:bg-[#1E7083]/10"
                onClick={() => {
                  setSelectedStatus(project.status || 'extracted');
                  setShowStatusModal(true);
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Change Status
              </Button>
              <Button
                className="bg-[#124481] text-white hover:bg-[#124481]/90"
                onClick={() => setShowROPacketModal(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate RO Packet
              </Button>
              <Button
                className="bg-[#289790] text-white hover:bg-[#289790]/90"
                onClick={() => setShowAssignROModal(true)}
              >
                <span className="mr-2 font-bold">#</span>
                Assign RO Number
              </Button>
              <Button
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                onClick={() => {
                  console.log('Create PO clicked');
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create PO
              </Button>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Button
              onClick={() => setShowScanPDFModal(true)}
              variant="outline"
              className="border-[#1E7083] text-[#1E7083] hover:bg-[#1E7083]/10"
            >
              <ScanLine className="mr-2 h-4 w-4" />
              Scan PDF
            </Button>
            
            <Button
              onClick={generateSummary}
              disabled={summaryLoading}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-100 disabled:text-gray-500 disabled:cursor-wait"
            >
              {summaryLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" />Summary</>
              )}
            </Button>
            
            <Button
              onClick={analyzeWarranty}
              disabled={warrantyLoading}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-100 disabled:text-gray-500 disabled:cursor-wait"
            >
              {warrantyLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</>
              ) : (
                <><DollarSign className="mr-2 h-4 w-4" />Warranty</>
              )}
            </Button>
            
            <Button
              onClick={() => navigate(`/projects/${id}/review`)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Review & Complete
            </Button>

            <Button
              onClick={() => navigate(`/invoices/create/${id}`)}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>

            <Button
              onClick={() => navigate(`/estimates/create/${id}`)}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Estimate
            </Button>

            {/* Vehicle Ready - Two Step Process */}
            {project?.status === 'in_progress' && (
              <Button
                onClick={proposeVehicleReady}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Propose Vehicle Ready
              </Button>
            )}

            {project?.status === 'ready_pending_confirmation' && (
              <Button
                onClick={confirmVehicleReady}
                className="bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Ready & Notify Customer
              </Button>
            )}
            
            {warrantyAnalysis?.has_warranty_opportunity && (
              <Button
                onClick={() => navigate(`/warranty/claims/create/${id}`)}
                variant="outline"
                className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
              >
                <FileText className="mr-2 h-4 w-4" />
                Create Warranty Claim
              </Button>
            )}
          </div>
        </div>

        {/* Two Column Layout: Main (Diagnostic) + Sidebar (Truck Info) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 print:hidden">
          {/* LEFT COLUMN - Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tasks Section with Pre-RO Panel included */}
            <WorkOrderTasks 
              workOrderId={id} 
              workOrderNumber={project?.work_order_number}
              companyId={project?.company_id}
              hasRONumber={!!project?.work_order_number}
              truck={truck}
              complaint={project?.complaint}
              cause={project?.cause}
              correction={project?.correction}
              onAISummary={generateSummary}
            />

          </div>

          {/* RIGHT SIDEBAR - Truck & Context Info - 1/3 width */}
          <div className="space-y-4 print:hidden">
            
            {/* Truck Info Card */}
            {truck ? (
              <Card className="border-[#1E7083]">
                <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white pb-4">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center">
                      <TruckIcon className="mr-2 h-5 w-5" />
                      Vehicle Info
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit / Truck #</label>
                    <p className="text-lg font-bold text-gray-900">
                      {truck.identity?.unit_id || truck.identity?.truck_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vehicle</label>
                    <p className="text-sm font-semibold text-gray-900">
                      {truck.identity?.year || 'N/A'} {truck.identity?.make || 'N/A'} {truck.identity?.model || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">VIN</label>
                    <p className="text-xs font-mono text-gray-700 break-all">{truck.identity?.vin || 'N/A'}</p>
                  </div>
                  {truck.identity?.odometer_mi && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Odometer</label>
                      <p className="text-sm font-semibold text-gray-900">{truck.identity.odometer_mi.toLocaleString()} mi</p>
                    </div>
                  )}
                  {truck.identity?.engine_hours && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Engine Hours</label>
                      <p className="text-sm font-semibold text-gray-900">{truck.identity.engine_hours.toLocaleString()} hrs</p>
                    </div>
                  )}
                  {(truck.engine?.manufacturer || truck.engine?.model) && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Engine</label>
                      <p className="text-sm font-semibold text-gray-900">
                        {truck.engine?.manufacturer || ''} {truck.engine?.model || ''}
                      </p>
                    </div>
                  )}
                  {truck.identity?.license_plate && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">License Plate</label>
                      <p className="text-sm font-semibold text-gray-900">{truck.identity.license_plate}</p>
                    </div>
                  )}
                  {truck.identity?.fleet_assignment && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fleet Assignment</label>
                      <p className="text-sm font-semibold text-gray-900">{truck.identity.fleet_assignment}</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/trucks/${truck.id}`)}
                    className="w-full mt-2"
                  >
                    Full Truck Details →
                  </Button>
                </CardContent>
              </Card>
            ) : project?.truck_id ? (
              <Card className="border-orange-400">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <AlertCircle className="mr-2 h-5 w-5 text-orange-600" />
                    Truck Info Unavailable
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert variant="warning" className="bg-orange-50 border-orange-200">
                    <AlertDescription className="text-sm text-orange-900">
                      The truck associated with this work order (ID: {project.truck_id.substring(0, 8)}...) 
                      no longer exists in the system.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <TruckIcon className="mr-2 h-5 w-5 text-gray-500" />
                    No Truck Linked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    This work order doesn't have a truck associated with it.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Customer & Complaint Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Work Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</label>
                  <p className="text-sm font-semibold text-gray-900">{project.customer_name || 'Unknown'}</p>
                </div>
                {project.complaint && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Complaint</label>
                    <p className="text-sm text-gray-700">{project.complaint}</p>
                  </div>
                )}
                {project.fault_codes && project.fault_codes.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Fault Codes</label>
                    <div className="flex flex-wrap gap-1">
                      {project.fault_codes.map((code, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-green-900">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => setShowPartsRequest(true)}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-green-600 text-green-700 hover:bg-green-600 hover:text-white"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Add Parts Used
                </Button>
                <Button
                  onClick={() => setShowLaborEntry(true)}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-blue-600 text-blue-700 hover:bg-blue-600 hover:text-white"
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  Log Labor Time
                </Button>
              </CardContent>
            </Card>

            {/* Parts & Labor Summary in Sidebar */}
            {(project?.parts_used?.length > 0 || project?.labor_items?.length > 0) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Cost Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {project.parts_used?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Parts ({project.parts_used.length})</span>
                      <span className="font-semibold text-gray-900">${calculatePartsTotal().toFixed(2)}</span>
                    </div>
                  )}
                  {project.labor_items?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Labor ({project.labor_items.length})</span>
                      <span className="font-semibold text-gray-900">${calculateLaborTotal().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-green-600 text-lg">${calculateGrandTotal().toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>

        {/* AI Summary Display */}
        {summary && (
          <Card className="mb-6 border-[#1E7083] shadow-lg print:shadow-none print:border print:border-gray-300" id="ai-summary-print">
            <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white pb-6 print:pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-2xl print:text-xl">
                  <FileText className="mr-3 h-6 w-6 print:h-5 print:w-5" />
                  AI-Generated Work Order Summary
                </CardTitle>
                <div className="flex items-center gap-3 print:hidden">
                  <Button
                    onClick={async () => {
                      try {
                        // IMPORTANT: Fetch ALL data fresh from database for PDF generation
                        // Do NOT rely on cached/stale state data
                        
                        // 1. Fetch fresh work order data
                        const { data: freshWorkOrder, error: woError } = await supabase
                          .from('work_orders')
                          .select('*')
                          .eq('id', id)
                          .maybeSingle();
                        
                        if (woError || !freshWorkOrder) {
                          toast.error('Failed to fetch work order data');
                          return;
                        }
                        
                        // 2. Fetch fresh company name (source of truth)
                        let companyName = null;
                        if (freshWorkOrder.company_id) {
                          const { data: companyData } = await supabase
                            .from('companies')
                            .select('name')
                            .eq('id', freshWorkOrder.company_id)
                            .maybeSingle();
                          
                          companyName = companyData?.name || null;
                        }
                        
                        // 3. Fetch fresh business profile for PDF branding
                        let businessProfile = null;
                        if (freshWorkOrder.company_id) {
                          const { data: profileData } = await supabase
                            .from('business_profiles')
                            .select('*')
                            .eq('company_id', freshWorkOrder.company_id)
                            .maybeSingle();
                          
                          businessProfile = profileData;
                          
                          // Ensure display_name matches company name (sync if needed)
                          if (businessProfile && companyName && businessProfile.display_name !== companyName) {
                            await supabase
                              .from('business_profiles')
                              .update({ display_name: companyName, updated_at: new Date().toISOString() })
                              .eq('company_id', freshWorkOrder.company_id);
                            
                            // Update local copy for immediate use
                            businessProfile.display_name = companyName;
                          }
                        }
                        
                        // 4. Fetch fresh parts for this work order
                        const { data: freshParts } = await supabase
                          .from('work_order_parts')
                          .select('*')
                          .eq('work_order_id', id);
                        
                        // 5. Fetch fresh labor entries for this work order
                        const { data: freshLabor } = await supabase
                          .from('work_order_labor')
                          .select('*')
                          .eq('work_order_id', id);
                        
                        // 6. Fetch signatures (technician and supervisor)
                        let technicianSignature = null;
                        let supervisorSignature = null;
                        if (freshWorkOrder.company_id) {
                          // Get technician signature (if assigned)
                          const { data: signatures } = await supabase
                            .from('user_signatures')
                            .select('*')
                            .eq('company_id', freshWorkOrder.company_id);
                          
                          if (signatures) {
                            technicianSignature = signatures.find(s => s.role === 'technician');
                            supervisorSignature = signatures.find(s => s.role === 'supervisor' || s.role === 'admin');
                          }
                        }
                        
                        // Generate PDF with fresh real-time data including parts, labor, signatures
                        const fileName = await generateSummaryPDF(
                          summary, 
                          freshWorkOrder, 
                          businessProfile,
                          {
                            parts: freshParts || [],
                            labor: freshLabor || [],
                            technicianSignature,
                            supervisorSignature
                          }
                        );
                        toast.success(`PDF downloaded: ${fileName}`);
                      } catch (error) {
                        console.error('PDF generation error:', error);
                        toast.error('Failed to generate PDF');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white hover:bg-white hover:text-[#124481]"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-90 print:text-xs">Generated by</div>
                  <div className="text-lg font-bold print:text-base">Fleetwise AI</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 pb-8 print:pt-4 print:pb-4">
              <div className="space-y-6 print:space-y-4">
                {/* Header Section */}
                <div className="border-b-2 border-[#289790] pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-bold text-[#124481] mb-1">
                        {summary.workOrderNumber ? `WO #${summary.workOrderNumber}` : 'Work Order Summary'}
                      </h2>
                      <p className="text-gray-600">
                        {summary.customerName || 'Customer'} • {new Date(summary.generated_at || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-[#289790] text-white px-4 py-2 text-sm">
                        {(summary.status || 'DRAFT').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                {summary.vehicleInfo && (
                  <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-[#1E7083]">
                    <h3 className="text-lg font-semibold text-[#124481] mb-3 flex items-center">
                      <TruckIcon className="w-5 h-5 mr-2" />
                      Vehicle Information
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 font-medium">Year/Make/Model:</span>
                        <p className="font-semibold text-gray-900">
                          {summary.vehicleInfo.year || 'N/A'} {summary.vehicleInfo.make || ''} {summary.vehicleInfo.model || ''}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">VIN:</span>
                        <p className="font-mono text-xs text-gray-900">{summary.vehicleInfo.vin || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Unit #:</span>
                        <p className="font-semibold text-gray-900">{summary.vehicleInfo.unit_id || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Mileage:</span>
                        <p className="font-semibold text-gray-900">
                          {summary.vehicleInfo.odometer ? `${summary.vehicleInfo.odometer.toLocaleString()} mi` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Issues / Complaint Section */}
                {summary.complaint && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#124481] mb-2 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-2 text-sm font-bold">!</span>
                      Issues (Complaint)
                    </h3>
                    <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                      <p className="text-gray-800 whitespace-pre-wrap">{summary.complaint}</p>
                    </div>
                  </div>
                )}

                {/* Fault Codes */}
                {summary.faultCodes && summary.faultCodes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#124481] mb-2">Fault Codes Detected</h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.faultCodes.map((code, idx) => (
                        <Badge key={idx} variant="outline" className="border-red-500 text-red-700 px-3 py-1 font-mono text-sm">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Diagnostic Summary */}
                {summary.diagnostic_summary && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#124481] mb-2 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-sm">📋</span>
                      Diagnosis Summary
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <p className="text-gray-800 leading-relaxed">{summary.diagnostic_summary}</p>
                    </div>
                  </div>
                )}

                {/* Probable Root Cause */}
                {summary.probable_root_cause && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#124481] mb-2 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-2 text-sm">🔍</span>
                      Probable Root Cause
                    </h3>
                    <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                      <p className="text-gray-800 leading-relaxed">{summary.probable_root_cause}</p>
                    </div>
                  </div>
                )}

                {/* Recommended Repair Steps */}
                {summary.recommended_repair_steps && summary.recommended_repair_steps.length > 0 && (
                  <div className="print-section">
                    <h3 className="text-lg font-semibold text-[#124481] mb-2 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-2 text-sm print:bg-green-200">🔧</span>
                      Recommended Repair Steps
                    </h3>
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500 print:bg-green-50 print:border-green-600">
                      <div className="space-y-2">
                        {summary.recommended_repair_steps.map((step, idx) => {
                          // Strip leading numbers like "1. " or "1) " from AI response to avoid duplicate numbering
                          const cleanStep = step.replace(/^\d+[\.\)]\s*/, '');
                          return (
                            <div key={idx} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center print:bg-green-700">
                                {idx + 1}
                              </span>
                              <p className="text-gray-800 leading-relaxed pt-0.5">{cleanStep}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tasks Summary */}
                {summary.tasks && summary.tasks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#124481] mb-2 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 text-sm">📝</span>
                      Work Order Tasks ({summary.tasks.length})
                    </h3>
                    <div className="space-y-3">
                      {summary.tasks.map((task, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{idx + 1}. {task.title}</p>
                              {task.description && (
                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              )}
                              {(task.complaint || task.cause || task.correction) && (
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  {task.complaint && (
                                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                      Complaint: {task.complaint.substring(0, 50)}...
                                    </span>
                                  )}
                                  {task.cause && (
                                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                      Cause: {task.cause.substring(0, 50)}...
                                    </span>
                                  )}
                                  {task.correction && (
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                      Correction: {task.correction.substring(0, 50)}...
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className={`ml-2 ${
                              task.status === 'completed' ? 'border-green-500 text-green-700' :
                              task.status === 'in_progress' ? 'border-blue-500 text-blue-700' :
                              'border-gray-400 text-gray-600'
                            }`}>
                              {task.status || 'pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safety Notes */}
                {summary.safety_notes && summary.safety_notes !== 'Standard safety procedures apply.' && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#124481] mb-2 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mr-2 text-sm">⚠️</span>
                      Safety Notes
                    </h3>
                    <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                      <p className="text-gray-800">{summary.safety_notes}</p>
                    </div>
                  </div>
                )}

                {/* Citations / Knowledge Base Sources */}
                {summary.citations && summary.citations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#124481] mb-2 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-2 text-sm">📚</span>
                      Knowledge Base Sources ({summary.citations.length})
                    </h3>
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <ul className="space-y-2">
                        {summary.citations.map((citation, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <span className="font-mono text-indigo-600 mr-2">[{citation.source_index || idx + 1}]</span>
                            <span>
                              <strong>{citation.title}</strong>
                              {citation.relevance && <span className="text-gray-500 ml-2">— {citation.relevance}</span>}
                              {citation.similarity && (
                                <Badge variant="outline" className="ml-2 text-xs border-indigo-400 text-indigo-600">
                                  {Math.round(citation.similarity * 100)}% match
                                </Badge>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Footer Branding */}
                <div className="mt-8 pt-6 border-t-2 border-gray-200">
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <div>
                      <p className="font-semibold text-[#124481]">Fleetwise AI</p>
                      <p>AI-Powered Fleet Maintenance Intelligence</p>
                      {summary.chat_history_used && (
                        <p className="text-xs text-green-600 mt-1">✓ Includes diagnostic chat history</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p>Generated: {new Date(summary.generated_at || Date.now()).toLocaleString()}</p>
                      <p className="text-xs">Work Order ID: {summary.work_order_id || project?.id}</p>
                      {summary.sources_searched > 0 && (
                        <p className="text-xs text-indigo-600">{summary.sources_searched} knowledge base docs searched</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warranty Analysis Display */}
        {warrantyAnalysis && (
          <Card className="mb-6 border-[#289790]">
            <CardHeader className={`bg-gradient-to-r ${warrantyAnalysis.has_warranty_opportunity ? 'from-green-600 to-green-500' : 'from-[#1E7083] to-[#289790]'} text-white`}>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Warranty Analysis Results
                </span>
                {warrantyAnalysis.has_warranty_opportunity && warrantyAnalysis.total_estimated_recovery && (
                  <Badge className="bg-white text-green-700 text-lg">
                    ${warrantyAnalysis.total_estimated_recovery.toFixed(2)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {warrantyAnalysis.has_warranty_opportunity ? (
                <div className="space-y-4">
                  {warrantyAnalysis.opportunities && warrantyAnalysis.opportunities.length > 0 ? (
                    warrantyAnalysis.opportunities.map((opp, idx) => (
                      <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-lg">{opp.claim_type}</h4>
                          <Badge variant={opp.confidence === 'High' ? 'default' : 'outline'}>
                            {opp.confidence} Confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{opp.reasoning}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                          <div>
                            <strong>Eligible Parts:</strong>
                            <ul className="list-disc ml-5">
                              {opp.eligible_parts?.map((part, i) => (
                                <li key={i}>{part}</li>
                              )) || <li>None specified</li>}
                            </ul>
                          </div>
                          <div>
                            <strong>Documentation Needed:</strong>
                            <ul className="list-disc ml-5">
                              {opp.documentation_needed?.map((doc, i) => (
                                <li key={i}>{doc}</li>
                              )) || <li>None specified</li>}
                            </ul>
                          </div>
                        </div>
                        {opp.estimated_recovery && (
                          <p className="text-green-700 font-semibold mt-2">
                            Estimated Recovery: ${opp.estimated_recovery.toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))
                  ) : null}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <DollarSign className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-semibold mb-2 text-gray-700">No Warranty Opportunities Found</p>
                  <p className="text-sm text-gray-600 mb-4">Based on the current work order details, no warranty coverage opportunities were identified.</p>
                </div>
              )}
              
              {warrantyAnalysis.next_steps && warrantyAnalysis.next_steps.length > 0 && (
                <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <span className="text-blue-700">📋 Next Steps:</span>
                  </h4>
                  <ol className="list-decimal ml-5 space-y-1 text-sm">
                    {warrantyAnalysis.next_steps?.map((step, i) => (
                      <li key={i}>{step}</li>
                    )) || <li>No next steps specified</li>}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        )}


        {/* Warranty Management Section */}
        <WarrantyManagement
          workOrderId={id}
          warrantyAnalysis={warrantyAnalysis}
          onWarrantyAnalyzed={setWarrantyAnalysis}
          warrantyLoading={warrantyLoading}
          setWarrantyLoading={setWarrantyLoading}
        />

        {/* Parts & Labor Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Parts Used */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Parts Used
                </span>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => setShowPartSelector(true)}
                    className="bg-white text-[#124481] hover:bg-gray-100"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Part
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setShowPartsRequest(true)}
                    variant="outline"
                    className="bg-white border-white text-[#124481] hover:bg-gray-100"
                  >
                    <Package className="mr-1 h-3 w-3" />
                    Request Parts
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {parts && parts.length > 0 ? (
                <div className="space-y-3">
                  {parts.map((part) => (
                    <div key={part.id} className="border border-gray-200 rounded-lg p-3 hover:border-[#289790] transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{part.description || 'Unnamed Part'}</h4>
                            {part.part_number && (
                              <Badge variant="outline" className="text-xs">
                                {part.part_number}
                              </Badge>
                            )}
                          </div>
                          {part.notes && (
                            <p className="text-sm text-gray-600 mb-2">{part.notes}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">Qty: {part.quantity || 1}</span>
                            {part.unit_price && (
                              <span className="text-gray-600">@ ${parseFloat(part.unit_price).toFixed(2)}</span>
                            )}
                            {(part.extended_price || part.unit_price) && (
                              <span className="font-semibold text-green-600">
                                Total: ${(parseFloat(part.extended_price) || (parseFloat(part.unit_price) * (part.quantity || 1))).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemovePart(part.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Parts Subtotal:</span>
                      <span className="text-lg font-bold text-green-600">
                        ${calculatePartsTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p className="mb-3">No parts added yet</p>
                  <Button 
                    size="sm"
                    onClick={() => setShowPartSelector(true)}
                    className="bg-[#289790] hover:bg-[#1E7083]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Part
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Labor Items */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-[#1E7083] to-[#289790] text-white">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Wrench className="mr-2 h-5 w-5" />
                  Labor
                </span>
                <Button 
                  size="sm"
                  onClick={() => setShowLaborEntry(true)}
                  className="bg-white text-[#1E7083] hover:bg-gray-100"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Labor
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {labor && labor.length > 0 ? (
                <div className="space-y-4">
                  {/* Group labor entries by technician name with accordion */}
                  {(() => {
                    // Group labor by technician
                    const groupedByTechnician = labor.reduce((acc, item) => {
                      const techName = item.technician_name || 'Unassigned';
                      if (!acc[techName]) {
                        acc[techName] = [];
                      }
                      acc[techName].push(item);
                      return acc;
                    }, {});

                    const technicianEntries = Object.entries(groupedByTechnician);

                    return (
                      <Accordion type="multiple" defaultValue={technicianEntries.map(([name]) => name)} className="space-y-2">
                        {technicianEntries.map(([techName, items]) => {
                          const techTotalHours = items.reduce((sum, i) => sum + (parseFloat(i.hours) || 0), 0);
                          const techTotal = items.reduce((sum, i) => sum + (parseFloat(i.total) || (parseFloat(i.hours) || 0) * (parseFloat(i.rate) || 0)), 0);
                          
                          return (
                            <AccordionItem 
                              key={techName} 
                              value={techName}
                              className="border border-gray-200 rounded-lg overflow-hidden data-[state=open]:border-[#289790]"
                            >
                              <AccordionTrigger className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 hover:no-underline [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-[#1E7083]/10 [&[data-state=open]]:to-[#289790]/10">
                                <div className="flex items-center justify-between w-full pr-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-[#1E7083] rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                                      {techName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                      <h4 className="font-semibold text-gray-900">{techName}</h4>
                                      <p className="text-xs text-gray-500">{items.length} task{items.length > 1 ? 's' : ''}</p>
                                    </div>
                                  </div>
                                  <div className="text-right mr-2">
                                    <p className="text-sm font-medium text-gray-700">{techTotalHours.toFixed(2)} hrs</p>
                                    <p className="text-sm font-bold text-green-600">${techTotal.toFixed(2)}</p>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              
                              <AccordionContent className="pb-0">
                                {/* Labor Items for this technician */}
                                <div className="divide-y divide-gray-100">
                                  {items.map((laborItem) => (
                                    <div key={laborItem.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <p className="text-sm text-gray-800 font-medium">
                                            {laborItem.description || laborItem.line_item_number || 'Labor Entry'}
                                          </p>
                                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{parseFloat(laborItem.hours || 0).toFixed(2)} hrs</span>
                                            {laborItem.rate && (
                                              <span>@ ${parseFloat(laborItem.rate).toFixed(2)}/hr</span>
                                            )}
                                            <span className="font-semibold text-green-600">
                                              ${(parseFloat(laborItem.total) || (parseFloat(laborItem.hours) * parseFloat(laborItem.rate)) || 0).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveLabor(laborItem.id);
                                          }}
                                          className="text-red-500 hover:bg-red-50 h-7 w-7 p-0"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    );
                  })()}
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Labor Subtotal:</span>
                      <span className="text-lg font-bold text-green-600">
                        ${calculateLaborTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p className="mb-3">No labor added yet</p>
                  <Button 
                    size="sm"
                    onClick={() => setShowLaborEntry(true)}
                    className="bg-[#289790] hover:bg-[#1E7083]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Labor
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Total Section */}
        {((project?.parts_used && project.parts_used.length > 0) || 
          (project?.labor_items && project.labor_items.length > 0)) && (
          <Card className="mb-6 border-[#289790]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">Work Order Total</h3>
                  <p className="text-sm text-gray-600">
                    {(project?.parts_used?.length || 0)} parts • {(project?.labor_items?.length || 0)} labor items
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[#289790]">
                    ${calculateGrandTotal().toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Before taxes & fees
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parts & Labor Details Section - MOVED TO BOTTOM */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {diagnosticActive && activeStep && (
              <Card className="border-[#289790]">
                <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Wrench className="mr-2 h-5 w-5" />
                      Step {currentStep + 1} of {diagnosticSteps.length}: {activeStep.title}
                    </CardTitle>
                    {estimatedTime && (
                      <Badge variant="secondary" className="bg-white text-[#124481]">
                        <Clock className="mr-1 h-3 w-3" />
                        {estimatedTime} min
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What This Step Does:</h4>
                    <p className="text-gray-700">{activeStep.description}</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Detailed Instructions:
                    </h4>
                    <ol className="space-y-2">
                      {activeStep.detailed_instructions && activeStep.detailed_instructions.length > 0 ? (
                        activeStep.detailed_instructions.map((instruction, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="font-semibold text-blue-700 mr-2">{idx + 1}.</span>
                            <span className="text-sm text-blue-900">{instruction}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-blue-900">No detailed instructions available</li>
                      )}
                    </ol>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Expected Results:
                    </h4>
                    <ul className="space-y-1">
                      {activeStep.expected_results && activeStep.expected_results.length > 0 ? (
                        activeStep.expected_results.map((result, idx) => (
                          <li key={idx} className="text-sm text-green-800">• {result}</li>
                        ))
                      ) : (
                        <li className="text-sm text-green-800">No expected results specified</li>
                      )}
                    </ul>
                  </div>

                  {activeStep.tools_required && activeStep.tools_required.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Tools Required:</h4>
                      <div className="flex gap-2 flex-wrap">
                        {activeStep.tools_required.map((tool, idx) => (
                          <Badge key={idx} variant="outline">{tool}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeStep.safety_notes && activeStep.safety_notes.length > 0 && (
                    <Alert variant="destructive">
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Safety:</strong>
                        <ul className="mt-1">
                          {activeStep.safety_notes.map((note, idx) => (
                            <li key={idx} className="text-sm">• {note}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {activeStep.reference_links && activeStep.reference_links.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <LinkIcon className="mr-2 h-4 w-4" />
                        References:
                      </h4>
                      <ul className="space-y-1">
                        {activeStep.reference_links.map((link, idx) => (
                          <li key={idx} className="text-sm text-blue-600">• {link}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-medium text-gray-900">Technician Notes:</label>
                      {/* DISABLED: VoiceInput temporarily removed due to TTS service unavailability */}
                    </div>
                    <Textarea
                      value={techNotes}
                      onChange={(e) => setTechNotes(e.target.value)}
                      placeholder="Document your findings, measurements, and observations..."
                      rows={4}
                      data-testid="tech-notes"
                    />
                  </div>

                  <div className="flex justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={previousStep}
                      disabled={currentStep === 0}
                    >
                      Previous Step
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="bg-[#124481] hover:bg-[#1E7083]"
                      disabled={currentStep === diagnosticSteps.length - 1}
                    >
                      {currentStep === diagnosticSteps.length - 1 ? 'Complete' : 'Next Step'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-[#124481]" />
                  Work Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Work Order #</label>
                    <p className="text-base">{project.work_order_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Complaint</label>
                  <p className="text-base mt-1">{project.complaint || 'No complaint recorded'}</p>
                </div>
                {project.fault_codes && project.fault_codes.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Fault Codes</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {project.fault_codes.map((code, idx) => (
                        <Badge key={idx} variant="outline" className="text-red-700 border-red-300">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      {/* Modals */}
      {showPartSelector && (
        <PartSelectorModal
          projectId={id}
          onClose={() => setShowPartSelector(false)}
          onSuccess={handlePartsSuccess}
        />
      )}

      {showLaborEntry && (
        <LaborEntryModal
          projectId={id}
          onClose={() => setShowLaborEntry(false)}
          onSuccess={handleLaborSuccess}
        />
      )}

      {showPartsRequest && (
        <PartsRequestModal
          isOpen={showPartsRequest}
          projectId={id}
          onClose={() => setShowPartsRequest(false)}
          onSubmit={handlePartsRequestSuccess}
        />
      )}

      {/* Change Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Work Order Status</DialogTitle>
            <DialogDescription>
              Select a new status for this work order. This will update the workflow state.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${option.color}`}></span>
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Current status: <Badge className={getStatusColor(project?.status)}>{project?.status?.replace('_', ' ') || 'Unknown'}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusChange} 
              disabled={statusLoading || selectedStatus === project?.status}
              className="bg-[#1E7083] hover:bg-[#1E7083]/90"
            >
              {statusLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RO Packet Modal */}
      <ROPacketModal
        isOpen={showROPacketModal}
        onClose={() => setShowROPacketModal(false)}
        workOrder={project}
        truck={truck}
      />

      {/* Assign RO Number Modal */}
      <AssignRONumberModal
        isOpen={showAssignROModal}
        onClose={() => setShowAssignROModal(false)}
        workOrder={project}
        onSuccess={(newRONumber) => {
          setProject(prev => ({ ...prev, work_order_number: newRONumber }));
        }}
      />

      {/* Scan PDF Modal */}
      <ScanPDFModal
        open={showScanPDFModal}
        onOpenChange={setShowScanPDFModal}
        workOrderId={id}
        onScanComplete={(data) => {
          // Refresh project data after scan
          projectAPI.get(id).then(res => setProject(res.data));
        }}
      />
    </div>
  );
};

export default ProjectDetail;
