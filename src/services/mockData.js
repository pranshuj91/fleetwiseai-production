// Mock data for frontend-only mode
// TODO: Lovable will replace this with Supabase queries

// Simple UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Mock company
export const mockCompany = {
  id: 'company-1',
  name: 'Demo Fleet Services',
  address: '123 Main St',
  phone: '(555) 123-4567',
  email: 'demo@fleetwise.ai',
  labor_rate: 125.00,
  shop_code: 'DEMO',
  settings: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Mock user (auto-logged in)
export const mockUser = {
  id: 'user-1',
  email: 'admin@fleetwise.ai',
  full_name: 'Demo Admin',
  company_id: mockCompany.id,
  role: 'company_admin', // Safe default role
  phone: '(555) 123-4567',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Mock trucks
export const generateMockTrucks = (count = 10) => {
  const makes = ['Freightliner', 'Peterbilt', 'Kenworth', 'Volvo', 'Mack', 'International'];
  const models = ['Cascadia', '579', 'T680', 'VNL', 'Anthem', 'LT'];
  const years = [2018, 2019, 2020, 2021, 2022, 2023];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `truck-${i + 1}`,
    company_id: mockCompany.id,
    customer_id: i % 3 === 0 ? `customer-${Math.floor(i / 3) + 1}` : null,
    customer_name: i % 3 === 0 ? `Customer ${Math.floor(i / 3) + 1}` : null,
    truck_number: `TRK-${String(i + 1).padStart(3, '0')}`,
    unit_id: `UNIT-${i + 1}`,
    vin: `1HGBH41JXMN10918${String(i).padStart(2, '0')}`,
    year: years[i % years.length],
    make: makes[i % makes.length],
    model: models[i % models.length],
    license_plate: `ABC-${String(i + 1).padStart(4, '0')}`,
    is_lease: i % 4 === 0,
    shop_code: 'DEMO',
    engine: {
      manufacturer: 'Cummins',
      model: 'ISX15',
      serial_number: `ENG-${i + 1}`,
      displacement: '15L',
      horsepower: '450',
      torque: '1650',
      fuel_type: 'Diesel'
    },
    transmission: {
      manufacturer: 'Eaton',
      model: 'UltraShift PLUS',
      transmission_type: 'AMT',
      speeds: 10
    },
    maintenance: {
      current_mileage: 150000 + (i * 10000),
      last_service_date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
      last_oil_change_date: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    data_completeness: 75 + (i % 25),
    health_score: 80 + (i % 20),
    notes: `Mock truck ${i + 1}`,
    created_at: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: mockUser.id
  }));
};

// Mock projects/work orders
export const generateMockProjects = (count = 15) => {
  const statuses = ['draft', 'in_progress', 'waiting_for_parts', 'completed', 'closed'];
  const priorities = ['urgent', 'high', 'normal', 'low'];
  const complaints = [
    'Engine won\'t start',
    'Check engine light on',
    'Transmission slipping',
    'Brake noise',
    'AC not working',
    'Overheating',
    'Low power',
    'Rough idle'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `project-${i + 1}`,
    company_id: mockCompany.id,
    truck_id: `truck-${(i % 10) + 1}`,
    project_number: `WO-${String(i + 1).padStart(5, '0')}`,
    customer_complaint: complaints[i % complaints.length],
    fault_codes: i % 2 === 0 ? ['P0420', 'U0100'] : ['P0301'],
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    assigned_to: i % 3 === 0 ? mockUser.id : null,
    assigned_to_name: i % 3 === 0 ? mockUser.full_name : null,
    diagnostic_notes: i % 2 === 0 ? 'Diagnostic in progress' : null,
    started_at: i % 2 === 0 ? new Date(Date.now() - i * 2 * 60 * 60 * 1000).toISOString() : null,
    completed_at: i % 5 === 0 ? new Date(Date.now() - i * 60 * 60 * 1000).toISOString() : null,
    created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: mockUser.id
  }));
};

// Mock customers
export const generateMockCustomers = (count = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `customer-${i + 1}`,
    company_id: mockCompany.id,
    name: `Customer ${i + 1}`,
    email: `customer${i + 1}@example.com`,
    phone: `(555) ${String(100 + i).padStart(3, '0')}-${String(1000 + i).padStart(4, '0')}`,
    address: `${100 + i} Business St`,
    city: 'Springfield',
    state: 'IL',
    zip_code: '62701',
    notes: `Mock customer ${i + 1}`,
    created_at: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }));
};

