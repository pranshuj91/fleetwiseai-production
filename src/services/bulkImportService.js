/**
 * Bulk Import Service - Handles truck CSV import with customer auto-linking
 * Implements upsert logic and flexible column mapping
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  createColumnMapping, 
  transformRow, 
  validateColumnMapping,
  parseDate 
} from './csvColumnMapper';

/**
 * Parse CSV text into rows with multi-line field support
 * Handles quoted fields that span multiple lines
 * @param {string} text - Raw CSV text
 * @returns {string[][]} Array of row arrays
 */
function parseCSVWithMultiline(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentField += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Skip carriage return if followed by newline
      if (char === '\r' && text[i + 1] === '\n') {
        continue;
      }
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(cell => cell)) { // Only add non-empty rows
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }
  
  // Don't forget last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell)) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

/**
 * Check if a row is an instruction/metadata row that should be skipped
 * @param {string[]} values - Row values
 * @param {string} rawLine - Original line text (if available)
 * @returns {boolean} True if row should be skipped
 */
function isInstructionRow(values, rawLine = '') {
  const firstCell = (values[0] || '').toLowerCase();
  const rowContent = rawLine.toLowerCase() || values.join(',').toLowerCase();
  
  // Skip instruction/title rows
  if (firstCell.includes('this is the title') || 
      firstCell.includes('only include columns') ||
      firstCell.includes('instruction') ||
      firstCell.includes('do not include')) {
    return true;
  }
  
  // Skip AS400 code header rows (contain " - value" pattern like "EN - Value", "AD - Value")
  if (rowContent.includes(' - value')) {
    return true;
  }
  
  // Skip rows where first cell looks like a header instruction
  if (firstCell.startsWith('note:') || firstCell.startsWith('required:')) {
    return true;
  }
  
  return false;
}

/**
 * Detect if a row contains actual data (not headers/instructions)
 * @param {string[]} values - Row values
 * @returns {boolean} True if row appears to be data
 */
function isDataRow(values) {
  // Check for VIN pattern (17 alphanumeric chars, no I, O, Q)
  const hasVINPattern = values.some(v => 
    typeof v === 'string' && 
    /^[A-HJ-NPR-Z0-9]{17}$/i.test(v.replace(/[^A-Z0-9]/gi, ''))
  );
  
  // Check for numeric unit number pattern
  const hasNumericFirst = /^\d{3,}$/.test(values[0]?.trim() || '');
  const hasNumericSecond = /^\d{3,}$/.test(values[1]?.trim() || '');
  
  return hasVINPattern || hasNumericFirst || hasNumericSecond;
}

/**
 * Parse CSV text into rows with enterprise format support
 * Handles multi-row headers, instruction rows, and AS400 code rows
 * @param {string} text - Raw CSV text
 * @returns {{ headers: string[], rows: string[][], skippedRows: number }}
 */
function parseCSV(text) {
  // Use multi-line aware parser
  const allRows = parseCSVWithMultiline(text);
  
  if (allRows.length < 1) return { headers: [], rows: [], skippedRows: 0 };
  
  // Find the actual header row by skipping instruction rows
  let headerIndex = 0;
  let skippedRows = 0;
  
  // Look at first 10 rows to find actual header
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const values = allRows[i];
    
    // Skip completely empty rows
    if (!values.some(v => v && v.trim())) {
      skippedRows++;
      continue;
    }
    
    // Skip instruction/metadata rows
    if (isInstructionRow(values)) {
      skippedRows++;
      continue;
    }
    
    // If this row looks like actual data (has VIN pattern), 
    // the previous non-skipped row was the header
    if (isDataRow(values) && i > 0) {
      // Go back to find the last non-instruction row as header
      for (let j = i - 1; j >= 0; j--) {
        if (!isInstructionRow(allRows[j]) && allRows[j].some(v => v && v.trim())) {
          headerIndex = j;
          skippedRows = j; // All rows before header are skipped
          break;
        }
      }
      break;
    }
    
    // Found a non-instruction row that's not data - assume it's the header
    headerIndex = i;
    skippedRows = i;
    break;
  }
  
  const headers = allRows[headerIndex];
  
  // Get data rows (everything after header, excluding instruction rows)
  const rows = allRows.slice(headerIndex + 1).filter(values => {
    // Filter out any remaining instruction rows in data section
    if (isInstructionRow(values)) {
      return false;
    }
    // Filter out completely empty rows
    if (!values.some(v => v && v.trim())) {
      return false;
    }
    return true;
  });
  
  return { headers, rows, skippedRows };
}

