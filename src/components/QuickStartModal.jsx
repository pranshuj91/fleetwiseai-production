import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Upload, FileText, Zap, Loader2, X, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from 'sonner';
import PDFPreviewViewer from './PDFPreviewViewer';
import ExtractionReviewForm from './ExtractionReviewForm';
import { ScrollArea } from './ui/scroll-area';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

// Extract text from PDF file
async function extractPdfText(file, onProgress = null) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  const totalPages = pdf.numPages;
  
  for (let i = 1; i <= totalPages; i++) {
    if (onProgress) {
      onProgress(Math.round((i / totalPages) * 100));
    }
    
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map(item => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText.trim();
}

// Convert PDF pages to base64 images for OCR - process ALL pages
async function extractPdfPagesAsImages(file, onProgress = null, maxPages = 10) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const images = [];
  const pagesToProcess = Math.min(pdf.numPages, maxPages);
  
  // Use adaptive scaling based on page count to manage payload size
  const scale = pagesToProcess > 6 ? 1.2 : 1.5;
  const quality = pagesToProcess > 6 ? 0.75 : 0.85;
  
  console.log(`[extractPdfPagesAsImages] Processing ${pagesToProcess} of ${pdf.numPages} pages (scale: ${scale}, quality: ${quality})`);
  
  for (let i = 1; i <= pagesToProcess; i++) {
    if (onProgress) {
      onProgress(Math.round((i / pagesToProcess) * 100));
    }
    
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    // Convert to base64 JPEG with adaptive quality
    const base64 = canvas.toDataURL('image/jpeg', quality);
    images.push({
      pageNumber: i,
      base64: base64.split(',')[1], // Remove data URL prefix
    });
  }
  
  console.log(`[extractPdfPagesAsImages] Generated ${images.length} page images`);
  return images;
}

// Get user's company ID from profile
async function getUserCompanyId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  
  return profile?.company_id;
}

// Flow steps
const STEPS = {
  UPLOAD: 'upload',
  PREVIEW: 'preview',
  CONFIRM: 'confirm',
};

