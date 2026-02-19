import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent } from './ui/dialog';
import { 
  History, StickyNote, FileText, Brain, Mic, Camera,
  Loader2, Clock, User, ChevronDown, ChevronUp, Bell, 
  Image as ImageIcon, Play, Calendar, X, Volume2
} from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, isValid } from 'date-fns';

const TruckIntelligenceTimeline = ({ truckId }) => {
  const [timelineItems, setTimelineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState(null);
  const [imagePopupUrl, setImagePopupUrl] = useState(null);

  useEffect(() => {
    if (truckId) {
      fetchTimelineData();
    }
  }, [truckId]);

  const fetchTimelineData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Fetch all data sources in parallel
      const [notesRes, workOrdersRes, diagnosticsRes] = await Promise.all([
        // Quick Notes from edge function
        fetch(
          `https://jdiowphmzsqvpizlwlzn.supabase.co/functions/v1/truck-notes/timeline?truck_id=${truckId}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        ).then(res => res.json()).catch(() => ({ data: [] })),
        
        // Work Orders
        supabase
          .from('work_orders')
          .select('id, work_order_number, complaint, cause, correction, status, created_at')
          .eq('truck_id', truckId)
          .order('created_at', { ascending: false })
          .limit(20),
        
        // Diagnostic Sessions
        supabase
          .from('diagnostic_chat_sessions')
          .select('id, complaint, fault_codes, summary, status, created_at')
          .eq('truck_id', truckId)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      // Process and merge all items
      const items = [];

      // Safe date parsing helper
      const safeParseDate = (dateStr) => {
        try {
          if (!dateStr) return new Date();
          const date = new Date(dateStr);
          return isValid(date) ? date : new Date();
        } catch {
          return new Date();
        }
      };

      // Add Quick Notes
      if (notesRes.data && Array.isArray(notesRes.data)) {
        notesRes.data.forEach(note => {
          items.push({
            id: note.id,
            type: 'note',
            noteType: note.note_type,
            title: getNoteTitle(note),
            preview: note.note_text || '',
            mediaUrl: note.media_url,
            photoUrl: note.photo_url,
            createdBy: note.created_by_name || 'Unknown',
            createdByRole: note.created_by_role || null,
            createdAt: safeParseDate(note.created_at),
            source: note.source,
            reminderAt: note.reminder_at,
            tags: note.tags || [],
          });
        });
      }

      // Add Work Orders
      if (workOrdersRes.data) {
        workOrdersRes.data.forEach(wo => {
          items.push({
            id: wo.id,
            type: 'work_order',
            title: wo.work_order_number ? `RO #${wo.work_order_number}` : 'Work Order',
            preview: wo.complaint || wo.cause || wo.correction || 'No description',
            status: wo.status,
            createdBy: 'System',
            createdAt: safeParseDate(wo.created_at),
          });
        });
      }

      // Add Diagnostic Sessions
      if (diagnosticsRes.data) {
        diagnosticsRes.data.forEach(diag => {
          items.push({
            id: diag.id,
            type: 'diagnostic',
            title: 'AI Diagnostic',
            preview: diag.summary || diag.complaint || 'Diagnostic session',
            faultCodes: diag.fault_codes ?? [],
            status: diag.status,
            createdBy: 'AI Assistant',
            createdAt: safeParseDate(diag.created_at),
          });
        });
      }

      // Sort by date (latest first)
      items.sort((a, b) => b.createdAt - a.createdAt);

      setTimelineItems(items);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      setError('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  const getNoteTitle = (note) => {
    switch (note.note_type) {
      case 'voice':
        return 'Voice Note';
      case 'photo':
        return 'Photo Note';
      default:
        return 'Quick Note';
    }
  };

  const getTypeIcon = (item) => {
    switch (item.type) {
      case 'note':
        if (item.noteType === 'voice') return <Mic className="h-4 w-4" />;
        if (item.noteType === 'photo') return <Camera className="h-4 w-4" />;
        return <StickyNote className="h-4 w-4" />;
      case 'work_order':
        return <FileText className="h-4 w-4" />;
      case 'diagnostic':
        return <Brain className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getTypeColor = (item) => {
    switch (item.type) {
      case 'note':
        return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'work_order':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'diagnostic':
        return 'bg-purple-100 text-purple-600 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getTypeBadge = (item) => {
    switch (item.type) {
      case 'note':
        if (item.noteType === 'voice') {
          return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Voice</Badge>;
        }
        if (item.noteType === 'photo') {
          return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Photo</Badge>;
        }
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Note</Badge>;
      case 'work_order':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Work Order</Badge>;
      case 'diagnostic':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">AI Diagnostic</Badge>;
      default:
        return null;
    }
  };

  const formatTimestamp = (date) => {
    try {
      if (!date || !isValid(date)) {
        return 'Unknown date';
      }
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 1) {
        return formatDistanceToNow(date, { addSuffix: true });
      } else if (diffDays < 7) {
        return format(date, "EEEE 'at' h:mm a");
      } else {
        return format(date, "MMM d, yyyy 'at' h:mm a");
      }
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Unknown date';
    }
  };

  // Render Quick Note with enhanced boxed visibility
  const renderQuickNoteContent = (item) => {
    const hasPhoto = (item.noteType === 'photo' && item.mediaUrl) || item.photoUrl;
    const hasVoice = item.noteType === 'voice' && item.mediaUrl;
    const photoSrc = item.photoUrl || (item.noteType === 'photo' ? item.mediaUrl : null);
    
    return (
      <div className="flex-1 min-w-0 pb-4">
        {/* Header with title and badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-base">{item.title}</span>
            {getTypeBadge(item)}
            {item.source && item.source !== 'manual' && (
              <Badge variant="secondary" className="text-xs capitalize">
                {item.source}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Boxed content area - Notes on left, Photo on right */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className={`flex ${hasPhoto ? 'flex-row' : 'flex-col'}`}>
            {/* Left side: Note text and voice recording */}
            <div className={`flex-1 p-4 ${hasPhoto ? 'border-r border-gray-100' : ''}`}>
              {/* Note text */}
              {item.preview && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    <StickyNote className="h-3.5 w-3.5" />
                    Note
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-md p-3">
                    {item.preview}
                  </p>
                </div>
              )}
              
              {/* Voice Recording */}
              {hasVoice && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    <Volume2 className="h-3.5 w-3.5" />
                    Voice Recording
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-100">
                    <audio 
                      controls 
                      preload="auto"
                      className="w-full h-10"
                      style={{ minWidth: '200px' }}
                    >
                      <source src={item.mediaUrl} type="audio/webm" />
                      <source src={item.mediaUrl} type="audio/ogg" />
                      <source src={item.mediaUrl} type="audio/mp4" />
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                </div>
              )}
              
              {/* Empty state if no content */}
              {!item.preview && !hasVoice && (
                <p className="text-sm text-muted-foreground italic">No text note</p>
              )}
            </div>
            
            {/* Right side: Photo */}
            {hasPhoto && (
              <div className="w-40 md:w-48 p-3 bg-gray-50 flex flex-col">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Photo
                </div>
                <div 
                  className="flex-1 flex items-center justify-center cursor-pointer group"
                  onClick={() => setImagePopupUrl(photoSrc)}
                >
                  <div className="relative w-full aspect-square bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                    <img 
                      src={photoSrc} 
                      alt="Note attachment" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden absolute inset-0 items-center justify-center bg-gray-100 text-gray-400">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs bg-black/50 px-2 py-1 rounded">
                        Click to enlarge
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Tags inside the box */}
          {item.tags && item.tags.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Metadata footer - improved UI */}
        <div className="flex items-center flex-wrap gap-3 text-sm pt-3 mt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full">
            <User className="h-4 w-4 text-primary" />
            <span className="text-gray-700">
              <span className="font-semibold">Created by:</span>{' '}
              <span className="font-medium text-gray-900">{item.createdBy}</span>
              {item.createdByRole && (
                <span className="text-primary ml-1">({item.createdByRole})</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTimestamp(item.createdAt)}</span>
          </div>
          {item.reminderAt && (
            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full font-medium">
              <Bell className="h-3.5 w-3.5" />
              <span>Reminder: {format(new Date(item.reminderAt), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render other item types (work order, diagnostic)
  const renderOtherContent = (item) => {
    return (
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{item.title}</span>
            {getTypeBadge(item)}
            {item.status && (
              <Badge variant="secondary" className="text-xs capitalize">
                {item.status}
              </Badge>
            )}
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
          {item.preview}
        </p>
        
        {item.faultCodes && item.faultCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.faultCodes.slice(0, 3).map((code, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                {code}
              </Badge>
            ))}
            {item.faultCodes.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{item.faultCodes.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {item.createdBy}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimestamp(item.createdAt)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader 
        className="bg-gradient-to-r from-[#124481] to-[#289790] text-white cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Truck Intelligence Timeline
            {!loading && (
              <Badge className="ml-3 bg-white/20 text-white">
                {timelineItems.length} items
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading timeline...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchTimelineData} className="mt-2">
                Retry
              </Button>
            </div>
          ) : timelineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No activity recorded yet</p>
              <p className="text-sm">Notes, work orders, and diagnostics will appear here</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                
                <div className="space-y-4">
                  {timelineItems.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${getTypeColor(item)}`}>
                        {getTypeIcon(item)}
                      </div>
                      
                      {/* Content - different rendering for notes vs other types */}
                      {item.type === 'note' ? renderQuickNoteContent(item) : renderOtherContent(item)}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
      
      {/* Image Popup Dialog */}
      <Dialog open={!!imagePopupUrl} onOpenChange={() => setImagePopupUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2 bg-black/95">
          <div className="relative flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
              onClick={() => setImagePopupUrl(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            {imagePopupUrl && (
              <img 
                src={imagePopupUrl} 
                alt="Full size attachment" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TruckIntelligenceTimeline;
