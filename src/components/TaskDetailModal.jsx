import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  Clock, Play, CheckCircle, Sparkles, Pencil, Trash2, 
  X, Send, Loader2, Bot, Volume2, VolumeX, Square,
  Settings, Mic, Image, RefreshCw, ChevronDown, ChevronUp, Pause,
  Save, FileText, BookOpen, ExternalLink, Package, Camera, Plus, User, History
} from 'lucide-react';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import useBrowserTTS from '../hooks/useBrowserTTS';

const SUPABASE_URL = "https://jdiowphmzsqvpizlwlzn.supabase.co";

// Expandable Source Card Component - Groups sources by document
const SourceCard = ({ source, sectionCount }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const title = source.document_title || source.title || 'Unknown Document';
  const similarity = source.similarity ? Math.round(source.similarity * 100) : null;
  const sections = source.sections || [];
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white border rounded-lg hover:bg-slate-50 transition-colors text-left">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            <FileText className="h-4 w-4 text-[#1E7083] flex-shrink-0" />
            <span className="text-sm font-medium truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {similarity && (
              <span className="text-xs text-muted-foreground">{similarity}% match</span>
            )}
            <Badge className="bg-[#1E7083] text-white text-[10px] hover:bg-[#1E7083]">
              {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
            </Badge>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 ml-4 border-l-2 border-[#1E7083]/20 pl-4 space-y-3">
          {sections.map((section, idx) => {
            const relevance = section.similarity ? (section.similarity * 100).toFixed(1) : null;
            const content = section.content || section.snippet || section;
            
            return (
              <div key={idx} className="bg-slate-50 border rounded-lg overflow-hidden">
                {/* Source Header */}
                <div className="px-3 py-2 bg-slate-100 border-b flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-semibold border-[#1E7083] text-[#1E7083]">
                    Source {idx + 1}
                  </Badge>
                  {relevance && (
                    <span className="text-[11px] text-muted-foreground">{relevance}% relevance</span>
                  )}
                </div>
                {/* Source Content */}
                <div className="px-3 py-2.5">
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {typeof content === 'string' ? content : JSON.stringify(content)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Helper to group sources by document
const groupSourcesByDocument = (sources) => {
  const grouped = {};
  sources.forEach(source => {
    const docTitle = source.document_title || source.title || 'Unknown Document';
    if (!grouped[docTitle]) {
      grouped[docTitle] = {
        document_title: docTitle,
        similarity: source.similarity,
        sections: []
      };
    }
    grouped[docTitle].sections.push({
      content: source.content || source.snippet,
      similarity: source.similarity
    });
    // Keep highest similarity for the document
    if (source.similarity && (!grouped[docTitle].similarity || source.similarity > grouped[docTitle].similarity)) {
      grouped[docTitle].similarity = source.similarity;
    }
  });
  return Object.values(grouped);
};

const TaskDetailModal = ({
  open, 
  onOpenChange, 
  task, 
  onTaskUpdate, 
  onTaskDelete,
  workOrderId,
  truck,
  complaint,
  onStartDiagnostic 
}) => {
  const { profile } = useAuth();
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);
  
  // Labor tracking state
  const [laborEntryId, setLaborEntryId] = useState(null);
  const [laborStartTime, setLaborStartTime] = useState(null);
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0); // Track time across pauses
  
  // Diagnostic state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Browser-native TTS for automatic voice playback
  const {
    isEnabled: ttsEnabled,
    isSpeaking: isPlayingAudio,
    isSupported: ttsSupported,
    speak: speakText,
    cancel: stopAudioPlayback,
    toggle: toggleTTS,
    setIsEnabled: setTtsEnabled,
    markUserInteracted
  } = useBrowserTTS({ defaultEnabled: true });
  
  // Mark user interaction when modal opens (user already clicked to open it)
  useEffect(() => {
    if (open) {
      markUserInteracted();
    }
  }, [open, markUserInteracted]);
  const [capturedData, setCapturedData] = useState({
    readings: {},
    parts: [],
    stepsCompleted: 0
  });
  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);
  const hasAutoStarted = useRef(false);
  const [savingMessageId, setSavingMessageId] = useState(null);
  const [diagnosticSessionId, setDiagnosticSessionId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [diagnosticProcedure, setDiagnosticProcedure] = useState([]);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  
  // Parts and Photos state
  const [taskParts, setTaskParts] = useState([]);
  const [taskPhotos, setTaskPhotos] = useState([]);
  const [laborHistory, setLaborHistory] = useState([]);
  const [loadingLaborHistory, setLoadingLaborHistory] = useState(false);
  const [loadingParts, setLoadingParts] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addingPart, setAddingPart] = useState(false);
  const [newPart, setNewPart] = useState({ part_number: '', description: '', quantity: 1, unit_price: '' });
  const [laborHistoryOpen, setLaborHistoryOpen] = useState(false);
  const photoInputRef = useRef(null);
  
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    complaint: '',
    cause: '',
    correction: '',
    priority: 'medium',
    task_type: 'repair',
    estimated_hours: '',
    actual_hours: '',
    due_date: ''
  });

  useEffect(() => {
    if (task) {
      setEditData({
        title: task.title || '',
        description: task.description || '',
        complaint: task.complaint || task.description || '',
        cause: task.cause || '',
        correction: task.correction || '',
        priority: task.priority || 'medium',
        task_type: task.task_type || 'repair',
        estimated_hours: task.estimated_hours?.toString() || '',
        actual_hours: task.actual_hours?.toString() || '',
        due_date: task.due_date || ''
      });
      setElapsedSeconds(0);
      setIsTimerRunning(false);
    }
  }, [task]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setShowDiagnostic(false);
      setMessages([]);
      hasAutoStarted.current = false;
      setCapturedData({ readings: {}, parts: [], stepsCompleted: 0 });
      setDiagnosticSessionId(null);
      setDiagnosticProcedure([]);
      setCompletedSteps(new Set());
      // Reset labor tracking
      setLaborEntryId(null);
      setLaborStartTime(null);
      setAccumulatedSeconds(0);
      setTaskParts([]);
      setTaskPhotos([]);
      setLaborHistory([]);
      setAddingPart(false);
      setNewPart({ part_number: '', description: '', quantity: 1, unit_price: '' });
    }
  }, [open]);

  // Load labor history, parts, and photos when modal opens
  useEffect(() => {
    if (open && workOrderId && profile?.company_id) {
      loadLaborHistory();
      loadParts();
      loadPhotos();
    }
  }, [open, workOrderId, profile?.company_id, task?.id]);

  const loadLaborHistory = async () => {
    if (!workOrderId) return;
    setLoadingLaborHistory(true);
    try {
      const { data, error } = await supabase
        .from('work_order_labor')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLaborHistory(data || []);
    } catch (error) {
      console.error('Error loading labor history:', error);
    } finally {
      setLoadingLaborHistory(false);
    }
  };

  const loadParts = async () => {
    if (!workOrderId) return;
    setLoadingParts(true);
    try {
      const { data, error } = await supabase
        .from('work_order_parts')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTaskParts(data || []);
    } catch (error) {
      console.error('Error loading parts:', error);
    } finally {
      setLoadingParts(false);
    }
  };

  const loadPhotos = async () => {
    if (!workOrderId) return;
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from('task_photos')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      // Build full URLs for photos
      const photosWithUrls = (data || []).map(photo => ({
        ...photo,
        url: `${SUPABASE_URL}/storage/v1/object/public/task-photos/${photo.file_path}`
      }));
      setTaskPhotos(photosWithUrls);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleAddPart = async () => {
    if (!newPart.description || !workOrderId || !profile) return;
    
    try {
      const { data, error } = await supabase
        .from('work_order_parts')
        .insert({
          work_order_id: workOrderId,
          company_id: profile.company_id,
          part_number: newPart.part_number || null,
          description: newPart.description,
          quantity: parseInt(newPart.quantity) || 1,
          unit_price: newPart.unit_price ? parseFloat(newPart.unit_price) : null,
          extended_price: newPart.unit_price ? parseFloat(newPart.unit_price) * (parseInt(newPart.quantity) || 1) : null
        })
        .select()
        .single();
      
      if (error) throw error;
      setTaskParts(prev => [data, ...prev]);
      setNewPart({ part_number: '', description: '', quantity: 1, unit_price: '' });
      setAddingPart(false);
      toast.success('Part added');
    } catch (error) {
      console.error('Error adding part:', error);
      toast.error('Failed to add part');
    }
  };

  const handleDeletePart = async (partId) => {
    try {
      const { error } = await supabase
        .from('work_order_parts')
        .delete()
        .eq('id', partId);
      
      if (error) throw error;
      setTaskParts(prev => prev.filter(p => p.id !== partId));
      toast.success('Part removed');
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error('Failed to remove part');
    }
  };

  const handlePhotoUpload = async (file) => {
    if (!file || !workOrderId || !profile) return;
    
    setUploadingPhoto(true);
    try {
      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile.company_id}/${workOrderId}/${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('task-photos')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Save reference in database
      const { data, error: dbError } = await supabase
        .from('task_photos')
        .insert({
          work_order_id: workOrderId,
          task_id: task?.id || null,
          company_id: profile.company_id,
          file_path: filePath,
          file_name: file.name,
          uploaded_by: profile.user_id,
          uploaded_by_name: profile.full_name || profile.email
        })
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      // Add to local state with full URL
      const photoWithUrl = {
        ...data,
        url: `${SUPABASE_URL}/storage/v1/object/public/task-photos/${filePath}`
      };
      setTaskPhotos(prev => [photoWithUrl, ...prev]);
      toast.success('Photo uploaded');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photo) => {
    try {
      // Delete from storage
      await supabase.storage
        .from('task-photos')
        .remove([photo.file_path]);
      
      // Delete from database
      const { error } = await supabase
        .from('task_photos')
        .delete()
        .eq('id', photo.id);
      
      if (error) throw error;
      setTaskPhotos(prev => prev.filter(p => p.id !== photo.id));
      toast.success('Photo deleted');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  // Parse procedure steps from AI message content
  const parseProcedureSteps = (content) => {
    const steps = [];
    
    // Pattern 1: Numbered steps like "1. Step description" or "1) Step description"
    const numberedPattern = /(?:^|\n)\s*(\d+)[.)\]]\s*([^\n]+)/g;
    let match;
    while ((match = numberedPattern.exec(content)) !== null) {
      const stepText = match[2].trim();
      if (stepText.length > 5 && stepText.length < 100) {
        steps.push(stepText);
      }
    }
    
    // Pattern 2: Bullet points like "- Step" or "• Step"
    if (steps.length === 0) {
      const bulletPattern = /(?:^|\n)\s*[-•*]\s*([^\n]+)/g;
      while ((match = bulletPattern.exec(content)) !== null) {
        const stepText = match[1].trim();
        if (stepText.length > 5 && stepText.length < 100 && !stepText.startsWith('**')) {
          steps.push(stepText);
        }
      }
    }
    
    // Pattern 3: Keywords for common procedures
    if (steps.length === 0) {
      const keywords = [
        'Visual inspection', 'Check brakes', 'Inspect lights', 'Check tires',
        'Verify structural', 'Test electrical', 'Check fluid', 'Inspect hoses',
        'Check air system', 'Inspect suspension', 'Check connections'
      ];
      keywords.forEach(keyword => {
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          steps.push(keyword);
        }
      });
    }
    
    return steps.slice(0, 8); // Limit to 8 steps
  };

  // Extract procedure from AI messages when they change and save to database
  useEffect(() => {
    if (messages.length > 0 && diagnosticProcedure.length === 0) {
      const assistantMessages = messages.filter(m => m.role === 'assistant' && !m.isThinking && m.content);
      if (assistantMessages.length > 0) {
        // Parse the first assistant message for procedure
        const firstResponse = assistantMessages[0].content;
        const steps = parseProcedureSteps(firstResponse);
        if (steps.length > 0) {
          setDiagnosticProcedure(steps);
          // Save procedure steps to database
          if (diagnosticSessionId) {
            saveProcedureToDatabase(steps);
          }
        }
      }
    }
  }, [messages, diagnosticSessionId]);

  // Save procedure steps to database
  const saveProcedureToDatabase = async (steps) => {
    if (!diagnosticSessionId) return;
    try {
      await supabase
        .from('diagnostic_chat_sessions')
        .update({ procedure_steps: steps })
        .eq('id', diagnosticSessionId);
    } catch (error) {
      console.error('Error saving procedure steps:', error);
    }
  };

  // Save completed steps to database when they change
  const saveCompletedStepsToDatabase = async (stepsSet) => {
    if (!diagnosticSessionId) return;
    try {
      await supabase
        .from('diagnostic_chat_sessions')
        .update({ completed_steps: Array.from(stepsSet) })
        .eq('id', diagnosticSessionId);
    } catch (error) {
      console.error('Error saving completed steps:', error);
    }
  };

  // Handle step completion toggle with persistence
  const handleStepToggle = (stepIndex) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepIndex)) {
        newSet.delete(stepIndex);
      } else {
        newSet.add(stepIndex);
      }
      // Save to database
      saveCompletedStepsToDatabase(newSet);
      return newSet;
    });
  };

  // Check for existing diagnostic history when modal opens - auto-expand if exists
  useEffect(() => {
    if (open && task?.id && profile?.company_id && workOrderId) {
      checkExistingDiagnosticHistory();
    }
  }, [open, task?.id, profile?.company_id, workOrderId]);

  // Check if diagnostic history exists and auto-load it
  const checkExistingDiagnosticHistory = async () => {
    if (!task?.id || !profile?.company_id) return;
    
    try {
      // Find existing session for this task
      const { data: sessions, error: sessionError } = await supabase
        .from('diagnostic_chat_sessions')
        .select('id, completed_steps, procedure_steps')
        .eq('company_id', profile.company_id)
        .eq('work_order_id', workOrderId)
        .eq('complaint', task.title)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        const sessionId = session.id;
        
        // Load completed steps from session
        if (session.completed_steps && session.completed_steps.length > 0) {
          setCompletedSteps(new Set(session.completed_steps));
        }
        
        // Load procedure steps from session
        if (session.procedure_steps && session.procedure_steps.length > 0) {
          setDiagnosticProcedure(session.procedure_steps);
        }
        
        // Check if there are messages in this session
        const { data: historyMessages, error: msgError } = await supabase
          .from('diagnostic_chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        if (historyMessages && historyMessages.length > 0) {
          // Auto-expand diagnostic view and load messages
          setDiagnosticSessionId(sessionId);
          const loadedMessages = historyMessages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            sources: msg.sources || [],
            timestamp: msg.created_at,
            dbId: msg.id
          }));
          setMessages(loadedMessages);
          setShowDiagnostic(true);
          hasAutoStarted.current = true;
        }
      }
    } catch (error) {
      console.error('Error checking diagnostic history:', error);
    }
  };

  // Load existing diagnostic history when switching to diagnostic view (manual click)
  useEffect(() => {
    if (showDiagnostic && task?.id && messages.length === 0 && !hasAutoStarted.current) {
      loadDiagnosticHistory();
    }
  }, [showDiagnostic, task?.id]);

  // Load diagnostic history from database
  const loadDiagnosticHistory = async () => {
    if (!task?.id || !profile?.company_id) return;
    
    setLoadingHistory(true);
    try {
      // Find existing session for this task
      const { data: sessions, error: sessionError } = await supabase
        .from('diagnostic_chat_sessions')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('work_order_id', workOrderId)
        .eq('complaint', task.title) // Use task title to identify session
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      if (sessions && sessions.length > 0) {
        const sessionId = sessions[0].id;
        setDiagnosticSessionId(sessionId);
        
        // Load messages for this session
        const { data: historyMessages, error: msgError } = await supabase
          .from('diagnostic_chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        if (historyMessages && historyMessages.length > 0) {
          // Convert to local message format
          const loadedMessages = historyMessages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            sources: msg.sources || [],
            dbId: msg.id
          }));
          setMessages(loadedMessages);
          hasAutoStarted.current = true; // Don't auto-start if we have history
        } else {
          // Session exists but no messages, start fresh
          startDiagnostic(sessionId);
        }
      } else {
        // No session exists, create one and start diagnostic
        const { data: newSession, error: createError } = await supabase
          .from('diagnostic_chat_sessions')
          .insert({
            company_id: profile.company_id,
            work_order_id: workOrderId,
            truck_id: truck?.id || null,
            complaint: task.title,
            status: 'active'
          })
          .select()
          .single();

        if (createError) throw createError;
        
        setDiagnosticSessionId(newSession.id);
        startDiagnostic(newSession.id);
      }
    } catch (error) {
      console.error('Error loading diagnostic history:', error);
      // Fall back to starting fresh
      startDiagnostic(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Auto-scroll chat messages within the chat container only (not the outer modal)
  useEffect(() => {
    if (chatScrollContainerRef.current && messages.length > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (chatScrollContainerRef.current) {
            chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
          }
        });
      });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  // Parsing logic for readings and parts
  const parseUserInput = (text) => {
    const newReadings = {};
    const newParts = [];

    const voltagePattern = /(\d+\.?\d*)\s*(?:v|V|volts?|Volts?)\b/gi;
    let match;
    while ((match = voltagePattern.exec(text)) !== null) {
      const voltage = parseFloat(match[1]);
      if (voltage >= 0 && voltage <= 50) {
        newReadings[`Voltage ${Object.keys(newReadings).length + 1}`] = `${voltage}V`;
      }
    }

    const psiPattern = /(\d+\.?\d*)\s*(?:psi|PSI)\b/gi;
    while ((match = psiPattern.exec(text)) !== null) {
      newReadings[`Pressure ${Object.keys(newReadings).filter(k => k.startsWith('Pressure')).length + 1}`] = `${parseFloat(match[1])} PSI`;
    }

    const ohmPattern = /(\d+\.?\d*)\s*(?:ohms?|Ω)\b/gi;
    while ((match = ohmPattern.exec(text)) !== null) {
      newReadings[`Resistance ${Object.keys(newReadings).filter(k => k.startsWith('Resistance')).length + 1}`] = `${parseFloat(match[1])}Ω`;
    }

    const partPattern = /\b([A-Z]{2,4}[-\s]?\d{5,})\b/g;
    while ((match = partPattern.exec(text)) !== null) {
      const part = match[1].toUpperCase().trim();
      if (part.length >= 5 && part.length !== 17 && !newParts.includes(part)) {
        newParts.push(part);
      }
    }

    return { newReadings, newParts };
  };

  const updateCapturedData = (userText) => {
    const { newReadings, newParts } = parseUserInput(userText);
    if (Object.keys(newReadings).length > 0 || newParts.length > 0) {
      setCapturedData(prev => ({
        ...prev,
        readings: { ...prev.readings, ...newReadings },
        parts: [...new Set([...prev.parts, ...newParts])],
        stepsCompleted: prev.stepsCompleted + 1
      }));
      toast.success(`Captured: ${Object.keys(newReadings).length} reading(s), ${newParts.length} part(s)`);
    }
  };

  const buildTaskContext = () => {
    const parts = [];
    // Support both nested identity structure and flat structure
    const truckYear = truck?.identity?.year || truck?.year;
    const truckMake = truck?.identity?.make || truck?.make;
    const truckModel = truck?.identity?.model || truck?.model;
    const truckVin = truck?.identity?.vin || truck?.vin;
    
    parts.push('=== VEHICLE INFORMATION ===');
    if (truckYear) parts.push(`Year: ${truckYear}`);
    if (truckMake) parts.push(`Make: ${truckMake}`);
    if (truckModel) parts.push(`Model: ${truckModel}`);
    if (truckVin) parts.push(`VIN: ${truckVin}`);
    
    // Task-specific context with 3 C's emphasis
    parts.push('\n=== TASK DETAILS ===');
    if (task?.title) parts.push(`Task Title: ${task.title}`);
    if (task?.reason) parts.push(`Service Code: ${task.reason}`);
    if (task?.activity) parts.push(`Activity Code: ${task.activity}`);
    
    // 3 C's - Explicitly labeled for AI context
    parts.push('\n=== 3 C\'s (Complaint, Cause, Correction) ===');
    const complaintText = task?.complaint || editData.complaint || task?.description;
    const causeText = task?.cause || editData.cause;
    const correctionText = task?.correction || editData.correction;
    
    parts.push(`COMPLAINT: ${complaintText || 'Not yet documented'}`);
    parts.push(`CAUSE: ${causeText || 'Not yet identified'}`);
    parts.push(`CORRECTION: ${correctionText || 'Not yet applied'}`);
    
    return parts.join('\n');
  };

  const startDiagnostic = async (sessionId = diagnosticSessionId) => {
    setIsLoading(true);
    hasAutoStarted.current = true;
    setMessages([{ id: Date.now(), role: 'assistant', content: '', isThinking: true }]);

    try {
      const taskContext = buildTaskContext();
      
      // Get the specific 3 C's for this task
      const complaintText = task?.complaint || editData.complaint || complaint || task?.description || '';
      const causeText = task?.cause || editData.cause || '';
      const correctionText = task?.correction || editData.correction || '';
      const taskTitle = task?.title || 'Unknown Task';
      
      // Build a highly focused prompt based on the task's 3 C's
      let prompt = `You are an expert diesel/truck technician diagnostic assistant. A technician has opened a specific repair task and needs your guidance based on the documented information.

${taskContext}

=== THIS SPECIFIC TASK: "${taskTitle}" ===

The technician needs step-by-step guidance to complete this task. Here is the documented 3 C's information:

📋 COMPLAINT (What was reported):
"${complaintText || 'No complaint documented yet'}"

🔍 CAUSE (Root problem identified):
"${causeText || 'No cause identified yet - help diagnose this'}"

🔧 CORRECTION (Repair action):
"${correctionText || 'No correction applied yet - provide repair steps'}"

---

`;

      // Customize the response based on what's documented
      if (!causeText && !correctionText) {
        // Only complaint documented - need full diagnostic
        prompt += `The technician has a COMPLAINT but hasn't identified the CAUSE or applied a CORRECTION yet.

Please provide:
1. **Diagnostic Steps**: Step-by-step procedure to diagnose "${complaintText || taskTitle}"
2. **Likely Causes**: What typically causes this issue based on the complaint
3. **Components to Inspect**: Specific parts/areas to check
4. **Test Procedures**: How to verify the root cause
5. **Safety Precautions**: Safety steps for this repair`;

      } else if (causeText && !correctionText) {
        // Complaint and Cause documented - need repair steps
        prompt += `The technician has identified the CAUSE: "${causeText}" but hasn't applied the CORRECTION yet.

Please provide:
1. **Repair Procedure**: Step-by-step instructions to fix "${causeText}"
2. **Parts Needed**: Common parts required for this repair
3. **Tools Required**: Specific tools needed
4. **Verification Steps**: How to confirm the repair is complete
5. **Safety Precautions**: Safety steps for this specific repair`;

      } else if (correctionText) {
        // All 3 C's documented - verify the repair
        prompt += `The technician has applied a CORRECTION: "${correctionText}"

Please provide:
1. **Verification Steps**: How to verify the repair was successful
2. **Post-Repair Checks**: Additional inspections to perform
3. **Common Follow-up Issues**: What to watch for after this repair
4. **Documentation Tips**: What to note for future reference
5. **Quality Assurance**: Final checks before returning vehicle to service`;
      }

      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: { 
          action: 'chat', 
          query: prompt, 
          companyId: profile?.company_id,
          conversationHistory: []
        }
      });

      if (error) throw error;
      const responseContent = data?.response || data?.answer || 'I apologize, I couldn\'t generate a diagnostic response.';
      const newMessageId = Date.now();
      setMessages([{ id: newMessageId, role: 'assistant', content: responseContent, sources: data?.sources || [], timestamp: new Date().toISOString() }]);
      
      // Auto-play TTS for initial diagnostic response
      if (ttsEnabled && responseContent) {
        speakText(responseContent);
      }
      
      // Save to database if we have a session
      if (sessionId && profile?.company_id) {
        await supabase.from('diagnostic_chat_messages').insert({
          session_id: sessionId,
          company_id: profile.company_id,
          role: 'assistant',
          content: responseContent,
          sources: data?.sources || []
        });
      }
    } catch (error) {
      console.error('Error starting diagnostic:', error);
      const errorMsg = 'I encountered an error. Please try again.';
      setMessages([{ id: Date.now(), role: 'assistant', content: errorMsg, isError: true }]);
      if (ttsEnabled) speakText(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const messageText = inputMessage.trim();
    updateCapturedData(messageText);
    
    const userMessage = { id: Date.now(), role: 'user', content: messageText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Save user message to database
    if (diagnosticSessionId && profile?.company_id) {
      await supabase.from('diagnostic_chat_messages').insert({
        session_id: diagnosticSessionId,
        company_id: profile.company_id,
        role: 'user',
        content: messageText
      });
    }

    const thinkingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: thinkingId, role: 'assistant', content: '', isThinking: true }]);

    try {
      const taskContext = buildTaskContext();
      // Build conversation history for context
      const conversationHistory = messages
        .filter(m => !m.isThinking && !m.isError)
        .map(m => ({ role: m.role, content: m.content }));
      
      // Get specific 3 C's for enhanced context
      const complaintText = task?.complaint || editData.complaint || complaint || task?.description || '';
      const causeText = task?.cause || editData.cause || '';
      const correctionText = task?.correction || editData.correction || '';
      const taskTitle = task?.title || 'Unknown Task';
      
      // Include full 3 C's context in the query with task-specific focus
      const contextualQuery = `You are helping a technician with the specific task: "${taskTitle}"

=== TASK'S 3 C's ===
📋 COMPLAINT: "${complaintText || 'Not documented'}"
🔍 CAUSE: "${causeText || 'Not yet identified'}"
🔧 CORRECTION: "${correctionText || 'Not yet applied'}"

${taskContext}

=== TECHNICIAN'S QUESTION ===
${messageText}

Provide a helpful, specific response that directly addresses the question while considering this task's 3 C's context. Give practical, step-by-step guidance when applicable.`;
      
      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: { 
          action: 'chat', 
          query: contextualQuery, 
          companyId: profile?.company_id,
          conversationHistory
        }
      });
      if (error) throw error;
      const responseContent = data?.response || data?.answer || 'I couldn\'t process that request.';
      setMessages(prev => prev.map(m => m.id === thinkingId ? { ...m, content: responseContent, isThinking: false, sources: data?.sources || [], timestamp: new Date().toISOString() } : m));
      
      // Auto-play TTS for AI response
      if (ttsEnabled && responseContent) {
        speakText(responseContent);
      }
      
      // Save assistant response to database
      if (diagnosticSessionId && profile?.company_id) {
        await supabase.from('diagnostic_chat_messages').insert({
          session_id: diagnosticSessionId,
          company_id: profile.company_id,
          role: 'assistant',
          content: responseContent,
          sources: data?.sources || []
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== thinkingId));
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format labor duration with time range display
  const formatLaborDuration = (entry) => {
    const hours = parseFloat(entry.hours) || 0;
    const startTime = new Date(entry.created_at);
    const endTime = new Date(entry.updated_at);
    
    // Calculate total minutes from hours
    const totalMinutes = Math.round(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    // Format duration string
    let durationStr = '';
    if (hrs === 0 && mins === 0) {
      durationStr = '0 mins';
    } else if (hrs === 0) {
      durationStr = `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
    } else if (mins === 0) {
      durationStr = `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`;
    } else {
      durationStr = `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
    }
    
    // Format time range
    const formatTimeOnly = (date) => format(date, 'h:mm a');
    const formatDateWithTime = (date) => {
      if (isToday(date)) return `Today ${format(date, 'h:mm a')}`;
      if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
      return format(date, 'MMM d, h:mm a');
    };
    
    // Check if start and end are on the same day
    const sameDay = isSameDay(startTime, endTime);
    
    let timeRangeStr = '';
    if (hours > 0) {
      if (sameDay) {
        // Same day: show "from X to Y"
        const datePrefix = isToday(startTime) ? '' : isYesterday(startTime) ? 'Yesterday ' : format(startTime, 'MMM d ');
        timeRangeStr = `${datePrefix}${formatTimeOnly(startTime)} to ${formatTimeOnly(endTime)}`;
      } else {
        // Different days: show full date and time for both
        timeRangeStr = `${formatDateWithTime(startTime)} to ${formatDateWithTime(endTime)}`;
      }
    } else {
      // No hours logged yet, just show start time
      timeRangeStr = formatDateWithTime(startTime);
    }
    
    return { durationStr, timeRangeStr, hours };
  };

  // Create or update labor entry in database
  const createLaborEntry = async () => {
    if (!profile || !workOrderId || !task) return null;
    
    try {
      const { data, error } = await supabase
        .from('work_order_labor')
        .insert({
          work_order_id: workOrderId,
          company_id: profile.company_id,
          technician_id: profile.user_id,
          technician_name: profile.full_name || profile.email || 'Unknown Technician',
          description: task.title,
          hours: 0,
          rate: null,
          total: null
        })
        .select()
        .single();
      
      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating labor entry:', error);
      toast.error('Failed to start labor tracking');
      return null;
    }
  };

  const updateLaborEntry = async (totalHours) => {
    if (!laborEntryId) return;
    
    try {
      const { error } = await supabase
        .from('work_order_labor')
        .update({
          hours: parseFloat(totalHours.toFixed(2)),
          updated_at: new Date().toISOString()
        })
        .eq('id', laborEntryId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating labor entry:', error);
    }
  };

  const handleStartWorking = async () => {
    // If resuming from pause, just restart the timer
    if (isTimerPaused) {
      setIsTimerRunning(true);
      setIsTimerPaused(false);
      setLaborStartTime(new Date());
      return;
    }
    
    // Starting fresh - create new labor entry
    const entryId = await createLaborEntry();
    if (entryId) {
      setLaborEntryId(entryId);
      setLaborStartTime(new Date());
      setAccumulatedSeconds(0);
      setIsTimerRunning(true);
      toast.success(`Time tracking started for ${profile?.full_name || 'technician'}`);
      loadLaborHistory(); // Refresh labor history
      
      if (task?.status === 'pending') handleStatusChange('in_progress');
    }
  };

  const handlePauseWorking = async () => {
    setIsTimerRunning(false);
    setIsTimerPaused(true);
    
    // Calculate time since last start and add to accumulated
    if (laborStartTime) {
      const sessionSeconds = Math.floor((new Date() - laborStartTime) / 1000);
      const newAccumulated = accumulatedSeconds + sessionSeconds;
      setAccumulatedSeconds(newAccumulated);
      
      // Update labor entry with total hours so far
      const totalHours = newAccumulated / 3600;
      await updateLaborEntry(totalHours);
      loadLaborHistory(); // Refresh labor history
      toast.info(`Paused - ${formatTime(newAccumulated)} logged`);
    }
  };

  const handleMarkComplete = async () => {
    setIsTimerRunning(false);
    setIsTimerPaused(false);
    
    // Calculate final hours including any running session
    let totalSeconds = accumulatedSeconds;
    if (laborStartTime && !isTimerPaused) {
      totalSeconds += Math.floor((new Date() - laborStartTime) / 1000);
    }
    
    const actualHours = totalSeconds / 3600;
    
    try {
      // Update labor entry with final hours
      if (laborEntryId) {
        await updateLaborEntry(actualHours);
      }
      
      // Update task status
      const { error } = await supabase
        .from('work_order_tasks')
        .update({ 
          status: 'completed', 
          actual_hours: parseFloat(actualHours.toFixed(2)) || task?.actual_hours 
        })
        .eq('id', task.id);
      
      if (error) throw error;
      
      onTaskUpdate?.({ ...task, status: 'completed', actual_hours: parseFloat(actualHours.toFixed(2)) });
      toast.success(`Task completed! ${actualHours.toFixed(2)} hours logged for ${profile?.full_name || 'technician'}`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase.from('work_order_tasks').update({ status: newStatus }).eq('id', task.id);
      if (error) throw error;
      onTaskUpdate?.({ ...task, status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase.from('work_order_tasks').update({
        title: editData.title,
        description: editData.complaint || editData.description,
        complaint: editData.complaint || null,
        cause: editData.cause || null,
        correction: editData.correction || null,
        priority: editData.priority,
        task_type: editData.task_type,
        estimated_hours: editData.estimated_hours ? parseFloat(editData.estimated_hours) : null,
        actual_hours: editData.actual_hours ? parseFloat(editData.actual_hours) : null,
        due_date: editData.due_date || null
      }).eq('id', task.id);
      if (error) throw error;
      onTaskUpdate?.({ ...task, ...editData });
      setIsEditing(false);
      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const { error } = await supabase.from('work_order_tasks').delete().eq('id', task.id);
      if (error) throw error;
      onTaskDelete?.(task.id);
      toast.success('Task deleted');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  // Save AI diagnostic response to task fields
  const handleSaveAIResponse = async (messageContent, saveType) => {
    if (!messageContent || !task?.id) return;
    
    setSavingMessageId(messageContent);
    try {
      const updateData = {};
      
      if (saveType === 'cause') {
        updateData.cause = messageContent;
        setEditData(prev => ({ ...prev, cause: messageContent }));
      } else if (saveType === 'correction') {
        updateData.correction = messageContent;
        setEditData(prev => ({ ...prev, correction: messageContent }));
      } else if (saveType === 'both') {
        // Extract sections from AI response
        const causeMatch = messageContent.match(/(?:root cause|likely cause|diagnosis|cause)[:\s]*([^]*?)(?=(?:recommend|step|correction|repair|solution|$))/i);
        const correctionMatch = messageContent.match(/(?:recommend|step|correction|repair|solution)[:\s]*([^]*?)$/i);
        
        if (causeMatch) {
          updateData.cause = causeMatch[1].trim().substring(0, 1000);
          setEditData(prev => ({ ...prev, cause: updateData.cause }));
        }
        if (correctionMatch) {
          updateData.correction = correctionMatch[1].trim().substring(0, 2000);
          setEditData(prev => ({ ...prev, correction: updateData.correction }));
        }
        
        // If no sections found, save full content to correction
        if (!updateData.cause && !updateData.correction) {
          updateData.correction = messageContent.substring(0, 2000);
          setEditData(prev => ({ ...prev, correction: updateData.correction }));
        }
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('work_order_tasks')
          .update(updateData)
          .eq('id', task.id);
        
        if (error) throw error;
        onTaskUpdate?.({ ...task, ...updateData });
        toast.success(`AI diagnostic saved to task ${saveType === 'both' ? 'fields' : saveType}!`);
      }
    } catch (error) {
      console.error('Error saving AI response:', error);
      toast.error('Failed to save AI response');
    } finally {
      setSavingMessageId(null);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`p-0 gap-0 flex flex-col transition-all duration-300 ease-in-out ${
          showDiagnostic ? 'w-[90vw] max-w-[1400px] h-[88vh]' : 'sm:max-w-4xl max-h-[85vh]'
        }`}
        aria-describedby={undefined}
      >
        {/* Single scrollable container for everything */}
        <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">
          <div className="p-5 space-y-4">
            {/* Task Header */}
            <DialogHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold uppercase tracking-wide">{task.title}</DialogTitle>
                  <Badge variant="outline" className={`text-[10px] ${
                    task.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                    task.status === 'blocked' ? 'bg-red-100 text-red-700 border-red-300' :
                    'bg-gray-100 text-gray-600 border-gray-300'
                  }`}>{task.status?.replace('_', ' ').toUpperCase()}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(!isEditing)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </DialogHeader>

            {/* Time Tracking */}
            <div className="rounded-xl overflow-hidden border shadow-sm">
              <div className="bg-gradient-to-r from-[#124481] to-[#1E7083] px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white text-sm font-medium">
                  <Clock className="h-4 w-4" /> Time Tracking
                </div>
                <div className="text-2xl font-mono font-bold tracking-wider text-white">{formatTime(elapsedSeconds)}</div>
              </div>
              <div className="bg-white px-5 py-4">
                <div className="flex gap-3">
                  {!isTimerRunning ? (
                    <Button 
                      onClick={handleStartWorking} 
                      disabled={task.status === 'completed'} 
                      variant="outline"
                      className="flex-1 border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 h-10"
                    >
                      <Play className="h-4 w-4 mr-2" />{isTimerPaused ? 'Resume' : 'Start Working'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handlePauseWorking} 
                      variant="outline"
                      className="flex-1 border-amber-400 bg-white text-amber-600 hover:bg-amber-50 hover:text-amber-700 h-10"
                    >
                      <Pause className="h-4 w-4 mr-2" /> Pause
                    </Button>
                  )}
                  <Button 
                    onClick={handleMarkComplete} 
                    disabled={task.status === 'completed'} 
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white h-10"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Mark Complete <span className="ml-1">→</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">Completing this task will automatically open Task 2</p>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4 border-t pt-4">
                <div><Label>Title</Label><Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Priority</Label>
                    <Select value={editData.priority} onValueChange={(v) => setEditData({ ...editData, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Estimated Hours</Label><Input type="number" step="0.5" value={editData.estimated_hours} onChange={(e) => setEditData({ ...editData, estimated_hours: e.target.value })} /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={handleSaveEdit} className="bg-[#1E7083] hover:bg-[#1E7083]/90">Save</Button>
                </div>
              </div>
            ) : (
              <>
                {/* 3 C's Section - Always visible */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-sm tracking-wide text-foreground">Task Details (3 C's Format)</h3>
                  
                  {/* Complaint */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-500 text-xs font-bold">C</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">Complaint</span>
                    </div>
                    <div className="ml-8 border-l-3 border-red-400 bg-red-50 rounded-r-md px-3 py-2" style={{ borderLeftWidth: '3px' }}>
                      <p className="text-sm text-foreground">{editData.complaint || task.description || 'No complaint recorded'}</p>
                    </div>
                  </div>
                  
                  {/* Cause */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-500 text-xs font-bold">C</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">Cause</span>
                    </div>
                    <div className="ml-8 border-l-3 border-orange-400 bg-orange-50 rounded-r-md px-3 py-2" style={{ borderLeftWidth: '3px' }}>
                      <p className="text-sm text-foreground">{editData.cause || 'No cause identified yet'}</p>
                    </div>
                  </div>
                  
                  {/* Correction */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 text-xs font-bold">C</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">Correction</span>
                    </div>
                    <div className="ml-8 border-l-3 border-green-500 bg-green-50 rounded-r-md px-3 py-2" style={{ borderLeftWidth: '3px' }}>
                      <p className="text-sm text-foreground">{editData.correction || 'No correction recorded yet'}</p>
                    </div>
                  </div>
                </div>

                {/* AI Diagnostic Section - Split-screen workspace */}
                {!showDiagnostic ? (
                  <div className="border-2 border-purple-300 rounded-xl p-5 bg-gradient-to-r from-purple-50 to-violet-50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2"><Sparkles className="h-5 w-5 text-purple-600" /><h3 className="font-semibold text-base text-purple-800">AI Diagnostic Assistant</h3></div>
                    <p className="text-sm text-muted-foreground mb-3">Get AI-powered step-by-step guidance tailored to this task's 3 C's.</p>
                    <Button onClick={() => setShowDiagnostic(true)} size="lg" className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white text-base h-12 shadow-md">
                      <Sparkles className="h-5 w-5 mr-2" /> Start AI Diagnostic
                    </Button>
                  </div>
                ) : (
                  /* AI Diagnostic - Professional split-screen workspace */
                  <div className="animate-in slide-in-from-bottom-4 duration-300 mt-2">
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-4 py-2 border rounded-t-xl bg-white">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <h3 className="font-semibold text-sm text-foreground">AI Diagnostic Mode</h3>
                        <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-600">Active</Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowDiagnostic(false)}
                        className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Exit
                      </Button>
                    </div>
                    
                    {/* Split-screen: Left Plan + Right Chat */}
                    <div className="flex flex-col md:flex-row border-x border-b rounded-b-xl overflow-hidden bg-white" style={{ height: 'clamp(500px, 65vh, 700px)' }}>
                      
                      {/* LEFT PANEL - Diagnostic Plan (32%) */}
                      <div className="md:w-[32%] w-full md:border-r flex flex-col bg-slate-50 overflow-hidden">
                        {/* Sticky header */}
                        <div className="px-3 py-2.5 bg-[#124481] flex items-center justify-between flex-shrink-0">
                          <span className="text-xs font-semibold text-white tracking-wide">Diagnostic Plan</span>
                          {diagnosticProcedure.length > 0 && (
                            <Badge className="bg-white/20 text-white text-[10px] hover:bg-white/30">
                              {completedSteps.size}/{diagnosticProcedure.length}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Scrollable plan content */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                          {/* Procedure Steps */}
                          {diagnosticProcedure.length > 0 ? (
                            <div className="space-y-1.5">
                              {diagnosticProcedure.map((step, idx) => (
                                <div 
                                  key={idx} 
                                  className={`flex items-start gap-2 cursor-pointer group p-2 rounded-lg transition-all ${
                                    completedSteps.has(idx) 
                                      ? 'bg-green-50 opacity-60' 
                                      : 'hover:bg-white'
                                  }`}
                                  onClick={() => handleStepToggle(idx)}
                                >
                                  <div className={`w-5 h-5 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                    completedSteps.has(idx) 
                                      ? 'bg-green-500 border-green-500' 
                                      : 'border-gray-300 bg-white group-hover:border-[#1E7083]'
                                  }`}>
                                    {completedSteps.has(idx) && (
                                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                                    )}
                                  </div>
                                  <span className={`text-xs leading-snug ${
                                    completedSteps.has(idx) 
                                      ? 'text-muted-foreground line-through' 
                                      : 'text-foreground font-medium'
                                  }`}>
                                    {step}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                              <Bot className="h-6 w-6 text-muted-foreground/40 mb-2" />
                              <p className="text-xs text-muted-foreground italic">
                                {messages.length > 0 && !messages[0]?.isThinking 
                                  ? 'Follow AI recommendations'
                                  : 'Plan will appear after AI responds...'}
                              </p>
                            </div>
                          )}

                          {/* Data Captured - Always visible */}
                          <div className="border-t pt-3">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Data Captured</p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-[10px] text-muted-foreground mb-1">Readings:</p>
                                {Object.keys(capturedData.readings).length > 0 ? (
                                  <div className="space-y-1">
                                    {Object.entries(capturedData.readings).map(([key, value]) => (
                                      <div key={key} className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">{key}:</span>
                                        <span className="font-medium">{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-muted-foreground italic">No readings yet</p>
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground mb-1">Parts Identified:</p>
                                {capturedData.parts.length > 0 ? (
                                  <div className="space-y-1">
                                    {capturedData.parts.map((part, idx) => (
                                      <div key={idx} className="font-mono text-[11px] bg-white px-2 py-1 rounded border">{part}</div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-muted-foreground italic">No parts yet</p>
                                )}
                              </div>
                              <div className="pt-1">
                                <p className="text-xs font-medium">{capturedData.stepsCompleted} steps completed</p>
                              </div>
                            </div>
                          </div>

                          {/* Vehicle Info - Compact */}
                          <div className="border-t pt-3">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vehicle</p>
                            <div className="space-y-1 text-xs">
                              {(truck?.identity?.year || truck?.year) && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Year:</span>
                                  <span className="font-medium">{truck?.identity?.year || truck?.year}</span>
                                </div>
                              )}
                              {(truck?.identity?.make || truck?.make) && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Make:</span>
                                  <span className="font-medium">{truck?.identity?.make || truck?.make}</span>
                                </div>
                              )}
                              {(truck?.identity?.model || truck?.model) && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Model:</span>
                                  <span className="font-medium">{truck?.identity?.model || truck?.model}</span>
                                </div>
                              )}
                              {(truck?.identity?.vin || truck?.vin) && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">VIN:</span>
                                  <span className="font-mono text-[10px] truncate max-w-[100px]">{truck?.identity?.vin || truck?.vin}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT PANEL - AI Chat (68%) */}
                      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                        {/* Compact Chat Header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 text-white flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            <h3 className="font-semibold text-xs">AI Diagnostic Assistant</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-white hover:bg-white/20 h-7 w-7"
                              onClick={toggleTTS}
                              title={ttsEnabled ? "Auto-voice ON" : "Auto-voice OFF"}
                            >
                              {ttsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Stop Speaking bar */}
                        {isPlayingAudio && (
                          <div className="px-3 py-1 bg-amber-50 border-b flex items-center justify-between text-xs text-amber-700 flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <Volume2 className="h-3 w-3 animate-pulse" />
                              <span>Speaking...</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-5 px-2 text-[10px] hover:bg-amber-100" 
                              onClick={stopAudioPlayback}
                            >
                              <Square className="h-3 w-3 mr-1" /> Stop
                            </Button>
                          </div>
                        )}

                        {/* Messages - Scrollable */}
                        <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 min-h-0">
                          {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-[#1E7083]" />
                              <span className="ml-2 text-sm text-muted-foreground">Loading diagnostic history...</span>
                            </div>
                          ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <Bot className="h-10 w-10 text-muted-foreground/50 mb-3" />
                              <p className="text-sm text-muted-foreground">Starting AI diagnostic for this task...</p>
                            </div>
                          ) : (
                            messages.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {message.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-lg bg-[#1E7083] flex items-center justify-center flex-shrink-0"><Bot className="h-3.5 w-3.5 text-white" /></div>
                              )}
                              <div className={`max-w-[85%] space-y-2`}>
                                <div className={`rounded-xl px-4 py-3 ${message.role === 'user' ? 'bg-[#1E7083] text-white' : 'bg-white border shadow-sm text-gray-900'}`}>
                                  {message.isThinking ? (
                                    <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Analyzing...</span></div>
                                  ) : (
                                    <>
                                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                                      {message.timestamp && (
                                        <p className={`text-[10px] mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                                          {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                                
                                {/* Source Citations */}
                                {message.role === 'assistant' && !message.isThinking && message.sources && message.sources.length > 0 && (() => {
                                  const groupedSources = groupSourcesByDocument(message.sources);
                                  return (
                                    <div className="mt-2 pt-2 border-t border-dashed">
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                                        <FileText className="h-3.5 w-3.5" />
                                        <span className="font-medium">Sources:</span>
                                      </div>
                                      <div className="space-y-1.5">
                                        {groupedSources.map((doc, idx) => (
                                          <SourceCard 
                                            key={idx} 
                                            source={doc} 
                                            sectionCount={doc.sections.length} 
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          ))
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Input - Sticky at bottom */}
                        <div className="border-t p-3 bg-white flex-shrink-0">
                          <div className="flex items-end gap-2">
                            <div className="flex gap-0.5">
                              <Button size="icon" variant="ghost" className="text-muted-foreground h-8 w-8"><Mic className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="text-muted-foreground h-8 w-8" onClick={startDiagnostic} title="Restart diagnostic"><RefreshCw className="h-3.5 w-3.5" /></Button>
                            </div>
                            <div className="flex-1 relative">
                              <Textarea
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Ask about this repair... (e.g., 'I got 12.4 volts')"
                                className="min-h-[44px] max-h-[100px] pr-10 resize-none text-sm"
                                disabled={isLoading}
                              />
                              <Button size="icon" onClick={sendMessage} disabled={!inputMessage.trim() || isLoading} className="absolute right-1.5 bottom-1.5 bg-[#1E7083] hover:bg-[#1E7083]/90 h-7 w-7">
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Labor History Section - Collapsible */}
                <Collapsible open={laborHistoryOpen} onOpenChange={setLaborHistoryOpen}>
                  <Card className="border shadow-sm">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-sm font-semibold">Labor History</CardTitle>
                          {laborHistory.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">{laborHistory.length}</Badge>
                          )}
                          {loadingLaborHistory && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${laborHistoryOpen ? 'rotate-180' : ''}`} />
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="px-4 pb-4 pt-0">
                        {laborHistory.length > 0 ? (
                          <div className="space-y-3">
                            {laborHistory.map((entry) => {
                              const { durationStr, timeRangeStr } = formatLaborDuration(entry);
                              return (
                                <div key={entry.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                                  <div className="w-8 h-8 rounded-full bg-[#1E7083]/10 flex items-center justify-center flex-shrink-0">
                                    <User className="h-4 w-4 text-[#1E7083]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{entry.technician_name || 'Unknown Technician'}</p>
                                    <p className="text-xs text-muted-foreground">{entry.description || 'Work performed'}</p>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                      <span className="text-xs font-medium text-[#1E7083]">
                                        {durationStr}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {timeRangeStr}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {loadingLaborHistory ? 'Loading...' : 'No labor entries yet. Click "Start Working" to begin tracking.'}
                          </p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Parts Used Section */}
                <Card className="border shadow-sm">
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-semibold">Parts Used</CardTitle>
                      {loadingParts && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => setAddingPart(!addingPart)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Part
                    </Button>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {/* Add Part Form */}
                    {addingPart && (
                      <div className="mb-4 p-3 bg-slate-50 rounded-lg border space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Part Number</Label>
                            <Input 
                              placeholder="e.g., ABC-123"
                              value={newPart.part_number}
                              onChange={(e) => setNewPart(prev => ({ ...prev, part_number: e.target.value }))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input 
                              type="number"
                              min="1"
                              value={newPart.quantity}
                              onChange={(e) => setNewPart(prev => ({ ...prev, quantity: e.target.value }))}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Description *</Label>
                          <Input 
                            placeholder="Part description"
                            value={newPart.description}
                            onChange={(e) => setNewPart(prev => ({ ...prev, description: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit Price ($)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newPart.unit_price}
                            onChange={(e) => setNewPart(prev => ({ ...prev, unit_price: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAddingPart(false)} className="flex-1">Cancel</Button>
                          <Button 
                            size="sm" 
                            onClick={handleAddPart} 
                            disabled={!newPart.description}
                            className="flex-1 bg-[#1E7083] hover:bg-[#1E7083]/90"
                          >
                            Add Part
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {taskParts.length > 0 ? (
                      <div className="space-y-2">
                        {taskParts.map((part) => (
                          <div key={part.id} className="flex items-center justify-between py-2 border-b last:border-0 group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{part.description}</p>
                              {part.part_number && (
                                <p className="text-xs text-muted-foreground font-mono">{part.part_number}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm">Qty: {part.quantity}</span>
                              {part.unit_price && (
                                <span className="text-xs text-muted-foreground">${parseFloat(part.unit_price).toFixed(2)}</span>
                              )}
                              <button
                                onClick={() => handleDeletePart(part.id)}
                                className="w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !addingPart && <p className="text-sm text-muted-foreground text-center py-4">No parts added yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Photos Section */}
                <Card className="border shadow-sm">
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-semibold">Photos</CardTitle>
                      {(loadingPhotos || uploadingPhoto) && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Plus className="h-3 w-3 mr-1" /> {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
                    </Button>
                    <input 
                      ref={photoInputRef}
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handlePhotoUpload(file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {taskPhotos.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {taskPhotos.map((photo) => (
                          <div key={photo.id || photo.url} className="relative group aspect-square rounded-lg overflow-hidden border">
                            <img 
                              src={photo.url} 
                              alt={photo.file_name || photo.name || 'Photo'}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-[10px] text-white truncate">{photo.uploaded_by_name || 'Unknown'}</p>
                            </div>
                            <button
                              onClick={() => handleDeletePhoto(photo)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {loadingPhotos ? 'Loading...' : 'No photos added yet'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {task.estimated_hours && !showDiagnostic && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                    <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> Est: {task.estimated_hours}h</div>
                    {task.actual_hours && <div>Actual: {task.actual_hours}h</div>}
                  </div>
                )}

                {!showDiagnostic && (
                  <button onClick={() => setIsEditing(true)} className="text-sm text-[#1E7083] hover:underline mt-2">Edit Task</button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailModal;
