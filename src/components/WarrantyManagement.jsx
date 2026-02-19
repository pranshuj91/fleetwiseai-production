import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Circle, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { warrantyAPI } from '../lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const WarrantyManagement = ({ 
  workOrderId, 
  warrantyAnalysis, 
  onWarrantyAnalyzed,
  warrantyLoading,
  setWarrantyLoading 
}) => {
  const navigate = useNavigate();
  const [manualFlagMode, setManualFlagMode] = useState(false);

  const handleAutoDetect = async () => {
    setWarrantyLoading(true);
    try {
      const response = await warrantyAPI.analyze(workOrderId);
      onWarrantyAnalyzed(response.data);
      
      if (response.data?.has_warranty_opportunity) {
        toast.success('Warranty opportunity detected!');
      } else {
        toast.info('No warranty opportunities found');
      }
    } catch (error) {
      console.error('Error analyzing warranty:', error);
      toast.error('Failed to analyze warranty');
    } finally {
      setWarrantyLoading(false);
    }
  };

  const handleFlagManually = () => {
    // For now, just toggle the flag mode - in a full implementation, 
    // this would open a modal to select warranty type
    toast.info('Manual warranty flagging - feature coming soon');
    setManualFlagMode(!manualFlagMode);
  };

  const handleGeneratePacket = () => {
    if (warrantyAnalysis?.has_warranty_opportunity) {
      navigate(`/warranty/claims/create/${workOrderId}`);
    } else {
      toast.warning('Run warranty detection first to generate a packet');
    }
  };

  const hasWarrantyFlags = warrantyAnalysis?.has_warranty_opportunity;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Circle className="h-4 w-4 mr-2 text-gray-400" />
          Warranty Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Status Message */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
          <Circle className={`h-4 w-4 mr-2 ${hasWarrantyFlags ? 'text-green-500' : 'text-gray-400'}`} />
          <span className="text-sm text-gray-600">
            {hasWarrantyFlags 
              ? `Warranty opportunity found: ${warrantyAnalysis.opportunities?.[0]?.claim_type || 'Potential Coverage'}`
              : 'No warranty flags detected. Run auto-detection or flag manually.'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={handleAutoDetect}
            disabled={warrantyLoading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {warrantyLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Circle className="mr-2 h-4 w-4" />
            )}
            Auto-Detect Warranty
          </Button>

          <Button
            variant="outline"
            onClick={handleFlagManually}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Flag Manually
          </Button>

          <Button
            onClick={handleGeneratePacket}
            disabled={!hasWarrantyFlags}
            className={hasWarrantyFlags 
              ? 'bg-[#7c8798] hover:bg-[#6b7688] text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
          >
            <FileText className="mr-2 h-4 w-4" />
            Generate Warranty Packet
          </Button>
        </div>

        {/* Show detected opportunities summary */}
        {hasWarrantyFlags && warrantyAnalysis.opportunities && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-green-800">
              {warrantyAnalysis.opportunities.length} warranty opportunit{warrantyAnalysis.opportunities.length > 1 ? 'ies' : 'y'} detected
            </p>
            <p className="text-xs text-green-600 mt-1">
              Estimated recovery: ${warrantyAnalysis.total_estimated_recovery?.toFixed(2) || '0.00'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WarrantyManagement;
