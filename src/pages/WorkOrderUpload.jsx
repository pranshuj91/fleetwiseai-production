import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import EditableExtraction from '../components/EditableExtraction';
import { workOrderServiceAPI } from '../services/workOrderService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { Upload, FileText, Loader2, CheckCircle2, Truck, Wrench } from 'lucide-react';

const WorkOrderUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please drop a PDF file');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError('');
    setExtractedData(null);

    try {
      const response = await workOrderServiceAPI.createFromPDF(file, setProgress);
      
      if (response.data.ready_to_save) {
        setExtractedData(response.data.extracted_data);
        setShowEdit(true);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to process PDF. Please try again.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleSaveExtraction = async (editedData) => {
    setSaving(true);
    setError('');

    try {
      const response = await workOrderServiceAPI.saveFromExtraction(editedData);
      
      setSaveResult(response.data);
      setSuccess(true);
      
      // Redirect after delay
      setTimeout(() => {
        if (response.data.truck_id) {
          navigate(`/trucks/${response.data.truck_id}`);
        } else {
          navigate('/trucks');
        }
      }, 3000);
      
    } catch (error) {
      console.error('Save error:', error);
      setError(error.message || 'Failed to save data. Please try again.');
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEdit(false);
    setExtractedData(null);
    setFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="work-order-upload-page">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="upload-title">
            Import Work Order from PDF
          </h1>
          <p className="text-gray-600">
            Upload a work order PDF to extract diagnostics and auto-enrich truck profiles
          </p>
        </div>

        {success && saveResult ? (
          <Card className="border-green-200 bg-green-50" data-testid="success-card">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-green-900 mb-2">
                  Work Order Imported Successfully!
                </h3>
                <div className="space-y-2 text-green-700 mb-4">
                  {saveResult.truck_auto_created ? (
                    <p className="flex items-center justify-center gap-2">
                      <Truck className="h-4 w-4" />
                      New truck profile created
                    </p>
                  ) : (
                    <p className="flex items-center justify-center gap-2">
                      <Truck className="h-4 w-4" />
                      Linked to existing truck
                    </p>
                  )}
                  {saveResult.maintenance_records_created > 0 && (
                    <p className="flex items-center justify-center gap-2">
                      <Wrench className="h-4 w-4" />
                      {saveResult.maintenance_records_created} maintenance record(s) created
                    </p>
                  )}
                </div>
                <p className="text-sm text-green-600">
                  Redirecting to truck profile...
                </p>
              </div>
            </CardContent>
          </Card>
        ) : showEdit && extractedData ? (
          <>
            {error && (
              <Alert variant="destructive" className="mb-4" data-testid="error-alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <EditableExtraction
              extractedData={extractedData}
              onSave={handleSaveExtraction}
              onCancel={handleCancelEdit}
              saving={saving}
            />
          </>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Upload PDF Work Order</CardTitle>
                <CardDescription>
                  Drag and drop or click to select a work order PDF
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4" data-testid="error-alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    dragging
                      ? 'border-[#124481] bg-blue-50'
                      : file
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-[#124481]'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  data-testid="drop-zone"
                >
                  {file ? (
                    <div className="space-y-4">
                      <FileText className="mx-auto h-16 w-16 text-green-600" />
                      <div>
                        <p className="text-lg font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setFile(null)}
                        data-testid="remove-file-button"
                      >
                        Remove File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="mx-auto h-16 w-16 text-gray-400" />
                      <div>
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          Drop your PDF here, or click to browse
                        </p>
                        <p className="text-sm text-gray-500">
                          Supported format: PDF work orders
                        </p>
                      </div>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        data-testid="file-input"
                      />
                      <label htmlFor="file-upload">
                        <Button
                          variant="outline"
                          className="cursor-pointer"
                          data-testid="browse-button"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('file-upload').click();
                          }}
                        >
                          Browse Files
                        </Button>
                      </label>
                    </div>
                  )}
                </div>

                {loading && (
                  <div className="mt-4">
                    <Progress value={progress} className="mb-2" />
                    <p className="text-sm text-gray-600 text-center">
                      {progress < 50 ? 'Extracting text from PDF...' : 
                       progress < 90 ? 'AI is parsing work order data...' : 
                       'Finalizing...'}
                    </p>
                  </div>
                )}

                {file && !loading && (
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={handleUpload}
                      disabled={loading}
                      className="bg-[#124481] hover:bg-[#1E7083]"
                      data-testid="upload-button"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Parse Work Order
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Upload your work order PDF</li>
                <li>AI extracts VIN, complaint, cause, correction, and service categories</li>
                <li>Review and edit the extracted information</li>
                <li>Save to create/update truck profile and maintenance history</li>
              </ol>
              <div className="mt-4 p-3 bg-blue-100 rounded">
                <h4 className="font-medium text-blue-900 text-sm mb-1">Safe Auto-Enrichment</h4>
                <p className="text-xs text-blue-700">
                  Only safe data is auto-updated: maintenance history, service categories, and last service date. 
                  Part numbers, serial numbers, and ECM data are never guessed.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkOrderUpload;