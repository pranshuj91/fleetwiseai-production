import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import useEffectiveCompany from '../hooks/useEffectiveCompany';
import { Send, Bot, User, Loader2, Sparkles, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const TruckAIChat = ({ truckId, truck }) => {
  const { user, profile } = useAuth();
  const { effectiveCompanyId } = useEffectiveCompany();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const chatContainerRef = useRef(null);
  const prevMessagesLenRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const companyId = effectiveCompanyId || profile?.company_id;

  // Build truck context string
  const buildTruckContext = useCallback(() => {
    if (!truck) return '';
    const identity = truck.identity || {};
    const parts = [
      `Vehicle: ${identity.year || ''} ${identity.make || ''} ${identity.model || ''}`.trim(),
      `VIN: ${identity.vin || 'N/A'}`,
      identity.truck_number ? `Truck #: ${identity.truck_number}` : null,
      identity.odometer_mi ? `Odometer: ${identity.odometer_mi} mi` : null,
      identity.engine_hours ? `Engine Hours: ${identity.engine_hours}` : null,
      truck.engine?.manufacturer ? `Engine: ${truck.engine.manufacturer} ${truck.engine.model || ''}` : null,
    ].filter(Boolean);
    return parts.join('\n');
  }, [truck]);

  // Smooth scroll to bottom using requestAnimationFrame
  const scrollToBottom = useCallback((instant = false) => {
    if (!chatContainerRef.current) return;
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: instant ? 'instant' : 'smooth'
        });
      }
    });
  }, []);

  // Scroll only on new messages, not re-renders
  useEffect(() => {
    const currentLen = messages.length;
    const prevLen = prevMessagesLenRef.current;

    if (isInitialLoadRef.current && currentLen > 0) {
      isInitialLoadRef.current = false;
      scrollToBottom(true);
      prevMessagesLenRef.current = currentLen;
      return;
    }

    if (currentLen > prevLen && prevLen > 0) {
      scrollToBottom(false);
    }

    prevMessagesLenRef.current = currentLen;
  }, [messages, scrollToBottom]);

  // Also scroll when loading indicator appears
  useEffect(() => {
    if (loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  // Load sessions for this truck
  const fetchSessions = useCallback(async () => {
    if (!truckId || !companyId) return;
    setSessionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('truck_chat_sessions')
        .select('*')
        .eq('truck_id', truckId)
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);

      if (data?.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, [truckId, companyId, activeSessionId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Load messages for active session
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    isInitialLoadRef.current = true;
    prevMessagesLenRef.current = 0;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('truck_chat_messages')
          .select('*')
          .eq('session_id', activeSessionId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages((data || []).map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources || [],
        })));
      } catch (err) {
        console.error('Error loading messages:', err);
      }
    };

    loadMessages();
  }, [activeSessionId]);

  // Create new session
  const handleNewSession = async () => {
    if (!companyId || !user) return;
    try {
      const { data, error } = await supabase
        .from('truck_chat_sessions')
        .insert({
          truck_id: truckId,
          company_id: companyId,
          created_by: user.id,
          title: 'New Conversation',
        })
        .select()
        .single();

      if (error) throw error;
      setSessions(prev => [data, ...prev]);
      setActiveSessionId(data.id);
      setMessages([]);
    } catch (err) {
      console.error('Error creating session:', err);
      toast.error('Failed to create conversation');
    }
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    let sessionId = activeSessionId;

    if (!sessionId) {
      if (!companyId || !user) return;
      try {
        const { data, error } = await supabase
          .from('truck_chat_sessions')
          .insert({
            truck_id: truckId,
            company_id: companyId,
            created_by: user.id,
            title: input.trim().slice(0, 60),
          })
          .select()
          .single();

        if (error) throw error;
        sessionId = data.id;
        setSessions(prev => [data, ...prev]);
        setActiveSessionId(data.id);
      } catch (err) {
        console.error('Error creating session:', err);
        toast.error('Failed to start conversation');
        return;
      }
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, sources: [] }]);
    setLoading(true);

    try {
      await supabase.from('truck_chat_messages').insert({
        session_id: sessionId,
        truck_id: truckId,
        company_id: companyId,
        role: 'user',
        content: userMessage,
      });

      const [notesRes, workOrdersRes] = await Promise.all([
        supabase.from('truck_notes').select('*').eq('truck_id', truckId).order('created_at', { ascending: false }).limit(20),
        supabase.from('work_orders').select('*').eq('truck_id', truckId).order('created_at', { ascending: false }).limit(10),
      ]);

      const notes = notesRes.data || [];
      const workOrders = workOrdersRes.data || [];

      const notesContext = notes.map(n =>
        `[${new Date(n.created_at).toLocaleDateString()}] ${n.note_type}: ${n.note_text || 'Voice/Photo note'}`
      ).join('\n');

      const workOrderContext = workOrders.map(wo =>
        `[${wo.work_order_date || new Date(wo.created_at).toLocaleDateString()}] RO#${wo.work_order_number || 'N/A'}: Complaint: ${wo.complaint || 'N/A'} | Cause: ${wo.cause || 'N/A'} | Correction: ${wo.correction || 'Pending'}`
      ).join('\n');

      const vehicleContext = `${buildTruckContext()}\n\nRecent Notes:\n${notesContext || 'None'}\n\nWork Order History:\n${workOrderContext || 'None'}\n\nIMPORTANT: You are scoped to THIS truck only (VIN: ${truck?.identity?.vin}). Do NOT respond about other trucks. If asked about a different truck, politely decline and redirect to this vehicle.`;

      const { data, error } = await supabase.functions.invoke('rag-feeder', {
        body: {
          action: 'chat',
          query: userMessage,
          companyId,
          vehicleContext,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      const assistantContent = data.response || 'Unable to generate a response.';
      const sources = data.sources || [];

      await supabase.from('truck_chat_messages').insert({
        session_id: sessionId,
        truck_id: truckId,
        company_id: companyId,
        role: 'assistant',
        content: assistantContent,
        sources,
      });

      if (messages.length === 0) {
        await supabase
          .from('truck_chat_sessions')
          .update({ title: userMessage.slice(0, 60), updated_at: new Date().toISOString() })
          .eq('id', sessionId);
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: userMessage.slice(0, 60) } : s));
      } else {
        await supabase
          .from('truck_chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sessionId);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent, sources }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        sources: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteSession = async (sessionIdToDelete, e) => {
    e.stopPropagation();
    try {
      await supabase.from('truck_chat_messages').delete().eq('session_id', sessionIdToDelete);
      await supabase.from('truck_chat_sessions').delete().eq('id', sessionIdToDelete);
      setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
      if (activeSessionId === sessionIdToDelete) {
        setActiveSessionId(null);
        setMessages([]);
      }
      toast.success('Conversation deleted');
    } catch (err) {
      console.error('Error deleting session:', err);
      toast.error('Failed to delete conversation');
    }
  };

  return (
    <Card className="mb-6 border border-violet-200 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-violet-50/80 to-purple-50/60 py-3 px-4 border-b border-violet-100 flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <span className="font-semibold text-violet-700 text-lg">Truck AI Assistant</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewSession}
            className="text-violet-600 border-violet-300 hover:bg-violet-100/50"
          >
            <Plus className="mr-1 h-4 w-4" /> New Chat
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex" style={{ height: '70vh', maxHeight: '700px', minHeight: '400px' }}>
          {/* Sessions sidebar */}
          <div className="w-48 border-r border-violet-100 bg-violet-50/30 flex flex-col flex-shrink-0">
            <div className="p-2 text-xs font-medium text-violet-500 uppercase tracking-wide">Conversations</div>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-1 px-2 pb-2">
                {sessionsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-3">No conversations yet. Start one!</p>
                ) : (
                  sessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => setActiveSessionId(session.id)}
                      className={`group flex items-center gap-1 px-2 py-2 rounded-md cursor-pointer text-xs transition-colors ${
                        activeSessionId === session.id
                          ? 'bg-violet-200/60 text-violet-800 font-medium'
                          : 'hover:bg-violet-100/50 text-gray-600'
                      }`}
                    >
                      <MessageSquare className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate flex-1">{session.title || 'Untitled'}</span>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages - native scrollable div instead of ScrollArea */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 min-h-0"
            >
              <div className="space-y-4">
                {messages.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <Bot className="h-10 w-10 text-violet-300 mb-3" />
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Ask me anything about this truck — service history, diagnostics, maintenance recommendations, and more.
                    </p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-violet-600" />
                      </div>
                    )}
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          message.role === 'user'
                            ? 'bg-[#124481] text-white'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.sources?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {message.sources.map((s, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] text-violet-600 border-violet-200">
                              {s.title}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#124481] flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-violet-600" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input - sticky at bottom */}
            <div className="p-3 border-t border-violet-100 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about this truck..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-[#124481] hover:bg-[#1E7083]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TruckAIChat;
