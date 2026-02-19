import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { FileText, Download, Copy, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { generateROPacketPDF } from '../lib/generateROPacketPDF';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

const ROPacketModal = ({ isOpen, onClose, workOrder, truck }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('text');
  const [isGeneratingDiagnostic, setIsGeneratingDiagnostic] = useState(false);
  const [diagnosticContent, setDiagnosticContent] = useState(null);

  // Build vehicle info for API
  const getVehicleInfo = () => {
    const truckVin = truck?.identity?.vin || truck?.vin;
    const truckYear = truck?.identity?.year || truck?.year;
    const truckMake = truck?.identity?.make || truck?.make;
    const truckModel = truck?.identity?.model || truck?.model;
    const truckOdometer = truck?.identity?.odometer_mi || truck?.odometer_miles;
    
    const engineInfo = truck?.engine?.manufacturer && truck?.engine?.model
      ? `${truck.engine.manufacturer} ${truck.engine.model}`
      : (truck?.engine?.model || truck?.engine?.manufacturer || null);

    return {
      vin: workOrder?.extracted_vin || truckVin,
      year: workOrder?.extracted_year || truckYear,
      make: workOrder?.extracted_make || truckMake,
      model: workOrder?.extracted_model || truckModel,
      engine: engineInfo,
      odometer: workOrder?.extracted_odometer || truckOdometer
    };
  };

  // Fetch RAG-powered diagnostic content
  const fetchDiagnosticContent = async () => {
    setIsGeneratingDiagnostic(true);
    try {
      const vehicleInfo = getVehicleInfo();
      
      const { data, error } = await supabase.functions.invoke('generate-ro-diagnostic', {
        body: {
          workOrderId: workOrder?.id,
          companyId: profile?.company_id,
          vehicleInfo,
          complaint: workOrder?.complaint,
          faultCodes: workOrder?.fault_codes || []
        }
      });

      if (error) throw error;

      if (data && data.success !== false) {
        setDiagnosticContent(data);
        return data;
      } else {
        console.error('Diagnostic generation failed:', data?.error);
        // Still return the fallback content from the API
        if (data) {
          setDiagnosticContent(data);
          return data;
        }
        throw new Error(data?.error || 'Failed to generate diagnostic');
      }
    } catch (error) {
      console.error('Error fetching diagnostic:', error);
      toast.error('Could not generate AI diagnostic. Using basic PDF format.');
      return null;
    } finally {
      setIsGeneratingDiagnostic(false);
    }
  };

  // Generate text content for RO Packet
  const generateTextContent = () => {
    const lines = [];
    
    lines.push('================================================================');
    lines.push('                    RO CREATION PACKET');
    lines.push('================================================================');
    lines.push('');
    
    // Work Order Info
    lines.push(`Work Order #: ${workOrder?.work_order_number || workOrder?.id?.slice(0, 8) || 'N/A'}`);
    lines.push(`Date: ${workOrder?.work_order_date || new Date().toISOString().split('T')[0]}`);
    lines.push(`Status: ${workOrder?.status?.replace('_', ' ')?.toUpperCase() || 'N/A'}`);
    lines.push('');
    
    // Customer Info
    lines.push('CUSTOMER INFORMATION:');
    lines.push(`  Name: ${workOrder?.customer_name || 'N/A'}`);
    lines.push(`  Location: ${workOrder?.customer_location || 'N/A'}`);
    lines.push(`  Customer ID: ${workOrder?.customer_id_ref || 'N/A'}`);
    lines.push('');
    
    // Vehicle Info - access nested identity structure from truckAPI
    lines.push('VEHICLE INFORMATION:');
    lines.push(`  VIN: ${workOrder?.extracted_vin || truck?.identity?.vin || 'N/A'}`);
    lines.push(`  Unit #: ${workOrder?.extracted_unit_number || truck?.identity?.unit_id || truck?.identity?.truck_number || 'N/A'}`);
    lines.push(`  Year: ${workOrder?.extracted_year || truck?.identity?.year || 'N/A'}`);
    lines.push(`  Make: ${workOrder?.extracted_make || truck?.identity?.make || 'N/A'}`);
    lines.push(`  Model: ${workOrder?.extracted_model || truck?.identity?.model || 'N/A'}`);
    const odometer = workOrder?.extracted_odometer || truck?.identity?.odometer_mi;
    lines.push(`  Mileage: ${odometer ? odometer.toLocaleString() : 'N/A'}`);
    lines.push('');
    
    // Fault Codes
    const faultCodes = workOrder?.fault_codes || [];
    if (faultCodes.length > 0) {
      lines.push('FAULT CODES:');
      faultCodes.forEach(code => {
        lines.push(`  - ${code}`);
      });
      lines.push('');
    }
    
    // Complaint
    lines.push('CUSTOMER COMPLAINT:');
    lines.push(`  ${workOrder?.complaint || 'No complaint recorded'}`);
    lines.push('');
    
    // AI-Generated Content (if available)
    if (diagnosticContent) {
      lines.push('----------------------------------------------------------------');
      lines.push('AI-GENERATED DIAGNOSTIC ANALYSIS');
      lines.push('----------------------------------------------------------------');
      lines.push('');
      
      lines.push('DIAGNOSTIC SUMMARY:');
      lines.push(`  ${diagnosticContent.diagnostic_summary || 'N/A'}`);
      lines.push('');
      
      lines.push('PROBABLE ROOT CAUSE:');
      lines.push(`  ${diagnosticContent.probable_root_cause || 'N/A'}`);
      lines.push('');
      
      if (diagnosticContent.recommended_repair_steps?.length > 0) {
        lines.push('RECOMMENDED REPAIR STEPS:');
        diagnosticContent.recommended_repair_steps.forEach((step, idx) => {
          lines.push(`  ${idx + 1}. ${step}`);
        });
        lines.push('');
      }
      
      if (diagnosticContent.safety_notes) {
        lines.push('SAFETY NOTES:');
        lines.push(`  ${diagnosticContent.safety_notes}`);
        lines.push('');
      }
      
      if (diagnosticContent.citations?.length > 0) {
        lines.push('CITATIONS:');
        diagnosticContent.citations.forEach((citation, idx) => {
          const title = citation.title || `Source ${idx + 1}`;
          const match = citation.similarity ? ` (${(citation.similarity * 100).toFixed(0)}% match)` : '';
          lines.push(`  ${idx + 1}. ${title}${match}`);
        });
        lines.push('');
      }
    } else {
      // Fallback to database fields
      lines.push('WORK PERFORMED:');
      if (workOrder?.correction) {
        lines.push(`  ${workOrder.correction}`);
      } else {
        lines.push('  No work performed recorded');
      }
      lines.push('');
      
      if (workOrder?.cause) {
        lines.push('DIAGNOSIS/CAUSE:');
        lines.push(`  ${workOrder.cause}`);
        lines.push('');
      }
    }
    
    // Parts Used (if available)
    if (workOrder?.parts_used && workOrder.parts_used.length > 0) {
      lines.push('PARTS USED:');
      workOrder.parts_used.forEach((part, idx) => {
        lines.push(`  ${idx + 1}. ${part.name || part.part_name || 'Part'}`);
        if (part.part_number) lines.push(`     PN: ${part.part_number}`);
        if (part.quantity) lines.push(`     Qty: ${part.quantity}`);
        if (part.total_price) lines.push(`     Price: $${part.total_price.toFixed(2)}`);
      });
      lines.push('');
    }
    
    // Labor (if available)
    if (workOrder?.labor_items && workOrder.labor_items.length > 0) {
      lines.push('LABOR:');
      let totalHours = 0;
      workOrder.labor_items.forEach((labor, idx) => {
        lines.push(`  ${idx + 1}. ${labor.description || 'Labor'}`);
        if (labor.hours) {
          lines.push(`     Hours: ${labor.hours}`);
          totalHours += parseFloat(labor.hours) || 0;
        }
        if (labor.total) lines.push(`     Amount: $${labor.total.toFixed(2)}`);
      });
      lines.push(`  Total Labor: ${totalHours} hours`);
      lines.push('');
    }
    
    // Summary
    lines.push('----------------------------------------------------------------');
    lines.push('SUMMARY:');
    if (workOrder?.parts_used && workOrder.parts_used.length > 0) {
      const partsTotal = workOrder.parts_used.reduce((sum, p) => sum + (p.total_price || 0), 0);
      lines.push(`  Total Parts: $${partsTotal.toFixed(2)}`);
    }
    if (workOrder?.labor_items && workOrder.labor_items.length > 0) {
      const laborTotal = workOrder.labor_items.reduce((sum, l) => sum + (parseFloat(l.hours) || 0), 0);
      lines.push(`  Total Labor: ${laborTotal} hours`);
    }
    lines.push('');
    
    lines.push('================================================================');
    lines.push(diagnosticContent ? 'Generated by FleetWise AI' : 'Generated by FleetWise');
    lines.push('================================================================');
    
    return lines.join('\n');
  };

  // Generate JSON content
  const generateJSONContent = () => {
    const data = {
      work_order: {
        number: workOrder?.work_order_number || workOrder?.id?.slice(0, 8),
        date: workOrder?.work_order_date || new Date().toISOString().split('T')[0],
        status: workOrder?.status,
      },
      customer: {
        name: workOrder?.customer_name,
        location: workOrder?.customer_location,
        id: workOrder?.customer_id_ref,
      },
      vehicle: {
        vin: workOrder?.extracted_vin || truck?.identity?.vin,
        unit_number: workOrder?.extracted_unit_number || truck?.identity?.unit_id || truck?.identity?.truck_number,
        year: workOrder?.extracted_year || truck?.identity?.year,
        make: workOrder?.extracted_make || truck?.identity?.make,
        model: workOrder?.extracted_model || truck?.identity?.model,
        mileage: workOrder?.extracted_odometer || truck?.identity?.odometer_mi,
      },
      fault_codes: workOrder?.fault_codes || [],
      complaint: workOrder?.complaint,
      diagnosis: workOrder?.cause,
      correction: workOrder?.correction,
      parts_used: workOrder?.parts_used || [],
      labor_items: workOrder?.labor_items || [],
      // Include AI-generated content if available
      ai_diagnostic: diagnosticContent ? {
        diagnostic_summary: diagnosticContent.diagnostic_summary,
        probable_root_cause: diagnosticContent.probable_root_cause,
        recommended_repair_steps: diagnosticContent.recommended_repair_steps,
        safety_notes: diagnosticContent.safety_notes,
        citations: diagnosticContent.citations,
        generated_at: diagnosticContent.generated_at
      } : null
    };
    return JSON.stringify(data, null, 2);
  };

  // Generate HTML content
  const generateHTMLContent = () => {
    const aiSection = diagnosticContent ? `
  <div class="section ai-diagnostic">
    <h2>🤖 AI Diagnostic Analysis</h2>
    
    <h3>Diagnostic Summary</h3>
    <p>${diagnosticContent.diagnostic_summary || 'N/A'}</p>
    
    <h3>Probable Root Cause</h3>
    <p>${diagnosticContent.probable_root_cause || 'N/A'}</p>
    
    ${diagnosticContent.recommended_repair_steps?.length > 0 ? `
    <h3>Recommended Repair Steps</h3>
    <ol>
      ${diagnosticContent.recommended_repair_steps.map(step => `<li>${step}</li>`).join('')}
    </ol>
    ` : ''}
    
    ${diagnosticContent.safety_notes ? `
    <h3>Safety Notes</h3>
    <p class="safety-note">${diagnosticContent.safety_notes}</p>
    ` : ''}
    
    ${diagnosticContent.citations?.length > 0 ? `
    <h3>Citations</h3>
    <ul class="citations">
      ${diagnosticContent.citations.map((c, i) => `<li>${c.title || `Source ${i + 1}`}${c.similarity ? ` (${(c.similarity * 100).toFixed(0)}% match)` : ''}</li>`).join('')}
    </ul>
    ` : ''}
  </div>
    ` : `
  <div class="section">
    <h2>Work Performed</h2>
    <p>${workOrder?.correction || 'No work performed recorded'}</p>
  </div>
  
  ${workOrder?.cause ? `
  <div class="section">
    <h2>Diagnosis</h2>
    <p>${workOrder.cause}</p>
  </div>
  ` : ''}`;

    return `<!DOCTYPE html>
<html>
<head>
  <title>RO Packet - ${workOrder?.work_order_number || workOrder?.id?.slice(0, 8)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #1E7083; }
    h2 { color: #124481; border-bottom: 1px solid #ccc; }
    h3 { color: #1E7083; margin-top: 15px; }
    .section { margin-bottom: 20px; }
    .label { font-weight: bold; }
    .fault-code { background: #fee; padding: 2px 8px; border-radius: 4px; margin: 2px; display: inline-block; }
    .ai-diagnostic { background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #1E7083; }
    .safety-note { background: #fff3cd; padding: 10px; border-radius: 4px; border-left: 3px solid #ffc107; }
    .citations { font-size: 0.9em; color: #666; }
    ol { padding-left: 20px; }
    ol li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>RO Creation Packet</h1>
  <p><strong>Work Order #:</strong> ${workOrder?.work_order_number || workOrder?.id?.slice(0, 8) || 'N/A'}</p>
  <p><strong>Date:</strong> ${workOrder?.work_order_date || new Date().toISOString().split('T')[0]}</p>
  
  <div class="section">
    <h2>Customer Information</h2>
    <p><span class="label">Name:</span> ${workOrder?.customer_name || 'N/A'}</p>
    <p><span class="label">Location:</span> ${workOrder?.customer_location || 'N/A'}</p>
  </div>
  
  <div class="section">
    <h2>Vehicle Information</h2>
    <p><span class="label">VIN:</span> ${workOrder?.extracted_vin || truck?.identity?.vin || 'N/A'}</p>
    <p><span class="label">Unit #:</span> ${workOrder?.extracted_unit_number || truck?.identity?.unit_id || 'N/A'}</p>
    <p><span class="label">Year/Make/Model:</span> ${workOrder?.extracted_year || truck?.identity?.year || ''} ${workOrder?.extracted_make || truck?.identity?.make || ''} ${workOrder?.extracted_model || truck?.identity?.model || ''}</p>
    <p><span class="label">Mileage:</span> ${(workOrder?.extracted_odometer || truck?.identity?.odometer_mi || 'N/A').toLocaleString()}</p>
  </div>
  
  ${(workOrder?.fault_codes?.length > 0) ? `
  <div class="section">
    <h2>Fault Codes</h2>
    ${workOrder.fault_codes.map(code => `<span class="fault-code">${code}</span>`).join(' ')}
  </div>
  ` : ''}
  
  <div class="section">
    <h2>Complaint</h2>
    <p>${workOrder?.complaint || 'No complaint recorded'}</p>
  </div>
  
  ${aiSection}
  
  <footer style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 0.8em; color: #666;">
    ${diagnosticContent ? 'Generated by FleetWise AI' : 'Generated by FleetWise'} | ${new Date().toLocaleString()}
  </footer>
</body>
</html>`;
  };

  const getContent = () => {
    switch (activeTab) {
      case 'html':
        return generateHTMLContent();
      case 'json':
        return generateJSONContent();
      default:
        return generateTextContent();
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getContent());
      toast.success('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // If we don't have diagnostic content yet, fetch it first
      let content = diagnosticContent;
      if (!content) {
        toast.info('Generating AI diagnostic analysis...');
        content = await fetchDiagnosticContent();
      }
      
      // Generate PDF with diagnostic content (or without if fetch failed)
      generateROPacketPDF(workOrder, truck, content);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Fetch diagnostic content when modal opens
  React.useEffect(() => {
    if (isOpen && workOrder && !diagnosticContent) {
      fetchDiagnosticContent();
    }
  }, [isOpen, workOrder?.id]);

  // Reset diagnostic content when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setDiagnosticContent(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col z-50 bg-white p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#1E7083]" />
              <DialogTitle className="text-xl">RO Creation Packet</DialogTitle>
              {diagnosticContent && (
                <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  AI Enhanced
                </span>
              )}
            </div>
          </div>
          <DialogDescription>
            {isGeneratingDiagnostic 
              ? 'Generating AI diagnostic analysis from knowledge base...'
              : diagnosticContent 
                ? 'AI-powered diagnostic analysis ready. Copy or download the packet.'
                : 'Copy this packet and paste it into Enrich to create the Repair Order.'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 flex-1 flex flex-col overflow-hidden">
          {isGeneratingDiagnostic && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing work order with RAG knowledge base...</span>
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-fit grid-cols-3 mb-4">
              <TabsTrigger value="text">Text Format</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="flex-1 mt-0">
              <ScrollArea className="h-[400px] w-full rounded-md border bg-gray-50">
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-gray-800">
                  {generateTextContent()}
                </pre>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="html" className="flex-1 mt-0">
              <ScrollArea className="h-[400px] w-full rounded-md border bg-gray-50">
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-gray-800">
                  {generateHTMLContent()}
                </pre>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="json" className="flex-1 mt-0">
              <ScrollArea className="h-[400px] w-full rounded-md border bg-gray-50">
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-gray-800">
                  {generateJSONContent()}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between bg-white">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCopyToClipboard}
              className="border-gray-300"
              disabled={isGeneratingDiagnostic}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-[#1E7083] hover:bg-[#1E7083]/90 text-white"
              disabled={isGeneratingDiagnostic}
            >
              {isGeneratingDiagnostic ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </div>
          <Button
            onClick={onClose}
            className="bg-[#1E7083] hover:bg-[#1E7083]/90"
          >
            Close
          </Button>
        </div>

        <div className="px-6 py-3 bg-blue-50 border-t">
          <p className="text-sm text-blue-800">
            <strong>Next Steps:</strong> Copy this packet and paste it into the Enrich system to create the official Repair Order. Once created, return here to assign the RO number.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ROPacketModal;
