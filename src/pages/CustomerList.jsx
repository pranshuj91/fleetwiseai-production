import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { customerAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Users, Loader2, Plus, Search, Truck, FileText, DollarSign, Phone, Mail
} from 'lucide-react';

const CustomerList = () => {
  const navigate = useNavigate();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [effectiveCompanyId]);

  useEffect(() => {
    const safeCustomers = customers ?? [];
    if (searchTerm) {
      const filtered = safeCustomers.filter(customer =>
        (customer?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer?.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer?.phone ?? '').includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(safeCustomers);
    }
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      // Pass effectiveCompanyId which respects impersonation
      const response = await customerAPI.list(effectiveCompanyId);
      const data = response?.data ?? [];
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
    const totalTrucks = customers.reduce((sum, c) => sum + (c.total_trucks || 0), 0);
    const totalWorkOrders = customers.reduce((sum, c) => sum + (c.total_work_orders || 0), 0);
    
    return { totalCustomers, totalRevenue, totalTrucks, totalWorkOrders };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="mr-3 h-8 w-8 text-[#124481]" />
                Customers
              </h1>
              <p className="text-gray-600 mt-1">Manage your customer database</p>
            </div>
            <Button 
              onClick={() => navigate('/customers/new')}
              className="bg-[#124481] hover:bg-[#1E7083]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
                </div>
                <Users className="h-8 w-8 text-[#124481]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">${stats.totalRevenue.toFixed(0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Trucks</p>
                  <p className="text-2xl font-bold text-[#1E7083]">{stats.totalTrucks}</p>
                </div>
                <Truck className="h-8 w-8 text-[#1E7083]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Work Orders</p>
                  <p className="text-2xl font-bold text-[#289790]">{stats.totalWorkOrders}</p>
                </div>
                <FileText className="h-8 w-8 text-[#289790]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No customers found' : 'No customers yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Add your first customer to get started'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => navigate('/customers/new')} 
                  className="bg-[#124481] hover:bg-[#1E7083]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <Card 
                key={customer.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-[#124481] bg-opacity-10 rounded-lg flex items-center justify-center">
                          <Users className="h-6 w-6 text-[#124481]" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {customer.name}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="flex items-center gap-1 text-[#1E7083]">
                            <Truck className="h-3 w-3" />
                            {customer?.total_trucks ?? 0} trucks
                          </span>
                          <span className="flex items-center gap-1 text-[#289790]">
                            <FileText className="h-3 w-3" />
                            {customer?.total_work_orders ?? 0} work orders
                          </span>
                          <span className="flex items-center gap-1 text-green-600">
                            <DollarSign className="h-3 w-3" />
                            ${(customer?.total_revenue ?? 0).toFixed(0)} revenue
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerList;
