import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { partsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Plus, Search, Edit, Trash2, Package, Loader2, 
  DollarSign, TrendingUp, AlertCircle
} from 'lucide-react';

const PartsCatalog = () => {
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'engine', label: 'Engine' },
    { value: 'transmission', label: 'Transmission' },
    { value: 'brakes', label: 'Brakes' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'emission', label: 'Emission' },
    { value: 'cooling', label: 'Cooling' },
    { value: 'fuel', label: 'Fuel' },
    { value: 'suspension', label: 'Suspension' },
    { value: 'drivetrain', label: 'Drivetrain' },
    { value: 'filters', label: 'Filters' },
    { value: 'fluids', label: 'Fluids' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchParts();
  }, [searchTerm, selectedCategory]);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      
      const response = await partsAPI.list(params);
      setParts(response.data);
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (partId) => {
    if (!window.confirm('Are you sure you want to delete this part?')) return;
    
    try {
      await partsAPI.delete(partId);
      fetchParts();
    } catch (error) {
      console.error('Error deleting part:', error);
      alert('Failed to delete part');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      engine: 'bg-red-100 text-red-700',
      transmission: 'bg-blue-100 text-blue-700',
      brakes: 'bg-orange-100 text-orange-700',
      electrical: 'bg-yellow-100 text-yellow-700',
      emission: 'bg-green-100 text-green-700',
      cooling: 'bg-cyan-100 text-cyan-700',
      fuel: 'bg-purple-100 text-purple-700',
      filters: 'bg-pink-100 text-pink-700',
      fluids: 'bg-indigo-100 text-indigo-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Package className="mr-3 h-8 w-8 text-[#289790]" />
                Parts Catalog
              </h1>
              <p className="text-gray-600 mt-1">Manage your parts inventory and pricing</p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-[#289790] hover:bg-[#1E7083]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Part
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by part number, name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#289790]"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Parts</p>
                  <p className="text-2xl font-bold text-gray-900">{parts.length}</p>
                </div>
                <Package className="h-8 w-8 text-[#124481]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Stock</p>
                  <p className="text-2xl font-bold text-green-600">
                    {parts.filter(p => p.in_stock > 0).length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {parts.filter(p => p.reorder_point && p.in_stock <= p.reorder_point).length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inventory Value</p>
                  <p className="text-2xl font-bold text-[#289790]">
                    ${parts.reduce((sum, p) => sum + ((p.cost || 0) * (p.in_stock || 0)), 0).toFixed(0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-[#289790]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Parts List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
          </div>
        ) : parts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No parts found</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first part to the catalog</p>
              <Button onClick={() => setShowCreateModal(true)} className="bg-[#289790] hover:bg-[#1E7083]">
                <Plus className="mr-2 h-4 w-4" />
                Add Part
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parts.map((part) => (
              <Card key={part.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{part.name}</CardTitle>
                      <p className="text-sm font-mono text-gray-600">{part.part_number}</p>
                    </div>
                    <Badge className={getCategoryColor(part.category)}>
                      {part.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {part.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{part.description}</p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-semibold text-green-600">${part.unit_price.toFixed(2)}</span>
                    </div>
                    {part.cost && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cost:</span>
                        <span className="font-semibold">${part.cost.toFixed(2)}</span>
                      </div>
                    )}
                    {part.markup_percentage && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Markup:</span>
                        <span className="font-semibold text-blue-600">{part.markup_percentage.toFixed(0)}%</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">In Stock:</span>
                      <span className={`font-semibold ${
                        part.in_stock === 0 ? 'text-red-600' : 
                        part.reorder_point && part.in_stock <= part.reorder_point ? 'text-orange-600' : 
                        'text-green-600'
                      }`}>
                        {part.in_stock || 0}
                      </span>
                    </div>
                    {part.manufacturer && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Manufacturer:</span>
                        <span className="font-semibold">{part.manufacturer}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setEditingPart(part)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(part.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPart) && (
        <PartFormModal
          part={editingPart}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPart(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingPart(null);
            fetchParts();
          }}
          categories={categories}
        />
      )}
    </div>
  );
};

// Part Form Modal Component
const PartFormModal = ({ part, onClose, onSuccess, categories }) => {
  const [formData, setFormData] = useState(part || {
    part_number: '',
    name: '',
    description: '',
    category: 'other',
    manufacturer: '',
    oem_part_number: '',
    unit_price: '',
    cost: '',
    supplier: '',
    in_stock: 0,
    reorder_point: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Convert string numbers to floats
      const data = {
        ...formData,
        unit_price: parseFloat(formData.unit_price) || 0,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        in_stock: parseInt(formData.in_stock) || 0,
        reorder_point: formData.reorder_point ? parseInt(formData.reorder_point) : null
      };

      if (part) {
        await partsAPI.update(part.id, data);
      } else {
        await partsAPI.create(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving part:', error);
      alert('Failed to save part');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">{part ? 'Edit Part' : 'Add New Part'}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Number <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.part_number}
                  onChange={(e) => setFormData({...formData, part_number: e.target.value})}
                  placeholder="e.g., 23532598"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., EGR Cooler"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the part"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#289790]"
                >
                  {categories.filter(c => c.value).map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                  placeholder="e.g., Detroit Diesel"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost (Shop)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">In Stock</label>
                <Input
                  type="number"
                  value={formData.in_stock}
                  onChange={(e) => setFormData({...formData, in_stock: e.target.value})}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                <Input
                  type="number"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({...formData, reorder_point: e.target.value})}
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  placeholder="FleetPride"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OEM Part Number</label>
              <Input
                value={formData.oem_part_number}
                onChange={(e) => setFormData({...formData, oem_part_number: e.target.value})}
                placeholder="Original manufacturer part number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#289790]"
                rows={3}
                placeholder="Additional notes or specifications"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="flex-1 bg-[#289790] hover:bg-[#1E7083]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  part ? 'Update Part' : 'Create Part'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PartsCatalog;