/**
 * Find or create customer by external_id within a company
 * @param {string} externalId - Customer external ID (e.g., customer number)
 * @param {string} customerName - Customer name for creation
 * @param {string} companyId - Company ID for tenant isolation
 * @returns {Promise<string|null>} Customer ID or null
 */
async function findOrCreateCustomer(externalId, customerName, companyId) {
  if (!externalId && !customerName) return null;
  
  // First, try to find by external_id
  if (externalId) {
    const { data: existingByExternalId } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .eq('external_id', externalId)
      .maybeSingle();
    
    if (existingByExternalId) {
      return existingByExternalId.id;
    }
  }
  
  // Try to find by exact name match if no external_id or not found
  if (customerName) {
    const { data: existingByName } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .ilike('name', customerName)
      .maybeSingle();
    
    if (existingByName) {
      // Update external_id if we found by name but had an external_id
      if (externalId && existingByName.id) {
        await supabase
          .from('customers')
          .update({ external_id: externalId })
          .eq('id', existingByName.id);
      }
      return existingByName.id;
    }
  }
  
  // Create new customer
  const insertData = {
    company_id: companyId,
    name: customerName || `Customer ${externalId}`,
    external_id: externalId || null,
  };
  
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert(insertData)
    .select('id')
    .single();
  
  if (error) {
    console.error('[BulkImport] Failed to create customer:', error);
    return null;
  }
  
  return newCustomer.id;
}

/**
 * Check if a truck with the given VIN exists for the company
 * @param {string} vin - VIN to check
 * @param {string} companyId - Company ID
 * @returns {Promise<Object|null>} Existing truck or null
 */
async function findTruckByVin(vin, companyId) {
  if (!vin) return null;
  
  const { data } = await supabase
    .from('trucks')
    .select('id')
    .eq('company_id', companyId)
    .eq('vin', vin.toUpperCase())
    .maybeSingle();
  
  return data;
}

/**
 * Map a transformed row to truck database schema
 * @param {Object} row - Transformed row with standardized field names
 * @param {string} companyId - Company ID
 * @param {string|null} customerId - Resolved customer ID
 * @returns {Object} Truck data ready for insert/update
 */
