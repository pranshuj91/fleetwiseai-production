import React, { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import RagChatDialog from '../components/RagChatDialog';
import { 
  Database, FileText, Upload, Search, Trash2, RefreshCw, 
  CheckCircle, Clock, AlertCircle, FileUp, BookOpen, Loader2, MessageSquare, Eye, Tag, X, Download,
  Camera, ScanLine
} from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Checkbox } from '../components/ui/checkbox';
import { format } from 'date-fns';

// Predefined tag categories for document classification
const TAG_CATEGORIES = {
  oem: {
    label: 'OEM Specific',
    description: 'Manufacturer-level data (chassis diagnostics, cab controls, module faults)',
    tags: [
      { value: 'oem-daimler', label: 'Daimler/Freightliner' },
      { value: 'oem-navistar', label: 'Navistar/International' },
      { value: 'oem-paccar', label: 'PACCAR (Kenworth/Peterbilt)' },
      { value: 'oem-volvo', label: 'Volvo/Mack' },
      { value: 'oem-other', label: 'Other OEM' },
    ]
  },
  component: {
    label: 'Component Specific',
    description: 'Engine, aftertreatment, and component-level systems',
    tags: [
      { value: 'component-cummins', label: 'Cummins' },
      { value: 'component-detroit', label: 'Detroit Diesel' },
      { value: 'component-paccar-engine', label: 'PACCAR Engine' },
      { value: 'component-aftertreatment', label: 'Aftertreatment/DEF' },
      { value: 'component-transmission', label: 'Transmission' },
      { value: 'component-electrical', label: 'Electrical Systems' },
      { value: 'component-other', label: 'Other Component' },
    ]
  },
  mindset: {
    label: 'Mindset / Tribal Knowledge',
    description: 'General approaches, processes, and diagnostic methodology',
    tags: [
      { value: 'mindset-process', label: 'Diagnostic Process' },
      { value: 'mindset-j1939', label: 'J1939 / SPN/FMI' },
      { value: 'mindset-troubleshooting', label: 'Troubleshooting Guide' },
      { value: 'mindset-best-practice', label: 'Best Practices' },
      { value: 'mindset-training', label: 'Training Material' },
    ]
  }
};

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const RagFeeder = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Upload form state
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    document_type: 'manual',
    tags: [],
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedContent, setExtractedContent] = useState('');
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPages, setExtractedPages] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [extractionError, setExtractionError] = useState(null);
  
  // Vision/OCR processing state
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [pdfImages, setPdfImages] = useState([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Chunks viewer state
  const [showChunksModal, setShowChunksModal] = useState(false);
  const [selectedDocumentChunks, setSelectedDocumentChunks] = useState([]);
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState('');
  const [loadingChunks, setLoadingChunks] = useState(false);
  
  // Edit tags state
  const [showEditTagsModal, setShowEditTagsModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [editingTags, setEditingTags] = useState([]);
  const [savingTags, setSavingTags] = useState(false);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Extract text from PDF client-side with detailed progress
  const extractTextFromPDF = async (file) => {
    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractedContent('');
    setExtractedPages(0);
    setTotalPages(0);
    setExtractionError(null);
    
    try {
      console.log(`[PDF Extraction] Starting: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      const arrayBuffer = await file.arrayBuffer();
      console.log(`[PDF Extraction] ArrayBuffer loaded: ${arrayBuffer.byteLength} bytes`);
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      setTotalPages(numPages);
      console.log(`[PDF Extraction] PDF loaded: ${numPages} pages`);
      
      let fullText = '';
      let pagesWithText = 0;
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => item.str)
            .join(' ')
            .trim();
          
          if (pageText.length > 0) {
            fullText += pageText + '\n\n';
            pagesWithText++;
          }
          
          const progress = Math.round((pageNum / numPages) * 100);
          setExtractionProgress(progress);
          setExtractedPages(pageNum);
          
          // Log progress every 10 pages or on last page
          if (pageNum % 10 === 0 || pageNum === numPages) {
            console.log(`[PDF Extraction] Page ${pageNum}/${numPages} - ${fullText.length.toLocaleString()} chars extracted`);
          }
        } catch (pageError) {
          console.warn(`[PDF Extraction] Page ${pageNum} error:`, pageError.message);
        }
      }
      
      console.log(`[PDF Extraction] Complete: ${fullText.length.toLocaleString()} chars from ${pagesWithText}/${numPages} pages`);
      
      if (fullText.length < 100) {
        throw new Error(`Only ${fullText.length} characters extracted. PDF may be scanned/image-based.`);
      }
      
      setExtractedContent(fullText);
      return fullText;
    } catch (error) {
      console.error('[PDF Extraction] Error:', error);
      setExtractionError(error.message);
      throw error;
    } finally {
      setIsExtracting(false);
    }
  };

  // Convert PDF pages to images for Vision/OCR processing
  const extractPdfPagesAsImages = async (file, maxPages = 20) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const images = [];
    const pagesToProcess = Math.min(pdf.numPages, maxPages);
    const scale = pagesToProcess > 10 ? 1.2 : 1.5;
    const quality = pagesToProcess > 10 ? 0.75 : 0.85;
    
    console.log(`[Vision OCR] Converting ${pagesToProcess} pages to images`);
    
    for (let i = 1; i <= pagesToProcess; i++) {
      setOcrProgress(Math.round((i / pagesToProcess) * 50)); // First 50% is image conversion
      
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
      
      console.log(`[Vision OCR] Page ${i}/${pagesToProcess} converted`);
    }
    
    return images;
  };

  // Process PDF with Vision AI (OCR for scanned/photo-based PDFs)
  const handleOcrProcess = async () => {
    if (!selectedFile) return;
    
    setIsOcrProcessing(true);
    setOcrProgress(0);
    setExtractionError(null);
    
    try {
      toast({
        title: 'Starting Vision OCR',
        description: 'Converting PDF pages to images...',
      });
      
      // Convert PDF to images
      const images = await extractPdfPagesAsImages(selectedFile);
      setPdfImages(images);
      
      toast({
        title: 'Images Ready',
        description: `${images.length} pages converted. Processing with AI Vision...`,
      });
      
      setOcrProgress(60);
      
      // Upload to storage first if needed
      let filePath = null;
      if (profile?.company_id) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
        filePath = `${profile.company_id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('knowledge-files')
          .upload(filePath, selectedFile, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          filePath = null;
        }
      }
      
      setOcrProgress(70);
      
      // Send images to Vision API via edge function
      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'process_vision',
          title: newDocument.title || selectedFile.name.replace(/\.[^/.]+$/, ''),
          description: newDocument.description,
          documentType: newDocument.document_type,
          images: images,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          uploadedBy: profile?.user_id,
          companyId: profile?.company_id,
          tags: newDocument.tags,
          filePath: filePath,
        },
      });

      if (error) throw error;
      
      setOcrProgress(100);
      
      toast({
        title: 'Vision OCR Complete',
        description: `Processed ${data.pagesProcessed} pages, ${data.contentLength?.toLocaleString() || 0} characters extracted`,
      });
      
      // Close modal and refresh
      setShowUploadModal(false);
      setNewDocument({ title: '', description: '', document_type: 'manual', tags: [] });
      setSelectedFile(null);
      setExtractedContent('');
      setExtractionError(null);
      setPdfImages([]);
      fetchDocuments();
      
    } catch (error) {
      console.error('[Vision OCR] Error:', error);
      toast({
        title: 'Vision OCR Failed',
        description: error.message || 'Failed to process with Vision AI',
        variant: 'destructive',
      });
    } finally {
      setIsOcrProcessing(false);
      setOcrProgress(0);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setExtractedContent('');
    
    // Auto-fill title from filename if empty
    if (!newDocument.title) {
      setNewDocument(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, ''),
      }));
    }

    toast({
      title: 'File Selected',
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
    });

    // Auto-extract PDF content
    if (file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: 'Extracting PDF',
        description: 'Processing pages...',
      });
      
      try {
        const content = await extractTextFromPDF(file);
        toast({
          title: 'Extraction Complete',
          description: `Extracted ${content.length.toLocaleString()} characters`,
        });
      } catch (error) {
        toast({
          title: 'Extraction Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      // For text files, read directly
      try {
        const text = await file.text();
        setExtractedContent(text);
      } catch (error) {
        console.error('Error reading text file:', error);
      }
    }
  };

  // Create document - sends extracted text to edge function
  const handleCreateDocument = async () => {
    if (!newDocument.title || !selectedFile) {
      toast({
        title: 'Validation Error',
        description: 'Title and file are required',
        variant: 'destructive',
      });
      return;
    }

    if (!extractedContent || extractedContent.length < 50) {
      toast({
        title: 'Validation Error',
        description: 'Please wait for content extraction to complete or select a valid file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      toast({
        title: 'Uploading Document',
        description: 'Uploading file and processing...',
      });

      console.log(`Sending document: ${newDocument.title}, content length: ${extractedContent.length}`);

      // Upload original file to storage if it's a PDF
      let filePath = null;
      if (selectedFile.name.toLowerCase().endsWith('.pdf') && profile?.company_id) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
        filePath = `${profile.company_id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('knowledge-files')
          .upload(filePath, selectedFile, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          // Continue without file storage - not critical
          filePath = null;
        } else {
          console.log('File uploaded to storage:', filePath);
        }
      }

      // Send extracted text (not raw file) to edge function
      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'process_text',
          title: newDocument.title,
          description: newDocument.description,
          documentType: newDocument.document_type,
          content: extractedContent,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          uploadedBy: profile?.user_id,
          companyId: profile?.company_id,
          tags: newDocument.tags,
          filePath: filePath,
        },
      });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message || 'Upload failed');
      }

      if (data?.warning) {
        toast({
          title: 'Document Uploaded with Warning',
          description: data.warning,
          variant: 'destructive',
        });
      } else if (data?.status === 'processing') {
        toast({
          title: 'Processing Started',
          description: `Document uploaded with ${data?.chunkCount || 0} chunks. Embeddings are being generated in the background.`,
        });
      } else {
        toast({
          title: 'Success',
          description: `Document processed with ${data?.chunkCount || 0} chunks (${data?.contentLength?.toLocaleString() || 0} characters)`,
        });
      }

      setShowUploadModal(false);
      setNewDocument({ title: '', description: '', document_type: 'manual', tags: [] });
      setSelectedFile(null);
      setExtractedContent('');
      setExtractionProgress(0);
      fetchDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create document',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Search documents
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      
      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'search',
          query: searchQuery,
          companyId: profile?.company_id,
          matchCount: 10,
          matchThreshold: 0.5,
        },
      });

      if (error) throw error;

      setSearchResults(data.results || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Error',
        description: error.message || 'Failed to search documents',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'delete_document',
          documentId,
        },
      });

      if (error) throw error;

      toast({
        title: 'Document Deleted',
        description: 'Document and embeddings removed successfully',
      });
      
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  // Reprocess document
  const handleReprocessDocument = async (documentId) => {
    try {
      // Update status
      await supabase
        .from('knowledge_documents')
        .update({ processing_status: 'pending' })
        .eq('id', documentId);

      // Delete existing chunks
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId);

      // Trigger reprocessing
      const { error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'process_document',
          documentId,
        },
      });

      if (error) throw error;

      toast({
        title: 'Reprocessing Started',
        description: 'Document is being reprocessed',
      });

      fetchDocuments();
    } catch (error) {
      console.error('Reprocess error:', error);
      toast({
        title: 'Error',
        description: 'Failed to reprocess document',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      manual: 'bg-purple-500',
      oem: 'bg-blue-500',
      transcription: 'bg-teal-500',
      text: 'bg-gray-500',
      other: 'bg-orange-500',
    };
    return <Badge className={colors[type] || colors.other}>{type?.toUpperCase()}</Badge>;
  };

  // View chunks for a document
  const handleViewChunks = async (doc) => {
    try {
      setLoadingChunks(true);
      setSelectedDocumentTitle(doc.title);
      setShowChunksModal(true);
      
      const { data, error } = await supabase
        .from('document_chunks')
        .select('id, chunk_index, content, token_count')
        .eq('document_id', doc.id)
        .order('chunk_index', { ascending: true });
      
      if (error) throw error;
      setSelectedDocumentChunks(data || []);
    } catch (error) {
      console.error('Error fetching chunks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load document chunks',
        variant: 'destructive',
      });
    } finally {
      setLoadingChunks(false);
    }
  };

  // Edit tags for a document
  const handleEditTags = (doc) => {
    setEditingDocument(doc);
    setEditingTags(doc.tags || []);
    setShowEditTagsModal(true);
  };

  // Save edited tags
  const handleSaveTags = async () => {
    if (!editingDocument) return;
    
    try {
      setSavingTags(true);
      
      // Update document tags
      const { error: docError } = await supabase
        .from('knowledge_documents')
        .update({ tags: editingTags })
        .eq('id', editingDocument.id);
      
      if (docError) throw docError;
      
      // Update chunk tags
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .update({ tags: editingTags })
        .eq('document_id', editingDocument.id);
      
      if (chunkError) {
        console.warn('Warning: Could not update chunk tags:', chunkError);
      }
      
      toast({
        title: 'Tags Updated',
        description: `Updated tags for "${editingDocument.title}"`,
      });
      
      setShowEditTagsModal(false);
      setEditingDocument(null);
      fetchDocuments();
    } catch (error) {
      console.error('Error saving tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tags',
        variant: 'destructive',
      });
    } finally {
      setSavingTags(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Database className="h-8 w-8 text-primary" />
              RAG Feeder
            </h1>
            <p className="text-muted-foreground mt-1">
              Centralized vectorized knowledge base for AI-powered search
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => setShowChatDialog(true)} variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Test RAG
            </Button>
            <Button onClick={() => setShowUploadModal(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
        </div>
        
        <RagChatDialog open={showChatDialog} onOpenChange={setShowChatDialog} />

        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Semantic Search
            </CardTitle>
            <CardDescription>
              Search across all documents using natural language
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter your search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>

            {/* Search Results */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="font-medium text-foreground">Search Results ({searchResults.length})</h4>
                {searchResults.map((result, index) => (
                  <Card key={result.id} className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Match: {(result.similarity * 100).toFixed(1)}%</Badge>
                      </div>
                      <p className="text-sm text-foreground line-clamp-3">{result.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {showSearchResults && searchResults.length === 0 && (
              <p className="mt-4 text-muted-foreground text-center py-4">
                No results found. Try a different search query.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{documents.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Processed</p>
                  <p className="text-2xl font-bold text-green-500">
                    {documents.filter(d => d.processing_status === 'completed').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {documents.filter(d => d.processing_status === 'processing').length}
                  </p>
                </div>
                <Loader2 className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Chunks</p>
                  <p className="text-2xl font-bold">
                    {documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0)}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
            <CardDescription>
              All uploaded documents and their processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No documents uploaded yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Document
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(doc.document_type)}</TableCell>
                      <TableCell>
                        <div 
                          className="flex flex-wrap gap-1 max-w-[200px] cursor-pointer hover:opacity-80"
                          onClick={() => handleEditTags(doc)}
                          title="Click to edit tags"
                        >
                          {(doc.tags || []).length === 0 ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              <Tag className="h-3 w-3 mr-1" />
                              Add tags
                            </Badge>
                          ) : (
                            <>
                              {(doc.tags || []).slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag.replace(/^(oem|component|mindset)-/, '')}
                                </Badge>
                              ))}
                              {(doc.tags || []).length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{doc.tags.length - 3}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.processing_status)}</TableCell>
                      <TableCell>{doc.chunk_count || 0}</TableCell>
                      <TableCell>
                        {doc.created_at && format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!doc.file_path}
                            onClick={async () => {
                              if (!doc.file_path) return;
                              try {
                                const { data, error } = await supabase.storage
                                  .from('knowledge-files')
                                  .download(doc.file_path);
                                
                                if (error) throw error;
                                
                                // Create download link
                                const url = URL.createObjectURL(data);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = doc.file_name || 'document.pdf';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              } catch (error) {
                                console.error('Download error:', error);
                                toast({
                                  title: 'Download Failed',
                                  description: 'Could not download the file',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            title={doc.file_path ? "Download Original" : "No file stored"}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReprocessDocument(doc.id)}
                            title="Reprocess"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewChunks(doc)}
                            title="View Chunks"
                            disabled={doc.chunk_count === 0}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Upload Document
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 min-h-0">
            <div className="space-y-4 pb-4">
            <div>
              <Label>Document Title *</Label>
              <Input
                value={newDocument.title}
                onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter document title"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={newDocument.description}
                onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the document"
              />
            </div>

            <div>
              <Label>Document Type</Label>
              <Select
                value={newDocument.document_type}
                onValueChange={(value) => setNewDocument(prev => ({ ...prev, document_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="oem">OEM Documentation</SelectItem>
                  <SelectItem value="transcription">Transcription</SelectItem>
                  <SelectItem value="text">Text File</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags Selection */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4" />
                Classification Tags
              </Label>
              <div className="space-y-4 max-h-[200px] overflow-y-auto p-3 border rounded-md bg-muted/20">
                {Object.entries(TAG_CATEGORIES).map(([categoryKey, category]) => (
                  <div key={categoryKey}>
                    <div className="mb-2">
                      <p className="font-medium text-sm">{category.label}</p>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {category.tags.map((tag) => {
                        const isSelected = newDocument.tags.includes(tag.value);
                        return (
                          <Badge
                            key={tag.value}
                            variant={isSelected ? 'default' : 'outline'}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? '' : 'hover:bg-muted'
                            }`}
                            onClick={() => {
                              setNewDocument(prev => ({
                                ...prev,
                                tags: isSelected
                                  ? prev.tags.filter(t => t !== tag.value)
                                  : [...prev.tags, tag.value]
                              }));
                            }}
                          >
                            {tag.label}
                            {isSelected && <X className="h-3 w-3 ml-1" />}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {newDocument.tags.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {newDocument.tags.length} tag(s) selected
                </p>
              )}
            </div>

            <div>
              <Label>Upload File (PDF, TXT, MD) *</Label>
              <Input
                type="file"
                accept=".pdf,.txt,.md,.text"
                onChange={handleFileSelect}
                className="cursor-pointer"
                disabled={uploading}
              />
              {selectedFile && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
              )}
              
              {/* Extraction Progress */}
              {isExtracting && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Extracting page {extractedPages} of {totalPages}...
                      </span>
                    </div>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {extractionProgress}%
                    </span>
                  </div>
                  <Progress value={extractionProgress} className="h-2" />
                  {extractedContent.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {extractedContent.length.toLocaleString()} characters extracted so far
                    </p>
                  )}
                </div>
              )}
              
              {/* Extraction Error with OCR Option */}
              {extractionError && !isExtracting && !isOcrProcessing && (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">Text Extraction Limited</span>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">{extractionError}</p>
                  
                  <div className="p-3 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="h-4 w-4 text-violet-600" />
                      <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                        Use Vision AI for Photo-Based PDFs
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      This PDF appears to contain scanned images or photos. Vision AI can extract text and describe visual content like diagrams, part numbers, and procedures.
                    </p>
                    <Button 
                      onClick={handleOcrProcess}
                      disabled={isOcrProcessing || !newDocument.title}
                      className="w-full bg-violet-600 hover:bg-violet-700"
                    >
                      <ScanLine className="h-4 w-4 mr-2" />
                      Process with Vision AI (OCR)
                    </Button>
                    {!newDocument.title && (
                      <p className="text-xs text-destructive mt-2">Please enter a document title first</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* OCR Processing Progress */}
              {isOcrProcessing && (
                <div className="mt-2 p-3 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                      <span className="text-sm text-violet-700 dark:text-violet-300">
                        {ocrProgress < 50 ? 'Converting pages to images...' : 
                         ocrProgress < 70 ? 'Uploading to storage...' : 
                         'Processing with Vision AI...'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                      {ocrProgress}%
                    </span>
                  </div>
                  <Progress value={ocrProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Vision AI is analyzing each page for text and visual content...
                  </p>
                </div>
              )}
              
              {/* Extraction Complete with Preview */}
              {extractedContent && !isExtracting && !extractionError && (
                <div className="mt-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-300 font-semibold">
                        Extraction Complete
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="bg-background/70 px-2 py-1 rounded">
                        Pages: <strong>{totalPages.toLocaleString()}</strong>
                      </span>
                      <span className="bg-background/70 px-2 py-1 rounded">
                        Characters: <strong>{extractedContent.length.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="bg-background rounded-md border border-border overflow-hidden">
                    <p className="font-medium text-muted-foreground px-3 pt-3 pb-2 text-xs uppercase tracking-wide">Preview:</p>
                    <div className="h-[140px] overflow-y-auto overflow-x-hidden px-3 pb-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed max-w-full">
                        {extractedContent.slice(0, 1200)}
                        {extractedContent.length > 1200 && (
                          <span className="text-muted-foreground">... (truncated)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {uploading && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Processing document and generating embeddings...
                  </span>
                </div>
              </div>
            )}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t bg-background px-6 py-4">
            <Button variant="outline" onClick={() => setShowUploadModal(false)} disabled={uploading || isOcrProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDocument} 
              disabled={uploading || isExtracting || isOcrProcessing || !newDocument.title || !selectedFile || !extractedContent}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : isOcrProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vision OCR...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chunks Viewer Modal */}
      <Dialog open={showChunksModal} onOpenChange={setShowChunksModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vectorized Chunks: {selectedDocumentTitle}
            </DialogTitle>
          </DialogHeader>

          {loadingChunks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedDocumentChunks.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No chunks found for this document</p>
            </div>
          ) : (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {selectedDocumentChunks.map((chunk) => (
                  <Card key={chunk.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-mono">
                          Chunk #{chunk.chunk_index + 1}
                        </Badge>
                        {chunk.token_count && (
                          <span className="text-xs text-muted-foreground">
                            {chunk.token_count} tokens
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {chunk.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChunksModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tags Modal */}
      <Dialog open={showEditTagsModal} onOpenChange={setShowEditTagsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Edit Tags: {editingDocument?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto p-3 border rounded-md bg-muted/20">
            {Object.entries(TAG_CATEGORIES).map(([categoryKey, category]) => (
              <div key={categoryKey}>
                <div className="mb-2">
                  <p className="font-medium text-sm">{category.label}</p>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {category.tags.map((tag) => {
                    const isSelected = editingTags.includes(tag.value);
                    return (
                      <Badge
                        key={tag.value}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? '' : 'hover:bg-muted'
                        }`}
                        onClick={() => {
                          setEditingTags(prev => 
                            isSelected
                              ? prev.filter(t => t !== tag.value)
                              : [...prev, tag.value]
                          );
                        }}
                      >
                        {tag.label}
                        {isSelected && <X className="h-3 w-3 ml-1" />}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {editingTags.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {editingTags.length} tag(s) selected
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTagsModal(false)} disabled={savingTags}>
              Cancel
            </Button>
            <Button onClick={handleSaveTags} disabled={savingTags}>
              {savingTags ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Tags'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RagFeeder;
