import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, 
  Loader2, Download, Truck as TruckIcon, Eye, ArrowLeft, X, Pencil, Check,
  ChevronDown, ChevronUp, Columns, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Checkbox } from '../components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { bulkImportTrucks, bulkImportFromPreview, previewCSV } from '../services/bulkImportService';

const TruckBulkImport = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [previewData, setPreviewData] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [columnInfo, setColumnInfo] = useState(null);
  const [excludedRows, setExcludedRows] = useState(new Set());
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [columnMappingOpen, setColumnMappingOpen] = useState(false);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setPreviewData(null);
      setValidationErrors([]);
      setColumnInfo(null);
      
      // Auto-parse for preview using new service
      try {
        const text = await selectedFile.text();
        setCsvText(text);
        
        const preview = previewCSV(text);
        
        if (!preview.success) {
          setError(preview.error || 'No valid data found in CSV file');
          return;
        }
        
        if (preview.totalRows > 5000) {
          setError('Maximum 5000 trucks per upload. Please split your file.');
          return;
        }
        
        // Set column mapping info
        setColumnInfo({
          mappedFields: preview.columnMapping,
          headerToFieldMap: preview.headerToFieldMap,
          ignoredHeaders: preview.ignoredHeaders,
          warnings: preview.warnings,
          originalHeaders: preview.originalHeaders,
          isValid: preview.isValid,
          missingFields: preview.missingFields,
          skippedRows: preview.skippedRows,
          parsingNote: preview.parsingNote,
        });
        
        // Collect validation errors from preview
        const errors = preview.previewRows
          .filter(row => row._status === 'error' || row._status === 'warning')
          .map(row => ({
            row: row.rowNumber,
            field: row._status === 'error' ? 'vin/truck_number' : 'vin',
            error: row._statusMessage,
          }));
        
        setValidationErrors(errors);
        setPreviewData(preview.previewRows);
      } catch (err) {
        console.error('CSV parse error:', err);
        setError('Failed to parse CSV file');
      }
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const clearPreview = () => {
    setFile(null);
    setCsvText('');
    setPreviewData(null);
    setValidationErrors([]);
    setError(null);
    setResult(null);
    setColumnInfo(null);
    setExcludedRows(new Set());
    setColumnMappingOpen(false);
  };

  // Get ignored columns directly from the service response
  const ignoredColumns = useMemo(() => {
    return columnInfo?.ignoredHeaders || [];
  }, [columnInfo]);

  // Calculate selected rows for import
  const selectedRows = useMemo(() => {
    if (!previewData) return [];
    return previewData.filter((_, idx) => !excludedRows.has(idx));
  }, [previewData, excludedRows]);

  const toggleRowSelection = (idx) => {
    setExcludedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (excludedRows.size === 0) {
      // Deselect all
      setExcludedRows(new Set(previewData.map((_, idx) => idx)));
    } else {
      // Select all
      setExcludedRows(new Set());
    }
  };

  const allSelected = excludedRows.size === 0;
  const someSelected = previewData && excludedRows.size < previewData.length && excludedRows.size > 0;

  // Inline editing handlers
  const startEditRow = useCallback((idx, row) => {
    setEditingRow(idx);
    setEditValues({
      vin: row.vin || '',
      truck_number: row.truck_number || row.unit_id || '',
      year: row.year || '',
      make: row.make || '',
      model: row.model || '',
      current_mileage: row.current_mileage || row.odometer || '',
      customer_name: row.customer_name || '',
    });
  }, []);

  const cancelEditRow = useCallback(() => {
    setEditingRow(null);
    setEditValues({});
  }, []);

  const saveEditRow = useCallback((idx) => {
    if (!previewData) return;
    
    // Update the preview data with edited values
    const updatedPreviewData = [...previewData];
    const updatedRow = { ...updatedPreviewData[idx] };
    
    // Apply edits
    updatedRow.vin = editValues.vin || null;
    updatedRow.truck_number = editValues.truck_number || null;
    updatedRow.unit_id = editValues.truck_number || null;
    updatedRow.year = editValues.year ? parseInt(editValues.year, 10) || null : null;
    updatedRow.make = editValues.make || null;
    updatedRow.model = editValues.model || null;
    updatedRow.current_mileage = editValues.current_mileage ? parseInt(editValues.current_mileage, 10) || null : null;
    updatedRow.odometer = updatedRow.current_mileage;
    updatedRow.customer_name = editValues.customer_name || null;
    
    // Re-validate the row
    const hasVinOrTruckNumber = updatedRow.vin || updatedRow.truck_number;
    const vinLengthValid = !updatedRow.vin || updatedRow.vin.length === 17;
    
    if (!hasVinOrTruckNumber) {
      updatedRow._status = 'error';
      updatedRow._statusMessage = 'Missing VIN and Truck Number';
    } else if (!vinLengthValid) {
      updatedRow._status = 'warning';
      updatedRow._statusMessage = `Invalid VIN length: ${updatedRow.vin.length}`;
    } else {
      updatedRow._status = 'ok';
      updatedRow._statusMessage = null;
    }
    
    updatedPreviewData[idx] = updatedRow;
    setPreviewData(updatedPreviewData);
    
    // Update validation errors
    const rowNumber = idx + 2;
    const newValidationErrors = validationErrors.filter(e => e.row !== rowNumber);
    
    if (updatedRow._status === 'error') {
      newValidationErrors.push({
        row: rowNumber,
        field: 'vin/truck_number',
        error: updatedRow._statusMessage,
      });
    } else if (updatedRow._status === 'warning') {
      newValidationErrors.push({
        row: rowNumber,
        field: 'vin',
        error: updatedRow._statusMessage,
      });
    }
    
    setValidationErrors(newValidationErrors);
    setEditingRow(null);
    setEditValues({});
    
    toast.success(`Row ${rowNumber} updated`);
  }, [previewData, editValues, validationErrors]);

  const handleEditInputChange = useCallback((field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleUpload = async () => {
    if (!previewData || previewData.length === 0) {
      setError('No data to import. Please select a file first.');
      return;
    }

    if (selectedRows.length === 0) {
      setError('No rows selected for import. Please select at least one row.');
      return;
    }

    if (!profile?.company_id) {
      setError('Unable to determine your company. Please try logging in again.');
      return;
    }

    // Check for validation errors on selected rows
    const selectedIndices = new Set(previewData.map((_, idx) => idx).filter(idx => !excludedRows.has(idx)));
    const errorsOnSelectedRows = validationErrors.filter(e => {
      const rowIdx = e.row - 2;
      return selectedIndices.has(rowIdx) && e.field === 'vin/truck_number';
    });
    
    if (errorsOnSelectedRows.length > 0) {
      setError(`Cannot import: ${errorsOnSelectedRows.length} selected row(s) have critical errors. Please fix or exclude them.`);
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: selectedRows.length });

    try {
      // Convert excludedRows set to array of indices
      const excludedIndices = Array.from(excludedRows);
      
      // Use the new bulk import function that accepts pre-edited preview data
      const importResult = await bulkImportFromPreview(
        previewData, 
        profile.company_id,
        (current, total) => setProgress({ current, total }),
        excludedIndices
      );

      if (!importResult.success && importResult.error) {
        setError(importResult.error);
        setUploading(false);
        return;
      }

      // Transform results to match expected UI format
      const results = {
        successful: importResult.summary.created + importResult.summary.updated,
        created: importResult.summary.created,
        updated: importResult.summary.updated,
        skipped: importResult.summary.skipped,
        failed: importResult.summary.failed,
        errors: importResult.errors || [],
      };

      setResult(results);
      
      if (results.successful > 0) {
        const message = results.updated > 0 
          ? `Successfully imported ${results.created} new trucks and updated ${results.updated} existing trucks!`
          : `Successfully imported ${results.successful} trucks!`;
        toast.success(message);
        setTimeout(() => {
          navigate('/trucks');
        }, 3000);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to process CSV file. Please check the format.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `vin,year,make,model,truck_number,license_plate,fleet_assignment,engine_manufacturer,engine_model,engine_serial,engine_horsepower,transmission_manufacturer,transmission_model,transmission_type,rear_axle_ratio,emission_standard,current_mileage,customer_name,notes
1FUJGLDR9PLBX1236,2022,Freightliner,Cascadia,FB-001,ABC123,Fleet A,Cummins,ISX15,12345678,450,Eaton,UltraShift PLUS,Automatic,3.42,EPA 2017,125000,Airoldi Brothers,Well maintained
1FUJGLDR9PLBX1237,2021,International,LT625,FB-002,DEF456,Fleet B,Detroit,DD15,87654321,500,Allison,4000 Series,Automatic,3.73,EPA 2017,98000,Airoldi Brothers,New DPF installed`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'truck_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/trucks')}
          className="mb-6"
        >
          ← Back to Trucks
        </Button>

        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <CardTitle className="flex items-center text-2xl">
              <Upload className="mr-3 h-6 w-6" />
              Bulk Import Trucks from CSV
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Instructions */}
              <Alert className="border-blue-200 bg-blue-50">
                <FileText className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <strong>Import Instructions:</strong>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Download the CSV template to see expected format</li>
                    <li>Fill in truck data from AS400 or your existing system</li>
                    <li>Required: Either VIN or Truck Number</li>
                    <li>All other fields are optional</li>
                    <li>Maximum 5000 trucks per upload</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Download Template */}
              <div>
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="w-full justify-center border-[#124481] text-[#124481] hover:bg-[#124481] hover:text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </div>

              {/* File Upload */}
              {!previewData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#124481] file:text-white hover:file:bg-[#1E7083] cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Preview Section */}
              {previewData && previewData.length > 0 && !result && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-[#124481]" />
                      <span className="font-medium text-gray-900">
                        Preview: {selectedRows.length} of {previewData.length} trucks selected
                      </span>
                      {validationErrors.length > 0 ? (
                        <Badge variant="destructive">{validationErrors.length} issues</Badge>
                      ) : selectedRows.length > 0 ? (
                        <Badge className="bg-green-100 text-green-800">Ready to import</Badge>
                      ) : (
                        <Badge variant="secondary">No rows selected</Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearPreview}>
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>

                  {/* Skipped Rows Alert */}
                  {columnInfo?.skippedRows > 0 && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        {columnInfo.parsingNote || `Skipped ${columnInfo.skippedRows} instruction/header row(s) from the file`}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Column Mapping Preview */}
                  {columnInfo && (
                    <Collapsible open={columnMappingOpen} onOpenChange={setColumnMappingOpen}>
                      <Card className="border border-slate-200">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <Columns className="h-4 w-4 text-slate-600" />
                              <span className="text-sm font-medium text-slate-700">Column Mapping Results</span>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {columnInfo.mappedFields?.length || 0} mapped
                              </Badge>
                              {ignoredColumns.length > 0 && (
                                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                  {ignoredColumns.length} ignored
                                </Badge>
                              )}
                            </div>
                            {columnMappingOpen ? (
                              <ChevronUp className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-3 pb-3 border-t border-slate-100">
                            <div className="grid md:grid-cols-2 gap-4 pt-3">
                              {/* Mapped Columns */}
                              <div>
                                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                                  ✓ Mapped Columns ({columnInfo.mappedFields?.length || 0})
                                </h4>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {columnInfo.headerToFieldMap && Object.entries(columnInfo.headerToFieldMap).map(([header, field], idx) => (
                                    <div key={idx} className="flex items-center gap-1 text-xs">
                                      <span className="text-slate-600 truncate max-w-[120px]" title={header}>{header}</span>
                                      <span className="text-slate-400">→</span>
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                        {field.replace(/_/g, ' ')}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Ignored Columns */}
                              {ignoredColumns.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                    ⚠ Ignored Columns ({ignoredColumns.length})
                                  </h4>
                                  <div className="flex flex-wrap gap-1">
                                    {ignoredColumns.slice(0, 15).map((header, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200">
                                        {header}
                                      </Badge>
                                    ))}
                                    {ignoredColumns.length > 15 && (
                                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600">
                                        +{ignoredColumns.length - 15} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Warnings */}
                            {columnInfo.warnings?.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
                                  ⚠ Warnings
                                </h4>
                                <ul className="text-xs text-amber-700 space-y-0.5">
                                  {columnInfo.warnings.map((warning, idx) => (
                                    <li key={idx}>• {warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                  {/* Validation Errors Summary */}
                  {validationErrors.length > 0 && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-sm text-yellow-900">
                        <strong>{validationErrors.length} validation issue(s) found:</strong>
                        <ul className="list-disc ml-5 mt-1">
                          {validationErrors.slice(0, 5).map((err, idx) => (
                            <li key={idx}>Row {err.row}: {err.error}</li>
                          ))}
                          {validationErrors.length > 5 && (
                            <li>...and {validationErrors.length - 5} more</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Preview Table */}
                  <Card className="border">
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-gray-50">
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox 
                                checked={allSelected}
                                onCheckedChange={toggleSelectAll}
                                aria-label="Select all rows"
                                className={someSelected ? "data-[state=checked]:bg-primary" : ""}
                              />
                            </TableHead>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>VIN</TableHead>
                            <TableHead>Unit #</TableHead>
                            <TableHead>Year</TableHead>
                            <TableHead>Make</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Mileage</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="w-20">Status</TableHead>
                            <TableHead className="w-16">Edit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, idx) => {
                            const rowNumber = idx + 2;
                            const rowErrors = validationErrors.filter(e => e.row === rowNumber);
                            const hasError = rowErrors.length > 0;
                            const isExcluded = excludedRows.has(idx);
                            const isEditing = editingRow === idx;
                            
                            return (
                              <TableRow 
                                key={idx} 
                                className={`${hasError ? 'bg-red-50' : ''} ${isExcluded ? 'opacity-50' : ''} ${isEditing ? 'bg-blue-50' : ''}`}
                              >
                                <TableCell>
                                  <Checkbox 
                                    checked={!isExcluded}
                                    onCheckedChange={() => toggleRowSelection(idx)}
                                    aria-label={`Select row ${rowNumber}`}
                                    disabled={isEditing}
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-xs text-gray-500">{rowNumber}</TableCell>
                                
                                {/* VIN Cell */}
                                <TableCell className="font-mono text-xs">
                                  {isEditing ? (
                                    <Input
                                      value={editValues.vin}
                                      onChange={(e) => handleEditInputChange('vin', e.target.value.toUpperCase())}
                                      className={`h-7 text-xs font-mono ${editValues.vin && editValues.vin.length !== 17 ? 'border-red-500' : ''}`}
                                      placeholder="17-char VIN"
                                      maxLength={17}
                                    />
                                  ) : (
                                    <span className={row.vin && row.vin.length !== 17 ? 'text-red-600' : ''}>
                                      {row.vin || <span className="text-gray-400">—</span>}
                                    </span>
                                  )}
                                </TableCell>
                                
                                {/* Truck Number Cell */}
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={editValues.truck_number}
                                      onChange={(e) => handleEditInputChange('truck_number', e.target.value)}
                                      className="h-7 text-xs"
                                      placeholder="Unit #"
                                    />
                                  ) : (
                                    row.truck_number || row.unit_id || <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                
                                {/* Year Cell */}
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={editValues.year}
                                      onChange={(e) => handleEditInputChange('year', e.target.value)}
                                      className="h-7 text-xs w-16"
                                      placeholder="Year"
                                      type="number"
                                      min="1900"
                                      max="2099"
                                    />
                                  ) : (
                                    row.year || <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                
                                {/* Make Cell */}
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={editValues.make}
                                      onChange={(e) => handleEditInputChange('make', e.target.value)}
                                      className="h-7 text-xs"
                                      placeholder="Make"
                                    />
                                  ) : (
                                    row.make || <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                
                                {/* Model Cell */}
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={editValues.model}
                                      onChange={(e) => handleEditInputChange('model', e.target.value)}
                                      className="h-7 text-xs"
                                      placeholder="Model"
                                    />
                                  ) : (
                                    row.model || <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                
                                {/* Mileage Cell */}
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={editValues.current_mileage}
                                      onChange={(e) => handleEditInputChange('current_mileage', e.target.value)}
                                      className="h-7 text-xs w-20"
                                      placeholder="Mileage"
                                      type="number"
                                    />
                                  ) : (
                                    row.current_mileage || row.odometer || <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                
                                {/* Customer Cell */}
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={editValues.customer_name}
                                      onChange={(e) => handleEditInputChange('customer_name', e.target.value)}
                                      className="h-7 text-xs"
                                      placeholder="Customer"
                                    />
                                  ) : (
                                    row.customer_name || <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                
                                {/* Status Cell */}
                                <TableCell>
                                  {isExcluded ? (
                                    <Badge variant="secondary" className="text-xs">Skipped</Badge>
                                  ) : hasError ? (
                                    <Badge variant="destructive" className="text-xs">Error</Badge>
                                  ) : (
                                    <Badge className="bg-green-100 text-green-800 text-xs">OK</Badge>
                                  )}
                                </TableCell>
                                
                                {/* Edit Action Cell */}
                                <TableCell>
                                  {isEditing ? (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => saveEditRow(idx)}
                                        title="Save changes"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                                        onClick={cancelEditRow}
                                        title="Cancel"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={() => startEditRow(idx, row)}
                                      disabled={isExcluded}
                                      title="Edit row"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </Card>

                  {/* Import Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={clearPreview}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || selectedRows.length === 0 || validationErrors.some(e => e.field === 'vin/truck_number' && !excludedRows.has(previewData.findIndex(r => r.rowNumber === e.row - 1)))}
                      className="flex-1 bg-[#124481] hover:bg-[#1E7083]"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing... ({progress.current}/{progress.total})
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Import {selectedRows.length} Truck{selectedRows.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  {uploading && progress.total > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-[#1E7083] h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-900">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Result Display */}
              {result && (
                <div className="space-y-4">
                  <Alert className={result.failed === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                    {result.failed === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <AlertDescription>
                      <div className="text-sm font-medium mb-2">
                        Import Complete
                      </div>
                      <div className="text-sm space-y-1">
                        <p>✅ Successfully imported: <strong>{result.successful}</strong> trucks</p>
                        {result.failed > 0 && (
                          <p>❌ Failed: <strong>{result.failed}</strong> rows</p>
                        )}
                        <p className="text-xs text-gray-600 mt-2">
                          Redirecting to trucks list in 3 seconds...
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {/* Error Details */}
                  {result.errors && result.errors.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-red-700">Import Errors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {result.errors.map((err, idx) => (
                            <div key={idx} className="text-sm bg-red-50 p-3 rounded border border-red-200">
                              <p className="font-medium text-red-900">Row {err.row}:</p>
                              <p className="text-red-700">{err.error}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CSV Format Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CSV Column Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-[#124481] mb-2">Identity</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• vin</li>
                  <li>• year</li>
                  <li>• make</li>
                  <li>• model</li>
                  <li>• truck_number</li>
                  <li>• license_plate</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-[#124481] mb-2">Engine</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• engine_manufacturer</li>
                  <li>• engine_model</li>
                  <li>• engine_serial</li>
                  <li>• engine_horsepower</li>
                  <li>• fuel_type</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-[#124481] mb-2">Transmission</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• transmission_manufacturer</li>
                  <li>• transmission_model</li>
                  <li>• transmission_type</li>
                  <li>• transmission_speeds</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-[#124481] mb-2">Drivetrain</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• rear_axle_manufacturer</li>
                  <li>• rear_axle_ratio</li>
                  <li>• rear_axle_type</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-[#124481] mb-2">Emissions</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• emission_standard</li>
                  <li>• dpf_manufacturer</li>
                  <li>• scr_manufacturer</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-[#124481] mb-2">Maintenance</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• current_mileage</li>
                  <li>• in_service_date</li>
                  <li>• last_service_date</li>
                </ul>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              <strong>Note:</strong> All columns are optional except VIN or truck_number. 
              Add more columns matching the comprehensive truck schema as needed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TruckBulkImport;