function mapRowToTruckData(row, companyId, customerId) {
  const year = parseInt(row.year) || null;
  const odometer = parseInt(row.odometer) || null;
  const engineHours = parseInt(row.engine_hours) || null;
  const inServiceDate = parseDate(row.in_service_date);
  
  // Generate temp VIN only if absolutely necessary
  let vin = row.vin?.toUpperCase()?.trim();
  if (!vin && row.truck_number) {
    // Use truck number to create a placeholder VIN (will fail validation intentionally)
    vin = null; // Don't create invalid VINs
  }
  
  // Helper to build JSONB objects - only include non-null/non-empty values
  const buildJsonb = (obj) => {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        result[key] = value;
      }
    }
    return Object.keys(result).length > 0 ? result : {};
  };
  
  const truckData = {
    company_id: companyId,
    customer_id: customerId,
    vin: vin,
    unit_id: row.truck_number || null,
    truck_number: row.truck_number || null,
    year: year,
    make: row.make || null,
    model: row.model || null,
    vehicle_class: row.vehicle_class || null,
    body_type: row.body_type || null,
    odometer_miles: odometer,
    engine_hours: engineHours,
    license_plate: row.license_plate || null,
    fleet_assignment: row.fleet_assignment || null,
    customer_name: row.customer_name || null,
    notes: row.notes || null,
    in_service_date: inServiceDate,
    
    // Engine JSONB - includes key_code
    engine: buildJsonb({
      manufacturer: row.engine_manufacturer || null,
      model: row.engine_model || null,
      serial_number: row.engine_serial || null,
      horsepower: row.engine_horsepower ? parseInt(row.engine_horsepower) : null,
      fuel_type: row.fuel_type || null,
      key_code: row.key_code || null,
    }),
    
    // Transmission JSONB - includes serial_number
    transmission: buildJsonb({
      manufacturer: row.transmission_manufacturer || null,
      model: row.transmission_model || null,
      type: row.transmission_type || null,
      speeds: row.transmission_speeds ? parseInt(row.transmission_speeds) : null,
      serial_number: row.transmission_serial || null,
    }),
    
    // Drivetrain JSONB - includes front axle and fifth wheel
    drivetrain: buildJsonb({
      rear_axle_manufacturer: row.rear_axle_manufacturer || null,
      rear_axle_ratio: row.rear_axle_ratio || null,
      rear_axle_type: row.rear_axle_type || null,
      front_axle_model: row.front_axle_model || null,
      front_axle_serial: row.front_axle_serial || null,
      fifth_wheel_model: row.fifth_wheel_model || null,
      fifth_wheel_serial: row.fifth_wheel_serial || null,
    }),
    
    // Emissions JSONB
    emissions: buildJsonb({
      standard: row.emission_standard || null,
    }),
    
    // Braking JSONB - includes brake_type and air_drier
    braking: buildJsonb({
      brake_type: row.brake_type || null,
      air_drier: row.air_drier || null,
    }),
    
    // Fuel system JSONB - includes tank_size
    fuel_system: buildJsonb({
      tank_size: row.fuel_tank_size || null,
    }),
    
    // Maintenance JSONB - includes body, liftgate, apu, reefer, and other metadata
    maintenance: buildJsonb({
      // Body details
      body: (row.body_manufacturer || row.body_model || row.body_serial || row.body_length || row.rear_door_type) ? buildJsonb({
        manufacturer: row.body_manufacturer || null,
        model: row.body_model || null,
        serial_number: row.body_serial || null,
        length: row.body_length || null,
        rear_door_type: row.rear_door_type || null,
      }) : null,
      // Liftgate details
      liftgate: (row.liftgate_manufacturer || row.liftgate_model || row.liftgate_serial) ? buildJsonb({
        manufacturer: row.liftgate_manufacturer || null,
        model: row.liftgate_model || null,
        serial_number: row.liftgate_serial || null,
      }) : null,
      // APU details
      apu: (row.apu_manufacturer || row.apu_model || row.apu_serial) ? buildJsonb({
        manufacturer: row.apu_manufacturer || null,
        model: row.apu_model || null,
        serial_number: row.apu_serial || null,
      }) : null,
      // Reefer details
      reefer: row.reefer_manufacturer ? buildJsonb({
        manufacturer: row.reefer_manufacturer || null,
      }) : null,
      // Additional metadata
      vehicle_height: row.vehicle_height || null,
      location_code: row.location_code || null,
      location_description: row.location_description || null,
      equipment_pool: row.equipment_pool || null,
      customer_unit_number: row.customer_unit_number || null,
    }),
    
    // Empty JSONB for other systems
    electrical: {},
    electronics: {},
    cooling: {},
  };
  
  return truckData;
}

/**
 * Process a single row - upsert truck with customer linking
 * @param {Object} row - Transformed row
 * @param {string} companyId - Company ID
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Promise<Object>} Result { success: boolean, action: string, error?: string }
 */
async function processRow(row, companyId, rowNumber) {
  try {
    // Validate required fields
    const vin = row.vin?.toUpperCase()?.trim();
    const truckNumber = row.truck_number?.trim();
    
    if (!vin && !truckNumber) {
      return { success: false, action: 'skipped', error: 'Either VIN or Truck Number is required' };
    }
    
    if (vin && vin.length !== 17) {
      return { success: false, action: 'skipped', error: `Invalid VIN length: ${vin.length} (expected 17)` };
    }
    
    // Resolve customer
    let customerId = null;
    const customerNumber = row.customer_number?.trim();
    const customerName = row.customer_name?.trim();
    
    if (customerNumber || customerName) {
      customerId = await findOrCreateCustomer(customerNumber, customerName, companyId);
    }
    
    // Check if truck exists (by VIN)
    const existingTruck = vin ? await findTruckByVin(vin, companyId) : null;
    
    // Prepare truck data
    const truckData = mapRowToTruckData(row, companyId, customerId);
    
    if (existingTruck) {
      // UPDATE existing truck
      delete truckData.company_id; // Don't update company_id
      delete truckData.vin; // Don't update VIN (it's the unique identifier)
      
      const { error } = await supabase
        .from('trucks')
        .update(truckData)
        .eq('id', existingTruck.id);
      
      if (error) {
        return { success: false, action: 'update_failed', error: error.message };
      }
      
      return { success: true, action: 'updated' };
    } else {
      // INSERT new truck
      if (!vin) {
        return { success: false, action: 'skipped', error: 'VIN is required for new trucks' };
      }
      
      const { error } = await supabase
        .from('trucks')
        .insert(truckData);
      
      if (error) {
        if (error.code === '23505') {
          return { success: false, action: 'skipped', error: 'Duplicate VIN' };
        }
        return { success: false, action: 'insert_failed', error: error.message };
      }
      
      return { success: true, action: 'created' };
    }
  } catch (err) {
    console.error(`[BulkImport] Error processing row ${rowNumber}:`, err);
    return { success: false, action: 'error', error: err.message };
  }
}

