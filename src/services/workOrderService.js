import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';

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
      onProgress(Math.round((i / totalPages) * 50)); // 0-50% for extraction
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

import { getEffectiveCompanyId } from '@/lib/companyContext';

// Use centralized company context that respects impersonation
const getUserCompanyId = getEffectiveCompanyId;

// Map UI status to valid database status values
// DB allows: 'extracted', 'reviewed', 'linked', 'completed'
function mapStatusToDbValue(uiStatus) {
  const statusMap = {
    'draft': 'extracted',
    'in_progress': 'reviewed',
    'in progress': 'reviewed',
    'pending': 'extracted',
    'complete': 'completed',
    'completed': 'completed',
    'linked': 'linked',
    'reviewed': 'reviewed',
    'extracted': 'extracted',
  };
  const normalized = (uiStatus || '').toLowerCase().trim();
  return statusMap[normalized] || 'extracted';
}

export const workOrderServiceAPI = {
  // Create a new work order directly (from form submission)
  create: async (projectData) => {
    try {
      console.log('[WorkOrderService] Creating work order with data:', projectData);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('[WorkOrderService] Auth error:', userError);
        throw new Error('Authentication error: ' + userError.message);
      }
      if (!user) throw new Error('User not authenticated');
      
      console.log('[WorkOrderService] User authenticated:', user.id);
      
      // Get company ID using the centralized context (respects impersonation)
      const companyId = await getUserCompanyId();
      if (!companyId) {
        console.error('[WorkOrderService] No effective company_id available');
        throw new Error('Company not found. Please ensure you have a company assigned or are impersonating a user.');
      }
      
      console.log('[WorkOrderService] Effective Company ID:', companyId);
      
      // Map status to valid DB value
      const dbStatus = mapStatusToDbValue(projectData.status);
      console.log('[WorkOrderService] Status mapping:', projectData.status, '->', dbStatus);
      
      // Auto-populate customer from truck if truck_id is provided
      let customerName = projectData.customer_name || null;
      let customerId = null;
      
      if (projectData.truck_id) {
        const { data: truckData } = await supabase
          .from('trucks')
          .select('customer_id, customer_name, customer:customers(id, name)')
          .eq('id', projectData.truck_id)
          .maybeSingle();
        
        if (truckData) {
          // Use linked customer if available, otherwise use customer_name from truck
          if (truckData.customer?.id) {
            customerId = truckData.customer.id;
            customerName = truckData.customer.name || customerName;
          } else if (truckData.customer_name) {
            customerName = truckData.customer_name;
          }
          console.log('[WorkOrderService] Auto-populated customer from truck:', { customerId, customerName });
        }
      }
      
      // Map form data to work_orders table columns
      const workOrderData = {
        company_id: companyId,
        truck_id: projectData.truck_id || null,
        work_order_number: projectData.work_order_number || null,
        complaint: projectData.complaint || null,
        customer_name: customerName,
        fault_codes: projectData.fault_codes || [],
        status: dbStatus,
      };
      
      console.log('[WorkOrderService] Inserting work order data:', workOrderData);
      
      const { data, error } = await supabase
        .from('work_orders')
        .insert(workOrderData)
        .select()
        .single();
      
      if (error) {
        console.error('[WorkOrderService] Insert error:', error);
        throw new Error('Database error: ' + error.message);
      }
      
      console.log('[WorkOrderService] Work order created successfully:', data);
      return { data };
    } catch (error) {
      console.error('[WorkOrderService] Create error:', error);
      throw error;
    }
  },

  // Parse a work order PDF and extract structured data
  createFromPDF: async (file, onProgress = null) => {
    try {
      // Step 1: Extract text from PDF (client-side)
      if (onProgress) onProgress(5);
      console.log('[WorkOrderService] Extracting text from PDF:', file.name);
      
      const content = await extractPdfText(file, onProgress);
      
      if (!content || content.length < 50) {
        throw new Error('Could not extract text from PDF. Document may be scanned or image-based.');
      }
      
      console.log(`[WorkOrderService] Extracted ${content.length} characters`);
      if (onProgress) onProgress(60);
      
      // Step 2: Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const companyId = await getUserCompanyId();
      if (!companyId) throw new Error('Company not found for user');
      
      // Step 3: Send to edge function for AI parsing
      console.log('[WorkOrderService] Sending to AI for extraction...');
      
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
        console.error('[WorkOrderService] Edge function error:', error);
        throw new Error(error.message || 'Failed to parse work order');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract work order data');
      }
      
      if (onProgress) onProgress(100);
      
      return { data };
    } catch (error) {
      console.error('[WorkOrderService] Error:', error);
      throw error;
    }
  },
  
  // Save extracted and reviewed work order data
  saveFromExtraction: async (extractedData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const companyId = await getUserCompanyId();
      if (!companyId) throw new Error('Company not found for user');
      
      console.log('[WorkOrderService] Saving work order data...');
      
      const { data, error } = await supabase.functions.invoke('work-order-parse', {
        body: {
          action: 'save_work_order',
          extractedData,
          companyId,
          userId: user.id,
        },
      });
      
      if (error) {
        console.error('[WorkOrderService] Save error:', error);
        throw new Error(error.message || 'Failed to save work order');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save work order');
      }
      
      return { data };
    } catch (error) {
      console.error('[WorkOrderService] Save error:', error);
      throw error;
    }
  },
  
  // List work orders for the company
  list: async (companyId = null, statusFilter = null, dateRange = null) => {
    const effectiveCompanyId = companyId || await getUserCompanyId();
    
    let query = supabase
      .from('work_orders')
      .select(`
        *,
        truck:trucks(
          id, 
          vin, 
          truck_number, 
          make, 
          model, 
          year,
          customer_id,
          customer_name,
          customer:customers(id, name, phone, email)
        )
      `)
      .eq('company_id', effectiveCompanyId);
    
    // Apply status filter if provided
    if (statusFilter && statusFilter !== 'all') {
      // Map UI filter values to actual DB status values
      const statusMapping = {
        'draft': ['extracted'],
        'in_progress': ['reviewed', 'linked'],
        'completed': ['completed'],
        // Direct DB values also supported
        'extracted': ['extracted'],
        'reviewed': ['reviewed'],
        'linked': ['linked'],
      };
      
      const dbStatuses = statusMapping[statusFilter] || [statusFilter];
      query = query.in('status', dbStatuses);
    }
    
    // Apply date range filter if provided
    if (dateRange?.startDate) {
      query = query.gte('created_at', dateRange.startDate);
    }
    if (dateRange?.endDate) {
      query = query.lte('created_at', dateRange.endDate + 'T23:59:59');
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Enrich work orders with customer data from linked trucks
    const enrichedData = (data || []).map(wo => {
      // If work order has a truck with a linked customer, use that customer info
      if (wo.truck?.customer?.name && !wo.customer_name) {
        wo.customer_name = wo.truck.customer.name;
      }
      return wo;
    });
    
    return { data: enrichedData };
  },
  
  // Get a single work order by ID
  get: async (workOrderId) => {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        truck:trucks(
          id, 
          vin, 
          truck_number, 
          make, 
          model, 
          year,
          odometer_miles,
          engine_hours,
          vehicle_class,
          customer_id,
          customer_name,
          customer:customers(id, name, phone, email, street_address, city, state, zip_code)
        )
      `)
      .eq('id', workOrderId)
      .maybeSingle();
    
    if (error) throw error;
    
    // Enrich with customer data from truck if not set on work order
    if (data && data.truck?.customer?.name && !data.customer_name) {
      data.customer_name = data.truck.customer.name;
    }
    
    return { data };
  },
  
  // Get parts for a work order
  getParts: async (workOrderId) => {
    const { data, error } = await supabase
      .from('work_order_parts')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return { data: data || [] };
  },
  
  // Get labor entries for a work order
  getLabor: async (workOrderId) => {
    const { data, error } = await supabase
      .from('work_order_labor')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return { data: data || [] };
  },
  
  // Add a part to a work order
  addPart: async (workOrderId, partData) => {
    const companyId = await getUserCompanyId();
    const { data, error } = await supabase
      .from('work_order_parts')
      .insert({
        work_order_id: workOrderId,
        company_id: companyId,
        ...partData,
      })
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  },
  
  // Add labor entry to a work order
  addLabor: async (workOrderId, laborData) => {
    const companyId = await getUserCompanyId();
    const { data, error } = await supabase
      .from('work_order_labor')
      .insert({
        work_order_id: workOrderId,
        company_id: companyId,
        ...laborData,
      })
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  },
  
  // Delete a part from a work order
  deletePart: async (partId) => {
    const { error } = await supabase
      .from('work_order_parts')
      .delete()
      .eq('id', partId);
    
    if (error) throw error;
    return { success: true };
  },
  
  // Delete a labor entry from a work order
  deleteLabor: async (laborId) => {
    const { error } = await supabase
      .from('work_order_labor')
      .delete()
      .eq('id', laborId);
    
    if (error) throw error;
    return { success: true };
  },
  
  // Get maintenance records for a truck
  getMaintenanceHistory: async (truckId) => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('truck_id', truckId)
      .order('service_date', { ascending: false });
    
    if (error) throw error;
    return { data };
  },
  
  // Get maintenance summary by category for a truck
  getMaintenanceSummary: async (truckId) => {
    const { data: records, error } = await supabase
      .from('maintenance_records')
      .select('service_category, service_date, odometer_at_service')
      .eq('truck_id', truckId)
      .order('service_date', { ascending: false });
    
    if (error) throw error;
    
    // Group by category and get latest date for each
    const summary = {};
    (records || []).forEach(record => {
      const cat = record.service_category || 'other';
      if (!summary[cat]) {
        summary[cat] = {
          category: cat,
          last_service_date: record.service_date,
          last_odometer: record.odometer_at_service,
          count: 1,
        };
      } else {
        summary[cat].count++;
      }
    });
    
    return { data: Object.values(summary) };
  },
};