const QuickStartModal = ({ isOpen, onClose, mode = 'scan' }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // Quick AI form state - auto-show if mode is quickai
  const [showQuickAIForm, setShowQuickAIForm] = useState(mode === 'quickai');
  const [quickAIData, setQuickAIData] = useState({
    vin: '',
    customer_name: '',
    customer_phone: '',
    unit_number: '',
    odometer: ''
  });
  const [creatingSession, setCreatingSession] = useState(false);
  
  // Flow state
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  
  // Extraction state
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractedData, setExtractedData] = useState(null);
  const [extractionConfidence, setExtractionConfidence] = useState('medium');
  const [pdfContent, setPdfContent] = useState('');
  
  // Confirmation state
  const [confirming, setConfirming] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep(STEPS.UPLOAD);
      setFile(null);
      setExtractedData(null);
      setExtractionConfidence('medium');
      setPdfContent('');
      setValidationErrors({});
      setShowQuickAIForm(false);
      setQuickAIData({ vin: '', customer_name: '', customer_phone: '', unit_number: '', odometer: '' });
    } else {
      // Auto-show Quick AI form when mode is quickai
      setShowQuickAIForm(mode === 'quickai');
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleScanPDF = async () => {
    if (!file) return;

    setExtracting(true);
    setExtractionProgress(0);

    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please log in to upload work orders');
      }

      const companyId = await getUserCompanyId();
      if (!companyId) {
        throw new Error('Company not found. Please contact support.');
      }

      // First, try to extract text from PDF
      setExtractionProgress(10);
      const content = await extractPdfText(file, (p) => setExtractionProgress(10 + p * 0.2));
      setPdfContent(content);
      
      const textLength = content?.trim().length || 0;
      const isScannedPdf = textLength < 100; // Likely a scanned/image-based PDF
      
      console.log(`[QuickStartModal] Extracted ${textLength} characters from PDF. Scanned: ${isScannedPdf}`);

      let extractionData;

      if (isScannedPdf) {
        // Use OCR: convert pages to images and send to vision API
        console.log('[QuickStartModal] Low text content detected, using OCR...');
        toast.info('Scanned PDF detected. Using OCR to extract text...', { duration: 3000 });
        
        setExtractionProgress(35);
        // Process up to 10 pages for comprehensive extraction
        const pageImages = await extractPdfPagesAsImages(file, (p) => setExtractionProgress(35 + p * 0.25), 10);
        
        console.log(`[QuickStartModal] Converted ${pageImages.length} pages to images for OCR`);
        
        // Call edge function with OCR action
        setExtractionProgress(65);
        
        const { data, error } = await supabase.functions.invoke('work-order-parse', {
          body: {
            action: 'parse_ocr',
            pageImages,
            fileName: file.name,
            companyId,
            userId: user.id,
          },
        });

        if (error) {
          console.error('[QuickStartModal] OCR error:', error);
          throw new Error(error.message || 'Failed to extract data via OCR');
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to extract work order data via OCR');
        }

        extractionData = data;
        
        // Store OCR-extracted text for later use
        if (data.ocr_text) {
          setPdfContent(data.ocr_text);
        }
      } else {
        // Use regular text extraction
        console.log('[QuickStartModal] Using text-based extraction');
        
        setExtractionProgress(50);
        
        const { data, error } = await supabase.functions.invoke('work-order-parse', {
          body: {
            action: 'parse_text',
            content,
            fileName: file.name,
            companyId,
            userId: user.id,
          },
        });

        if (error) {
          console.error('[QuickStartModal] Edge function error:', error);
          throw new Error(error.message || 'Failed to extract data from PDF');
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to extract work order data');
        }

        extractionData = data;
      }

      setExtractionProgress(100);
      
      // Store extracted data for review
      setExtractedData(extractionData.extracted_data);
      setExtractionConfidence(extractionData.extracted_data?.extraction_confidence || 'medium');
      
      console.log('[QuickStartModal] Extraction complete:', extractionData.extracted_data);
      
      // Move to preview/review step
      setStep(STEPS.PREVIEW);
      
    } catch (error) {
      console.error('[QuickStartModal] Error:', error);
      toast.error(error.message || 'Failed to process PDF');
    } finally {
      setExtracting(false);
      setExtractionProgress(0);
    }
  };

  // Helper to extract value from either new {value, confidence} format or legacy format
  const getValue = (field) => {
    if (field === null || field === undefined) return null;
    if (typeof field === 'object' && 'value' in field) return field.value;
    return field;
  };

  const buildCombinedComplaint = (data) => {
    const workOrder = data?.work_order || {};

    // Prefer explicit top-level complaint if user edited it
    const direct = getValue(workOrder.complaint);
    if (typeof direct === 'string' && direct.trim().length > 0) return direct.trim();

    // Otherwise build from line items if present
    const lineItems = Array.isArray(data?.line_items) ? data.line_items : [];
    const lineComplaints = lineItems
      .map((item, idx) => {
        const c = getValue(item?.complaint);
        if (typeof c === 'string' && c.trim().length > 0) {
          const lineNo = item?.line_number || idx + 1;
          return `Line ${lineNo}: ${c.trim()}`;
        }
        return null;
      })
      .filter(Boolean);

    if (lineComplaints.length > 0) return lineComplaints.join('\n');

    // Fall back to AI summary fields
    const summary = getValue(workOrder.all_complaints_summary);
    if (typeof summary === 'string' && summary.trim().length > 0) return summary.trim();

    const primary = getValue(workOrder.primary_complaint);
    if (typeof primary === 'string' && primary.trim().length > 0) return primary.trim();

    return '';
  };

  const validateForm = () => {
    const errors = {};

    // VIN validation (if provided, must be 17 chars)
    const vin = getValue(extractedData?.truck?.vin);
    if (vin && vin.length !== 17) {
      errors.vin = 'VIN must be exactly 17 characters';
    }

    // Complaint is required (even if the user didn't touch the complaint field)
    const complaint = buildCombinedComplaint(extractedData);
    if (!complaint || complaint.trim().length === 0) {
      errors.complaint = 'Complaint/issue description is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConfirmAndStart = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors before continuing');
      return;
    }

    setConfirming(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please log in to continue');
      }

      const companyId = await getUserCompanyId();
      if (!companyId) {
        throw new Error('Company not found');
      }

      const combinedComplaint = buildCombinedComplaint(extractedData);
      const confirmedDataForSave = {
        ...extractedData,
        work_order: {
          ...(extractedData?.work_order || {}),
          // Ensure DB gets a complaint even if user didn't edit the field
          complaint: getValue(extractedData?.work_order?.complaint) || combinedComplaint || null,
        },
      };

      // Call edge function to create work order with confirmed data
      const { data, error } = await supabase.functions.invoke('work-order-parse', {
        body: {
          action: 'scan_and_create',
          content: pdfContent,
          fileName: file.name,
          companyId,
          userId: user.id,
          mode,
          // Pass the user-edited extracted data
          confirmedData: confirmedDataForSave,
        },
      });

      if (error) {
        console.error('[QuickStartModal] Confirmation error:', error);
        throw new Error(error.message || 'Failed to create work order');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create work order');
      }

      console.log('[QuickStartModal] Work order created:', data);

      // Show success message
      const successParts = [];
      if (data.truck_auto_created) successParts.push('new truck created');
      if (data.customer_auto_created) successParts.push('new customer added');
      if (data.maintenance_records_created > 0) successParts.push(`${data.maintenance_records_created} maintenance record(s)`);
      
      toast.success(
        `Work order created${successParts.length > 0 ? ': ' + successParts.join(', ') : ''}`,
        { duration: 5000 }
      );

      // Close modal first, then navigate
      onClose();
      
      // Navigate to work order detail page
      const projectId = data.project_id || data.work_order_id;
      console.log('[QuickStartModal] Navigating to project:', projectId);
      
      if (projectId) {
        navigate(`/projects/${projectId}`, { 
          state: { fromWorkOrderCreation: true, justCreated: true } 
        });
      } else {
        console.warn('[QuickStartModal] No project_id in response, navigating to list');
        navigate('/projects');
      }
    } catch (error) {
      console.error('[QuickStartModal] Error:', error);
      toast.error(error.message || 'Failed to create work order');
    } finally {
      setConfirming(false);
    }
  };

  const handleBack = () => {
    if (step === STEPS.PREVIEW) {
      setStep(STEPS.UPLOAD);
      setExtractedData(null);
    }
  };

  const handleManualStart = () => {
    if (mode === 'diagnostic') {
      navigate('/templates');
    } else {
      navigate('/projects/new');
    }
    onClose();
  };

  const handleQuickAISubmit = async () => {
    if (!quickAIData.vin.trim()) {
      toast.error('VIN is required');
      return;
    }
    setCreatingSession(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in');
      const companyId = profile?.company_id;
      if (!companyId) throw new Error('Company not found');
      const { data, error } = await supabase
        .from('standalone_diagnostic_sessions')
        .insert({
          company_id: companyId,
          created_by: user.id,
          vin: quickAIData.vin.trim().toUpperCase(),
          customer_name: quickAIData.customer_name.trim() || null,
          customer_phone: quickAIData.customer_phone.trim() || null,
          unit_number: quickAIData.unit_number.trim() || null,
          odometer: quickAIData.odometer ? parseInt(quickAIData.odometer) : null,
          status: 'open'
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Diagnostic session created');
      onClose();
      navigate(`/standalone-diagnostic?sessionId=${data.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error(error.message || 'Failed to create session');
    } finally {
      setCreatingSession(false);
    }
  };

  const renderQuickAIForm = () => (
    <CardContent className="space-y-6">
      <div className="border-2 border-[#124481] rounded-lg p-6 bg-gradient-to-br from-[#124481]/5 to-[#1E7083]/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-[#124481] p-2 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Quick AI Diagnostic</h3>
            <p className="text-sm text-gray-600">Enter vehicle info to start a diagnostic chat</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VIN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={quickAIData.vin}
              onChange={(e) => setQuickAIData(prev => ({ ...prev, vin: e.target.value.toUpperCase() }))}
              placeholder="Enter Vehicle Identification Number"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono uppercase"
              maxLength={17}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={quickAIData.customer_name}
                onChange={(e) => setQuickAIData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
              <input
                type="text"
                value={quickAIData.customer_phone}
                onChange={(e) => setQuickAIData(prev => ({ ...prev, customer_phone: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit / Truck Number</label>
              <input
                type="text"
                value={quickAIData.unit_number}
                onChange={(e) => setQuickAIData(prev => ({ ...prev, unit_number: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Odometer (mi)</label>
              <input
                type="number"
                value={quickAIData.odometer}
                onChange={(e) => setQuickAIData(prev => ({ ...prev, odometer: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-6">
          {mode !== 'quickai' && (
            <Button variant="outline" onClick={() => setShowQuickAIForm(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          {mode === 'quickai' && <div />}
          <Button
            onClick={handleQuickAISubmit}
            disabled={creatingSession || !quickAIData.vin.trim()}
            className="bg-[#124481] hover:bg-[#1E7083]"
          >
            {creatingSession ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Continue to AI Diagnostic
              </>
            )}
          </Button>
        </div>
      </div>
    </CardContent>
  );

  const getConfidenceBadge = () => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-amber-100 text-amber-800',
      low: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[extractionConfidence] || colors.medium}`}>
        {extractionConfidence === 'high' ? '✓ High confidence' : 
         extractionConfidence === 'low' ? '⚠ Low confidence - please verify' : 
         '● Medium confidence'}
      </span>
    );
  };

  // Render upload step
  const renderUploadStep = () => (
    <CardContent className="space-y-6">
      {/* Scan Work Order Option */}
      <div className="border-2 border-[#289790] rounded-lg p-6 bg-gradient-to-br from-[#289790]/5 to-[#124481]/5">
        <div className="flex items-start gap-4">
          <div className="bg-[#289790] p-3 rounded-lg">
            <Upload className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Scan Work Order (Recommended)
            </h3>
            <p className="text-gray-600 mb-4">
              Upload a PDF work order. We'll extract VIN, complaints, fault codes, 
              and let you review before creating the work order.
            </p>
            
            {!file ? (
              <div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="workorder-upload"
                  ref={(input) => input && (window._pdfInput = input)}
                />
                <Button
                  type="button"
                  onClick={() => document.getElementById('workorder-upload')?.click()}
                  className="bg-[#289790] hover:bg-[#1E7083]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select PDF Work Order
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-white rounded border">
                  <FileText className="h-5 w-5 text-[#124481]" />
                  <span className="font-medium text-sm">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="ml-auto"
                    disabled={extracting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {extracting && (
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#289790] transition-all duration-300"
                        style={{ width: `${extractionProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      {extractionProgress < 50 ? 'Extracting text from PDF...' : 'AI extracting data...'}
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={handleScanPDF}
                  disabled={extracting}
                  className="bg-[#289790] hover:bg-[#1E7083] w-full"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Scan & Extract Data
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      {/* Manual Entry Option */}
      <div className="border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="bg-gray-100 p-3 rounded-lg">
            <FileText className="h-8 w-8 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Manual Entry</h3>
            <p className="text-gray-600 mb-4">
              {mode === 'diagnostic' 
                ? 'Start a blank diagnostic session and enter information manually.'
                : 'Create a work order by filling out the form manually.'
              }
            </p>
            <Button
              variant="outline"
              onClick={handleManualStart}
              className="border-gray-300"
            >
              {mode === 'diagnostic' ? 'Start Blank Session' : 'Manual Entry Form'}
            </Button>
          </div>
        </div>
      </div>

      {mode !== 'quickai' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>💡 Pro Tip:</strong> Scanning a work order is 10x faster! Our AI will extract 
          all information, and you can review and edit before saving.
        </div>
      )}
    </CardContent>
  );

  // Render preview/review step
  const renderPreviewStep = () => (
    <CardContent className="p-0">
      <div className="flex h-[600px]">
        {/* PDF Preview - Left Side */}
        <div className="w-1/2 border-r bg-gray-50 flex flex-col">
          <div className="px-4 py-3 border-b bg-white">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#289790]" />
              PDF Preview
            </h4>
            <p className="text-xs text-gray-500 mt-1">{file?.name}</p>
          </div>
          <PDFPreviewViewer file={file} className="flex-1" />
        </div>
        
        {/* Extraction Review - Right Side */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#124481]" />
                Review Extracted Data
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Edit any fields before confirming
              </p>
            </div>
            {getConfidenceBadge()}
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <ExtractionReviewForm
              extractedData={extractedData}
              onChange={setExtractedData}
              validationErrors={validationErrors}
            />
          </ScrollArea>
          
          {/* Action buttons */}
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={confirming}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button
              onClick={handleConfirmAndStart}
              disabled={confirming}
              className="bg-[#289790] hover:bg-[#1E7083]"
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {mode === 'diagnostic' ? 'Confirm & Start Diagnostics' : 'Confirm & Create Work Order'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`${step === STEPS.PREVIEW ? 'w-full max-w-6xl' : 'w-full max-w-2xl'} max-h-[90vh] flex flex-col`}>
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {showQuickAIForm ? (
                <>
                  <Bot className="h-5 w-5 text-[#124481]" />
                  Quick AI Diagnostic
                </>
              ) : mode === 'diagnostic' ? (
                <>
                  <Zap className="h-5 w-5 text-[#289790]" />
                  {step === STEPS.UPLOAD ? 'Start Diagnostic Session' : 'Review & Confirm'}
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 text-[#289790]" />
                  {step === STEPS.UPLOAD ? 'Create Work Order' : 'Review & Confirm'}
                </>
              )}
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Step indicators */}
              {step === STEPS.PREVIEW && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-[#289790]">
                    <span className="h-5 w-5 rounded-full bg-[#289790] text-white text-xs flex items-center justify-center">✓</span>
                    Upload
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="flex items-center gap-1 text-[#124481] font-medium">
                    <span className="h-5 w-5 rounded-full bg-[#124481] text-white text-xs flex items-center justify-center">2</span>
                    Review
                  </span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          {showQuickAIForm && renderQuickAIForm()}
          {!showQuickAIForm && step === STEPS.UPLOAD && renderUploadStep()}
          {!showQuickAIForm && step === STEPS.PREVIEW && renderPreviewStep()}
        </div>
      </Card>
    </div>
  );
};

export default QuickStartModal;