/**
 * Main bulk import function
 * @param {string} csvText - Raw CSV text
 * @param {string} companyId - Company ID for tenant isolation
 * @param {Function} onProgress - Progress callback (current, total)
 * @param {number[]} excludedIndices - Array of row indices to skip (0-based, relative to data rows)
 * @returns {Promise<Object>} Import results
 */
export async function bulkImportTrucks(csvText, companyId, onProgress = null, excludedIndices = []) {
  console.log('[BulkImport] Starting bulk import...');
  
  // Parse CSV
  const { headers, rows } = parseCSV(csvText);
  
  // Debug: log detected headers and their mappings
  console.log('[BulkImport] Detected headers:', headers);
  
  if (rows.length === 0) {
    return {
      success: false,
      error: 'No data rows found in CSV',
      summary: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
      errors: [],
    };
  }
  
  // Convert excluded indices to a Set for O(1) lookup
  const excludedSet = new Set(excludedIndices);
  
  // Filter out excluded rows
  const rowsToProcess = rows
    .map((row, idx) => ({ row, originalIndex: idx }))
    .filter(({ originalIndex }) => !excludedSet.has(originalIndex));
  
  console.log(`[BulkImport] Found ${headers.length} columns, ${rows.length} total rows, ${rowsToProcess.length} selected for import`);
  console.log('[BulkImport] Headers:', headers);
  
  if (rowsToProcess.length === 0) {
    return {
      success: false,
      error: 'No rows selected for import',
      summary: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
      errors: [],
    };
  }
  
  // Create column mapping
  const columnMapping = createColumnMapping(headers);
  const validation = validateColumnMapping(columnMapping);
  
  console.log('[BulkImport] Column mapping:', columnMapping);
  console.log('[BulkImport] Mapped fields:', validation.mappedFields);
  
  if (!validation.isValid) {
    return {
      success: false,
      error: `Missing required columns: ${validation.missingFields.join(', ')}`,
      summary: { total: rowsToProcess.length, created: 0, updated: 0, skipped: 0, failed: 0 },
      errors: [],
      warnings: validation.warnings,
    };
  }
  
  // Process rows
  const results = {
    total: rowsToProcess.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
  const errors = [];
  
  for (let i = 0; i < rowsToProcess.length; i++) {
    const { row: values, originalIndex } = rowsToProcess[i];
    const rowNumber = originalIndex + 2; // +2 for header and 1-based index
    
    // Transform row using column mapping
    const transformedRow = transformRow(values, columnMapping);
    
    // Process the row
    const result = await processRow(transformedRow, companyId, rowNumber);
    
    if (result.success) {
      if (result.action === 'created') results.created++;
      else if (result.action === 'updated') results.updated++;
    } else {
      if (result.action === 'skipped') {
        results.skipped++;
      } else {
        results.failed++;
      }
      errors.push({ row: rowNumber, error: result.error, action: result.action });
    }
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, rowsToProcess.length);
    }
  }
  
  console.log('[BulkImport] Import complete:', results);
  
  return {
    success: true,
    summary: results,
    errors: errors.slice(0, 50), // Limit error list
    warnings: validation.warnings,
    columnMapping: validation.mappedFields,
  };
}

/**
 * Import trucks from pre-processed/edited preview data
 * @param {Array} previewRows - Array of edited truck data objects
 * @param {string} companyId - Company ID for tenant isolation
 * @param {Function} onProgress - Progress callback (current, total)
 * @param {number[]} excludedIndices - Array of row indices to skip (0-based)
 * @returns {Promise<Object>} Import results
 */
