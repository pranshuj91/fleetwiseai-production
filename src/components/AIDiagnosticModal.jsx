import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Send, Loader2, Bot, Volume2, VolumeX, Settings, 
  Mic, Image, RefreshCw, Sparkles
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const AIDiagnosticModal = ({ 
  open, 
  onOpenChange, 
  task,
  workOrderId,
  truck,
  complaint
}) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [diagnosticPlan, setDiagnosticPlan] = useState(null);
  const [capturedData, setCapturedData] = useState({
    readings: {},
    parts: [],
    stepsCompleted: 0
  });
  const messagesEndRef = useRef(null);
  const hasAutoStarted = useRef(false);

  // Auto-start diagnostic when modal opens
  useEffect(() => {
    if (open && !hasAutoStarted.current && messages.length === 0) {
      hasAutoStarted.current = true;
      startDiagnostic();
    }
  }, [open]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      hasAutoStarted.current = false;
    }
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Parse user message for readings and parts
  const parseUserInput = (text) => {
    const newReadings = {};
    const newParts = [];

    // Parse voltage readings (e.g., "12.4V", "12.4 volts", "got 12.4v", "reading is 12.4 V")
    const voltagePatterns = [
      /(\d+\.?\d*)\s*(?:v|V|volts?|Volts?)\b/gi,
      /(?:voltage|reading|got|measured|shows?|is)\s*(?:is|of|:)?\s*(\d+\.?\d*)\s*(?:v|V|volts?)?/gi
    ];
    
    voltagePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const voltage = parseFloat(match[1]);
        if (voltage >= 0 && voltage <= 50) { // Reasonable voltage range
          newReadings[`Voltage ${Object.keys(newReadings).length + 1}`] = `${voltage}V`;
        }
      }
    });

    // Parse resistance/ohms (e.g., "5.2 ohms", "resistance is 120Ω")
    const ohmPatterns = [
      /(\d+\.?\d*)\s*(?:ohms?|Ω|ohm)\b/gi,
      /(?:resistance|ohms?)\s*(?:is|of|:)?\s*(\d+\.?\d*)/gi
    ];
    
    ohmPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const resistance = parseFloat(match[1]);
        newReadings[`Resistance ${Object.keys(newReadings).filter(k => k.startsWith('Resistance')).length + 1}`] = `${resistance}Ω`;
      }
    });

    // Parse PSI readings (e.g., "45 psi", "pressure is 120 PSI")
    const psiPattern = /(\d+\.?\d*)\s*(?:psi|PSI)\b/gi;
    let psiMatch;
    while ((psiMatch = psiPattern.exec(text)) !== null) {
      const pressure = parseFloat(psiMatch[1]);
      newReadings[`Pressure ${Object.keys(newReadings).filter(k => k.startsWith('Pressure')).length + 1}`] = `${pressure} PSI`;
    }

    // Parse temperature (e.g., "200°F", "temp is 95 degrees")
    const tempPattern = /(\d+\.?\d*)\s*(?:°F|°C|degrees?|deg)\b/gi;
    let tempMatch;
    while ((tempMatch = tempPattern.exec(text)) !== null) {
      const temp = parseFloat(tempMatch[1]);
      newReadings[`Temp ${Object.keys(newReadings).filter(k => k.startsWith('Temp')).length + 1}`] = `${temp}°`;
    }

    // Parse part numbers (common patterns: alphanumeric with dashes/dots, typically 5+ chars)
    // Examples: "RE-568923", "3176789", "CAT-C15-INJ", "A23-45678"
    const partPatterns = [
      /\b(?:part\s*(?:number|#|no\.?)?\s*[:=]?\s*)([A-Z0-9][-A-Z0-9\.]{4,}[A-Z0-9])\b/gi,
      /\b(?:P\/N|PN|PART#)\s*[:=]?\s*([A-Z0-9][-A-Z0-9\.]{3,})\b/gi,
      /\b([A-Z]{2,4}[-\s]?\d{5,})\b/g, // Like "RE-568923" or "CAT 123456"
      /\b(\d{7,10})\b/g // Long numeric codes like part numbers
    ];

    partPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const part = match[1].toUpperCase().trim();
        // Avoid duplicates and filter out things that look like VINs (17 chars)
        if (part.length >= 5 && part.length !== 17 && !newParts.includes(part)) {
          newParts.push(part);
        }
      }
    });

    return { newReadings, newParts };
  };

  // Update captured data when user sends a message
  const updateCapturedData = (userText) => {
    const { newReadings, newParts } = parseUserInput(userText);
    
    if (Object.keys(newReadings).length > 0 || newParts.length > 0) {
      setCapturedData(prev => ({
        ...prev,
        readings: { ...prev.readings, ...newReadings },
        parts: [...new Set([...prev.parts, ...newParts])], // Dedupe parts
        stepsCompleted: prev.stepsCompleted + 1
      }));
      
      // Show toast for captured data
      const capturedItems = [];
      if (Object.keys(newReadings).length > 0) {
        capturedItems.push(`${Object.keys(newReadings).length} reading(s)`);
      }
      if (newParts.length > 0) {
        capturedItems.push(`${newParts.length} part(s)`);
      }
      if (capturedItems.length > 0) {
        toast.success(`Captured: ${capturedItems.join(' and ')}`);
      }
    }
  };

  const buildContext = () => {
    const parts = [];
    if (truck?.year) parts.push(`Year: ${truck.year}`);
    if (truck?.make) parts.push(`Make: ${truck.make}`);
    if (truck?.model) parts.push(`Model: ${truck.model}`);
    if (truck?.vin) parts.push(`VIN: ${truck.vin}`);
    if (truck?.odometer_miles) parts.push(`Odometer: ${truck.odometer_miles?.toLocaleString()} mi`);
    if (task?.title) parts.push(`Task: ${task.title}`);
    if (complaint) parts.push(`Complaint: ${complaint}`);
    return parts.join('\n');
  };

  const startDiagnostic = async () => {
    setIsLoading(true);
    
    // Add initial "thinking" message
    const thinkingMessage = {
      id: Date.now(),
      role: 'assistant',
      content: '',
      isThinking: true
    };
    setMessages([thinkingMessage]);

    try {
      const context = buildContext();
      const prompt = task?.title 
        ? `I need help diagnosing: ${task.title}. ${complaint ? `The complaint is: ${complaint}` : ''}`
        : `Please help me diagnose this vehicle issue. ${complaint ? `Complaint: ${complaint}` : ''}`;

      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'query',
          query: prompt,
          vehicleContext: context,
          companyId: profile?.company_id
        }
      });

      if (error) throw error;

      const responseContent = data?.response || data?.answer || 'I apologize, I couldn\'t generate a diagnostic response. Please try again.';
      
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: responseContent,
        sources: data?.sources || []
      }]);

    } catch (error) {
      console.error('Error starting diagnostic:', error);
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: 'I encountered an error starting the diagnostic. Please try again.',
        isError: true
      }]);
      toast.error('Failed to start diagnostic');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageText = inputMessage.trim();
    
    // Parse for readings and parts before sending
    updateCapturedData(messageText);

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Add thinking indicator
    const thinkingId = Date.now() + 1;
    setMessages(prev => [...prev, { id: thinkingId, role: 'assistant', content: '', isThinking: true }]);

    try {
      const context = buildContext();
      
      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'query',
          query: userMessage.content,
          vehicleContext: context,
          companyId: profile?.company_id
        }
      });

      if (error) throw error;

      const responseContent = data?.response || data?.answer || 'I couldn\'t process that request.';
      
      setMessages(prev => prev.map(m => 
        m.id === thinkingId 
          ? { ...m, content: responseContent, isThinking: false, sources: data?.sources || [] }
          : m
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== thinkingId));
      toast.error('Failed to get response');
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

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full">
          {/* Left Panel - Context */}
          <div className="w-72 border-r bg-gray-50 p-4 flex flex-col gap-4 overflow-y-auto">
            {/* Diagnostic Plan */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 bg-gradient-to-r from-[#1E7083] to-[#289790] text-white rounded-t-lg">
                <CardTitle className="text-sm font-semibold">Diagnostic Plan</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-sm text-muted-foreground">
                  {diagnosticPlan || 'Plan will appear once diagnostic starts...'}
                </p>
              </CardContent>
            </Card>

            {/* Data Captured */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Data Captured
                  {(Object.keys(capturedData.readings).length > 0 || capturedData.parts.length > 0) && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      {Object.keys(capturedData.readings).length + capturedData.parts.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Readings:</p>
                  {Object.keys(capturedData.readings).length > 0 ? (
                    <div className="space-y-1">
                      {Object.entries(capturedData.readings).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center bg-blue-50 px-2 py-1 rounded text-sm">
                          <span className="text-muted-foreground text-xs">{key}</span>
                          <span className="font-mono font-medium text-blue-700">{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No readings yet</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Parts Identified:</p>
                  {capturedData.parts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {capturedData.parts.map((part, idx) => (
                        <Badge key={idx} variant="outline" className="font-mono text-xs bg-orange-50 text-orange-700 border-orange-200">
                          {part}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No parts yet</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Progress:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#1E7083] to-[#289790] transition-all duration-300"
                        style={{ width: `${Math.min(capturedData.stepsCompleted * 20, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{capturedData.stepsCompleted} steps</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Vehicle Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year:</span>
                  <span className="font-medium">{truck?.year || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Make:</span>
                  <span className="font-medium">{truck?.make || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-medium">{truck?.model || 'N/A'}</span>
                </div>
                {truck?.vin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VIN:</span>
                    <span className="font-mono text-xs">{truck.vin.slice(-8)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Chat */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-[#1E7083] to-[#289790] text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Diagnostic Assistant</h3>
                  <p className="text-xs text-white/80">Your expert technician guiding you step-by...</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-white hover:bg-white/20"
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                >
                  {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-[#1E7083] flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div 
                    className={`max-w-[80%] rounded-xl px-4 py-3 ${
                      message.role === 'user' 
                        ? 'bg-[#1E7083] text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.isThinking ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-2">
                  <Button size="icon" variant="ghost" className="text-muted-foreground">
                    <Mic className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-muted-foreground">
                    <Image className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-muted-foreground">
                    <RefreshCw className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1 relative">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your response... (e.g., 'I got 12.4 volts' or 'Where is connector C3?')"
                    className="min-h-[80px] pr-12 resize-none"
                    disabled={isLoading}
                  />
                  <Button
                    size="icon"
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="absolute right-2 bottom-2 bg-[#1E7083] hover:bg-[#1E7083]/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIDiagnosticModal;
