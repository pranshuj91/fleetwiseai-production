/**
 * CSV Column Mapper - Flexible column mapping for enterprise fleet exports
 * Maps various column name aliases to standardized field names
 */

// Column alias mappings - lowercase keys for case-insensitive matching
// Supports enterprise/AS400 style headers and common variations
const COLUMN_ALIASES = {
  // VIN mappings - VIN takes priority over Item Serial Number
  vin: [
    'vin', 
    'vehicle identification number',
    'item serial number', 
    'equipment serial number', 
    'serial number',
    'v.i.n.',
    'vin number',
    'vin#',
    'vehicle vin',
    'chassis number',
    'frame number',
  ],
  
  // Truck number / Unit ID mappings - Unit Number takes priority
  // NOTE: "customer unit number" is intentionally NOT here - it maps to customer_unit_number instead
  truck_number: [
    'unit number',
    'unit no',
    'unit#',
    'truck number', 
    'truck no',
    'truck#',
    'unit_number', 
    'truck_no', 
    'unit', 
    'unit_id',
    'unit id',
    'equipment number',
    'equipment no',
    'equipment#',
    'asset number',
    'asset no',
    'asset#',
    'fleet number',
    'vehicle number',
    'vehicle no',
    'vehicle#',
  ],
  
  // Make / Manufacturer mappings
  make: [
    'manufacturer name',
    'equipment manufacturer',
    'make',
    'manufacturer',
    'mfr',
    'mfg',
    'brand',
    'vehicle make',
    'chassis make',
    'chassis manufacturer',
    'truck make',
    'oem',
  ],
  
  // Model mappings
  model: [
    'equipment model',
    'model description',
    'model',
    'vehicle model',
    'model name',
    'chassis model',
    'truck model',
    'model number',
    'model no',
    'model#',
  ],
  
  // Year mappings
  year: [
    'year',
    'model year',
    'vehicle year',
    'year built',
    'mfg year',
    'manufacture year',
    'yr',
    'build year',
    'production year',
  ],
  
  // Customer mappings
  customer_name: [
    'customer name',
    'customer',
    'owner name',
    'owner',
    'fleet name',
    'company name',
    'client name',
    'account name',
    'business name',
    'lessee name',
    'lessee',
  ],
  customer_number: [
    'customer number',
    'customer no',
    'customer#',
    'customer id',
    'customer_id',
    'cust number',
    'cust no',
    'cust#',
    'cust_no',
    'customer code',
    'client number',
    'client no',
    'client#',
    'client id',
    'account number',
    'account no',
    'account#',
    'account id',
    'acct number',
    'acct no',
    'acct#',
  ],
  
  // Odometer / Mileage mappings
  odometer: [
    'current mileage',
    'odometer',
    'mileage',
    'odometer miles',
    'miles',
    'odometer_miles',
    'current miles',
    'total miles',
    'hub miles',
    'hubometer',
    'hub odometer',
    'actual mileage',
    'current odometer',
  ],
  
  // Engine hours mappings
  engine_hours: [
    'engine hours',
    'hours',
    'engine_hours',
    'total hours',
    'operating hours',
    'run hours',
    'meter hours',
    'hour meter',
    'hourmeter',
    'eng hours',
    'eng hrs',
  ],
  
  // License plate mappings
  license_plate: [
    'license plate',
    'license_plate',
    'plate number',
    'plate no',
    'plate#',
    'plate',
    'tag number',
    'tag no',
    'tag#',
    'tag',
    'registration',
    'registration number',
    'reg number',
    'reg no',
    'license number',
    'license no',
  ],
  
  // In service date mappings
  in_service_date: [
    'date in service',
    'in service date',
    'in_service_date',
    'service date',
    'acquisition date',
    'purchase date',
    'start date',
    'inservice date',
    'delivery date',
    'put in service',
    'activation date',
    'first use date',
  ],
  
  // Location code mappings - numeric location identifiers (e.g., 155, 160, 110)
  location_code: [
    'location #',
    'location no',
    'location number',
    'facility code',
    'current facility code',
    'loc #',
    'loc no',
  ],
  
  // Fleet assignment mappings - removed 'location' to prevent conflict with location_code
  fleet_assignment: [
    'fleet assignment',
    'fleet_assignment',
    'fleet',
    'division',
    'department',
    'branch',
    'terminal',
    'yard',
    'depot',
    'region',
    'district',
    'area',
    'site',
  ],
  
  // Vehicle class mappings - NOTE: "equipment type" is here but "equipment type description" maps to body_type
  vehicle_class: [
    'vehicle class',
    'class',
    'equipment type',
    'asset type',
    'vehicle type',
    'truck type',
    'equipment class',
    'asset class',
    'veh class',
    'classification',
    'category',
  ],
  
  // Body type mappings - also maps Equipment Type Description
  body_type: [
    'body type',
    'body_type',
    'body style',
    'configuration',
    'body configuration',
    'box type',
    'trailer type',
    'cargo type',
    'equipment type description',
  ],
  
  // Engine details
  engine_manufacturer: [
    'engine manufacturer',
    'engine make',
    'engine_manufacturer',
    'eng manufacturer',
    'eng make',
    'engine mfr',
    'engine mfg',
    'motor manufacturer',
    'motor make',
    'en',
    'en value',
    'en - value',
    'en-value',
  ],
  engine_model: [
    'engine model',
    'engine_model',
    'engine type',
    'eng model',
    'motor model',
    'engine model number',
    'engine model no',
    'enm',
    'enm value',
    'enm - value',
  ],
  engine_serial: [
    'engine serial',
    'engine serial number',
    'engine serial no',
    'engine serial#',
    'engine_serial',
    'eng serial',
    'eng serial number',
    'eng serial#',
    'engine sn',
    'eng sn',
    'ens',
    'ens value',
    'ens - value',
    'engine serial #',
  ],
  engine_horsepower: [
    'engine horsepower',
    'horsepower',
    'hp',
    'engine_horsepower',
    'eng hp',
    'engine hp',
    'rated hp',
    'rated horsepower',
    'power',
    'engine power',
  ],
  fuel_type: [
    'fuel type',
    'fuel_type',
    'fuel',
    'fuel code',
    'fuel source',
  ],
  
  // Key code - stored in engine.key_code
  key_code: [
    'key code',
    'key_code',
    'dk',
    'dk value',
    'dk - value',
    'door key',
    'ignition key',
  ],
  
  // Transmission details  
  transmission_manufacturer: [
    'transmission manufacturer',
    'transmission make',
    'trans manufacturer',
    'trans make',
    'transmission mfr',
    'trans mfr',
    'tranny manufacturer',
    'tranny make',
    'tra',
    'tra value',
    'tra - value',
  ],
  transmission_model: [
    'transmission model',
    'trans model',
    'transmission type',
    'transmission model number',
    'trans model number',
    'tranny model',
    'trm',
    'trm value',
    'trm - value',
  ],
  transmission_type: [
    'transmission type',
    'trans type',
    'tranny type',
    'gear type',
  ],
  transmission_speeds: [
    'transmission speeds',
    'speeds',
    'gear count',
    'number of speeds',
    'speed count',
    'gears',
    'trans speeds',
  ],
  transmission_serial: [
    'transmission serial',
    'transmission serial number',
    'transmission serial#',
    'trans serial',
    'trans serial number',
    'trs',
    'trs value',
    'trs - value',
    'transmission serial #',
  ],
  
  // Drivetrain details
  rear_axle_manufacturer: [
    'rear axle manufacturer',
    'axle manufacturer',
    'axle make',
    'rear axle make',
    'drive axle manufacturer',
    'drive axle make',
  ],
  rear_axle_ratio: [
    'rear axle ratio',
    'axle ratio',
    'gear ratio',
    'drive ratio',
    'final drive ratio',
  ],
  rear_axle_type: [
    'rear axle type',
    'axle type',
    'drive axle type',
  ],
  front_axle_model: [
    'front axle model',
    'front axle',
    'fam',
    'fam value',
    'fam - value',
  ],
  front_axle_serial: [
    'front axle serial',
    'front axle serial number',
    'front axle serial #',
    'fas',
    'fas value',
    'fas - value',
  ],
  fifth_wheel_model: [
    'fifth wheel model',
    '5th wheel model',
    'fifth wheel',
    '5th wheel',
    'fw',
    'fw value',
    'fw - value',
  ],
  fifth_wheel_serial: [
    'fifth wheel serial',
    'fifth wheel serial number',
    '5th wheel serial',
    '5th wheel serial #',
    'fws',
    'fws value',
    'fws - value',
  ],
  
  // Braking
  brake_type: [
    'brake type',
    'brakes',
    'brk',
    'brk value',
    'brk - value',
  ],
  air_drier: [
    'air drier',
    'air dryer',
    'ad',
    'ad value',
    'ad - value',
  ],
  
  // Fuel system
  fuel_tank_size: [
    'fuel tank size',
    'tank size',
    'fuel capacity',
    'fts',
    'fts value',
    'fts - value',
  ],
  
  // Body details - stored in maintenance.body
  body_manufacturer: [
    'body manufacturer',
    'body make',
    'mfg',
    'mfg value',
    'mfg - value',
  ],
  body_model: [
    'body model',
    'bmd',
    'bmd value',
    'bmd - value',
    'bmd-value',
  ],
  body_serial: [
    'body serial',
    'body serial number',
    'bds',
    'bds value',
    'bds - value',
    'bds-value',
  ],
  body_length: [
    'body length',
    'bl',
    'bl value',
    'bl - value',
    'bl-value',
    'box length',
  ],
  rear_door_type: [
    'rear door type',
    'door type',
    'rdt',
    'rdt value',
    'rdt - value',
  ],
  vehicle_height: [
    'vehicle height',
    'height',
    'ht',
    'ht value',
    'ht - value',
  ],
  
  // Liftgate - stored in maintenance.liftgate
  liftgate_manufacturer: [
    'liftgate manufacturer',
    'liftgate make',
    'lift gate manufacturer',
    'lg',
    'lg value',
    'lg - value',
  ],
  liftgate_model: [
    'liftgate model',
    'lift gate model',
    'lgm',
    'lgm value',
    'lgm - value',
  ],
  liftgate_serial: [
    'liftgate serial',
    'liftgate serial number',
    'lift gate serial',
    'lift gate serial #',
    'lgs',
    'lgs value',
    'lgs - value',
  ],
  
  // APU - stored in maintenance.apu
  apu_manufacturer: [
    'apu manufacturer',
    'apu make',
    'apu',
    'apu value',
    'apu - value',
    'apu-value',
  ],
  apu_model: [
    'apu model',
    'apm',
    'apm value',
    'apm - value',
    'apm-value',
  ],
  apu_serial: [
    'apu serial',
    'apu serial number',
    'aps',
    'aps value',
    'aps - value',
    'aps-value',
  ],
  
  // Reefer - stored in maintenance.reefer
  reefer_manufacturer: [
    'reefer manufacturer',
    'reefer make',
    'reefer',
    'ree',
    'ree value',
    'ree - value',
  ],
  
  // Location and pool
  location_description: [
    'current facility description',
    'facility description',
    'domiciled location',
    'domicilied location',
    'location description',
    'home location',
  ],
  equipment_pool: [
    'equipment pool',
    'pool',
    'fleet pool',
  ],
  customer_unit_number: [
    'customer unit number',
    'customer unit #',
    'cust unit number',
    'cust unit #',
    'customer unit',
  ],
  
  // Emissions
  emission_standard: [
    'emission standard',
    'emissions',
    'epa standard',
    'emission_standard',
    'emission level',
    'emissions standard',
    'epa level',
    'emission tier',
  ],
  
  // Notes
  notes: [
    'notes',
    'comments',
    'description',
    'remarks',
    'memo',
    'note',
    'comment',
    'remark',
  ],
};

