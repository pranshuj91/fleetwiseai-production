import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  DollarSign, Plus, Trash2, Loader2, FileText, 
  AlertCircle, CheckCircle, Download 
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const WarrantyClaimCreate = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [warrantyAnalysis, setWarrantyAnalysis] = useState(null);
  const [project, setProject] = useState(null);
  
  // Claim form state
  const [claimType, setClaimType] = useState('');
  const [partsClaimed, setPartsClaimed] = useState([]);
  const [laborHours, setLaborHours] = useState(0);
  const [laborRate, setLaborRate] = useState(0);
  const [notes, setNotes] = useState('');
  
  useEffect(() => {
    fetchProjectAndAnalysis();
  }, [projectId]);
  
  const fetchProjectAndAnalysis = async () => {
    try {
      setLoading(true);
      
      // Fetch project
      const projectRes = await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const projectData = await projectRes.json();
      setProject(projectData);
      
      // Fetch warranty analysis
      const analysisRes = await fetch(`${BACKEND_URL}/api/warranty/list`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const analyses = await analysisRes.json();
      
      // Find analysis for this project
      const projectAnalysis = analyses.find(a => a.project_id === projectId);
      setWarrantyAnalysis(projectAnalysis);
      
      // Pre-populate claim type if analysis exists
      if (projectAnalysis?.analysis?.opportunities?.length > 0) {
        setClaimType(projectAnalysis.analysis.opportunities[0].claim_type);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const addPart = () => {
    setPartsClaimed([...partsClaimed, {
      part_number: '',
      description: '',
      quantity: 1,
      cost: 0
    }]);
  };
  
  const removePart = (index) => {
    setPartsClaimed(partsClaimed.filter((_, i) => i !== index));
  };
  
  const updatePart = (index, field, value) => {
    const updated = [...partsClaimed];
    updated[index][field] = value;
    setPartsClaimed(updated);
  };
  
  const calculateTotal = () => {
    const partsTotal = partsClaimed.reduce((sum, part) => sum + (part.quantity * part.cost), 0);
    const laborTotal = laborHours * laborRate;
    return partsTotal + laborTotal;
  };
  
  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const claimData = {
        project_id: projectId,
        warranty_analysis_id: warrantyAnalysis?._id || '',
        claim_type: claimType,
        parts_claimed: partsClaimed,
        labor_hours_claimed: parseFloat(laborHours),
        labor_rate: parseFloat(laborRate),
        total_claim_amount: calculateTotal(),
        supporting_documents: [],
        notes: notes
      };
      
      const response = await fetch(`${BACKEND_URL}/api/warranty/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(claimData)
      });
      
      if (response.ok) {
        const claim = await response.json();
        alert(`Warranty claim ${claim.claim_number} created successfully!`);
        navigate('/warranty');
      } else {
        alert('Failed to create warranty claim');
      }
      
    } catch (error) {
      console.error('Error creating claim:', error);
      alert('Error creating warranty claim');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-[#289790]" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/warranty')}
            className="mb-4"
          >
            ← Back to Warranty Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <DollarSign className="mr-3 h-8 w-8 text-[#289790]" />
            Create Warranty Claim
          </h1>
          <p className="text-gray-600 mt-1">
            Work Order: {project?.work_order_number} - {project?.customer_name}
          </p>
        </div>
        
        {/* Warranty Analysis Summary */}
        {warrantyAnalysis?.analysis?.has_warranty_opportunity && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center">
                <CheckCircle className="mr-2 h-5 w-5" />
                Warranty Opportunity Identified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-green-700">
                  <strong>Estimated Recovery:</strong> ${warrantyAnalysis.analysis.total_estimated_recovery?.toFixed(2) || '0.00'}
                </p>
                {warrantyAnalysis.analysis.opportunities?.map((opp, idx) => (
                  <div key={idx} className="bg-white rounded p-3 border border-green-200">
                    <p className="font-semibold text-gray-900">{opp.claim_type}</p>
                    <p className="text-sm text-gray-600">{opp.reasoning}</p>
                    <Badge className="mt-2">{opp.confidence} Confidence</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Claim Form */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <CardTitle>Warranty Claim Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Claim Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Claim Type *
                </label>
                <Input
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value)}
                  placeholder="e.g., Factory Powertrain Warranty, Emission System Warranty"
                  required
                />
              </div>
              
              {/* Parts Claimed */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Parts Claimed
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPart}
                    className="border-[#289790] text-[#289790] hover:bg-[#289790] hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Part
                  </Button>
                </div>
                
                {partsClaimed.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                    <p className="text-gray-500">No parts added yet. Click "Add Part" to begin.</p>
                  </div>
                )}
                
                <div className="space-y-3">
                  {partsClaimed.map((part, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="col-span-3">
                        <Input
                          placeholder="Part Number"
                          value={part.part_number}
                          onChange={(e) => updatePart(index, 'part_number', e.target.value)}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          placeholder="Description"
                          value={part.description}
                          onChange={(e) => updatePart(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={part.quantity}
                          onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Cost"
                          value={part.cost}
                          onChange={(e) => updatePart(index, 'cost', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePart(index)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Labor Claimed */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Labor Hours *
                  </label>
                  <Input
                    type="number"
                    value={laborHours}
                    onChange={(e) => setLaborHours(parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                    min="0"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Labor Rate ($/hr) *
                  </label>
                  <Input
                    type="number"
                    value={laborRate}
                    onChange={(e) => setLaborRate(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add any additional information about this warranty claim..."
                />
              </div>
              
              {/* Total */}
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Claim Amount</p>
                    <p className="text-3xl font-bold text-[#124481]">
                      ${calculateTotal().toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="h-12 w-12 text-[#124481] opacity-20" />
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !claimType || partsClaimed.length === 0}
                  className="flex-1 bg-[#289790] hover:bg-[#1E7083]"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Claim...</>
                  ) : (
                    <><FileText className="mr-2 h-4 w-4" />Create Warranty Claim</>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => navigate('/warranty')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WarrantyClaimCreate;
