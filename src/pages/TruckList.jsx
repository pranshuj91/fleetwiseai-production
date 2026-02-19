import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import TruckHealthBadge from '../components/TruckHealthBadge';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { truckAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Plus, Search, Truck as TruckIcon, Upload } from 'lucide-react';

const TruckList = () => {
  const { user } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompany();
  const navigate = useNavigate();
  const [trucks, setTrucks] = useState([]);
  const [filteredTrucks, setFilteredTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        // Pass effectiveCompanyId which respects impersonation
        const response = await truckAPI.list(effectiveCompanyId);
        const data = response?.data ?? [];
        setTrucks(data);
        setFilteredTrucks(data);
      } catch (error) {
        console.error('Error fetching trucks:', error);
        setTrucks([]);
        setFilteredTrucks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrucks();
  }, [effectiveCompanyId]);

  useEffect(() => {
    const safeTrucks = trucks ?? [];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = safeTrucks.filter(truck => {
        // Support both flat structure and legacy nested identity structure
        const vin = (truck?.vin || truck?.identity?.vin || '').toLowerCase();
        const truckNumber = (truck?.truck_number || truck?.unit_id || truck?.identity?.truck_number || truck?.identity?.unit_id || '').toLowerCase();
        const make = (truck?.make || truck?.identity?.make || '').toLowerCase();
        const model = (truck?.model || truck?.identity?.model || '').toLowerCase();
        const customerName = (truck?.customer_name || '').toLowerCase();
        const year = String(truck?.year || truck?.identity?.year || '');
        
        // Combine make and model for vehicle name search
        const vehicleName = `${make} ${model}`.toLowerCase();
        
        return vin.includes(query) ||
          truckNumber.includes(query) ||
          make.includes(query) ||
          model.includes(query) ||
          vehicleName.includes(query) ||
          customerName.includes(query) ||
          year.includes(query);
      });
      setFilteredTrucks(filtered);
    } else {
      // Keep DB order (latest created first)
      setFilteredTrucks(safeTrucks);
    }
  }, [searchQuery, trucks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="truck-list-page">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="trucks-title">Fleet Trucks</h1>
            <p className="text-gray-600">{filteredTrucks.length} trucks in your fleet</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="border-[#1E7083] text-[#1E7083] hover:bg-[#1E7083] hover:text-white"
              onClick={() => navigate('/trucks/bulk-import')}
            >
              <Upload className="mr-2 h-4 w-4" /> Bulk Import
            </Button>
            <Button 
              className="bg-[#124481] hover:bg-[#1E7083]"
              onClick={() => navigate('/trucks/new')}
              data-testid="add-truck-button"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Truck
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by VIN, customer name, or vehicle name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Truck List */}
        {filteredTrucks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TruckIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2" data-testid="no-trucks">No trucks found</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first truck</p>
              <Button onClick={() => navigate('/trucks/new')}>Add Truck</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTrucks.map((truck) => {
              // Support both flat structure and legacy nested identity structure
              const vin = truck?.vin || truck?.identity?.vin || '';
              const truckNumber = truck?.truck_number || truck?.unit_id || truck?.identity?.truck_number || truck?.identity?.unit_id || '';
              const year = truck?.year || truck?.identity?.year || '';
              const make = truck?.make || truck?.identity?.make || '';
              const model = truck?.model || truck?.identity?.model || '';
              const odometer = truck?.odometer_miles || truck?.identity?.odometer_mi || null;
              const customerName = truck?.customer_name || '';
              
              return (
                <Card 
                  key={truck?.id ?? Math.random()} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/trucks/${truck?.id}`)}
                  data-testid={`truck-card-${truck?.id}`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      {/* Left: Unit Number and Truck Info */}
                      <div className="flex items-center space-x-6 flex-1">
                        <div className="w-24 flex-shrink-0">
                          <div className="text-sm text-gray-500">Unit #</div>
                          <div className="text-lg font-bold text-gray-900">
                            {truckNumber || 'N/A'}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {year} {make} {model}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            VIN: <span className="font-mono text-primary">{vin || 'N/A'}</span>
                          </div>
                        </div>
                        
                        {odometer && (
                          <div className="w-32 text-right flex-shrink-0">
                            <div className="text-sm text-gray-500">Odometer</div>
                            <div className="font-medium text-gray-900">
                              {Number(odometer).toLocaleString()} mi
                            </div>
                          </div>
                        )}
                        
                        {customerName && (
                          <div className="w-48 flex-shrink-0">
                            <div className="text-sm text-gray-500">Customer</div>
                            <div className="font-medium text-gray-900 truncate">
                              {customerName}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Right: Health Badge and Data Completeness */}
                      <div className="flex items-center space-x-4 ml-6">
                        <TruckHealthBadge truck={truck} />
                        <Badge className="bg-[#289790]">{truck?.data_completeness ?? 0}% Complete</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TruckList;
