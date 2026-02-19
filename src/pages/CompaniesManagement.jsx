import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Building2, Plus, Search, Edit, Trash2, Users, 
  Calendar, X, Loader2, CheckCircle, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client.js';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CompaniesManagement = () => {
  const { profile } = useAuth();
  const { isMasterAdmin, getRole } = usePermissions();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState([]);
  const [editingCompany, setEditingCompany] = useState(null);
  const [newCompanyName, setNewCompanyName] = useState('');

  const role = getRole();
  const isMasterAdminUser = role === 'master_admin';

  useEffect(() => {
    if (role && !isMasterAdminUser) {
      toast.error('Access denied. Super Admin only.');
      navigate('/');
      return;
    }
    if (role) {
      fetchCompanies();
    }
  }, [role, isMasterAdminUser, navigate]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      
      // Fetch companies with user count
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) {
        console.error('Error fetching companies:', companiesError);
        toast.error('Failed to load companies');
        return;
      }

      // Get user counts per company
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('company_id');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Count users per company
      const userCounts = {};
      profilesData?.forEach(profile => {
        if (profile.company_id) {
          userCounts[profile.company_id] = (userCounts[profile.company_id] || 0) + 1;
        }
      });

      // Merge user counts into companies
      const companiesWithCounts = companiesData.map(company => ({
        ...company,
        userCount: userCounts[company.id] || 0
      }));

      setCompanies(companiesWithCounts);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    if (newCompanyName.length > 100) {
      toast.error('Company name must be less than 100 characters');
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({ name: newCompanyName.trim() })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('Company created successfully');
      setShowAddModal(false);
      setNewCompanyName('');
      fetchCompanies();
    } catch (error) {
      console.error('Error adding company:', error);
      toast.error(error.message || 'Failed to create company');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCompany = async () => {
    if (!editingCompany || !editingCompany.name.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    if (editingCompany.name.length > 100) {
      toast.error('Company name must be less than 100 characters');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: editingCompany.name.trim() })
        .eq('id', editingCompany.id);

      if (error) {
        throw error;
      }

      toast.success('Company updated successfully');
      setShowEditModal(false);
      setEditingCompany(null);
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error(error.message || 'Failed to update company');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCompany = async (company) => {
    // Prevent deletion if company has users - they must be reassigned first
    if (company.userCount > 0) {
      toast.error(`Cannot delete "${company.name}" - it has ${company.userCount} user(s). Please reassign or remove users first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${company.name}"?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);

      if (error) {
        throw error;
      }

      toast.success('Company deleted successfully');
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error(error.message || 'Failed to delete company');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (company) => {
    setEditingCompany({ ...company });
    setShowEditModal(true);
  };

  // Stats
  const totalCompanies = companies.length;
  const totalUsers = companies.reduce((sum, c) => sum + c.userCount, 0);
  const activeCompanies = companies.filter(c => c.userCount > 0).length;

  if (!isMasterAdminUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                <Building2 className="mr-2 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8 text-[#124481] flex-shrink-0" />
                <span className="truncate">Companies Management</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Create and manage companies across the platform
              </p>
            </div>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#124481] hover:bg-[#1E7083] w-full sm:w-auto flex-shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Total Companies</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalCompanies}</p>
                </div>
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-[#124481] flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Active Companies</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{activeCompanies}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Total Users</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{totalUsers}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
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
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#124481]" />
            <span className="ml-2 text-gray-600">Loading companies...</span>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <Card className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first company'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowAddModal(true)} className="bg-[#124481] hover:bg-[#1E7083]">
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            )}
          </Card>
        ) : (
          /* Companies List */
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCompanies.map(company => (
              <Card key={company.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-[#124481] bg-opacity-10 rounded-full flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-[#124481]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                        <Badge className={`mt-1 ${company.userCount > 0 ? 'bg-green-500' : 'bg-gray-400'} text-white`}>
                          {company.userCount} user{company.userCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditModal(company)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteCompany(company)}
                        className="text-red-600 hover:text-red-700"
                        disabled={actionLoading}
                        title={company.userCount > 0 ? 'Warning: Has users' : 'Delete company'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      Created {new Date(company.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Company Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Plus className="mr-2 h-5 w-5" />
                    Add Company
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowAddModal(false); setNewCompanyName(''); }}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Company Name *</label>
                  <Input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    maxLength={100}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => { setShowAddModal(false); setNewCompanyName(''); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCompany}
                    disabled={actionLoading || !newCompanyName.trim()}
                    className="flex-1 bg-[#124481] hover:bg-[#1E7083]"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Company'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Company Modal */}
        {showEditModal && editingCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Edit className="mr-2 h-5 w-5" />
                    Edit Company
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowEditModal(false); setEditingCompany(null); }}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Company Name</label>
                  <Input
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})}
                    placeholder="Enter company name"
                    maxLength={100}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => { setShowEditModal(false); setEditingCompany(null); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditCompany}
                    disabled={actionLoading || !editingCompany.name.trim()}
                    className="flex-1 bg-[#124481] hover:bg-[#1E7083]"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompaniesManagement;
