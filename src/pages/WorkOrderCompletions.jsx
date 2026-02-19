import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Eye, Filter, Truck, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import Navigation from '../components/Navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { toast } from 'sonner';

const WorkOrderCompletions = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isTechnician } = usePermissions();
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    technician: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    if (user && profile?.company_id) {
      fetchCompletions();
    }
  }, [user, profile?.company_id]);

  const fetchCompletions = async () => {
    try {
      setLoading(true);
      
      // First get work orders with status 'completed' or 'closed'
      let workOrdersQuery = supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          complaint,
          status,
          updated_at,
          extracted_unit_number,
          extracted_year,
          extracted_make,
          extracted_model,
          extracted_vin,
          truck_id,
          trucks (
            id,
            truck_number,
            unit_id,
            year,
            make,
            model,
            vin
          )
        `)
        .in('status', ['completed', 'closed', 'invoiced'])
        .order('updated_at', { ascending: false });

      // For technicians, only show work orders where they have assigned tasks
      if (isTechnician()) {
        // Get work order IDs where this technician has tasks
        const { data: techTasks, error: taskError } = await supabase
          .from('work_order_tasks')
          .select('work_order_id')
          .eq('assigned_to', user.id);
        
        if (taskError) {
          console.error('Error fetching technician tasks:', taskError);
          throw taskError;
        }
        
        const workOrderIds = [...new Set(techTasks?.map(t => t.work_order_id) || [])];
        
        if (workOrderIds.length === 0) {
          setCompletions([]);
          setLoading(false);
          return;
        }
        
        workOrdersQuery = workOrdersQuery.in('id', workOrderIds);
      }

      const { data: workOrders, error: woError } = await workOrdersQuery;

      if (woError) {
        console.error('Error fetching work orders:', woError);
        throw woError;
      }

      // Get tasks with technician info for each work order
      const completionsData = await Promise.all(
        (workOrders || []).map(async (wo) => {
          // Get tasks with technician names
          const { data: tasks } = await supabase
            .from('work_order_tasks')
            .select('assigned_to, status')
            .eq('work_order_id', wo.id);

          // Get technician names from profiles
          const assignedToIds = [...new Set(tasks?.filter(t => t.assigned_to).map(t => t.assigned_to) || [])];
          let technicianNames = [];
          
          if (assignedToIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .in('user_id', assignedToIds);
            
            technicianNames = profiles?.map(p => p.full_name).filter(Boolean) || [];
          }

          const truck = wo.trucks || {};
          const truckNumber = truck.truck_number || truck.unit_id || wo.extracted_unit_number || 'N/A';
          const truckInfo = `${truck.year || wo.extracted_year || ''} ${truck.make || wo.extracted_make || ''} ${truck.model || wo.extracted_model || ''}`.trim() || 'Unknown Vehicle';

          return {
            completion_id: wo.id,
            work_order_number: wo.work_order_number,
            truck_number: truckNumber,
            truck_info: truckInfo,
            technician_name: technicianNames.join(', ') || 'Unassigned',
            customer_complaint: wo.complaint || 'No complaint recorded',
            completed_at: wo.updated_at,
            manager_approved: wo.status === 'invoiced',
            status: wo.status
          };
        })
      );

      setCompletions(completionsData);
    } catch (error) {
      console.error('Error fetching completions:', error);
      toast.error('Failed to load completed work orders');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (completionId) => {
    // For now, show a message that PDF generation would require backend setup
    toast.info('PDF download feature requires backend configuration');
  };

  const filteredCompletions = completions.filter(completion => {
    if (filters.search && !completion.truck_number.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.technician && !completion.technician_name.toLowerCase().includes(filters.technician.toLowerCase())) {
      return false;
    }
    if (filters.dateFrom && new Date(completion.completed_at) < new Date(filters.dateFrom)) {
      return false;
    }
    if (filters.dateTo && new Date(completion.completed_at) > new Date(filters.dateTo)) {
      return false;
    }
    return true;
  });

  return (
    <>
      <Navigation />
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Work Order Completions</h1>
        <p className="text-gray-600">View and manage completed work orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Truck</label>
              <Input
                placeholder="Truck number or VIN"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Technician</label>
              <Input
                placeholder="Technician name"
                value={filters.technician}
                onChange={(e) => setFilters(prev => ({ ...prev, technician: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading completions...</div>
          ) : filteredCompletions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No completed work orders found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Truck</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Complaint</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCompletions.map((completion) => (
                  <tr key={completion.completion_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(completion.completed_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{completion.truck_number}</div>
                          <div className="text-gray-500 text-xs">{completion.truck_info}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {completion.technician_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {completion.customer_complaint}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        completion.manager_approved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {completion.manager_approved ? 'Approved' : 'Pending Review'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/work-orders/completions/${completion.completion_id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadPDF(completion.completion_id, completion.pdf_filename)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default WorkOrderCompletions;
