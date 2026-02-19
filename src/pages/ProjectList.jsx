import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveCompany } from '../hooks/useEffectiveCompany';
import { projectAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { FileText, Filter, ArrowUpDown, CalendarIcon, X } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '../lib/utils';

const ProjectList = () => {
  const { user } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompany();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]); // For counting
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'work_order'
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState('all'); // 'all', '7days', '30days', 'custom'
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [isCustomPopoverOpen, setIsCustomPopoverOpen] = useState(false);

  // Calculate date range based on filter selection
  const getDateRange = () => {
    const today = new Date();
    switch (dateFilter) {
      case '7days':
        return { 
          startDate: subDays(today, 7).toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case '30days':
        return { 
          startDate: subDays(today, 30).toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'custom':
        if (customStartDate || customEndDate) {
          return {
            startDate: customStartDate ? format(customStartDate, 'yyyy-MM-dd') : null,
            endDate: customEndDate ? format(customEndDate, 'yyyy-MM-dd') : null
          };
        }
        return null;
      default:
        return null;
    }
  };

  // Calculate status counts from all projects
  const statusCounts = React.useMemo(() => {
    const counts = {
      all: allProjects.length,
      draft: 0,
      in_progress: 0,
      completed: 0,
    };
    
    allProjects.forEach(p => {
      const status = p?.status;
      if (status === 'extracted') {
        counts.draft++;
      } else if (status === 'reviewed' || status === 'linked') {
        counts.in_progress++;
      } else if (status === 'completed') {
        counts.completed++;
      }
    });
    
    return counts;
  }, [allProjects]);

  // Fetch all projects once for counts (respects date filter)
  useEffect(() => {
    const fetchAllProjects = async () => {
      try {
        const dateRange = getDateRange();
        // Use effectiveCompanyId which respects impersonation
        const response = await projectAPI.list(effectiveCompanyId, null, dateRange);
        setAllProjects(response?.data ?? []);
      } catch (error) {
        console.error('Error fetching all projects for counts:', error);
      }
    };
    fetchAllProjects();
  }, [effectiveCompanyId, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const dateRange = getDateRange();
        // Use effectiveCompanyId which respects impersonation
        const response = await projectAPI.list(
          effectiveCompanyId, 
          statusFilter === 'all' ? null : statusFilter,
          dateRange
        );
        const fetchedProjects = response?.data ?? [];
        
        // Apply sorting
        const sorted = [...fetchedProjects].sort((a, b) => {
          if (sortBy === 'work_order') {
            // Sort by work order number
            const woA = a?.work_order_number || a?.id || '';
            const woB = b?.work_order_number || b?.id || '';
            
            // Try numeric comparison first
            const numA = parseInt(woA);
            const numB = parseInt(woB);
            
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            
            // Fallback to string comparison
            return woA.localeCompare(woB);
          } else {
            // Sort by date (newest first)
            return new Date(b?.created_at ?? 0) - new Date(a?.created_at ?? 0);
          }
        });
        
        setProjects(sorted);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [effectiveCompanyId, statusFilter, sortBy, dateFilter, customStartDate, customEndDate]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'reviewed':
        return 'bg-blue-500';
      case 'linked':
        return 'bg-purple-500';
      case 'extracted':
        return 'bg-yellow-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDateFilterChange = (filter) => {
    if (filter === 'custom') {
      setIsCustomPopoverOpen(true);
    } else {
      setDateFilter(filter);
      setCustomStartDate(null);
      setCustomEndDate(null);
    }
  };

  const applyCustomDateRange = () => {
    setDateFilter('custom');
    setIsCustomPopoverOpen(false);
  };

  const clearCustomDates = () => {
    setCustomStartDate(null);
    setCustomEndDate(null);
    setDateFilter('all');
    setIsCustomPopoverOpen(false);
  };

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
    <div className="min-h-screen bg-gray-50" data-testid="project-list-page">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="projects-title">Work Orders</h1>
            <p className="text-gray-600">{projects.length} projects</p>
          </div>
        </div>

        {/* Filter and Sort */}
        <Card className="mb-6">
          <CardContent className="py-5">
            <div className="space-y-4">
              {/* Row 1: Status Filter and Sort */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Status Filter */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Filter className="h-4 w-4" />
                    <span className="font-medium">Status:</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge 
                      className={`cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-[#124481] hover:bg-[#0f3a6e] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => setStatusFilter('all')}
                      data-testid="filter-all"
                    >
                      All <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">{statusCounts.all}</span>
                    </Badge>
                    <Badge 
                      className={`cursor-pointer transition-colors ${statusFilter === 'draft' ? 'bg-[#124481] hover:bg-[#0f3a6e] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => setStatusFilter('draft')}
                      data-testid="filter-draft"
                    >
                      Draft <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">{statusCounts.draft}</span>
                    </Badge>
                    <Badge 
                      className={`cursor-pointer transition-colors ${statusFilter === 'in_progress' ? 'bg-[#124481] hover:bg-[#0f3a6e] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => setStatusFilter('in_progress')}
                      data-testid="filter-in-progress"
                    >
                      In Progress <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">{statusCounts.in_progress}</span>
                    </Badge>
                    <Badge 
                      className={`cursor-pointer transition-colors ${statusFilter === 'completed' ? 'bg-[#124481] hover:bg-[#0f3a6e] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => setStatusFilter('completed')}
                      data-testid="filter-completed"
                    >
                      Completed <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">{statusCounts.completed}</span>
                    </Badge>
                  </div>
                </div>
                
                {/* Sort Options */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ArrowUpDown className="h-4 w-4" />
                    <span className="font-medium">Sort:</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge 
                      className={`cursor-pointer transition-colors ${sortBy === 'date' ? 'bg-[#289790] hover:bg-[#1f7b75] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => setSortBy('date')}
                      data-testid="sort-date"
                    >
                      Date
                    </Badge>
                    <Badge 
                      className={`cursor-pointer transition-colors ${sortBy === 'work_order' ? 'bg-[#289790] hover:bg-[#1f7b75] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      onClick={() => setSortBy('work_order')}
                      data-testid="sort-work-order"
                    >
                      Work Order #
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Row 2: Date Range Filter */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="font-medium">Date Range:</span>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <Badge 
                    className={`cursor-pointer transition-colors ${dateFilter === 'all' ? 'bg-[#8B5CF6] hover:bg-[#7c4ce4] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => handleDateFilterChange('all')}
                    data-testid="date-filter-all"
                  >
                    All Time
                  </Badge>
                  <Badge 
                    className={`cursor-pointer transition-colors ${dateFilter === '7days' ? 'bg-[#8B5CF6] hover:bg-[#7c4ce4] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => handleDateFilterChange('7days')}
                    data-testid="date-filter-7days"
                  >
                    Last 7 Days
                  </Badge>
                  <Badge 
                    className={`cursor-pointer transition-colors ${dateFilter === '30days' ? 'bg-[#8B5CF6] hover:bg-[#7c4ce4] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => handleDateFilterChange('30days')}
                    data-testid="date-filter-30days"
                  >
                    Last 30 Days
                  </Badge>
                  
                  {/* Custom Date Range Popover */}
                  <Popover open={isCustomPopoverOpen} onOpenChange={setIsCustomPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Badge 
                        className={`cursor-pointer transition-colors ${dateFilter === 'custom' ? 'bg-[#8B5CF6] hover:bg-[#7c4ce4] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        data-testid="date-filter-custom"
                      >
                        {dateFilter === 'custom' && customStartDate && customEndDate 
                          ? `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d, yyyy')}`
                          : 'Custom'}
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4 bg-white border shadow-lg z-50" align="start">
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          {/* From Date */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">From</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-[140px] justify-start text-left font-normal",
                                    !customStartDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {customStartDate ? format(customStartDate, "MMM d, yyyy") : "Start date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-white border shadow-lg z-[60]" align="start">
                                <Calendar
                                  mode="single"
                                  selected={customStartDate}
                                  onSelect={setCustomStartDate}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* To Date */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">To</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-[140px] justify-start text-left font-normal",
                                    !customEndDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {customEndDate ? format(customEndDate, "MMM d, yyyy") : "End date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-white border shadow-lg z-[60]" align="start">
                                <Calendar
                                  mode="single"
                                  selected={customEndDate}
                                  onSelect={setCustomEndDate}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                          <Button 
                            size="sm" 
                            onClick={applyCustomDateRange}
                            disabled={!customStartDate && !customEndDate}
                            className="bg-[#8B5CF6] hover:bg-[#7c4ce4]"
                          >
                            Apply
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={clearCustomDates}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Show clear button when custom date is active */}
                  {dateFilter === 'custom' && (customStartDate || customEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      onClick={clearCustomDates}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2" data-testid="no-projects">No projects found</h3>
              <p className="text-gray-600">
                {dateFilter !== 'all' 
                  ? 'No work orders found for the selected date range. Try adjusting the filter.'
                  : 'Projects will appear here once they are created'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
                data-testid={`project-card-${project.id}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    {/* Left: Work Order Number */}
                    <div className="w-32 flex-shrink-0">
                      <div className="text-sm text-gray-500">WO #</div>
                      <div className="text-lg font-bold text-gray-900">
                        {project.work_order_number || project.id?.substring(0, 8) || 'N/A'}
                      </div>
                    </div>
                    
                    {/* Middle: Truck and Details */}
                    <div className="flex-1 px-6">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-gray-900">
                          {project.truck?.truck_number || project.extracted_unit_number || 'No Truck #'}
                        </h3>
                      <Badge className={getStatusColor(project?.status)}>
                          {(project?.status ?? 'draft').replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-1">
                        {project.customer_name || project.truck?.customer_name || project.truck?.customer?.name ? (
                          <>Customer: {project.customer_name || project.truck?.customer_name || project.truck?.customer?.name}</>
                        ) : (
                          <span className="text-orange-600 italic">Customer is not linked with this fleet or Work order</span>
                        )}
                      </p>
                      
                      {project.complaint && (
                        <p className="text-sm text-gray-700 mb-1 line-clamp-1">
                          {project.complaint}
                        </p>
                      )}
                      
                      {project.fault_codes && project.fault_codes.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-1">
                          {project.fault_codes.slice(0, 3).map((code, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                          {project.fault_codes.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{project.fault_codes.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Right: Dates */}
                    <div className="w-48 text-right flex-shrink-0">
                      <div className="text-xs text-gray-500">
                        Created: {new Date(project.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Updated: {new Date(project.updated_at).toLocaleDateString()}
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

export default ProjectList;
