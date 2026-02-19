// API service layer - real Supabase services + mock fallbacks
// This file maintains the same interface so components don't need changes

// Import mock APIs for features not yet migrated
import {
  authAPI,
  companyAPI,
  diagnosticsAPI,
  vinAPI,
  voiceAPI,
  summaryAPI,
  warrantyAPI,
  partsAPI,
  laborAPI,
  invoiceAPI,
  estimateAPI,
  pmAPI
} from '../services/mockAPI';

// Import real Supabase-backed services
import { customerAPI } from '../services/customerService';
import { truckAPI } from '../services/truckService';
import { workOrderServiceAPI as workOrderAPI } from '../services/workOrderService';

// Use real workOrderServiceAPI for projectAPI (work order creation)
const projectAPI = workOrderAPI;

// Re-export all APIs for backward compatibility
export {
  authAPI,
  companyAPI,
  truckAPI,
  projectAPI,
  diagnosticsAPI,
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

// Default export for compatibility
export default {
  authAPI,
  companyAPI,
  truckAPI,
  projectAPI,
  diagnosticsAPI,
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
