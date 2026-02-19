import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Filter, X, Calendar, Truck, User, Tag, DollarSign, CheckSquare, Square
} from 'lucide-react';

const AdvancedFilterPanel = ({ onFilterChange, onBulkAction, selectedItems = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: [],
    dateRange: { start: '', end: '' },
    customer: '',
    truck: '',
    minAmount: '',
    maxAmount: '',
    hasFaultCodes: false,
    tags: []
  });

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'in_progress', label: 'In Progress', color: 'blue' },
    { value: 'completed', label: 'Completed', color: 'green' }
  ];

  const bulkActions = [
    { value: 'update_status', label: 'Update Status', icon: Tag },
    { value: 'assign_technician', label: 'Assign Technician', icon: User },
    { value: 'export_pdf', label: 'Export to PDF', icon: DollarSign },
    { value: 'delete', label: 'Delete Selected', icon: X, danger: true }
  ];

  const toggleStatus = (status) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    
    const newFilters = { ...filters, status: newStatuses };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      status: [],
      dateRange: { start: '', end: '' },
      customer: '',
      truck: '',
      minAmount: '',
      maxAmount: '',
      hasFaultCodes: false,
      tags: []
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const activeFilterCount = 
    filters.status.length +
    (filters.customer ? 1 : 0) +
    (filters.truck ? 1 : 0) +
    (filters.dateRange.start ? 1 : 0) +
    (filters.minAmount ? 1 : 0) +
    (filters.hasFaultCodes ? 1 : 0);

  return (
    <div className="mb-6">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant={isOpen ? "default" : "outline"}
          onClick={() => setIsOpen(!isOpen)}
          className={isOpen ? "bg-[#124481]" : ""}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 bg-[#289790]">{activeFilterCount}</Badge>
          )}
        </Button>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedItems.length} selected
            </span>
            <div className="flex gap-2">
              {bulkActions.map(action => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.value}
                    variant="outline"
                    size="sm"
                    className={action.danger ? "text-red-600 hover:bg-red-50" : ""}
                    onClick={() => onBulkAction(action.value, selectedItems)}
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <Card className="border-[#124481] border-2">
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Advanced Filters
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-white hover:bg-white/20"
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(option => (
                    <Badge
                      key={option.value}
                      className={`cursor-pointer ${
                        filters.status.includes(option.value)
                          ? `bg-${option.color}-500 text-white`
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      onClick={() => toggleStatus(option.value)}
                    >
                      {filters.status.includes(option.value) ? (
                        <CheckSquare className="mr-1 h-3 w-3" />
                      ) : (
                        <Square className="mr-1 h-3 w-3" />
                      )}
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date Range
                </label>
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                    placeholder="Start date"
                  />
                  <Input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                    placeholder="End date"
                  />
                </div>
              </div>

              {/* Customer Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  <User className="inline h-4 w-4 mr-1" />
                  Customer
                </label>
                <Input
                  value={filters.customer}
                  onChange={(e) => updateFilter('customer', e.target.value)}
                  placeholder="Filter by customer name"
                />
              </div>

              {/* Truck Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Truck className="inline h-4 w-4 mr-1" />
                  Truck
                </label>
                <Input
                  value={filters.truck}
                  onChange={(e) => updateFilter('truck', e.target.value)}
                  placeholder="Truck number or VIN"
                />
              </div>

              {/* Amount Range */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Amount Range
                </label>
                <div className="space-y-2">
                  <Input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => updateFilter('minAmount', e.target.value)}
                    placeholder="Min amount"
                  />
                  <Input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => updateFilter('maxAmount', e.target.value)}
                    placeholder="Max amount"
                  />
                </div>
              </div>

              {/* Fault Codes Toggle */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Tag className="inline h-4 w-4 mr-1" />
                  Additional Filters
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.hasFaultCodes}
                    onChange={(e) => updateFilter('hasFaultCodes', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Has fault codes</span>
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Active Filters ({activeFilterCount}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {filters.status.map(status => (
                    <Badge key={status} variant="outline">
                      {statusOptions.find(o => o.value === status)?.label}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => toggleStatus(status)}
                      />
                    </Badge>
                  ))}
                  {filters.customer && (
                    <Badge variant="outline">
                      Customer: {filters.customer}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => updateFilter('customer', '')}
                      />
                    </Badge>
                  )}
                  {filters.truck && (
                    <Badge variant="outline">
                      Truck: {filters.truck}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => updateFilter('truck', '')}
                      />
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedFilterPanel;
