import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Package, AlertTriangle, TrendingUp, TrendingDown,
  Plus, Loader2, DollarSign, MapPin
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const InventoryManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('inventory');
  const [filterLocation, setFilterLocation] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchTransactions();
  }, [filterLocation, lowStockOnly]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      let url = `${BACKEND_URL}/api/inventory?`;
      if (filterLocation) url += `location=${filterLocation}&`;
      if (lowStockOnly) url += `low_stock_only=true&`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/inventory/transactions`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const totalValue = inventory.reduce((sum, item) => sum + item.total_value, 0);
  const lowStockCount = inventory.filter(item => item.needs_reorder).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-8 w-8 text-[#124481]" />
              Inventory Management
            </h1>
            <p className="text-gray-600 mt-1">Track parts and stock levels</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold">{inventory.length}</p>
                </div>
                <Package className="h-8 w-8 text-[#124481]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Transactions (30d)</p>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => setActiveTab('inventory')}
            variant={activeTab === 'inventory' ? 'default' : 'outline'}
            className={activeTab === 'inventory' ? 'bg-[#124481]' : ''}
          >
            <Package className="h-4 w-4 mr-2" />
            Current Stock
          </Button>
          <Button
            onClick={() => setActiveTab('transactions')}
            variant={activeTab === 'transactions' ? 'default' : 'outline'}
            className={activeTab === 'transactions' ? 'bg-[#124481]' : ''}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Transactions
          </Button>
        </div>

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Inventory Items</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLowStockOnly(!lowStockOnly)}
                  >
                    {lowStockOnly ? 'Show All' : 'Low Stock Only'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-gray-400" />
                </div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No inventory items</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Part #</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Location</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Unit Cost</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Value</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {inventory.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{item.part_number}</td>
                          <td className="px-4 py-3 text-sm">{item.part_name}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.location}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right">${item.unit_cost.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">${item.total_value.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            {item.needs_reorder ? (
                              <Badge className="bg-red-500">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Reorder
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500">OK</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(trans => (
                    <div key={trans.id} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {trans.transaction_type === 'purchase' && <TrendingUp className="h-4 w-4 text-green-600" />}
                          {trans.transaction_type === 'usage' && <TrendingDown className="h-4 w-4 text-red-600" />}
                          <span className="font-semibold">{trans.part_number} - {trans.part_name}</span>
                        </div>
                        <Badge className={
                          trans.transaction_type === 'purchase' ? 'bg-green-500' :
                          trans.transaction_type === 'usage' ? 'bg-red-500' :
                          'bg-blue-500'
                        }>
                          {trans.transaction_type}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Quantity</p>
                          <p>{trans.quantity}</p>
                        </div>
                        <div>
                          <p className="font-medium">Balance After</p>
                          <p>{trans.balance_after}</p>
                        </div>
                        <div>
                          <p className="font-medium">Cost</p>
                          <p>${trans.total_cost ? trans.total_cost.toFixed(2) : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-medium">Date</p>
                          <p>{new Date(trans.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {trans.notes && (
                        <p className="text-sm text-gray-600 mt-2">Notes: {trans.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InventoryManagement;