// Mock parts
export const generateMockParts = (count = 20) => {
  const categories = ['engine', 'transmission', 'brakes', 'electrical', 'emission', 'cooling', 'fuel', 'filters'];
  const manufacturers = ['Cummins', 'Eaton', 'Bendix', 'Delphi', 'Bosch', 'Fleetguard'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `part-${i + 1}`,
    company_id: mockCompany.id,
    part_number: `PN-${String(i + 1).padStart(6, '0')}`,
    name: `Part ${i + 1}`,
    description: `Mock part description ${i + 1}`,
    category: categories[i % categories.length],
    manufacturer: manufacturers[i % manufacturers.length],
    cost: 50 + (i * 10),
    price: 75 + (i * 15),
    markup_percentage: 50,
    quantity_on_hand: 10 + (i % 20),
    reorder_level: 5,
    is_active: true,
    created_at: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }));
};

// Mock estimates
export const generateMockEstimates = (count = 8) => {
  const statuses = ['draft', 'sent', 'approved', 'declined'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `estimate-${i + 1}`,
    company_id: mockCompany.id,
    project_id: `project-${i + 1}`,
    truck_id: `truck-${(i % 10) + 1}`,
    estimate_number: `EST-${String(i + 1).padStart(5, '0')}`,
    customer_name: `Customer ${(i % 5) + 1}`,
    customer_email: `customer${(i % 5) + 1}@example.com`,
    truck_info: {
      year: 2020,
      make: 'Freightliner',
      model: 'Cascadia'
    },
    parts: [
      { part_id: `part-${i + 1}`, part_number: `PN-${String(i + 1).padStart(6, '0')}`, part_name: `Part ${i + 1}`, quantity: 1, unit_price: 100, total_price: 100 }
    ],
    labor_items: [
      { description: 'Diagnostic', hours: 2, rate: 125, total: 250, technician: mockUser.full_name }
    ],
    parts_total: 100,
    labor_total: 250,
    estimated_total: 350,
    status: statuses[i % statuses.length],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: mockUser.id
  }));
};

// Mock invoices
export const generateMockInvoices = (count = 10) => {
  const statuses = ['draft', 'sent', 'paid', 'overdue'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `invoice-${i + 1}`,
    company_id: mockCompany.id,
    project_id: `project-${i + 1}`,
    customer_id: `customer-${(i % 5) + 1}`,
    invoice_number: `INV-${String(i + 1).padStart(5, '0')}`,
    parts: [
      { part_id: `part-${i + 1}`, part_number: `PN-${String(i + 1).padStart(6, '0')}`, part_name: `Part ${i + 1}`, quantity: 1, unit_price: 100, total_price: 100 }
    ],
    labor_items: [
      { description: 'Repair work', hours: 3, rate: 125, total: 375, technician: mockUser.full_name }
    ],
    subtotal: 475,
    tax: 38,
    total: 513,
    status: statuses[i % statuses.length],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: i % 3 === 0 ? new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000).toISOString() : null,
    created_at: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    created_by: mockUser.id
  }));
};

// Mock PM schedules
export const generateMockPMSchedules = (count = 12) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `pm-${i + 1}`,
    company_id: mockCompany.id,
    truck_id: `truck-${(i % 10) + 1}`,
    template_id: `template-${(i % 3) + 1}`,
    template_name: `PM Template ${(i % 3) + 1}`,
    truck_number: `TRK-${String((i % 10) + 1).padStart(3, '0')}`,
    status: i % 4 === 0 ? 'overdue' : i % 3 === 0 ? 'due' : 'upcoming',
    last_completed_date: i % 2 === 0 ? new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() : null,
    next_due_date: new Date(Date.now() + (i % 30) * 24 * 60 * 60 * 1000).toISOString(),
    next_due_mileage: 150000 + (i * 5000),
    days_until_due: i % 30,
    miles_until_due: i * 5000,
    created_at: new Date(Date.now() - i * 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }));
};

// Initialize mock data stores (in-memory)
let mockTrucks = generateMockTrucks(10);
let mockProjects = generateMockProjects(15);
let mockCustomers = generateMockCustomers(5);
let mockParts = generateMockParts(20);
let mockEstimates = generateMockEstimates(8);
let mockInvoices = generateMockInvoices(10);
let mockPMSchedules = generateMockPMSchedules(12);

// Export getters and setters for mock data
export const getMockTrucks = () => mockTrucks;
export const setMockTrucks = (trucks) => { mockTrucks = trucks; };

export const getMockProjects = () => mockProjects;
export const setMockProjects = (projects) => { mockProjects = projects; };

export const getMockCustomers = () => mockCustomers;
export const setMockCustomers = (customers) => { mockCustomers = customers; };

export const getMockParts = () => mockParts;
export const setMockParts = (parts) => { mockParts = parts; };

export const getMockEstimates = () => mockEstimates;
export const setMockEstimates = (estimates) => { mockEstimates = estimates; };

export const getMockInvoices = () => mockInvoices;
export const setMockInvoices = (invoices) => { mockInvoices = invoices; };

export const getMockPMSchedules = () => mockPMSchedules;
export const setMockPMSchedules = (schedules) => { mockPMSchedules = schedules; };

