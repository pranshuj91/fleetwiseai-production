import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { truckAPI, projectAPI, customerAPI, partsAPI } from '../lib/api';
import { Input } from '../components/ui/input';
import { Search, Truck, FileText, Users, Package, Loader2 } from 'lucide-react';

const GlobalSearch = () => {
  const navigate = useNavigate();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchTerm, effectiveCompanyId]);

  const performSearch = async () => {
    setLoading(true);
    try {
      // Use effectiveCompanyId which respects impersonation
      const [trucksRes, projectsRes, customersRes, partsRes] = await Promise.allSettled([
        truckAPI.list(effectiveCompanyId),
        projectAPI.list(effectiveCompanyId),
        customerAPI.list(effectiveCompanyId),
        partsAPI.list()
      ]);

      const searchResults = [];
      const term = searchTerm.toLowerCase();

      // Search Trucks
      if (trucksRes.status === 'fulfilled') {
        const trucks = trucksRes.value.data.filter(truck => 
          truck.identity?.unit_id?.toLowerCase().includes(term) ||
          truck.identity?.truck_number?.toLowerCase().includes(term) ||
          truck.identity?.vin?.toLowerCase().includes(term) ||
          truck.identity?.license_plate?.toLowerCase().includes(term) ||
          `${truck.identity?.year} ${truck.identity?.make} ${truck.identity?.model}`.toLowerCase().includes(term)
        ).slice(0, 3);

        trucks.forEach(truck => {
          searchResults.push({
            id: truck.id,
            type: 'truck',
            icon: Truck,
            title: `${truck.identity?.year || ''} ${truck.identity?.make || ''} ${truck.identity?.model || ''}`.trim(),
            subtitle: truck.identity?.unit_id ? `Unit ${truck.identity.unit_id}` : (truck.identity?.truck_number || truck.identity?.vin),
            path: `/trucks/${truck.id}`
          });
        });
      }

      // Search Projects
      if (projectsRes.status === 'fulfilled') {
        const projects = projectsRes.value.data.filter(project => 
          project.work_order_number?.toLowerCase().includes(term) ||
          project.truck_number?.toLowerCase().includes(term) ||
          project.customer_name?.toLowerCase().includes(term) ||
          project.complaint?.toLowerCase().includes(term)
        ).slice(0, 3);

        projects.forEach(project => {
          searchResults.push({
            id: project.id,
            type: 'project',
            icon: FileText,
            title: project.work_order_number || 'Work Order',
            subtitle: `${project.customer_name || 'N/A'} • ${project.truck_number || 'N/A'}`,
            path: `/projects/${project.id}`
          });
        });
      }

      // Search Customers
      if (customersRes.status === 'fulfilled') {
        const customers = customersRes.value.data.filter(customer => 
          customer.name?.toLowerCase().includes(term) ||
          customer.email?.toLowerCase().includes(term) ||
          customer.phone?.includes(term)
        ).slice(0, 3);

        customers.forEach(customer => {
          searchResults.push({
            id: customer.id,
            type: 'customer',
            icon: Users,
            title: customer.name,
            subtitle: customer.email || customer.phone || 'No contact',
            path: `/customers/${customer.id}`
          });
        });
      }

      // Search Parts
      if (partsRes.status === 'fulfilled') {
        const parts = partsRes.value.data.filter(part => 
          part.part_number?.toLowerCase().includes(term) ||
          part.part_name?.toLowerCase().includes(term) ||
          part.manufacturer?.toLowerCase().includes(term)
        ).slice(0, 3);

        parts.forEach(part => {
          searchResults.push({
            id: part.id,
            type: 'part',
            icon: Package,
            title: part.part_name,
            subtitle: `${part.part_number} • ${part.manufacturer || 'N/A'}`,
            path: `/parts`
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result) => {
    navigate(result.path);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search trucks, work orders, customers..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 bg-white/90 text-gray-900 placeholder-gray-500"
        />
      </div>

      {isOpen && searchTerm.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#289790] mx-auto" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No results found for "{searchTerm}"
            </div>
          ) : (
            <div className="py-2">
              {results.map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b last:border-b-0"
                >
                  <div className="flex-shrink-0">
                    <result.icon className="h-5 w-5 text-[#124481]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{result.title}</p>
                    <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs text-gray-400 capitalize">{result.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
