import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Upload, FileText, CheckCircle, AlertCircle, 
  Loader2, Download, ArrowRight, Database
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const AS400ImportWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Import, 4: Complete
  const [file, setFile] = useState(null);
  const [formatType, setFormatType] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  
  const handleUploadAndPreview = async () => {
    if (!file) return;
    
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const params = new URLSearchParams({
        format_type: formatType
      });
      
      const response = await fetch(
        `${BACKEND_URL}/api/trucks/as400-import?${params}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
        setStep(2);
      } else {
        const error = await response.json();
        alert(`Failed to parse file: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmImport = async () => {
    try {
      setLoading(true);
      setStep(3);
      
      const response = await fetch(
        `${BACKEND_URL}/api/trucks/as400-import/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            trucks: previewData.preview
          })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        setStep(4);
      } else {
        alert('Failed to import trucks');
        setStep(2);
      }
    } catch (error) {
      console.error('Error importing trucks:', error);
      alert('Error importing trucks');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };
  
  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/trucks')}
            className="mb-4"
          >
            ← Back to Fleet
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Database className="mr-3 h-8 w-8 text-[#289790]" />
            AS/400 Data Import Wizard
          </h1>
          <p className="text-gray-600 mt-1">
            Import historical fleet data from AS/400 systems
          </p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className={`flex items-center ${step >= 1 ? 'text-[#289790]' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-[#289790] text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Upload</span>
            </div>
            
            <div className={`mx-4 h-1 w-20 ${step >= 2 ? 'bg-[#289790]' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center ${step >= 2 ? 'text-[#289790]' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-[#289790] text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Preview</span>
            </div>
            
            <div className={`mx-4 h-1 w-20 ${step >= 3 ? 'bg-[#289790]' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center ${step >= 3 ? 'text-[#289790]' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-[#289790] text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Import</span>
            </div>
            
            <div className={`mx-4 h-1 w-20 ${step >= 4 ? 'bg-[#289790]' : 'bg-gray-200'}`}></div>
            
            <div className={`flex items-center ${step >= 4 ? 'text-[#289790]' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-[#289790] text-white' : 'bg-gray-200'}`}>
                ✓
              </div>
              <span className="ml-2 font-medium">Complete</span>
            </div>
          </div>
        </div>
        
        {/* Step 1: Upload */}
        {step === 1 && (
          <Card>
            <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                Step 1: Upload AS/400 Data File
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Format Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Data Format
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <button
                      onClick={() => setFormatType('auto')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formatType === 'auto' 
                          ? 'border-[#289790] bg-[#289790]/5' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-semibold">Auto-Detect</div>
                      <div className="text-xs text-gray-600 mt-1">Recommended</div>
                    </button>
                    
                    <button
                      onClick={() => setFormatType('csv')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formatType === 'csv' 
                          ? 'border-[#289790] bg-[#289790]/5' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-semibold">CSV Format</div>
                      <div className="text-xs text-gray-600 mt-1">Comma-separated</div>
                    </button>
                    
                    <button
                      onClick={() => setFormatType('fixed_width')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formatType === 'fixed_width' 
                          ? 'border-[#289790] bg-[#289790]/5' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-semibold">Fixed-Width</div>
                      <div className="text-xs text-gray-600 mt-1">Position-based</div>
                    </button>
                    
                    <button
                      onClick={() => setFormatType('spool')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        formatType === 'spool' 
                          ? 'border-[#289790] bg-[#289790]/5' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-semibold">Spool File</div>
                      <div className="text-xs text-gray-600 mt-1">Report format</div>
                    </button>
                  </div>
                </div>
                
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Upload File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#289790] transition-colors">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <input
                      type="file"
                      accept=".csv,.txt,.dat"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-block px-4 py-2 bg-[#289790] text-white rounded-md hover:bg-[#1E7083]"
                    >
                      Choose File
                    </label>
                    <p className="text-sm text-gray-600 mt-2">
                      Supported formats: CSV, TXT, DAT
                    </p>
                    {file && (
                      <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                        <p className="text-sm text-green-800 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Format Examples */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Expected Format Examples:</h4>
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>CSV:</strong> "VIN","UNIT_ID","MAKE","MODEL","YEAR"</p>
                    <p><strong>Fixed-Width:</strong> 1HGBH41JXMN109186  UNIT-001  Freightliner  2020</p>
                    <p><strong>Spool:</strong> Report-style with headers and data rows</p>
                  </div>
                </div>
                
                {/* Action */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleUploadAndPreview}
                    disabled={!file || loading}
                    className="bg-[#289790] hover:bg-[#1E7083]"
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      <>Continue to Preview<ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Step 2: Preview */}
        {step === 2 && previewData && (
          <Card>
            <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Step 2: Preview Import Data
                </div>
                <Badge className="bg-white text-[#124481]">
                  {previewData.total_records} trucks found
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Format Detection */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-green-800 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <strong>Detected Format:</strong> 
                    <Badge className="ml-2 bg-green-600">{previewData.detected_format.toUpperCase()}</Badge>
                  </p>
                </div>
                
                {/* Preview Table */}
                <div>
                  <h4 className="font-semibold mb-3">Preview (First 10 Records)</h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VIN</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Make</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mileage</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.preview.map((truck, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                              {truck.identity?.vin || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {truck.identity?.unit_id || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {truck.identity?.make || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {truck.identity?.model || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {truck.identity?.year || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {truck.maintenance?.current_mileage || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  
                  <Button
                    onClick={handleConfirmImport}
                    disabled={loading}
                    className="bg-[#289790] hover:bg-[#1E7083]"
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
                    ) : (
                      <>Confirm & Import {previewData.total_records} Trucks<ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Step 3: Importing */}
        {step === 3 && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin text-[#289790] mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Importing Trucks...</h3>
                <p className="text-gray-600">
                  Please wait while we process your AS/400 data
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Step 4: Complete */}
        {step === 4 && importResult && (
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-6 w-6" />
                Import Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Results Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{importResult.total}</p>
                    <p className="text-sm text-gray-600">Total Records</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{importResult.successful}</p>
                    <p className="text-sm text-gray-600">Successfully Imported</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </div>
                
                {/* Errors */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-700">Import Errors:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {importResult.errors.map((error, idx) => (
                        <div key={idx} className="p-3 bg-red-50 rounded border border-red-200 text-sm">
                          <p className="font-semibold text-red-800">Truck: {error.truck}</p>
                          <p className="text-red-700">{error.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => navigate('/trucks')}
                    className="flex-1 bg-[#289790] hover:bg-[#1E7083]"
                  >
                    View Fleet
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetWizard}
                  >
                    Import More Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AS400ImportWizard;