export async function bulkImportFromPreview(previewRows, companyId, onProgress = null, excludedIndices = []) {
  console.log('[BulkImport] Starting bulk import from preview data...');
  
  if (!previewRows || previewRows.length === 0) {
    return {
      success: false,
      error: 'No data to import',
      summary: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
      errors: [],
    };
  }
  
  // Convert excluded indices to a Set for O(1) lookup
  const excludedSet = new Set(excludedIndices);
  
  // Filter out excluded rows
  const rowsToProcess = previewRows
    .map((row, idx) => ({ row, originalIndex: idx }))
    .filter(({ originalIndex }) => !excludedSet.has(originalIndex));
  
  console.log(`[BulkImport] ${previewRows.length} total rows, ${rowsToProcess.length} selected for import`);
  
  if (rowsToProcess.length === 0) {
    return {
      success: false,
      error: 'No rows selected for import',
      summary: { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 },
      errors: [],
    };
  }
  
  // Process rows
  const results = {
    total: rowsToProcess.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
  const errors = [];
  
  for (let i = 0; i < rowsToProcess.length; i++) {
    const { row, originalIndex } = rowsToProcess[i];
    const rowNumber = row.rowNumber || (originalIndex + 2);
    
    // The row is already transformed, just clean up internal fields
    const cleanRow = { ...row };
    delete cleanRow._status;
    delete cleanRow._statusMessage;
    delete cleanRow.rowNumber;
    
    // Process the row
    const result = await processRow(cleanRow, companyId, rowNumber);
    
    if (result.success) {
      if (result.action === 'created') results.created++;
      else if (result.action === 'updated') results.updated++;
    } else {
      if (result.action === 'skipped') {
        results.skipped++;
      } else {
        results.failed++;
      }
      errors.push({ row: rowNumber, error: result.error, action: result.action });
    }
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, rowsToProcess.length);
    }
  }
  
  console.log('[BulkImport] Import complete:', results);
  
  return {
    success: true,
    summary: results,
    errors: errors.slice(0, 50),
    warnings: [],
  };
}

/**
 * Preview CSV data with column mapping
 * @param {string} csvText - Raw CSV text
 * @returns {Object} Preview data
 */
export function previewCSV(csvText) {
  const { headers, rows, skippedRows } = parseCSV(csvText);
  
  if (rows.length === 0) {
    return { success: false, error: 'No data rows found', data: [], skippedRows };
  }
  
  const columnMapping = createColumnMapping(headers);
  const validation = validateColumnMapping(columnMapping);
  
  // Transform all rows for preview (up to 5000 limit)
  // Row numbers account for skipped instruction rows + header
  const previewRows = rows.map((values, i) => {
    const transformed = transformRow(values, columnMapping);
    const vin = transformed.vin?.toUpperCase()?.trim();
    const truckNumber = transformed.truck_number?.trim();
    
    let status = 'valid';
    let statusMessage = '';
    
    if (!vin && !truckNumber) {
      status = 'error';
      statusMessage = 'Missing VIN and Truck Number';
    } else if (vin && vin.length !== 17) {
      status = 'warning';
      statusMessage = `Invalid VIN length: ${vin.length}`;
    }
    
    return {
      rowNumber: i + skippedRows + 2, // Account for skipped rows + header + 1-based index
      ...transformed,
      _status: status,
      _statusMessage: statusMessage,
    };
  });
  
  // Build header-to-field mapping for UI display
  const headerToFieldMap = {};
  for (const [indexStr, fieldName] of Object.entries(columnMapping)) {
    const index = parseInt(indexStr, 10);
    if (headers[index]) {
      headerToFieldMap[headers[index]] = fieldName;
    }
  }
  
  // Identify ignored headers (not mapped to any field)
  const ignoredHeaders = headers.filter((header, idx) => !columnMapping.hasOwnProperty(idx));
  
  return {
    success: true,
    totalRows: rows.length,
    previewRows,
    columnMapping: validation.mappedFields,
    headerToFieldMap,
    ignoredHeaders,
    warnings: validation.warnings,
    isValid: validation.isValid,
    missingFields: validation.missingFields,
    originalHeaders: headers,
    skippedRows,
    parsingNote: skippedRows > 0 
      ? `Skipped ${skippedRows} instruction/header row(s)` 
      : null,
  };
}

export default {
  bulkImportTrucks,
  bulkImportFromPreview,
  previewCSV,
};