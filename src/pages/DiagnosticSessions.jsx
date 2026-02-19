import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import Navigation from '../components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, Bot, Calendar, User, Truck, MessageSquare, 
  ChevronRight, Loader2, Filter, X
} from 'lucide-react';
import { format } from 'date-fns';

const DiagnosticSessions = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVin, setSearchVin] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    if (profile?.company_id) {
      fetchSessions();
      fetchProfiles();
    }
  }, [profile?.company_id]);

  const fetchProfiles = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('company_id', profile.company_id);
      
      const map = {};
      (data || []).forEach(p => { map[p.user_id] = p.full_name || p.email || 'Unknown'; });
      setProfiles(map);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('standalone_diagnostic_sessions')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.company_id) {
      fetchSessions();
    }
  }, [statusFilter]);

  const filteredSessions = sessions.filter(s => {
    if (!searchVin) return true;
    const q = searchVin.toLowerCase();
    return (
      s.vin?.toLowerCase().includes(q) ||
      s.customer_name?.toLowerCase().includes(q) ||
      s.unit_number?.toLowerCase().includes(q)
    );
  });

  const getMessageCount = (session) => {
    return Array.isArray(session.messages) ? session.messages.length : 0;
  };

  const getLastMessage = (session) => {
    const msgs = session.messages || [];
    if (msgs.length === 0) return 'No messages yet';
    const last = msgs[msgs.length - 1];
    const content = last.content || '';
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-[#1E7083] to-[#289790] p-2 rounded-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Diagnostic Sessions</h1>
              <p className="text-sm text-muted-foreground">View past AI diagnostic conversations</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by VIN, customer name, or unit number..."
                  value={searchVin}
                  onChange={(e) => setSearchVin(e.target.value)}
                  className="pl-9"
                />
                {searchVin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setSearchVin('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {['all', 'open', 'closed'].map(status => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? 'bg-[#289790] hover:bg-[#1E7083]' : ''}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#289790]" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No diagnostic sessions found</h3>
              <p className="text-muted-foreground">
                {searchVin ? 'Try a different search term' : 'Start a Quick AI Diagnostic from the Diagnostics menu'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map(session => (
              <Card 
                key={session.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/standalone-diagnostic?sessionId=${session.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-[#1E7083]/10 p-2 rounded-lg">
                        <Truck className="h-5 w-5 text-[#1E7083]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-semibold text-sm text-foreground">
                            {session.vin}
                          </span>
                          <Badge className={`text-xs ${session.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {session.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {session.customer_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {session.customer_name}
                            </span>
                          )}
                          {session.unit_number && (
                            <span>Unit: {session.unit_number}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(session.created_at), 'MMM dd, yyyy h:mm a')}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {profiles[session.created_by] || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {getMessageCount(session)} messages
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {getLastMessage(session)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticSessions;
