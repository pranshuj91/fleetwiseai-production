import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, User, Bot, CheckCircle2, Mic, Image, X, Volume2, VolumeX, Settings, ThumbsUp, ThumbsDown, FileText, ChevronDown, ChevronRight, Sparkles, History, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import DiagnosticContextPanel from './DiagnosticContextPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { voiceAPI } from '../lib/api';
import { toast } from 'sonner';
import useBrowserTTS from '../hooks/useBrowserTTS';

// Source card component with expandable chunk details
const SourceCard = ({ source }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 p-2 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <FileText className="h-3 w-3 text-gray-500" />
          <span className="text-xs font-medium flex-1 truncate">{source.title}</span>
          <Badge variant="outline" className="text-xs">
            {(source.similarity * 100).toFixed(0)}% match
          </Badge>
          {source.chunkCount > 1 && (
            <Badge variant="secondary" className="text-xs">
              {source.chunkCount} sections
            </Badge>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 ml-5 space-y-2">
          {source.chunks?.map((chunk, idx) => (
            <div key={idx} className="p-2 rounded border border-gray-200 bg-white text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  [Source {chunk.sourceIndex}]
                </Badge>
                <span className="text-gray-500">
                  {(chunk.similarity * 100).toFixed(1)}% relevance
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {chunk.content.length > 300 ? chunk.content.substring(0, 300) + '...' : chunk.content}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const DiagnosticChatInterface = ({ 
  projectId, 
  project,
  truck,
  truckInfo, 
  faultCodes, 
  complaint,
  onDataCaptured,
  autoGenerateSummary = false
}) => {
  const { profile } = useAuth();
  
  // Support both direct truckInfo and truck object with identity nested structure
  const resolvedTruckInfo = truckInfo || (truck?.identity ? {
    truck_id: truck.id,
    year: truck.identity.year,
    make: truck.identity.make,
    model: truck.identity.model,
    vin: truck.identity.vin,
    engine_model: truck.engine?.manufacturer && truck.engine?.model 
      ? `${truck.engine.manufacturer} ${truck.engine.model}` 
      : (truck.engine?.model || truck.engine?.manufacturer || null),
    odometer_mi: truck.identity.odometer_mi,
  } : null);
  
  const resolvedFaultCodes = faultCodes || project?.fault_codes || [];
  const resolvedComplaint = complaint || project?.complaint || '';
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [diagnosticPlan, setDiagnosticPlan] = useState(null);
  const [capturedData, setCapturedData] = useState({
    readings: {},
    parts: [],
    stepsCompleted: 0
  });
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  // Browser-native TTS hook for automatic voice playback
  const {
    isEnabled: ttsEnabled,
    isSpeaking: isPlayingAudio,
    isSupported: ttsSupported,
    speak: speakText,
    cancel: stopAudioPlayback,
    toggle: toggleTTS,
    setIsEnabled: setTtsEnabled,
    resetLastSpoken
  } = useBrowserTTS({ defaultEnabled: true });
  const [messageFeedback, setMessageFeedback] = useState({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const autoSummaryTriggeredRef = useRef(false);

  const scrollToBottom = (instant = false) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: instant ? 'instant' : 'smooth'
      });
    }
  };

  // Only scroll when new messages are added, not on initial load or history fetch
  useEffect(() => {
    const currentLength = messages.length;
    const prevLength = prevMessagesLengthRef.current;
    
    // Skip scroll during initial load/history fetch
    if (isLoadingHistory) {
      return;
    }
    
    // If this is initial render after history load, scroll instantly without animation
    if (isInitialLoadRef.current && currentLength > 0) {
      isInitialLoadRef.current = false;
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
      prevMessagesLengthRef.current = currentLength;
      return;
    }
    
    // Only scroll when new messages are added (length increased)
    if (currentLength > prevLength && prevLength > 0) {
      // Small delay to let content render first, preventing flicker
      requestAnimationFrame(() => {
        scrollToBottom(false);
      });
    }
    
    prevMessagesLengthRef.current = currentLength;
  }, [messages, isLoadingHistory]);

  // Build truck context string for RAG queries
  const buildTruckContext = () => {
    const parts = [];
    
    if (resolvedTruckInfo) {
      if (resolvedTruckInfo.year) parts.push(`Year: ${resolvedTruckInfo.year}`);
      if (resolvedTruckInfo.make) parts.push(`Make: ${resolvedTruckInfo.make}`);
      if (resolvedTruckInfo.model) parts.push(`Model: ${resolvedTruckInfo.model}`);
      if (resolvedTruckInfo.engine_model) parts.push(`Engine: ${resolvedTruckInfo.engine_model}`);
      if (resolvedTruckInfo.vin) parts.push(`VIN: ${resolvedTruckInfo.vin}`);
      if (resolvedTruckInfo.odometer_mi) parts.push(`Odometer: ${resolvedTruckInfo.odometer_mi} mi`);
    }
    
    if (resolvedFaultCodes?.length > 0) {
      parts.push(`Fault Codes: ${resolvedFaultCodes.join(', ')}`);
    }
    
    if (resolvedComplaint) {
      parts.push(`Complaint: ${resolvedComplaint}`);
    }
    
    return parts.length > 0 ? parts.join(' | ') : '';
  };

  // Build a nicely formatted greeting with vehicle info
  const buildFormattedGreeting = () => {
    const hasVehicleInfo = resolvedTruckInfo && (
      resolvedTruckInfo.year || resolvedTruckInfo.make || resolvedTruckInfo.model
    );
    
    if (!hasVehicleInfo && !resolvedFaultCodes?.length && !resolvedComplaint) {
      return "Hello! I'm your AI Diagnostic Assistant connected to your knowledge base. Ask me anything about troubleshooting, repair procedures, or technical specifications. I'll search for relevant information to help you.";
    }

    let greeting = "Hello! I'm your AI Diagnostic Assistant connected to your knowledge base. I'm ready to help you diagnose issues for this vehicle:\n\n";
    
    // Build vehicle info section
    if (hasVehicleInfo) {
      const vehicleName = [
        resolvedTruckInfo?.year,
        resolvedTruckInfo?.make,
        resolvedTruckInfo?.model
      ].filter(Boolean).join(' ');
      
      greeting += `🚛 **${vehicleName}**\n`;
      
      if (resolvedTruckInfo?.engine_model) {
        greeting += `⚙️ Engine: ${resolvedTruckInfo.engine_model}\n`;
      }
      if (resolvedTruckInfo?.vin) {
        greeting += `🔖 VIN: ${resolvedTruckInfo.vin}\n`;
      }
      if (resolvedTruckInfo?.odometer_mi) {
        greeting += `📏 Odometer: ${Number(resolvedTruckInfo.odometer_mi).toLocaleString()} mi\n`;
      }
    }
    
    if (resolvedFaultCodes?.length > 0) {
      greeting += `\n⚠️ **Fault Codes:** ${resolvedFaultCodes.join(', ')}\n`;
    }
    
    if (resolvedComplaint) {
      greeting += `\n📋 **Complaint:** ${resolvedComplaint}\n`;
    }
    
    greeting += "\nAsk me anything about troubleshooting, repair procedures, or technical specifications. I'll search the knowledge base for relevant information.\n\n💡 **Tip:** Click the button below to generate a quick diagnostic summary.";
    
    return greeting;
  };

  // Generate a quick diagnostic summary based on vehicle info, fault codes, and complaint
  const generateDiagnosticSummary = async () => {
    if (isGeneratingSummary || isLoading) return;
    
    const hasRelevantInfo = resolvedFaultCodes?.length > 0 || resolvedComplaint;
    if (!hasRelevantInfo) {
      toast.error('No fault codes or complaint available to generate a summary');
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryGenerated(true);

    // Create a summary request message
    const summaryRequest = "Generate a brief diagnostic summary for this vehicle based on the fault codes and complaint. Include: 1) Most likely root causes, 2) Recommended diagnostic steps, 3) Key components to inspect. Keep it concise and actionable.";

    // Save user message to database
    const savedUserMsg = await saveMessage('user', "🔍 Generate Diagnostic Summary", []);
    
    const userMessage = {
      id: savedUserMsg?.id,
      role: 'user',
      content: "🔍 Generate Diagnostic Summary",
      timestamp: savedUserMsg?.created_at || new Date().toISOString(),
      sources: []
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const truckContext = buildTruckContext();
      const contextualQuery = truckContext 
        ? `[Vehicle Context: ${truckContext}]\n\n${summaryRequest}`
        : summaryRequest;

      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'chat',
          query: contextualQuery,
          companyId: profile?.company_id,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
          vehicleContext: {
            year: resolvedTruckInfo?.year,
            make: resolvedTruckInfo?.make,
            model: resolvedTruckInfo?.model,
            engine: resolvedTruckInfo?.engine_model,
            vin: resolvedTruckInfo?.vin,
            odometer: resolvedTruckInfo?.odometer_mi,
            faultCodes: resolvedFaultCodes,
            complaint: resolvedComplaint
          }
        },
      });

      if (error) throw error;

      const aiContent = data.response || data.answer || "I couldn't generate a diagnostic summary at this time.";
      const sources = data.sources || [];

      const savedAiMsg = await saveMessage('assistant', aiContent, sources);

      const aiMessage = {
        id: savedAiMsg?.id,
        role: 'assistant',
        content: aiContent,
        timestamp: savedAiMsg?.created_at || new Date().toISOString(),
        sources
      };
      setMessages(prev => [...prev, aiMessage]);

      // Auto-play TTS using browser speech synthesis
      if (ttsEnabled && aiContent) {
        speakText(aiContent);
      }

      toast.success('Diagnostic summary generated');

    } catch (error) {
      console.error('Error generating diagnostic summary:', error);
      const errorMessage = "Sorry, I couldn't generate the diagnostic summary. Please try again.";
      
      await saveMessage('assistant', errorMessage, []);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString(),
        sources: []
      }]);
      
      toast.error('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Check if summary button should be shown (has fault codes or complaint, and not already generated)
  const showSummaryButton = (resolvedFaultCodes?.length > 0 || resolvedComplaint) && !summaryGenerated && messages.length <= 1;

  // Load existing session or create new one
  useEffect(() => {
    if (projectId && profile?.company_id) {
      loadOrCreateSession();
    }
  }, [projectId, profile?.company_id]);

  // Auto-generate diagnostic summary when coming from work order creation
  useEffect(() => {
    // Only trigger once when:
    // - autoGenerateSummary is true (came from work order extraction)
    // - Session is loaded (not loading history)
    // - Session has been created (sessionId exists)
    // - Has fault codes or complaint to generate from
    // - Hasn't already been triggered
    // - Messages are at initial state (only greeting)
    const hasRelevantInfo = resolvedFaultCodes?.length > 0 || resolvedComplaint;
    
    if (
      autoGenerateSummary &&
      !isLoadingHistory &&
      sessionId &&
      hasRelevantInfo &&
      !autoSummaryTriggeredRef.current &&
      !summaryGenerated &&
      messages.length <= 1
    ) {
      autoSummaryTriggeredRef.current = true;
      // Small delay to ensure UI is ready
      setTimeout(() => {
        generateDiagnosticSummary();
      }, 500);
    }
  }, [autoGenerateSummary, isLoadingHistory, sessionId, resolvedFaultCodes, resolvedComplaint, summaryGenerated, messages.length]);

  const loadOrCreateSession = async () => {
    setIsLoadingHistory(true);
    isInitialLoadRef.current = true; // Reset initial load flag for fresh scroll handling
    try {
      // Check for existing session for this work order
      const { data: existingSessions, error: sessionError } = await supabase
        .from('diagnostic_chat_sessions')
        .select('*')
        .eq('work_order_id', projectId)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      if (existingSessions && existingSessions.length > 0) {
        const session = existingSessions[0];
        setSessionId(session.id);
        
        // Load existing messages
        const { data: existingMessages, error: msgError } = await supabase
          .from('diagnostic_chat_messages')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        if (existingMessages && existingMessages.length > 0) {
          const loadedMessages = existingMessages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            sources: msg.sources || []
          }));
          setMessages(loadedMessages);
          
          // Load feedback states
          const feedbackState = {};
          existingMessages.forEach((msg, idx) => {
            if (msg.feedback_rating) {
              feedbackState[idx] = { 
                rating: msg.feedback_rating, 
                comment: msg.feedback_comment,
                submitted: true 
              };
            }
          });
          setMessageFeedback(feedbackState);
          
          toast.success('Previous conversation loaded');
        } else {
          // Session exists but no messages, add greeting
          await addInitialGreeting(session.id);
        }
      } else {
        // Create new session
        await createNewSession();
      }
    } catch (error) {
      console.error('Error loading session:', error);
      // Fall back to local-only mode
      addLocalGreeting();
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const createNewSession = async () => {
    try {
      const { data: newSession, error } = await supabase
        .from('diagnostic_chat_sessions')
        .insert({
          work_order_id: projectId,
          truck_id: resolvedTruckInfo?.truck_id || truck?.id || null,
          company_id: profile.company_id,
          fault_codes: resolvedFaultCodes,
          complaint: resolvedComplaint,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(newSession.id);
      await addInitialGreeting(newSession.id);
    } catch (error) {
      console.error('Error creating session:', error);
      addLocalGreeting();
    }
  };

  const addInitialGreeting = async (sessId) => {
    const greeting = buildFormattedGreeting();
    
    try {
      const { data: savedMessage, error } = await supabase
        .from('diagnostic_chat_messages')
        .insert({
          session_id: sessId,
          company_id: profile.company_id,
          role: 'assistant',
          content: greeting,
          sources: []
        })
        .select()
        .single();

      if (error) throw error;

      setMessages([{
        id: savedMessage.id,
        role: 'assistant',
        content: greeting,
        timestamp: savedMessage.created_at,
        sources: []
      }]);
    } catch (error) {
      console.error('Error saving greeting:', error);
      addLocalGreeting();
    }
  };

  const addLocalGreeting = () => {
    const greeting = buildFormattedGreeting();
    
    setMessages([{
      role: 'assistant',
      content: greeting,
      timestamp: new Date().toISOString(),
      sources: []
    }]);
  };

  const saveMessage = async (role, content, sources = []) => {
    if (!sessionId || !profile?.company_id) return null;

    try {
      const { data, error } = await supabase
        .from('diagnostic_chat_messages')
        .insert({
          session_id: sessionId,
          company_id: profile.company_id,
          role,
          content,
          sources
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userContent = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    // Save user message to database
    const savedUserMsg = await saveMessage('user', userContent, []);
    
    const userMessage = {
      id: savedUserMsg?.id,
      role: 'user',
      content: userContent,
      timestamp: savedUserMsg?.created_at || new Date().toISOString(),
      sources: []
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Build query with truck context for better RAG results
      const truckContext = buildTruckContext();
      const contextualQuery = truckContext 
        ? `[Vehicle Context: ${truckContext}]\n\nUser Question: ${userContent}`
        : userContent;

      // Call RAG Feeder edge function
      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'chat',
          query: contextualQuery,
          companyId: profile?.company_id,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
          vehicleContext: {
            year: resolvedTruckInfo?.year,
            make: resolvedTruckInfo?.make,
            model: resolvedTruckInfo?.model,
            engine: resolvedTruckInfo?.engine_model,
            vin: resolvedTruckInfo?.vin,
            odometer: resolvedTruckInfo?.odometer_mi,
            faultCodes: resolvedFaultCodes,
            complaint: resolvedComplaint
          }
        },
      });

      if (error) throw error;

      const aiContent = data.response || data.answer || "I couldn't find specific information in the knowledge base for that question.";
      const sources = data.sources || [];

      // Save AI response to database
      const savedAiMsg = await saveMessage('assistant', aiContent, sources);

      const aiMessage = {
        id: savedAiMsg?.id,
        role: 'assistant',
        content: aiContent,
        timestamp: savedAiMsg?.created_at || new Date().toISOString(),
        sources
      };
      setMessages(prev => [...prev, aiMessage]);

      // Auto-play TTS using browser speech synthesis
      if (ttsEnabled && aiContent) {
        speakText(aiContent);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = "Sorry, I'm having trouble connecting to the knowledge base. Please try again.";
      
      await saveMessage('assistant', errorMessage, []);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString(),
        sources: []
      }]);
      
      if (ttsEnabled) {
        speakText(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Voice to text functionality
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

        try {
          setIsLoading(true);
          const response = await voiceAPI.transcribe(audioBlob);
          
          if (response.data?.text) {
            setInputMessage(prev => prev + (prev ? ' ' : '') + response.data.text);
          }
        } catch (error) {
          console.error('Error transcribing audio:', error);
        } finally {
          setIsLoading(false);
          stream.getTracks().forEach(track => track.stop());
        }
      });

      mediaRecorder.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 10000);

      window.currentMediaRecorder = mediaRecorder;

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check your browser permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (window.currentMediaRecorder && window.currentMediaRecorder.state === 'recording') {
      window.currentMediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Note: TTS is now handled by useBrowserTTS hook - speakText() and stopAudioPlayback()

  // Image upload and analysis
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      analyzeImage(file);
    }
  };

  const analyzeImage = async (imageFile) => {
    setIsAnalyzingImage(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockAnalysis = `I can see the image you uploaded. Based on the visual inspection:
- Components appear to be in good condition
- No obvious signs of damage or wear
- Connections look secure

Can you provide more details about what specific issue you're experiencing?`;

      const content = `📷 Image Analysis:\n\n${mockAnalysis}`;
      await saveMessage('assistant', content, []);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        imageUrl: URL.createObjectURL(imageFile),
        sources: []
      }]);

    } catch (error) {
      console.error('Error analyzing image:', error);
      const errorContent = "I'm having trouble analyzing that image. Can you describe what you see?";
      await saveMessage('assistant', errorContent, []);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
        sources: []
      }]);
    } finally {
      setIsAnalyzingImage(false);
      setSelectedImage(null);
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  // Feedback handlers
  const handleFeedbackRating = async (messageIndex, rating) => {
    const message = messages[messageIndex];
    
    setMessageFeedback(prev => ({
      ...prev,
      [messageIndex]: { 
        ...prev[messageIndex], 
        rating, 
        showInput: rating === 'down'
      }
    }));

    if (rating === 'up') {
      await submitFeedback(messageIndex, rating, '');
    }
  };

  const submitFeedback = async (messageIndex, rating, comment) => {
    const message = messages[messageIndex];
    
    try {
      // Update message in database with feedback
      if (message.id) {
        await supabase
          .from('diagnostic_chat_messages')
          .update({
            feedback_rating: rating,
            feedback_comment: comment
          })
          .eq('id', message.id);
      }
      
      setMessageFeedback(prev => ({
        ...prev,
        [messageIndex]: { ...prev[messageIndex], showInput: false, submitted: true }
      }));

      toast.success('Feedback submitted');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    }
  };

  const handleFeedbackComment = (messageIndex, comment) => {
    setMessageFeedback(prev => ({
      ...prev,
      [messageIndex]: { ...prev[messageIndex], comment }
    }));
  };

  // Start new conversation
  const startNewConversation = async () => {
    if (!profile?.company_id) return;
    
    try {
      // Update old session status
      if (sessionId) {
        await supabase
          .from('diagnostic_chat_sessions')
          .update({ status: 'completed' })
          .eq('id', sessionId);
      }
      
      // Create new session
      setMessages([]);
      setSessionId(null);
      setMessageFeedback({});
      await createNewSession();
      toast.success('New conversation started');
    } catch (error) {
      console.error('Error starting new conversation:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Chat Area - Takes up 2 columns */}
      <div className="lg:col-span-2">
        <Card className="h-[700px] flex flex-col">
          <CardHeader className="border-b bg-gradient-to-r from-[#124481] to-[#1E7083]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center">
                  <Bot className="mr-2 h-5 w-5" />
                  AI Diagnostic Assistant
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    RAG Powered
                  </Badge>
                </CardTitle>
                <p className="text-white text-sm opacity-90">
                  Connected to your knowledge base • Conversations are saved
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* New Conversation button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewConversation}
                  className="text-white hover:bg-[#1E7083]"
                  title="Start new conversation"
                >
                  <History className="h-4 w-4" />
                </Button>
                
                {/* Stop Speaking Button - shows when speaking */}
                {isPlayingAudio && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopAudioPlayback}
                    className="text-white hover:bg-[#1E7083] animate-pulse"
                    title="Stop speaking"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                )}
                
                {/* TTS Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTTS}
                  className={`text-white hover:bg-[#1E7083] ${isPlayingAudio ? 'animate-pulse' : ''}`}
                  title={ttsEnabled ? "Disable auto voice (ON)" : "Enable auto voice (OFF)"}
                >
                  {ttsEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* TTS Status Indicator */}
            {ttsSupported && ttsEnabled && (
              <div className="mt-2 flex items-center gap-2 text-white/80 text-xs">
                <Volume2 className="h-3 w-3" />
                <span>Auto-voice enabled {isPlayingAudio ? '• Speaking...' : ''}</span>
              </div>
            )}
          </CardHeader>

          <CardContent ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
            {isLoadingHistory ? (
              <div className="flex justify-center items-center h-full">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading conversation...</span>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}
                  >
                    <div
                      className={`flex gap-3 max-w-[85%] min-w-0 ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-[#124481]' 
                          : 'bg-gradient-to-br from-[#1E7083] to-[#289790]'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </div>
                      
                      <div className="space-y-2 min-w-0 flex-1">
                        <div
                          className={`rounded-lg p-4 ${
                            message.role === 'user'
                              ? 'bg-[#124481] text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            {message.content}
                          </div>
                          <div className={`flex items-center justify-between mt-2 ${
                            message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                          }`}>
                            <div className="text-xs">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </div>
                            {message.role === 'assistant' && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => playTextToSpeech(message.content)}
                                  disabled={isPlayingAudio}
                                  className="h-6 px-2 text-xs hover:bg-gray-200"
                                  title="Listen to this message"
                                >
                                  <Volume2 className="h-3 w-3 mr-1" />
                                  Listen
                                </Button>
                                
                                {/* Feedback Buttons */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleFeedbackRating(index, 'up')}
                                  className={`h-6 px-2 text-xs hover:bg-green-100 ${
                                    messageFeedback[index]?.rating === 'up' ? 'bg-green-100 text-green-600' : ''
                                  }`}
                                  title="Helpful response"
                                  disabled={messageFeedback[index]?.submitted}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleFeedbackRating(index, 'down')}
                                  className={`h-6 px-2 text-xs hover:bg-red-100 ${
                                    messageFeedback[index]?.rating === 'down' ? 'bg-red-100 text-red-600' : ''
                                  }`}
                                  title="Not helpful"
                                  disabled={messageFeedback[index]?.submitted}
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {/* Feedback Comment Input */}
                          {message.role === 'assistant' && messageFeedback[index]?.showInput && (
                            <div className="mt-2 space-y-2">
                              <Input
                                placeholder="What could be improved? (optional)"
                                value={messageFeedback[index]?.comment || ''}
                                onChange={(e) => handleFeedbackComment(index, e.target.value)}
                                className="text-sm"
                              />
                              <Button
                                size="sm"
                                onClick={() => submitFeedback(index, 'down', messageFeedback[index]?.comment || '')}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Submit Feedback
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Sources from RAG */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="p-2 bg-gray-50 rounded border border-gray-200 space-y-2">
                            <p className="text-xs font-medium text-gray-600 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Sources from Knowledge Base:
                            </p>
                            {message.sources.map((source, i) => (
                              <SourceCard key={i} source={source} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 max-w-[80%]">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[#1E7083] to-[#289790]">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="rounded-lg p-4 bg-gray-100">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-[#289790]" />
                          <span className="text-gray-600">Searching knowledge base...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generate Diagnostic Summary Button */}
                {showSummaryButton && !isLoading && (
                  <div className="flex justify-center py-4">
                    <Button
                      onClick={generateDiagnosticSummary}
                      disabled={isGeneratingSummary}
                      className="bg-gradient-to-r from-[#1E7083] to-[#289790] hover:from-[#1a6373] hover:to-[#238a84] text-white shadow-md"
                    >
                      {isGeneratingSummary ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating Summary...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Diagnostic Summary
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Input Area */}
          <div className="border-t p-4">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            
            <div className="flex gap-2">
              <div className="flex flex-col gap-2">
                {/* Voice button */}
                <Button
                  type="button"
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={isLoading || isAnalyzingImage || isLoadingHistory}
                  variant="outline"
                  className={`${isRecording ? 'bg-red-50 border-red-300' : ''}`}
                  title="Voice to text"
                >
                  <Mic className={`h-4 w-4 ${isRecording ? 'text-red-600 animate-pulse' : ''}`} />
                </Button>
                
                {/* Image upload button */}
                <Button
                  type="button"
                  onClick={triggerImageUpload}
                  disabled={isLoading || isAnalyzingImage || isLoadingHistory}
                  variant="outline"
                  title="Upload image (part numbers, readings, etc.)"
                >
                  {isAnalyzingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Image className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about repairs, troubleshooting, or technical specs..."
                rows={2}
                className="flex-1 resize-none"
                disabled={isLoading || isAnalyzingImage || isLoadingHistory}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading || isAnalyzingImage || isLoadingHistory}
                className="bg-[#289790] hover:bg-[#1E7083]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {isRecording ? (
                <span className="text-red-600 font-semibold animate-pulse">🔴 Recording... (tap mic to stop)</span>
              ) : (
                <>Press Enter to send, Shift+Enter for new line • Conversations are automatically saved</>
              )}
            </p>
          </div>
        </Card>
      </div>

      {/* Sidebar - Diagnostic Plan & Progress */}
      <div className="lg:col-span-1 space-y-4">
        {/* Truck Context Panel - AI-Powered Intelligence */}
        {resolvedTruckInfo?.truck_id && (
          <DiagnosticContextPanel 
            truckId={resolvedTruckInfo.truck_id}
            currentFaultCodes={resolvedFaultCodes}
          />
        )}
        
        {/* Diagnostic Plan */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-[#289790] to-[#1E7083]">
            <CardTitle className="text-white text-base">Diagnostic Plan</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {diagnosticPlan ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-700">
                  {diagnosticPlan.title || "Systematic Diagnostic Procedure"}
                </div>
                <div className="space-y-2">
                  {diagnosticPlan.steps && diagnosticPlan.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 text-sm p-2 rounded ${
                        idx < capturedData.stepsCompleted
                          ? 'bg-green-50 border border-green-200'
                          : idx === capturedData.stepsCompleted
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50'
                      }`}
                    >
                      {idx < capturedData.stepsCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={idx === capturedData.stepsCompleted ? 'font-semibold' : ''}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Plan will appear once diagnostic starts...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Captured Data */}
        <Card>
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-base">Data Captured</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-semibold text-gray-700 mb-1">Readings:</div>
                {Object.keys(capturedData.readings).length > 0 ? (
                  Object.entries(capturedData.readings).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-1 border-b">
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-mono text-gray-900">{value.value}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 italic">No readings yet</div>
                )}
              </div>

              <div>
                <div className="font-semibold text-gray-700 mb-1">Parts Identified:</div>
                {capturedData.parts.length > 0 ? (
                  capturedData.parts.map((part, idx) => (
                    <div key={idx} className="py-1 border-b text-gray-900 font-mono text-xs">
                      {part.part_number || part}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 italic">No parts yet</div>
                )}
              </div>

              <div>
                <div className="font-semibold text-gray-700 mb-1">Progress:</div>
                <div className="text-gray-900">
                  {capturedData.stepsCompleted} steps completed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Truck Info */}
        <Card>
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-base">Vehicle Info</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Year:</span>
                <span className="font-semibold">{resolvedTruckInfo?.year || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Make:</span>
                <span className="font-semibold">{resolvedTruckInfo?.make || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Model:</span>
                <span className="font-semibold">{resolvedTruckInfo?.model || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Engine:</span>
                <span className="font-semibold">{resolvedTruckInfo?.engine_model || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DiagnosticChatInterface;
