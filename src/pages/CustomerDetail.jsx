import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { customerAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  ArrowLeft, Users, Loader2, Edit, Trash2, Truck, FileText, 
  DollarSign, Phone, Mail, MapPin, Package, Plus, Link
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Assign existing truck modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [unassignedTrucks, setUnassignedTrucks] = useState([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [truckSearch, setTruckSearch] = useState('');
  const [assigningTruckId, setAssigningTruckId] = useState(null);

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      const [customerRes, trucksRes, projectsRes, invoicesRes] = await Promise.allSettled([
        customerAPI.get(id),
        customerAPI.getTrucks(id),
        customerAPI.getProjects(id),
        customerAPI.getInvoices(id)
      ]);

      if (customerRes.status === 'fulfilled') {
        setCustomer(customerRes.value.data);
      }
      if (trucksRes.status === 'fulfilled') {
        setTrucks(trucksRes.value.data || []);
      }
      if (projectsRes.status === 'fulfilled') {
        setProjects(projectsRes.value.data.projects || projectsRes.value.data || []);
      }
      if (invoicesRes.status === 'fulfilled') {
        setInvoices(invoicesRes.value.data.invoices || invoicesRes.value.data || []);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open assign modal and fetch unassigned trucks
  const handleOpenAssignModal = async () => {
    setShowAssignModal(true);
    setLoadingUnassigned(true);
    setTruckSearch('');
    try {
      const res = await customerAPI.getUnassignedTrucks();
      setUnassignedTrucks(res.data || []);
    } catch (error) {
      console.error('Error fetching unassigned trucks:', error);
      toast.error('Failed to load available trucks');
    } finally {
      setLoadingUnassigned(false);
    }
  };

  // Assign truck to customer
  const handleAssignTruck = async (truckId) => {
    setAssigningTruckId(truckId);
    try {
      await customerAPI.assignTruck(truckId, id);
      toast.success('Truck assigned successfully');
      setShowAssignModal(false);
      fetchCustomerData(); // Refresh trucks list
    } catch (error) {
      console.error('Error assigning truck:', error);
      toast.error('Failed to assign truck');
    } finally {
      setAssigningTruckId(null);
    }
  };

  // Filter unassigned trucks by search
  const filteredUnassignedTrucks = unassignedTrucks.filter(truck => {
    const search = truckSearch.toLowerCase();
    return (
      (truck.vin || '').toLowerCase().includes(search) ||
      (truck.truck_number || '').toLowerCase().includes(search) ||
      (truck.unit_id || '').toLowerCase().includes(search) ||
      (truck.make || '').toLowerCase().includes(search) ||
      (truck.model || '').toLowerCase().includes(search)
    );
  });

  const handleDelete = async () => {
    if (!window.confirm(`Delete customer ${customer.name}? This will not delete their trucks or work orders.`)) {
      return;
    }
    
    try {
      await customerAPI.delete(id);
      toast.success('Customer deleted successfully');
      navigate('/customers');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Customer not found</h3>
              <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/customers')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="mr-3 h-8 w-8 text-[#124481]" />
                {customer.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Customer since {new Date(customer.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/customers/${id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Trucks</p>
                  <p className="text-2xl font-bold text-[#1E7083]">{customer.total_trucks ?? trucks.length}</p>
                </div>
                <Truck className="h-8 w-8 text-[#1E7083]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Work Orders</p>
                  <p className="text-2xl font-bold text-[#289790]">{customer.total_work_orders ?? projects.length}</p>
                </div>
                <FileText className="h-8 w-8 text-[#289790]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Invoices</p>
                  <p className="text-2xl font-bold text-[#124481]">{customer.total_invoices ?? invoices.length}</p>
                </div>
                <DollarSign className="h-8 w-8 text-[#124481]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">${(customer.total_revenue ?? 0).toFixed(0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{customer.email}</p>
                  </div>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                </div>
              )}
              {(customer.street_address || customer.address || customer.city || customer.state) && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">
                      {(customer.street_address || customer.address) && <span>{customer.street_address || customer.address}<br /></span>}
                      {customer.city && <span>{customer.city}, </span>}
                      {customer.state && <span>{customer.state} </span>}
                      {customer.zip_code}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {customer.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-1">Notes</p>
                <p className="text-gray-900">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trucks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Trucks ({trucks.length})</CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleOpenAssignModal}
                >
                  <Link className="h-4 w-4 mr-1" />
                  Assign Existing
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/trucks/new')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {trucks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No trucks yet</p>
              ) : (
                <div className="space-y-2">
                {trucks.slice(0, 5).map((truck) => (
                    <div 
                      key={truck.id}
                      className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/trucks/${truck.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">
                          {truck.truck_number || truck.unit_id || 'No Unit #'}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {truck.year || 'N/A'}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {truck.make || ''} {truck.model || ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        VIN: {truck.vin}
                      </div>
                    </div>
                  ))}
                  {trucks.length > 5 && (
                    <Button 
                      variant="link" 
                      className="w-full"
                      onClick={() => navigate('/trucks')}
                    >
                      View all {trucks.length} trucks →
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Work Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Work Orders ({projects.length})</CardTitle>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/projects/new')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No work orders yet</p>
              ) : (
                <div className="space-y-2">
                  {projects.slice(0, 5).map((project) => (
                    <div 
                      key={project.id}
                      className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">{project.work_order_number || 'N/A'}</div>
                        <Badge className={
                          project.status === 'completed' ? 'bg-green-500' :
                          project.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-500'
                        }>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {project.truck_number || 'N/A'} • {new Date(project.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {projects.length > 5 && (
                    <Button 
                      variant="link" 
                      className="w-full"
                      onClick={() => navigate('/projects')}
                    >
                      View all {projects.length} work orders →
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Existing Truck Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Existing Truck</DialogTitle>
            <DialogDescription>
              Select a truck to assign to {customer?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Search by VIN, Unit #, Make, Model..."
              value={truckSearch}
              onChange={(e) => setTruckSearch(e.target.value)}
            />
            
            {loadingUnassigned ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUnassignedTrucks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {unassignedTrucks.length === 0 
                  ? 'No unassigned trucks available' 
                  : 'No trucks match your search'}
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {filteredUnassignedTrucks.map((truck) => (
                    <div 
                      key={truck.id}
                      className="p-3 border rounded flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {truck.truck_number || truck.unit_id || 'No Unit #'}
                          {truck.year && <span className="ml-2 text-muted-foreground">({truck.year})</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {truck.make || ''} {truck.model || ''}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          VIN: {truck.vin}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAssignTruck(truck.id)}
                        disabled={assigningTruckId === truck.id}
                      >
                        {assigningTruckId === truck.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Assign'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDetail;
