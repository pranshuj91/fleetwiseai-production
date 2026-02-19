import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import Navigation from '../components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Bot, Send, Loader2, User, Truck, Phone, Hash, Gauge, 
  ArrowLeft, MessageSquare, X, RotateCcw
} from 'lucide-react';

const StandaloneDiagnostic = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Session metadata from URL params
  const sessionId = searchParams.get('sessionId');
  const [sessionData, setSessionData] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const messagesEndRef = useRef(null);

  // Load session on mount
  useEffect(() => {
    if (sessionId && profile?.company_id) {
      loadSession();
    }
  }, [sessionId, profile?.company_id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSession = async () => {
    setIsLoadingSession(true);
    try {
      const { data, error } = await supabase
        .from('standalone_diagnostic_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      setSessionData(data);
      const loadedMessages = data.messages || [];
      
      if (loadedMessages.length === 0) {
        // Add initial greeting
        const greeting = {
          role: 'assistant',
          content: `Hello! I'm your AI Diagnostic Assistant. I have the following vehicle context:\n\n🔖 **VIN:** ${data.vin}${data.customer_name ? `\n👤 **Customer:** ${data.customer_name}` : ''}${data.unit_number ? `\n🔢 **Unit #:** ${data.unit_number}` : ''}${data.odometer ? `\n📏 **Odometer:** ${data.odometer.toLocaleString()} mi` : ''}\n\nHow can I help you diagnose this vehicle? Describe the issue or ask any question.`,
          timestamp: new Date().toISOString()
        };
        const newMessages = [greeting];
        setMessages(newMessages);
        await saveMessages(newMessages);
      } else {
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Failed to load diagnostic session');
      navigate('/diagnostic-sessions');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const saveMessages = async (msgs) => {
    if (!sessionId) return;
    try {
      await supabase
        .from('standalone_diagnostic_sessions')
        .update({ messages: msgs, updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMsg = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build vehicle context for the AI
      const vehicleContext = `Context: Technician is working on vehicle VIN: ${sessionData?.vin}${sessionData?.customer_name ? `, Customer: ${sessionData.customer_name}` : ''}${sessionData?.unit_number ? `, Unit #: ${sessionData.unit_number}` : ''}${sessionData?.odometer ? `, Odometer: ${sessionData.odometer} mi` : ''}`;

      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'chat',
          query: userMsg.content,
          companyId: profile?.company_id,
          conversationHistory: updatedMessages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
          vehicleContext: vehicleContext
        },
      });

      if (error) throw error;

      const aiMsg = {
        role: 'assistant',
        content: data.response || data.answer || "I couldn't process that request.",
        timestamp: new Date().toISOString(),
        sources: data.sources || []
      };

      const allMessages = [...updatedMessages, aiMsg];
      setMessages(allMessages);
      await saveMessages(allMessages);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString()
      };
      const allMessages = [...updatedMessages, errorMsg];
      setMessages(allMessages);
      await saveMessages(allMessages);
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

  const handleCloseSession = async () => {
    if (!sessionId) return;
    try {
      await supabase
        .from('standalone_diagnostic_sessions')
        .update({ status: 'closed' })
        .eq('id', sessionId);
      setSessionData(prev => ({ ...prev, status: 'closed' }));
      toast.success('Session closed');
    } catch (error) {
      toast.error('Failed to close session');
    }
  };

  const handleReopenSession = async () => {
    if (!sessionId) return;
    try {
      await supabase
        .from('standalone_diagnostic_sessions')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', sessionId);
      setSessionData(prev => ({ ...prev, status: 'open' }));
      toast.success('Session reopened');
    } catch (error) {
      toast.error('Failed to reopen session');
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[#289790]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      {/* Header bar */}
      <div className="bg-gradient-to-r from-[#1E7083] to-[#289790] text-white px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20"
              onClick={() => navigate('/diagnostic-sessions')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="h-6 w-px bg-white/30" />
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">Standalone AI Diagnostic</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-white/10 text-white border-white/30 font-mono text-xs">
              VIN: {sessionData?.vin}
            </Badge>
            {sessionData?.customer_name && (
              <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-xs">
                {sessionData.customer_name}
              </Badge>
            )}
            {sessionData?.unit_number && (
              <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-xs">
                Unit: {sessionData.unit_number}
              </Badge>
            )}
            <Badge className={`text-xs ${sessionData?.status === 'open' ? 'bg-green-500' : 'bg-gray-500'}`}>
              {sessionData?.status === 'open' ? 'Active' : 'Closed'}
            </Badge>
            {sessionData?.status === 'open' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20"
                onClick={handleCloseSession}
              >
                <X className="h-4 w-4 mr-1" />
                Close Session
              </Button>
            )}
            {sessionData?.status === 'closed' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20 border border-white/30"
                onClick={handleReopenSession}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reopen Session
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chat area - full width */}
      <div className="flex-1 flex flex-col container mx-auto max-w-4xl px-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          {messages.map((message, index) => (
            <div
              key={index}
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
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-[#124481] flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-[#1E7083] flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {sessionData?.status === 'open' && (
          <div className="border-t py-4">
            <div className="flex items-end gap-2">
              <Textarea
                placeholder="Describe the issue or ask a diagnostic question..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                className="flex-1 min-h-[48px] max-h-[120px] resize-none"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="bg-[#289790] hover:bg-[#1E7083] h-[48px] px-4"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              AI responses are based on your uploaded knowledge base documents
            </p>
          </div>
        )}
        {sessionData?.status === 'closed' && (
          <div className="border-t py-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">This session has been closed. View-only mode.</p>
            <Button
              onClick={handleReopenSession}
              className="bg-[#289790] hover:bg-[#1E7083]"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reopen Diagnostic Session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StandaloneDiagnostic;
