import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { 
  Upload, FileText, Loader2, CheckCircle2, 
  AlertCircle, ScanLine, X 
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

async function extractPdfText(file, onProgress = null) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  const totalPages = pdf.numPages;
  
  for (let i = 1; i <= totalPages; i++) {
    if (onProgress) {
      onProgress(Math.round((i / totalPages) * 100));
    }
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText.trim();
}

async function extractPdfPagesAsImages(file, onProgress = null, maxPages = 10) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const images = [];
  const pagesToProcess = Math.min(pdf.numPages, maxPages);
  const scale = pagesToProcess > 6 ? 1.2 : 1.5;
  const quality = pagesToProcess > 6 ? 0.75 : 0.85;
  
  for (let i = 1; i <= pagesToProcess; i++) {
    if (onProgress) {
      onProgress(Math.round((i / pagesToProcess) * 100));
    }
    
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: context, viewport }).promise;
    
    const base64 = canvas.toDataURL('image/jpeg', quality);
    images.push({
      pageNumber: i,
      base64: base64.split(',')[1],
    });
  }
  
  return images;
}

const ScanPDFModal = ({ open, onOpenChange, workOrderId, onScanComplete }) => {
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setResult(null);
    } else {
      toast.error('Please drop a PDF file');
    }
  };

  const handleScan = async () => {
    if (!file) return;

    setScanning(true);
    setProgress(0);
    setStatus('Extracting text from PDF...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in to scan documents');

      // Extract text
      setProgress(10);
      const content = await extractPdfText(file, (p) => setProgress(10 + p * 0.2));
      
      const textLength = content?.trim().length || 0;
      const isScannedPdf = textLength < 100;

      let extractedData;

      if (isScannedPdf) {
        setStatus('Scanned PDF detected, using OCR...');
        setProgress(35);
        
        const images = await extractPdfPagesAsImages(file, (p) => setProgress(35 + p * 0.3));
        setStatus('Processing with AI vision...');
        setProgress(70);

        const { data, error } = await supabase.functions.invoke('work-order-parse', {
          body: {
            action: 'parse_ocr',
            images,
            fileName: file.name,
            workOrderId,
          },
        });

        if (error) throw error;
        extractedData = data;
      } else {
        setStatus('Processing text with AI...');
        setProgress(50);

        const { data, error } = await supabase.functions.invoke('work-order-parse', {
          body: {
            action: 'parse_text',
            content,
            fileName: file.name,
            workOrderId,
          },
        });

        if (error) throw error;
        extractedData = data;
      }

      setProgress(100);
      setStatus('Scan complete!');
      setResult(extractedData);
      toast.success('PDF scanned successfully!');
      onScanComplete?.(extractedData);

    } catch (error) {
      console.error('Scan error:', error);
      toast.error(error.message || 'Failed to scan PDF');
      setStatus('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    setStatus('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-[#1E7083]" />
            Scan Work Order PDF
          </DialogTitle>
          <DialogDescription>
            Upload a PDF to extract data and add it to this work order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Upload Area */}
          {!result && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                file ? 'border-[#1E7083] bg-[#1E7083]/5' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-3">
                  <FileText className="h-12 w-12 mx-auto text-[#1E7083]" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="text-gray-500"
                  >
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Drop PDF here or click to browse</p>
                    <p className="text-sm text-gray-500">Supports text and scanned PDFs (OCR)</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select PDF
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Progress */}
          {scanning && (
            <Card>
              <CardContent className="py-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#1E7083]" />
                    <span className="text-sm font-medium">{status}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-gray-500 text-right">{progress}%</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result */}
          {result && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">Scan Complete</p>
                    <p className="text-sm text-green-700">
                      Extracted {result.line_items?.length || 0} line items
                    </p>
                  </div>
                </div>
                
                {/* Line Items Preview */}
                {result.line_items && result.line_items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs font-medium text-green-800 mb-2">Extracted Line Items:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {result.line_items.map((item, idx) => {
                        const lineNum = item.line_number || idx + 1;
                        const billable = item.billable || '';
                        const reason = item.reason || '';
                        const activity = item.activity || '';
                        const desc = item.description || '';
                        
                        // Build formatted string like: "1 B (08) PREVENTIVE (PM 005-50) PERFORM PM TRAILER SERVICE"
                        const formattedLine = [lineNum, billable, reason, activity, desc]
                          .filter(Boolean)
                          .join(' ');
                        
                        return (
                          <div key={idx} className="flex items-start gap-2 text-xs text-green-900 bg-white/50 rounded px-2 py-1">
                            <span className="font-bold text-green-700 flex-shrink-0">{lineNum}</span>
                            {billable && (
                              <span className={`px-1 rounded text-[10px] font-medium ${
                                billable === 'B' ? 'bg-green-200 text-green-800' :
                                billable === 'W' ? 'bg-purple-200 text-purple-800' :
                                'bg-gray-200 text-gray-700'
                              }`}>
                                {billable}
                              </span>
                            )}
                            {reason && <span className="text-blue-700 font-medium">{reason}</span>}
                            {activity && <span className="text-gray-600 font-mono">{activity}</span>}
                            {desc && <span className="uppercase font-medium">{desc}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button
                onClick={handleScan}
                disabled={!file || scanning}
                className="bg-[#1E7083] hover:bg-[#1E7083]/90"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4 mr-2" />
                    Scan PDF
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScanPDFModal;
