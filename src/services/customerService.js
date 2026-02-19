import { supabase } from '@/integrations/supabase/client';
import { getEffectiveCompanyId } from '@/lib/companyContext';

// Use centralized company context that respects impersonation
const getUserCompanyId = getEffectiveCompanyId;

export const customerAPI = {
  list: async (companyId = null) => {
    // Get effective company ID (respects impersonation)
    const effectiveCompanyId = companyId || await getUserCompanyId();
    
    // Build query with company filter if available
    let query = supabase
      .from('customers')
      .select(`
        *,
        trucks(
          id,
          work_orders:work_orders(id)
        )
      `);
    
    // Apply company filter if we have a company ID
    if (effectiveCompanyId) {
      query = query.eq('company_id', effectiveCompanyId);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    
    if (error) throw error;
    
    // Transform data to include truck and work order counts
    const customersWithCounts = (data || []).map(customer => {
      const trucks = customer.trucks || [];
      // Count work orders across all trucks belonging to this customer
      const workOrderCount = trucks.reduce((count, truck) => {
        return count + (truck.work_orders?.length || 0);
      }, 0);
      
      return {
        ...customer,
        total_trucks: trucks.length,
        total_work_orders: workOrderCount,
        trucks: undefined // Remove the trucks array from response
      };
    });
    
    return { data: customersWithCounts };
  },
  
  // Find customer by external_id within a company
  findByExternalId: async (externalId, companyId) => {
    if (!externalId) return { data: null };
    
    const effectiveCompanyId = companyId || await getUserCompanyId();
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', effectiveCompanyId)
      .eq('external_id', externalId)
      .maybeSingle();
    
    if (error) throw error;
    return { data };
  },
  
  get: async (customerId) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) throw new Error('Customer not found');
    return { data };
  },
  
  create: async (customerData) => {
    const companyId = await getUserCompanyId();
    if (!companyId) throw new Error('No company found for user');
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        company_id: companyId,
        name: customerData.name,
        email: customerData.email || null,
        phone: customerData.phone || null,
        street_address: customerData.address || customerData.street_address || null,
        city: customerData.city || null,
        state: customerData.state || null,
        zip_code: customerData.zip_code || null,
        notes: customerData.notes || null,
        external_id: customerData.external_id || null
      })
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  },
  
  update: async (customerId, customerData) => {
    const { data, error } = await supabase
      .from('customers')
      .update({
        name: customerData.name,
        email: customerData.email || null,
        phone: customerData.phone || null,
        street_address: customerData.address || customerData.street_address || null,
        city: customerData.city || null,
        state: customerData.state || null,
        zip_code: customerData.zip_code || null,
        notes: customerData.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  },
  
  delete: async (customerId) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    
    if (error) throw error;
    return { success: true };
  },
  
  // Fetch trucks linked to a customer
  getTrucks: async (customerId) => {
    const { data, error } = await supabase
      .from('trucks')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data: data || [] };
  },
  
  // Fetch trucks not assigned to any customer (for assignment)
  getUnassignedTrucks: async () => {
    const { data, error } = await supabase
      .from('trucks')
      .select('*')
      .is('customer_id', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data: data || [] };
  },
  
  // Assign an existing truck to a customer
  assignTruck: async (truckId, customerId) => {
    const { data, error } = await supabase
      .from('trucks')
      .update({ 
        customer_id: customerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', truckId)
      .select()
      .single();
    
    if (error) throw error;
    return { data };
  },
  
  getProjects: async (customerId) => {
    // Fetch work orders associated with a customer.
    // Primary linkage is via trucks.customer_id -> work_orders.truck_id.
    // Fallbacks are included for legacy work orders that may not have truck_id set.

    // Fetch customer info for fallback matching
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, external_id')
      .eq('id', customerId)
      .maybeSingle();

    if (customerError) throw customerError;

    // First get the truck IDs for this customer
    const { data: trucks, error: truckError } = await supabase
      .from('trucks')
      .select('id')
      .eq('customer_id', customerId);

    if (truckError) throw truckError;

    const truckIds = (trucks || []).map((t) => t.id);

    const selectWorkOrders = `
      *,
      truck:trucks(id, vin, truck_number, make, model, year)
    `;

    const queries = [];

    // Preferred: work orders linked to the customer's trucks
    if (truckIds.length > 0) {
      queries.push(
        supabase
          .from('work_orders')
          .select(selectWorkOrders)
          .in('truck_id', truckIds)
          .order('created_at', { ascending: false })
      );
    }

    // Fallback: work orders linked by external customer reference
    if (customer?.external_id) {
      queries.push(
        supabase
          .from('work_orders')
          .select(selectWorkOrders)
          .eq('customer_id_ref', customer.external_id)
          .order('created_at', { ascending: false })
      );
    }

    // Fallback: work orders linked by customer name (legacy)
    if (customer?.name) {
      queries.push(
        supabase
          .from('work_orders')
          .select(selectWorkOrders)
          .eq('customer_name', customer.name)
          .order('created_at', { ascending: false })
      );
    }

    if (queries.length === 0) {
      return { data: [] };
    }

    const responses = await Promise.all(queries);

    // Merge + de-dupe
    const byId = new Map();
    for (const res of responses) {
      if (res.error) throw res.error;
      for (const wo of res.data || []) {
        byId.set(wo.id, wo);
      }
    }

    const merged = Array.from(byId.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Enrich with truck_number for display
    const enrichedData = merged.map((wo) => ({
      ...wo,
      truck_number: wo.truck?.truck_number || wo.extracted_unit_number || null,
    }));

    return { data: enrichedData };
  },
  
  getInvoices: async () => {
    return { data: { invoices: [] } };
  }
};