/**
 * Normalize a column header for matching
 * Handles special characters, numbers, and common enterprise formatting
 * @param {string} header - Raw column header
 * @returns {string} Normalized header (lowercase, trimmed)
 */
function normalizeHeader(header) {
  return (header || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')           // Remove quotes
    .replace(/[_\-\.]/g, ' ')       // Replace underscores, hyphens, dots with spaces
    .replace(/#/g, '')              // Remove hash symbols (e.g., "Serial#" -> "Serial")
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .replace(/^\s+|\s+$/g, '');     // Trim again after replacements
}

/**
 * Find the standardized field name for a given column header
 * Uses priority-based matching where earlier aliases in the list take precedence
 * @param {string} header - Raw column header from CSV
 * @returns {string|null} Standardized field name or null if no match
 */
export function mapColumnToField(header) {
  const normalized = normalizeHeader(header);
  
  if (!normalized) return null;
  
  // Split normalized header into tokens (words) for word-boundary matching
  const tokens = normalized.split(/\s+/);
  
  // First pass: exact matches (highest priority)
  for (const [fieldName, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(alias => alias === normalized)) {
      return fieldName;
    }
  }
  
  // Second pass: partial matches with safety for short aliases
  // Short aliases (≤3 chars like "bl", "en", "ad") must match as whole tokens
  // to prevent matching inside unrelated words (e.g., "visible" containing "bl")
  for (const [fieldName, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (alias.length <= 3) {
        // Short alias: require exact token match (word boundary)
        if (tokens.includes(alias)) {
          return fieldName;
        }
      } else {
        // Longer alias: allow substring matching
        if (normalized.includes(alias) || alias.includes(normalized)) {
          return fieldName;
        }
      }
    }
  }
  
  // Return null for unrecognized columns (they will be ignored safely)
  return null;
}

/**
 * Create a column mapping from CSV headers to standardized fields
 * @param {string[]} headers - Array of CSV column headers
 * @returns {Object} Mapping of header index to field name
 */
export function createColumnMapping(headers) {
  const mapping = {};
  
  headers.forEach((header, index) => {
    const fieldName = mapColumnToField(header);
    if (fieldName) {
      // Only use first match if multiple columns map to same field
      if (!Object.values(mapping).includes(fieldName)) {
        mapping[index] = fieldName;
      }
    }
  });
  
  return mapping;
}

/**
 * Transform a CSV row using the column mapping
 * @param {string[]} values - Array of values from CSV row
 * @param {Object} columnMapping - Mapping from index to field name
 * @returns {Object} Transformed row object with standardized field names
 */
export function transformRow(values, columnMapping) {
  const row = {};
  
  for (const [indexStr, fieldName] of Object.entries(columnMapping)) {
    const index = parseInt(indexStr, 10);
    const value = values[index]?.trim().replace(/^"|"$/g, '') || '';
    row[fieldName] = value;
  }
  
  return row;
}

/**
 * Validate that required fields are present in column mapping
 * @param {Object} columnMapping - Column mapping object
 * @returns {Object} { isValid: boolean, missingFields: string[], warnings: string[] }
 */
export function validateColumnMapping(columnMapping) {
  const mappedFields = new Set(Object.values(columnMapping));
  const missingFields = [];
  const warnings = [];
  
  // VIN is required (or at least truck_number)
  if (!mappedFields.has('vin') && !mappedFields.has('truck_number')) {
    missingFields.push('VIN or Truck Number');
  }
  
  // Warnings for recommended fields
  if (!mappedFields.has('make')) {
    warnings.push('Make column not found - will be empty');
  }
  if (!mappedFields.has('model')) {
    warnings.push('Model column not found - will be empty');
  }
  if (!mappedFields.has('year')) {
    warnings.push('Year column not found - will be empty');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
    mappedFields: Array.from(mappedFields),
  };
}

/**
 * Parse date string in various formats
 * @param {string} dateStr - Date string from CSV
 * @returns {string|null} ISO date string (YYYY-MM-DD) or null
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  
  const cleaned = dateStr.trim();
  if (!cleaned) return null;
  
  // Try various date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // US format MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // US format MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // European format DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  ];
  
  // Try ISO format first
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  
  // Try MM/DD/YYYY or MM-DD-YYYY
  const usMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, '0');
    const day = usMatch[2].padStart(2, '0');
    return `${usMatch[3]}-${month}-${day}`;
  }
  
  return null;
}

export default {
  mapColumnToField,
  createColumnMapping,
  transformRow,
  validateColumnMapping,
  parseDate,
};