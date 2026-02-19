import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CheckSquare, FileText, DollarSign, Send, Download,
  Loader2, AlertCircle, CheckCircle
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const BatchOperations = ({ items = [], itemType = 'work_order', onRefresh }) => {
  const [selected, setSelected] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const toggleSelect = (id) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelected(items.map(item => item.id));
  };

  const clearSelection = () => {
    setSelected([]);
  };

  const batchAction = async (action) => {
    if (selected.length === 0) {
      alert('Please select items first');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      let endpoint = '';
      let body = { ids: selected };

      switch(action) {
        case 'invoice':
          endpoint = '/api/invoices/batch-create';
          break;
        case 'warranty':
          endpoint = '/api/warranty/batch-submit';
          break;
        case 'export':
          endpoint = '/api/export/work-orders';
          break;
        case 'assign':
          const techId = prompt('Enter technician ID to assign:');
          if (!techId) return;
          endpoint = '/api/tasks/batch-assign';
          body.assigned_to = techId;
          break;
        default:
          return;
      }

      const response = await fetch(
        `${BACKEND_URL}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(body)
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResult({
          success: true,
          message: data.message || `Successfully processed ${selected.length} items`,
          count: selected.length
        });
        clearSelection();
        if (onRefresh) onRefresh();
      } else {
        const error = await response.json();
        setResult({
          success: false,
          message: error.detail || 'Operation failed'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error: ' + error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-2 border-blue-200 bg-blue-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            Batch Operations
            {selected.length > 0 && (
              <Badge className="bg-blue-600">{selected.length} selected</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {selected.length === 0 ? (
              <Button size="sm" variant="outline" onClick={selectAll}>
                Select All ({items.length})
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={clearSelection}>
                Clear Selection
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <Button
            onClick={() => batchAction('invoice')}
            disabled={processing || selected.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Create Invoices
          </Button>
          
          <Button
            onClick={() => batchAction('warranty')}
            disabled={processing || selected.length === 0}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            File Warranty
          </Button>
          
          <Button
            onClick={() => batchAction('assign')}
            disabled={processing || selected.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Bulk Assign
          </Button>
          
          <Button
            onClick={() => batchAction('export')}
            disabled={processing || selected.length === 0}
            variant="outline"
            className="border-gray-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Result Message */}
        {result && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            result.success 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {result.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="font-medium">{result.message}</span>
          </div>
        )}

        {processing && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">Processing {selected.length} items...</span>
          </div>
        )}

        {/* Item Selection Grid */}
        <div className="mt-4 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-1 gap-2">
            {items.slice(0, 10).map(item => (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selected.includes(item.id)
                    ? 'bg-blue-100 border-blue-500'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selected.includes(item.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {selected.includes(item.id) && (
                      <CheckCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {item.truck_number || item.title || item.id}
                    </p>
                    <p className="text-xs text-gray-600">
                      {item.complaint || item.description || 'No description'}
                    </p>
                  </div>
                  {item.status && (
                    <Badge className="text-xs">{item.status}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          {items.length > 10 && (
            <p className="text-sm text-gray-500 text-center mt-3">
              Showing first 10 of {items.length} items. Select all to process batch.
            </p>
          )}
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>💡 Pro Tip:</strong> Use batch operations to process multiple work orders at once. 
          Perfect for end-of-day invoicing or warranty claim submissions.
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchOperations;
