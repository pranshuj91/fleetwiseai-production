// Mock API services - replaces backend API calls
// TODO: Lovable will implement Supabase logic here
// All function signatures match the original API interface

import {
  mockUser,
  mockCompany,
  getMockTrucks,
  setMockTrucks,
  getMockProjects,
  setMockProjects,
  getMockCustomers,
  setMockCustomers,
  getMockParts,
  setMockParts,
  getMockEstimates,
  setMockEstimates,
  getMockInvoices,
  setMockInvoices,
  getMockPMSchedules,
  setMockPMSchedules
} from './mockData';

// Simulate API delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to create axios-like response
const createResponse = (data) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {}
});

// Helper to create error response
const createError = (message, status = 400) => {
  const error = new Error(message);
  error.response = {
    data: { detail: message },
    status,
    statusText: status === 401 ? 'Unauthorized' : 'Bad Request'
  };
  return Promise.reject(error);
};

// Auth API
export const authAPI = {
  register: async (data) => {
    await delay();
    // Return mock user and token
    const token = 'mock-jwt-token-' + Date.now();
    return createResponse({
      access_token: token,
      token_type: 'bearer',
      user: mockUser
    });
  },
  
  login: async (email, password) => {
    await delay();
    // Always succeed for demo
    const token = 'mock-jwt-token-' + Date.now();
    return createResponse({
      access_token: token,
      token_type: 'bearer',
      user: mockUser
    });
  },
  
  getCurrentUser: async () => {
    await delay();
    return createResponse(mockUser);
  }
};

// Company API
export const companyAPI = {
  create: async (data) => {
    await delay();
    return createResponse(mockCompany);
  },
  
  list: async () => {
    await delay();
    return createResponse([mockCompany]);
  },
  
  get: async (id) => {
    await delay();
    return createResponse(mockCompany);
  }
};

// Truck API
export const truckAPI = {
  create: async (data) => {
    await delay();
    const trucks = getMockTrucks();
    const newTruck = {
      id: `truck-${trucks.length + 1}`,
      company_id: mockCompany.id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: mockUser.id
    };
    setMockTrucks([...trucks, newTruck]);
    return createResponse(newTruck);
  },
  
  list: async (companyId) => {
    await delay();
    const trucks = getMockTrucks();
    return createResponse(trucks.filter(t => t.company_id === companyId || !companyId));
  },
  
  get: async (id) => {
    await delay();
    const trucks = getMockTrucks();
    const truck = trucks.find(t => t.id === id);
    if (!truck) {
      return createError('Truck not found', 404);
    }
    return createResponse(truck);
  },
  
  update: async (id, data) => {
    await delay();
    const trucks = getMockTrucks();
    const index = trucks.findIndex(t => t.id === id);
    if (index === -1) {
      return createError('Truck not found', 404);
    }
    trucks[index] = { ...trucks[index], ...data, updated_at: new Date().toISOString() };
    setMockTrucks(trucks);
    return createResponse(trucks[index]);
  },
  
  delete: async (id) => {
    await delay();
    const trucks = getMockTrucks();
    setMockTrucks(trucks.filter(t => t.id !== id));
    return createResponse({ success: true });
  }
};

// Project API
export const projectAPI = {
  create: async (data) => {
    await delay();
    const projects = getMockProjects();
    const newProject = {
      id: `project-${projects.length + 1}`,
      company_id: mockCompany.id,
      project_number: `WO-${String(projects.length + 1).padStart(5, '0')}`,
      status: 'draft',
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: mockUser.id
    };
    setMockProjects([...projects, newProject]);
    return createResponse(newProject);
  },
  
  list: async (companyId, status) => {
    await delay();
    let projects = getMockProjects();
    if (companyId) {
      projects = projects.filter(p => p.company_id === companyId);
    }
    if (status) {
      projects = projects.filter(p => p.status === status);
    }
    return createResponse(projects);
  },
  
  get: async (id) => {
    await delay();
    const projects = getMockProjects();
    const project = projects.find(p => p.id === id);
    if (!project) {
      return createError('Project not found', 404);
    }
    return createResponse(project);
  }
};

