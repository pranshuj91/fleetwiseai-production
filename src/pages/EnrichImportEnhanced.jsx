import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  Upload, FileText, CheckCircle, AlertCircle, Loader2, 
  Download, ArrowRight, Database, Truck, Zap, TrendingUp,
  Shield, Package, Clock, Award
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const AS400ImportWizardEnhanced = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Upload, 2: Processing, 3: Review, 4: Complete
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({});
  const [analysisResult, setAnalysisResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
    } else {
      alert('Please select a CSV file');
    }
  };
  
  const handleAnalyze = async () => {
    if (!file) return;
    
    try {
      setLoading(true);
      setStep(2);
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate progressive updates
      setProcessingStatus({ stage: 'parsing', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProcessingStatus({ stage: 'parsing', progress: 30 });
      
      const response = await fetch(
        `${BACKEND_URL}/api/trucks/as400-analyze`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        }
      );
      
      setProcessingStatus({ stage: 'decoding', progress: 60 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (response.ok) {
        const data = await response.json();
        setProcessingStatus({ stage: 'complete', progress: 100 });
        setAnalysisResult(data);
        await new Promise(resolve => setTimeout(resolve, 500));
        setStep(3);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze file. Please check the format and try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };
  
  const handleImport = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/trucks/as400-import-confirmed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ analysis_id: analysisResult.analysis_id })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setImportResult(data);
        setStep(4);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Import failed');
    } finally {
      setLoading(false);
    }
  };

  const getCompletionColor = (pct) => {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getCompletionBg = (pct) => {
    if (pct >= 80) return 'bg-green-100';
    if (pct >= 60) return 'bg-yellow-100';
    return 'bg-orange-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-8 w-8 text-[#124481]" />
            AS/400 Smart Import
          </h1>
          <p className="text-gray-600 mt-1">
            Get started in 10 minutes. We'll auto-enrich your data with manufacturer specs and intelligent defaults.
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Upload', icon: Upload },
                { num: 2, label: 'Analyze', icon: Zap },
                { num: 3, label: 'Review', icon: CheckCircle },
                { num: 4, label: 'Import', icon: Database }
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className={`flex flex-col items-center ${step >= s.num ? 'text-[#289790]' : 'text-gray-400'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      step >= s.num ? 'bg-[#289790] text-white' : 'bg-gray-200'
                    }`}>
                      {step > s.num ? <CheckCircle className="h-6 w-6" /> : <s.icon className="h-6 w-6" />}
                    </div>
                    <span className="text-sm font-medium">{s.label}</span>
                  </div>
                  {idx < 3 && (
                    <div className={`flex-1 h-1 mx-4 ${step > s.num ? 'bg-[#289790]' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Upload */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Upload Your AS/400 Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Drop your CSV file here</p>
                <p className="text-sm text-gray-600 mb-4">or click to browse</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button as="span" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Select CSV File
                  </Button>
                </label>
                {file && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded inline-flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📋 Expected Columns:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                  <div>• Unit Number (required)</div>
                  <div>• VIN (required)</div>
                  <div>• Year</div>
                  <div>• Make</div>
                  <div>• Model</div>
                  <div>• Current Mileage</div>
                  <div>• In-Service Date</div>
                  <div>• Work Order History</div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">💡 What Happens Next:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
                  <li>We'll parse your CSV and extract truck data</li>
                  <li>Auto-decode each VIN to get manufacturer specs</li>
                  <li>Calculate data completeness for each truck</li>
                  <li>Show you a quality report before importing</li>
                  <li>Import takes ~1 second per truck</li>
                </ol>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!file || loading}
                className="w-full bg-[#289790] hover:bg-[#1E7083] py-6 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Analyze File
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Processing */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Processing Your Data...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <Loader2 className="h-16 w-16 animate-spin text-[#289790] mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  {processingStatus.stage === 'parsing' && 'Parsing CSV file...'}
                  {processingStatus.stage === 'decoding' && 'Decoding VINs & enriching data...'}
                  {processingStatus.stage === 'complete' && 'Analysis complete!'}
                </p>
                <Progress value={processingStatus.progress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-gray-600 mt-2">{processingStatus.progress}%</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Parsing Rows</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Truck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Decoding VINs</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Analyzing Quality</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && analysisResult && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <Card className="border-2 border-green-500 bg-gradient-to-r from-green-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Analysis Complete - Ready to Import!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <p className="text-3xl font-bold text-[#124481]">{analysisResult.total_trucks}</p>
                    <p className="text-sm text-gray-600">Total Trucks</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <p className="text-3xl font-bold text-green-600">{analysisResult.vins_decoded}</p>
                    <p className="text-sm text-gray-600">VINs Decoded</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <p className="text-3xl font-bold text-blue-600">{analysisResult.avg_completion}%</p>
                    <p className="text-sm text-gray-600">Avg Completeness</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                    <p className="text-3xl font-bold text-purple-600">{analysisResult.work_orders_found}</p>
                    <p className="text-sm text-gray-600">Work Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Quality Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Data Quality Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Quality Tiers */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-green-900">Excellent (80%+)</span>
                        <Award className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-green-600">{analysisResult.quality_tiers.excellent}</p>
                      <p className="text-xs text-green-700">Ready to diagnose immediately</p>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-yellow-900">Good (60-79%)</span>
                        <CheckCircle className="h-5 w-5 text-yellow-600" />
                      </div>
                      <p className="text-2xl font-bold text-yellow-600">{analysisResult.quality_tiers.good}</p>
                      <p className="text-xs text-yellow-700">Minor gaps, still very usable</p>
                    </div>
                    
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-orange-900">Needs Work (&lt; 60%)</span>
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      </div>
                      <p className="text-2xl font-bold text-orange-600">{analysisResult.quality_tiers.needs_work}</p>
                      <p className="text-xs text-orange-700">Will improve with first diagnostic</p>
                    </div>
                  </div>

                  {/* What We Found */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">✅ Data Present:</h4>
                      <div className="space-y-1 text-sm">
                        {analysisResult.data_present.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">⚠️ Common Gaps:</h4>
                      <div className="space-y-1 text-sm">
                        {analysisResult.data_gaps.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Priority Trucks */}
            <Card>
              <CardHeader>
                <CardTitle>🎯 High-Priority Trucks (Most Active)</CardTitle>
                <p className="text-sm text-gray-600">These trucks have the most work orders - prioritize completing their profiles</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.priority_trucks.slice(0, 5).map((truck, idx) => (
                    <div key={idx} className={`p-4 border rounded-lg ${getCompletionBg(truck.completion)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-900">{truck.truck_number}</p>
                          <p className="text-sm text-gray-600">{truck.year} {truck.make} {truck.model}</p>
                          <p className="text-xs text-gray-500 font-mono">{truck.vin}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${getCompletionColor(truck.completion)}`}>
                            {truck.completion}%
                          </p>
                          <p className="text-xs text-gray-600">{truck.work_order_count} work orders</p>
                        </div>
                      </div>
                      <Progress value={truck.completion} className="h-2" />
                      {truck.missing_data.length > 0 && (
                        <p className="text-xs text-gray-600 mt-2">
                          Missing: {truck.missing_data.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Ready to import?</p>
                    <p className="text-sm text-gray-600">
                      This will add {analysisResult.total_trucks} trucks to your fleet. 
                      VINs will be auto-decoded and work orders will be linked.
                    </p>
                  </div>
                  <Button
                    onClick={handleImport}
                    disabled={loading}
                    className="bg-[#289790] hover:bg-[#1E7083] px-8 py-6 text-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Database className="h-5 w-5 mr-2" />
                        Import {analysisResult.total_trucks} Trucks
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && importResult && (
          <Card className="border-2 border-green-500">
            <CardHeader className="bg-gradient-to-r from-green-50 to-white">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                Import Complete! 🎉
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {importResult.trucks_imported} Trucks Imported Successfully!
                </p>
                <p className="text-gray-600">
                  Your fleet is ready. Techs can start diagnosing immediately.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <Truck className="h-10 w-10 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-600">{importResult.trucks_imported}</p>
                  <p className="text-sm text-gray-600">Trucks Added</p>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <FileText className="h-10 w-10 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-green-600">{importResult.work_orders_linked}</p>
                  <p className="text-sm text-gray-600">Work Orders Linked</p>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <Package className="h-10 w-10 text-purple-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-purple-600">{importResult.parts_tracked}</p>
                  <p className="text-sm text-gray-600">Parts Tracked</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">🚀 Next Steps:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Start your first diagnostic - scan a work order or search by truck number</li>
                  <li>As techs use the system, truck profiles will automatically improve</li>
                  <li>After 30 days, most trucks will be 95% complete with rich history</li>
                  <li>Encourage senior techs to contribute to the Knowledge Base</li>
                </ol>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => navigate('/trucks')}
                  className="flex-1 bg-[#124481] hover:bg-[#0d3461] py-6 text-lg"
                >
                  <Truck className="h-5 w-5 mr-2" />
                  View Fleet
                </Button>
                <Button
                  onClick={() => {
                    setQuickStartMode('diagnostic');
                    setShowQuickStart(true);
                  }}
                  className="flex-1 bg-[#289790] hover:bg-[#1E7083] py-6 text-lg"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Start First Diagnostic
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AS400ImportWizardEnhanced;
