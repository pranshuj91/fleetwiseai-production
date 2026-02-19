import { supabase } from '@/integrations/supabase/client';
import { getEffectiveCompanyId } from '@/lib/companyContext';

// Use centralized company context that respects impersonation
const getUserCompanyId = getEffectiveCompanyId;

export const truckAPI = {
  // List all trucks for a company
  list: async (companyId) => {
    const effectiveCompanyId = companyId || await getUserCompanyId();
    
    const { data, error } = await supabase
      .from('trucks')
      .select(`
        *,
        customer:customers(id, name)
      `)
      .eq('company_id', effectiveCompanyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to match expected format with identity object
    const transformed = (data || []).map(truck => ({
      id: truck.id,
      company_id: truck.company_id,
      customer_id: truck.customer_id,
      customer_name: truck.customer?.name || null,
      identity: {
        vin: truck.vin,
        unit_id: truck.unit_id,
        truck_number: truck.truck_number,
        year: truck.year,
        make: truck.make,
        model: truck.model,
        vehicle_class: truck.vehicle_class,
        body_type: truck.body_type,
        odometer_mi: truck.odometer_miles,
        engine_hours: truck.engine_hours,
      },
      in_service_date: truck.in_service_date || null,
      data_completeness: calculateDataCompleteness(truck),
      created_at: truck.created_at,
      updated_at: truck.updated_at,
    }));

    return { data: transformed };
  },

  // Get a single truck by ID
  get: async (truckId) => {
    const { data, error } = await supabase
      .from('trucks')
      .select(`
        *,
        customer:customers(id, name, email, phone)
      `)
      .eq('id', truckId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { data: null };

    // Transform to expected format
    const transformed = {
      id: data.id,
      company_id: data.company_id,
      customer_id: data.customer_id,
      customer_name: data.customer?.name || data.customer_name || null,
      customer: data.customer,
      identity: {
        vin: data.vin,
        unit_id: data.unit_id,
        truck_number: data.truck_number,
        year: data.year,
        make: data.make,
        model: data.model,
        vehicle_class: data.vehicle_class,
        body_type: data.body_type,
        odometer_mi: data.odometer_miles,
        engine_hours: data.engine_hours,
        license_plate: data.license_plate,
        fleet_assignment: data.fleet_assignment,
      },
      notes: data.notes,
      shop_notes: data.shop_notes,
      in_service_date: data.in_service_date || null,
      engine: data.engine || {},
      transmission: data.transmission || {},
      drivetrain: data.drivetrain || {},
      braking: data.braking || {},
      fuel_system: data.fuel_system || {},
      maintenance: data.maintenance || {},
      data_completeness: calculateDataCompleteness(data),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { data: transformed };
  },

  // Create a new truck
  create: async (truckData) => {
    const companyId = truckData.company_id || await getUserCompanyId();
    const identity = truckData.identity || {};

    // Validate VIN
    const vin = identity.vin?.toUpperCase();
    if (!vin || vin.length !== 17) {
      throw new Error('VIN must be exactly 17 characters');
    }

    const insertData = {
      company_id: companyId,
      customer_id: truckData.customer_id || null,
      vin: vin,
      unit_id: identity.unit_id || null,
      truck_number: identity.truck_number || null,
      year: identity.year || null,
      make: identity.make || null,
      model: identity.model || null,
      vehicle_class: identity.vehicle_class || null,
      body_type: identity.body_type || null,
      odometer_miles: identity.odometer_mi || null,
      engine_hours: identity.engine_hours || null,
    };

    const { data, error } = await supabase
      .from('trucks')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('A truck with this VIN already exists');
      }
      throw error;
    }

    return { data };
  },

  // Update an existing truck
  update: async (truckId, truckData) => {
    const identity = truckData.identity || {};

    const updateData = {};
    
    // Top-level fields
    if (truckData.customer_id !== undefined) {
      updateData.customer_id = truckData.customer_id || null;
    }
    if (truckData.customer_name !== undefined) updateData.customer_name = truckData.customer_name || null;
    if (truckData.notes !== undefined) updateData.notes = truckData.notes || null;
    if (truckData.shop_notes !== undefined) updateData.shop_notes = truckData.shop_notes || null;

    // Identity fields
    if (identity.vin) updateData.vin = identity.vin.toUpperCase();
    if (identity.unit_id !== undefined) updateData.unit_id = identity.unit_id || null;
    if (identity.truck_number !== undefined) updateData.truck_number = identity.truck_number || null;
    if (identity.year !== undefined) {
      const yearValue = identity.year === '' ? null : parseInt(identity.year, 10);
      updateData.year = isNaN(yearValue) ? null : yearValue;
    }
    if (identity.make !== undefined) updateData.make = identity.make || null;
    if (identity.model !== undefined) updateData.model = identity.model || null;
    if (identity.vehicle_class !== undefined) updateData.vehicle_class = identity.vehicle_class || null;
    if (identity.body_type !== undefined) updateData.body_type = identity.body_type || null;
    if (identity.odometer_mi !== undefined) {
      const odometerValue = identity.odometer_mi === '' ? null : parseInt(identity.odometer_mi, 10);
      updateData.odometer_miles = isNaN(odometerValue) ? null : odometerValue;
    }
    if (identity.engine_hours !== undefined) {
      const engineHoursValue = identity.engine_hours === '' ? null : parseInt(identity.engine_hours, 10);
      updateData.engine_hours = isNaN(engineHoursValue) ? null : engineHoursValue;
    }
    if (identity.license_plate !== undefined) updateData.license_plate = identity.license_plate || null;
    if (identity.fleet_assignment !== undefined) updateData.fleet_assignment = identity.fleet_assignment || null;

    // JSONB section fields
    if (truckData.engine !== undefined) updateData.engine = truckData.engine || {};
    if (truckData.transmission !== undefined) updateData.transmission = truckData.transmission || {};
    if (truckData.drivetrain !== undefined) updateData.drivetrain = truckData.drivetrain || {};
    if (truckData.emissions !== undefined) updateData.emissions = truckData.emissions || {};
    if (truckData.electronics !== undefined) updateData.electronics = truckData.electronics || {};
    if (truckData.braking !== undefined) updateData.braking = truckData.braking || {};
    if (truckData.electrical !== undefined) updateData.electrical = truckData.electrical || {};
    if (truckData.fuel_system !== undefined) updateData.fuel_system = truckData.fuel_system || {};
    if (truckData.cooling !== undefined) updateData.cooling = truckData.cooling || {};
    if (truckData.maintenance !== undefined) updateData.maintenance = truckData.maintenance || {};

    const { data, error } = await supabase
      .from('trucks')
      .update(updateData)
      .eq('id', truckId)
      .select(`
        *,
        customer:customers(id, name, email, phone)
      `)
      .single();

    if (error) throw error;

    // Transform to expected format (same as get)
    const transformed = {
      id: data.id,
      company_id: data.company_id,
      customer_id: data.customer_id,
      customer_name: data.customer?.name || data.customer_name || null,
      customer: data.customer,
      identity: {
        vin: data.vin,
        unit_id: data.unit_id,
        truck_number: data.truck_number,
        year: data.year,
        make: data.make,
        model: data.model,
        vehicle_class: data.vehicle_class,
        body_type: data.body_type,
        odometer_mi: data.odometer_miles,
        engine_hours: data.engine_hours,
        license_plate: data.license_plate,
        fleet_assignment: data.fleet_assignment,
      },
      notes: data.notes,
      shop_notes: data.shop_notes,
      in_service_date: data.in_service_date || null,
      engine: data.engine || {},
      transmission: data.transmission || {},
      drivetrain: data.drivetrain || {},
      braking: data.braking || {},
      fuel_system: data.fuel_system || {},
      maintenance: data.maintenance || {},
      data_completeness: calculateDataCompleteness(data),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { data: transformed };
  },

  // Delete a truck and all associated data
  delete: async (truckId) => {
    // Delete related records in order to avoid FK constraint violations
    // 1. Delete diagnostic chat messages for sessions linked to this truck
    const { data: sessions } = await supabase
      .from('diagnostic_chat_sessions')
      .select('id')
      .eq('truck_id', truckId);
    
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      await supabase
        .from('diagnostic_chat_messages')
        .delete()
        .in('session_id', sessionIds);
    }

    // 2. Delete diagnostic chat sessions
    await supabase
      .from('diagnostic_chat_sessions')
      .delete()
      .eq('truck_id', truckId);

    // 3. Delete work order related data (parts, labor, tasks) for work orders linked to this truck
    const { data: workOrders } = await supabase
      .from('work_orders')
      .select('id')
      .eq('truck_id', truckId);

    if (workOrders && workOrders.length > 0) {
      const workOrderIds = workOrders.map(wo => wo.id);
      
      // Delete parts, labor, and tasks for these work orders
      await Promise.all([
        supabase.from('work_order_parts').delete().in('work_order_id', workOrderIds),
        supabase.from('work_order_labor').delete().in('work_order_id', workOrderIds),
        supabase.from('work_order_tasks').delete().in('work_order_id', workOrderIds),
      ]);
    }

    // 4. Delete work orders (or set truck_id to null to preserve history)
    await supabase
      .from('work_orders')
      .delete()
      .eq('truck_id', truckId);

    // 5. Delete maintenance records
    await supabase
      .from('maintenance_records')
      .delete()
      .eq('truck_id', truckId);

    // 6. Finally delete the truck
    const { error } = await supabase
      .from('trucks')
      .delete()
      .eq('id', truckId);

    if (error) throw error;

    return { success: true };
  },
};

// Calculate data completeness percentage
function calculateDataCompleteness(truck) {
  const fields = [
    truck.vin,
    truck.unit_id || truck.truck_number,
    truck.year,
    truck.make,
    truck.model,
    truck.vehicle_class,
    truck.body_type,
    truck.odometer_miles,
    truck.engine_hours,
    truck.customer_id,
  ];
  
  const filledFields = fields.filter(f => f !== null && f !== undefined && f !== '').length;
  return Math.round((filledFields / fields.length) * 100);
}

export default truckAPI;