// Diagnostics API
export const diagnosticsAPI = {
  generate: async (data) => {
    await delay(1000);
    // Return mock diagnostic steps
    return createResponse({
      steps: [
        {
          step_number: 1,
          title: 'Initial Visual Inspection',
          description: 'Perform a thorough visual inspection of the vehicle',
          detailed_instructions: [
            'Walk around the vehicle and inspect for obvious damage or leaks',
            'Check fluid levels (oil, coolant, DEF)',
            'Inspect hoses and belts for wear or damage'
          ],
          expected_results: ['No visible leaks or damage', 'All fluid levels within normal range'],
          tools_required: ['Flashlight', 'Inspection mirror'],
          safety_notes: ['Ensure parking brake is engaged'],
          reference_links: []
        },
        {
          step_number: 2,
          title: 'Diagnostic Scan',
          description: 'Connect diagnostic scanner and retrieve all fault codes',
          detailed_instructions: [
            'Locate the J1939 diagnostic port',
            'Connect diagnostic scanner',
            'Read and record all active and pending fault codes'
          ],
          expected_results: ['Clear fault code readings', 'Freeze frame data captured'],
          tools_required: ['Diagnostic scanner with J1939 capability'],
          safety_notes: ['Do not start engine during initial scan'],
          reference_links: []
        }
      ],
      estimated_time_minutes: 45,
      difficulty_level: 'Basic',
      parts_potentially_needed: ['To be determined after diagnostics'],
      data_capture_questions: [
        { question: 'What is the current mileage?', field: 'mileage' },
        { question: 'When did the issue first occur?', field: 'issue_start_date' }
      ]
    });
  },
  
  saveNotes: async (projectId, step, notes) => {
    await delay();
    return createResponse({ success: true });
  }
};

// Work Order / PDF API
export const workOrderAPI = {
  uploadPDF: async (file) => {
    await delay(1500);
    // Return mock extracted data
    return createResponse({
      extracted_data: {
        vin: '1HGBH41JXMN109186',
        truck_number: 'TRK-001',
        complaint: 'Engine won\'t start',
        fault_codes: ['P0420', 'U0100'],
        customer_name: 'Demo Customer',
        mileage: 150000
      }
    });
  },
  
  createFromPDF: async (file) => {
    await delay(1500);
    const projects = getMockProjects();
    const newProject = {
      id: `project-${projects.length + 1}`,
      company_id: mockCompany.id,
      project_number: `WO-${String(projects.length + 1).padStart(5, '0')}`,
      status: 'draft',
      customer_complaint: 'Engine won\'t start',
      fault_codes: ['P0420'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setMockProjects([...projects, newProject]);
    return createResponse(newProject);
  },
  
  saveFromExtraction: async (data) => {
    await delay();
    const projects = getMockProjects();
    const newProject = {
      id: `project-${projects.length + 1}`,
      company_id: mockCompany.id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setMockProjects([...projects, newProject]);
    return createResponse(newProject);
  }
};

// VIN Decoder API
export const vinAPI = {
  decode: async (vin) => {
    await delay(800);
    return createResponse({
      vin,
      year: 2020,
      make: 'Freightliner',
      model: 'Cascadia',
      manufacturer: 'Daimler Trucks North America',
      engine_displacement: '15L',
      fuel_type: 'Diesel'
    });
  }
};

// Voice API
export const voiceAPI = {
  transcribe: async (audioBlob) => {
    await delay(2000);
    return createResponse({
      text: 'Mock transcription: The engine is making a knocking sound and the check engine light is on.'
    });
  },
  
  speak: async (text, voice = 'alloy') => {
    await delay(1000);
    // Return empty blob for mock
    return createResponse(new Blob());
  }
};

// Work Order Summary API
export const summaryAPI = {
  generate: async (projectId) => {
    await delay(2000);
    return createResponse({
      summary: `# Work Order Summary

## Vehicle Information
- **Work Order #**: WO-00123
- **Vehicle**: 2020 Freightliner Cascadia
- **VIN**: 1HGBH41JXMN109186

## Customer Complaint
Engine won't start, check engine light is on.

## Fault Codes
P0420, U0100

## Diagnosis
Performed diagnostic scan and visual inspection. Found issues with...

## Correction
Replaced faulty component and verified repair.

## Status
Work order completed successfully.`
    });
  }
};

// Warranty Recovery API
export const warrantyAPI = {
  analyze: async (projectId) => {
    await delay(2000);
    return createResponse({
      has_warranty_opportunity: true,
      opportunities: [
        {
          type: 'Manufacturer Warranty',
          description: 'Engine component may be covered under manufacturer warranty',
          estimated_recovery: 1500.00,
          next_steps: ['Contact manufacturer', 'Gather documentation']
        }
      ],
      total_estimated_recovery: 1500.00,
      next_steps: ['Review warranty coverage', 'Submit claim']
    });
  }
};

// Parts Management API
export const partsAPI = {
  list: async (params = {}) => {
    await delay();
    let parts = getMockParts();
    if (params.category) {
      parts = parts.filter(p => p.category === params.category);
    }
    return createResponse(parts);
  },
  
  get: async (partId) => {
    await delay();
    const parts = getMockParts();
    const part = parts.find(p => p.id === partId);
    if (!part) {
      return createError('Part not found', 404);
    }
    return createResponse(part);
  },
  
  create: async (data) => {
    await delay();
    const parts = getMockParts();
    const newPart = {
      id: `part-${parts.length + 1}`,
      company_id: mockCompany.id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setMockParts([...parts, newPart]);
    return createResponse(newPart);
  },
  
  update: async (partId, data) => {
    await delay();
    const parts = getMockParts();
    const index = parts.findIndex(p => p.id === partId);
    if (index === -1) {
      return createError('Part not found', 404);
    }
    parts[index] = { ...parts[index], ...data, updated_at: new Date().toISOString() };
    setMockParts(parts);
    return createResponse(parts[index]);
  },
  
  delete: async (partId) => {
    await delay();
    const parts = getMockParts();
    setMockParts(parts.filter(p => p.id !== partId));
    return createResponse({ success: true });
  },
  
  adjustInventory: async (partId, adjustment) => {
    await delay();
    const parts = getMockParts();
    const part = parts.find(p => p.id === partId);
    if (part) {
      part.quantity_on_hand = (part.quantity_on_hand || 0) + adjustment.adjustment;
      setMockParts(parts);
    }
    return createResponse(part);
  },
  
  addToProject: async (projectId, partId, quantity, notes) => {
    await delay();
    const projects = getMockProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      // Mock adding part to project
      if (!project.parts) project.parts = [];
      const parts = getMockParts();
      const part = parts.find(p => p.id === partId);
      if (part) {
        project.parts.push({
          part_id: partId,
          part_number: part.part_number,
          part_name: part.name,
          quantity,
          unit_price: part.price,
          total_price: part.price * quantity,
          notes
        });
        setMockProjects(projects);
      }
    }
    return createResponse({ success: true });
  },
  
  removeFromProject: async (projectId, partIndex) => {
    await delay();
    const projects = getMockProjects();
    const project = projects.find(p => p.id === projectId);
    if (project && project.parts) {
      project.parts.splice(partIndex, 1);
      setMockProjects(projects);
    }
    return createResponse({ success: true });
  }
};

// Labor Management API
export const laborAPI = {
  addToProject: async (projectId, description, hours, rate, technician) => {
    await delay();
    const projects = getMockProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      if (!project.labor_items) project.labor_items = [];
      project.labor_items.push({
        description,
        hours,
        rate,
        total: hours * rate,
        technician
      });
      setMockProjects(projects);
    }
    return createResponse({ success: true });
  },
  
  removeFromProject: async (projectId, laborIndex) => {
    await delay();
    const projects = getMockProjects();
    const project = projects.find(p => p.id === projectId);
    if (project && project.labor_items) {
      project.labor_items.splice(laborIndex, 1);
      setMockProjects(projects);
    }
    return createResponse({ success: true });
  }
};

// Invoice API
export const invoiceAPI = {
  create: async (data) => {
    await delay();
    const invoices = getMockInvoices();
    const newInvoice = {
      id: `invoice-${invoices.length + 1}`,
      company_id: mockCompany.id,
      invoice_number: `INV-${String(invoices.length + 1).padStart(5, '0')}`,
      status: 'draft',
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: mockUser.id
    };
    setMockInvoices([...invoices, newInvoice]);
    return createResponse(newInvoice);
  },
  
  list: async (params = {}) => {
    await delay();
    let invoices = getMockInvoices();
    if (params.status) {
      invoices = invoices.filter(i => i.status === params.status);
    }
    return createResponse(invoices);
  },
  
  get: async (invoiceId) => {
    await delay();
    const invoices = getMockInvoices();
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) {
      return createError('Invoice not found', 404);
    }
    return createResponse(invoice);
  },
  
  update: async (invoiceId, data) => {
    await delay();
    const invoices = getMockInvoices();
    const index = invoices.findIndex(i => i.id === invoiceId);
    if (index === -1) {
      return createError('Invoice not found', 404);
    }
    invoices[index] = { ...invoices[index], ...data, updated_at: new Date().toISOString() };
    setMockInvoices(invoices);
    return createResponse(invoices[index]);
  },
  
  send: async (invoiceId) => {
    await delay();
    const invoices = getMockInvoices();
    const invoice = invoices.find(i => i.id === invoiceId);
    if (invoice) {
      invoice.status = 'sent';
      invoice.sent_at = new Date().toISOString();
      setMockInvoices(invoices);
    }
    return createResponse(invoice);
  },
  
  markPaid: async (invoiceId) => {
    await delay();
    const invoices = getMockInvoices();
    const invoice = invoices.find(i => i.id === invoiceId);
    if (invoice) {
      invoice.status = 'paid';
      invoice.paid_date = new Date().toISOString();
      setMockInvoices(invoices);
    }
    return createResponse(invoice);
  },
  
  exportCSV: async (invoiceId) => {
    await delay();
    // Return mock CSV blob
    return createResponse(new Blob(['Mock CSV data'], { type: 'text/csv' }));
  }
};

// Estimate API
export const estimateAPI = {
  create: async (data) => {
    await delay();
    const estimates = getMockEstimates();
    const newEstimate = {
      id: `estimate-${estimates.length + 1}`,
      company_id: mockCompany.id,
      estimate_number: `EST-${String(estimates.length + 1).padStart(5, '0')}`,
      status: 'draft',
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: mockUser.id
    };
    setMockEstimates([...estimates, newEstimate]);
    return createResponse(newEstimate);
  },
  
  list: async (params = {}) => {
    await delay();
    let estimates = getMockEstimates();
    if (params.status) {
      estimates = estimates.filter(e => e.status === params.status);
    }
    return createResponse(estimates);
  },
  
  get: async (estimateId) => {
    await delay();
    const estimates = getMockEstimates();
    const estimate = estimates.find(e => e.id === estimateId);
    if (!estimate) {
      return createError('Estimate not found', 404);
    }
    return createResponse(estimate);
  },
  
  send: async (estimateId) => {
    await delay();
    const estimates = getMockEstimates();
    const estimate = estimates.find(e => e.id === estimateId);
    if (estimate) {
      estimate.status = 'sent';
      estimate.sent_at = new Date().toISOString();
      setMockEstimates(estimates);
    }
    return createResponse(estimate);
  },
  
  approve: async (estimateId) => {
    await delay();
    const estimates = getMockEstimates();
    const estimate = estimates.find(e => e.id === estimateId);
    if (estimate) {
      estimate.status = 'approved';
      estimate.approved_at = new Date().toISOString();
      setMockEstimates(estimates);
    }
    return createResponse(estimate);
  }
};

// PM (Preventive Maintenance) API
export const pmAPI = {
  templates: {
    list: async () => {
      await delay();
      return createResponse([
        { id: 'template-1', name: 'Standard PM', interval_miles: 15000, task_list: ['Oil change', 'Filter replacement'] },
        { id: 'template-2', name: 'Heavy Duty PM', interval_miles: 25000, task_list: ['Full service', 'Inspection'] },
        { id: 'template-3', name: 'Light PM', interval_miles: 7500, task_list: ['Basic check'] }
      ]);
    },
    
    get: async (templateId) => {
      await delay();
      return createResponse({ id: templateId, name: 'Standard PM', interval_miles: 15000 });
    },
    
    create: async (data) => {
      await delay();
      return createResponse({ id: 'template-new', ...data });
    },
    
    update: async (templateId, data) => {
      await delay();
      return createResponse({ id: templateId, ...data });
    },
    
    delete: async (templateId) => {
      await delay();
      return createResponse({ success: true });
    }
  },
  
  schedules: {
    list: async (params = {}) => {
      await delay();
      return createResponse(getMockPMSchedules());
    },
    
    get: async (scheduleId) => {
      await delay();
      const schedules = getMockPMSchedules();
      return createResponse(schedules.find(s => s.id === scheduleId) || schedules[0]);
    },
    
    create: async (data) => {
      await delay();
      const schedules = getMockPMSchedules();
      const newSchedule = {
        id: `pm-${schedules.length + 1}`,
        company_id: mockCompany.id,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setMockPMSchedules([...schedules, newSchedule]);
      return createResponse(newSchedule);
    },
    
    complete: async (scheduleId, projectId) => {
      await delay();
      return createResponse({ success: true });
    },
    
    upcoming: async () => {
      await delay();
      const schedules = getMockPMSchedules();
      return createResponse(schedules.filter(s => s.status === 'upcoming' || s.status === 'due'));
    },
    
    overdue: async () => {
      await delay();
      const schedules = getMockPMSchedules();
      return createResponse(schedules.filter(s => s.status === 'overdue'));
    }
  }
};

// Customer Management API
export const customerAPI = {
  list: async () => {
    await delay();
    return createResponse(getMockCustomers());
  },
  
  get: async (customerId) => {
    await delay();
    const customers = getMockCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return createError('Customer not found', 404);
    }
    return createResponse(customer);
  },
  
  create: async (data) => {
    await delay();
    const customers = getMockCustomers();
    const newCustomer = {
      id: `customer-${customers.length + 1}`,
      company_id: mockCompany.id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setMockCustomers([...customers, newCustomer]);
    return createResponse(newCustomer);
  },
  
  update: async (customerId, data) => {
    await delay();
    const customers = getMockCustomers();
    const index = customers.findIndex(c => c.id === customerId);
    if (index === -1) {
      return createError('Customer not found', 404);
    }
    customers[index] = { ...customers[index], ...data, updated_at: new Date().toISOString() };
    setMockCustomers(customers);
    return createResponse(customers[index]);
  },
  
  delete: async (customerId) => {
    await delay();
    const customers = getMockCustomers();
    setMockCustomers(customers.filter(c => c.id !== customerId));
    return createResponse({ success: true });
  },
  
  getTrucks: async (customerId) => {
    await delay();
    const trucks = getMockTrucks();
    return createResponse(trucks.filter(t => t.customer_id === customerId));
  },
  
  getProjects: async (customerId) => {
    await delay();
    const projects = getMockProjects();
    // Mock: assume projects are linked via trucks
    const trucks = getMockTrucks();
    const customerTruckIds = trucks.filter(t => t.customer_id === customerId).map(t => t.id);
    return createResponse(projects.filter(p => customerTruckIds.includes(p.truck_id)));
  },
  
  getInvoices: async (customerId) => {
    await delay();
    const invoices = getMockInvoices();
    return createResponse(invoices.filter(i => i.customer_id === customerId));
  }
};

// Diagnostic Chat API (conversational)
export const diagnosticChatAPI = {
  start: async (data) => {
    await delay(1000);
    const sessionId = 'session-' + Date.now();
    return createResponse({
      session_id: sessionId,
      message: `Hi! I'm here to help you diagnose this ${data.truck_info?.year || ''} ${data.truck_info?.make || ''} ${data.truck_info?.model || ''}.

I see you're dealing with "${data.complaint || 'an issue'}" and we have these fault codes: ${data.fault_codes?.join(', ') || 'None'}

Let's tackle this step by step. First thing - let's get connected to the truck's diagnostic system.

**Step 1: Connect Diagnostic Scanner**

Can you:
1. Locate the J1939 diagnostic port (usually under the dash, driver side)
2. Connect your diagnostic scanner to the port  
3. Turn the key to ON position (don't start the engine yet)

Once connected, let me know what you see on the scanner display, or if you need help locating anything.`,
      current_phase: 'diagnosis',
      plan: {
        title: 'Diagnostic Procedure',
        steps: [
          'Connect diagnostic scanner',
          'Verify fault codes',
          'Perform systematic diagnostics',
          'Identify root cause',
          'Repair and verify'
        ]
      },
      captured_data: {
        readings: {},
        parts: [],
        stepsCompleted: 0
      }
    });
  },
  
  message: async (sessionId, message) => {
    await delay(1500);
    // Generate contextual responses based on message content
    let response = '';
    
    if (message.toLowerCase().includes('connected') || message.toLowerCase().includes('scanner')) {
      response = `Great! Now let's see what the scanner is telling us. Can you read me the fault codes you're seeing? Also, note any freeze frame data if available.`;
    } else if (message.toLowerCase().includes('code') || message.toLowerCase().includes('fault')) {
      response = `Good, we're getting somewhere. Based on those codes, let's check the voltage at the ECM. Can you measure the voltage at pin 1 of the ECM connector? It should read around 12.4V with the key on.`;
    } else if (message.toLowerCase().includes('voltage') || message.toLowerCase().includes('volt')) {
      response = `Perfect! That voltage reading is within spec. Now let's check the ground connection. Can you verify continuity between the ECM ground pin and the battery negative terminal?`;
    } else if (message.toLowerCase().includes('done') || message.toLowerCase().includes('finished') || message.toLowerCase().includes('complete')) {
      response = `Excellent work! You've completed the diagnostic steps. Based on what we've found, here's what I recommend:

1. The issue appears to be [root cause based on readings]
2. Next steps: [repair actions]
3. Parts needed: [list parts]

Would you like me to help you create a work order summary with all the details we've captured?`;
    } else {
      response = `I understand. Let me help you with that. Can you tell me more about what you're seeing? Specifically:
- What readings are you getting?
- Are there any visual issues you notice?
- Any unusual sounds or smells?

This will help me guide you to the next diagnostic step.`;
    }
    
    return createResponse({
      session_id: sessionId,
      message: response,
      current_phase: 'diagnosis',
      summary: {
        steps_completed: 2,
        readings_captured: 1,
        parts_identified: 0
      },
      captured_data: {
        readings: { voltage: '12.4V' },
        parts: [],
        steps_completed: 2
      }
    });
  }
};

// Default export for compatibility
export default {
  authAPI,
  companyAPI,
  truckAPI,
  projectAPI,
  diagnosticsAPI,
  diagnosticChatAPI,
  workOrderAPI,
  vinAPI,
  voiceAPI,
  summaryAPI,
  warrantyAPI,
  partsAPI,
  laborAPI,
  invoiceAPI,
  estimateAPI,
  pmAPI,
  customerAPI
};

