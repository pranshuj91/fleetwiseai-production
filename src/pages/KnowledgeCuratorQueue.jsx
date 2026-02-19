import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, Forward, BookOpen, Building2, FileText, User, Calendar, MessageSquare, Shield, Inbox } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import Navigation from '../components/Navigation';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const KnowledgeCuratorQueue = () => {
  const { user, profile } = useAuth();
  const { isMasterAdmin, isCompanyAdmin, isOfficeManager, getRole } = usePermissions();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [confirmForward, setConfirmForward] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);

  const role = getRole();
  const isSuperAdmin = isMasterAdmin();
  const isCompAdmin = isCompanyAdmin() && !isSuperAdmin;
  const isOfficeManagerRole = isOfficeManager();
  const canSeeCompanyQueue = isCompAdmin || isOfficeManagerRole;
  const isRegularUser = !isSuperAdmin && !isCompAdmin && !isOfficeManagerRole;

  useEffect(() => { fetchSubmissions(); }, [filter]);

  useEffect(() => {
    const channel = supabase
      .channel('knowledge-curator-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_submissions' }, () => {
        fetchSubmissions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filter]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      let query = supabase.from('knowledge_submissions').select('*, companies:company_id(id, name)');
      if (isSuperAdmin) {
        if (filter === 'pending') query = query.eq('status', 'pending_super_admin');
        else if (filter === 'approved') query = query.eq('status', 'approved_final');
        else if (filter === 'rejected') query = query.eq('status', 'rejected_by_super_admin');
        else query = query.in('status', ['pending_super_admin', 'approved_final', 'rejected_by_super_admin']);
      } else if (canSeeCompanyQueue) {
        if (filter === 'pending') query = query.eq('status', 'pending_company_admin');
        else if (filter === 'forwarded') query = query.eq('status', 'pending_super_admin');
        else if (filter === 'approved') query = query.eq('status', 'approved_final');
        else if (filter === 'rejected') query = query.in('status', ['rejected_by_company_admin', 'rejected_by_super_admin']);
      } else {
        if (filter === 'pending') query = query.in('status', ['pending_company_admin', 'pending_super_admin']);
        else if (filter === 'approved') query = query.eq('status', 'approved_final');
        else if (filter === 'rejected') query = query.in('status', ['rejected_by_company_admin', 'rejected_by_super_admin']);
      }
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
    } finally { setLoading(false); }
  };

  const handleForward = async (submissionId) => {
    try {
      setProcessing(true);
      const { error } = await supabase.from('knowledge_submissions').update({
        status: 'pending_super_admin',
        company_admin_id: user.id,
        company_admin_name: profile?.full_name || profile?.username || user.email,
        company_admin_reviewed_at: new Date().toISOString(),
        company_admin_notes: reviewNotes || null,
      }).eq('id', submissionId);
      if (error) throw error;
      toast.success('Forwarded to Super Admin for final review');
      setSelectedSubmission(null);
      setReviewNotes('');
      setConfirmForward(false);
      fetchSubmissions();
    } catch (error) {
      console.error('Error forwarding:', error);
      toast.error('Failed to forward submission');
    } finally { setProcessing(false); }
  };

  const handleCompanyReject = async (submissionId) => {
    if (!rejectionReason.trim()) { toast.error('Rejection reason is required'); return; }
    try {
      setProcessing(true);
      const { error } = await supabase.from('knowledge_submissions').update({
        status: 'rejected_by_company_admin',
        company_admin_id: user.id,
        company_admin_name: profile?.full_name || profile?.username || user.email,
        company_admin_reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      }).eq('id', submissionId);
      if (error) throw error;
      toast.success('Submission rejected');
      setSelectedSubmission(null);
      setRejectionReason('');
      setShowRejectDialog(false);
      fetchSubmissions();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject submission');
    } finally { setProcessing(false); }
  };

  const handleFinalApprove = async (submissionId) => {
    try {
      setProcessing(true);
      const { error } = await supabase.from('knowledge_submissions').update({
        status: 'approved_final',
        super_admin_id: user.id,
        super_admin_reviewed_at: new Date().toISOString(),
        super_admin_notes: reviewNotes || null,
      }).eq('id', submissionId);
      if (error) throw error;
      toast.success('Knowledge approved (final)');
      setSelectedSubmission(null);
      setReviewNotes('');
      setConfirmApprove(false);
      fetchSubmissions();
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve submission');
    } finally { setProcessing(false); }
  };

  const handleSuperReject = async (submissionId) => {
    if (!rejectionReason.trim()) { toast.error('Rejection reason is required'); return; }
    try {
      setProcessing(true);
      const { error } = await supabase.from('knowledge_submissions').update({
        status: 'rejected_by_super_admin',
        super_admin_id: user.id,
        super_admin_reviewed_at: new Date().toISOString(),
        super_admin_notes: reviewNotes || null,
        rejection_reason: rejectionReason,
      }).eq('id', submissionId);
      if (error) throw error;
      toast.success('Submission rejected');
      setSelectedSubmission(null);
      setRejectionReason('');
      setShowRejectDialog(false);
      fetchSubmissions();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject submission');
    } finally { setProcessing(false); }
  };

  const getFilterTabs = () => {
    if (isSuperAdmin) {
      return [
        { key: 'pending', label: 'Pending' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' },
        { key: 'all', label: 'All' },
      ];
    }
    if (canSeeCompanyQueue) {
      return [
        { key: 'pending', label: 'Pending' },
        { key: 'forwarded', label: 'Forwarded' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' },
        { key: 'all', label: 'All' },
      ];
    }
    return [
      { key: 'pending', label: 'Pending' },
      { key: 'approved', label: 'Approved' },
      { key: 'rejected', label: 'Rejected' },
      { key: 'all', label: 'All' },
    ];
  };

  const allSubmissionsForCounts = submissions; // current filtered set
  const tabCounts = useMemo(() => {
    // We only have the current filter's data, so show count for active tab
    return { [filter]: submissions.length };
  }, [submissions, filter]);

  const statusConfig = {
    pending_company_admin: { label: 'Pending', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    pending_super_admin: { label: 'Forwarded', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    approved_final: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected_by_company_admin: { label: 'Rejected – Company Admin', color: 'bg-red-50 text-red-600 border-red-200' },
    rejected_by_super_admin: { label: 'Rejected – Super Admin', color: 'bg-red-50 text-red-600 border-red-200' },
  };

  const categoryConfig = {
    triage: { color: 'bg-purple-50 text-purple-700 border-purple-200' },
    diagnosis: { color: 'bg-blue-50 text-blue-700 border-blue-200' },
    correction: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    safety: { color: 'bg-amber-50 text-amber-700 border-amber-200' },
    parts: { color: 'bg-orange-50 text-orange-700 border-orange-200' },
    reference: { color: 'bg-slate-50 text-slate-600 border-slate-200' },
  };

  const getStatusBadge = (status) => {
    const cfg = statusConfig[status] || { label: status, color: 'bg-muted text-muted-foreground' };
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  const getCategoryBadge = (category) => {
    const cfg = categoryConfig[category] || { color: 'bg-muted text-muted-foreground border-border' };
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cfg.color}`}>
        {category}
      </span>
    );
  };

  const sub = selectedSubmission;

  return (
    <>
      <Navigation />
      <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Knowledge Curator</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSuperAdmin ? 'Final review of forwarded knowledge submissions' :
               isCompAdmin ? 'Review and forward employee knowledge submissions' :
               isOfficeManagerRole ? 'Monitor employee knowledge submissions' :
               'Track your knowledge submissions'}
            </p>
          </div>
          {!isSuperAdmin && (
            <Button onClick={() => navigate('/knowledge/submit')} size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Submit Knowledge
            </Button>
          )}
        </div>

        {/* Segmented Filter Control */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          {getFilterTabs().map(tab => (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); setSelectedSubmission(null); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                filter === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {filter === tab.key && submissions.length > 0 && (
                <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                  {submissions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 2-Column Content */}
        <div className="flex gap-0 min-h-[calc(100vh-240px)]">
          {/* LEFT – Submission List (35%) */}
          <div className="w-[35%] border-r border-border overflow-y-auto pr-0">
            <div className="space-y-0">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <div className="text-center space-y-3">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm">Loading submissions…</p>
                  </div>
                </div>
              ) : submissions.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                      <Inbox className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">No submissions</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        There are no submissions in this category yet.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                submissions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => { setSelectedSubmission(s); setShowRejectDialog(false); setReviewNotes(''); setRejectionReason(''); }}
                    className={`group cursor-pointer border-b border-border px-5 py-4 transition-all hover:bg-accent/50 ${
                      sub?.id === s.id
                        ? 'bg-accent/70 border-l-2 border-l-primary'
                        : 'border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 flex-1">
                        {s.title}
                      </h3>
                      {getStatusBadge(s.status)}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {getCategoryBadge(s.category)}
                      {s.tags?.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="text-[11px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{s.submitted_by_name}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="capitalize">{s.submitted_by_role}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>

                    {isSuperAdmin && s.companies?.name && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
                        <Building2 className="h-3 w-3" />
                        <span className="font-medium">{s.companies.name}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT – Detail Panel (65%) */}
          <div className="w-[65%] overflow-y-auto pl-8">
            {sub ? (
              <div className="space-y-6 pb-32">
                {/* Section 1: Header */}
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-foreground tracking-tight">{sub.title}</h2>
                      <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {sub.submitted_by_name}
                        </span>
                        <span className="flex items-center gap-1.5 capitalize">
                          <Shield className="h-3.5 w-3.5" />
                          {sub.submitted_by_role}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' · '}
                          {new Date(sub.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(sub.status)}
                  </div>

                  {isSuperAdmin && sub.companies?.name && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">{sub.companies.name}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Section 2: Knowledge Content */}
                <Card className="border border-border shadow-sm">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getCategoryBadge(sub.category)}
                      {sub.tags?.map((tag, idx) => (
                        <span key={idx} className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                        Content
                      </label>
                      <div className="bg-muted/50 rounded-lg p-5 max-h-72 overflow-y-auto">
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{sub.content}</p>
                      </div>
                    </div>

                    {sub.source && (
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                          Source
                        </label>
                        <p className="text-sm text-muted-foreground">{sub.source}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Section 3: Review Information */}
                {(sub.company_admin_name || sub.super_admin_reviewed_at || sub.rejection_reason || sub.status === 'approved_final') && (
                  <div className="bg-muted/30 rounded-xl border border-border p-6 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review History</h3>

                    {sub.company_admin_name && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Company Admin Review</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {sub.company_admin_name} · {new Date(sub.company_admin_reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          {sub.company_admin_notes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">"{sub.company_admin_notes}"</p>
                          )}
                        </div>
                      </div>
                    )}

                    {sub.super_admin_reviewed_at && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Super Admin Review</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(sub.super_admin_reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          {sub.super_admin_notes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">"{sub.super_admin_notes}"</p>
                          )}
                        </div>
                      </div>
                    )}

                    {sub.rejection_reason && (
                      <div className="bg-red-50/60 border border-red-100 rounded-lg p-4 mt-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1.5">
                          Reason provided by {sub.status === 'rejected_by_super_admin' ? 'Super Admin' : 'Company Admin'}
                        </p>
                        <p className="text-sm text-red-600/80 italic">{sub.rejection_reason}</p>
                      </div>
                    )}

                    {sub.status === 'approved_final' && (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">Approved for AI / RAG Training (Future Phase)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Fixed Action Bar */}
                {/* Company Admin Pending Actions */}
                {isCompAdmin && sub.status === 'pending_company_admin' && !showRejectDialog && (
                  <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-8 py-4 z-50">
                    <div className="max-w-[1440px] mx-auto flex items-center justify-between">
                      <div>
                        <Textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          rows={1}
                          placeholder="Review notes for Super Admin (optional)…"
                          className="w-[400px] resize-none text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => setShowRejectDialog(true)}
                          disabled={processing}
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => setConfirmForward(true)}
                          disabled={processing}
                        >
                          <Forward className="h-4 w-4 mr-2" />
                          Forward to Super Admin
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Company Admin Reject Inline */}
                {isCompAdmin && showRejectDialog && sub.status === 'pending_company_admin' && (
                  <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-8 py-4 z-50">
                    <div className="max-w-[1440px] mx-auto flex items-end gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground block mb-1.5">Rejection reason <span className="text-red-500">*</span></label>
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={2}
                          placeholder="Explain why this submission is being rejected…"
                          className="resize-none text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-3 pb-0.5">
                        <Button onClick={() => setShowRejectDialog(false)} variant="outline">Cancel</Button>
                        <Button
                          onClick={() => handleCompanyReject(sub.id)}
                          disabled={processing || !rejectionReason.trim()}
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Super Admin Pending Actions */}
                {isSuperAdmin && sub.status === 'pending_super_admin' && !showRejectDialog && (
                  <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-8 py-4 z-50">
                    <div className="max-w-[1440px] mx-auto flex items-center justify-between">
                      <div>
                        <Textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          rows={1}
                          placeholder="Review notes (optional)…"
                          className="w-[400px] resize-none text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => setShowRejectDialog(true)}
                          disabled={processing}
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => setConfirmApprove(true)}
                          disabled={processing}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Final Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Super Admin Reject Inline */}
                {isSuperAdmin && showRejectDialog && sub.status === 'pending_super_admin' && (
                  <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-8 py-4 z-50">
                    <div className="max-w-[1440px] mx-auto flex items-end gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-foreground block mb-1.5">Rejection reason <span className="text-red-500">*</span></label>
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={2}
                          placeholder="Explain why this submission is being rejected…"
                          className="resize-none text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-3 pb-0.5">
                        <Button onClick={() => setShowRejectDialog(false)} variant="outline">Cancel</Button>
                        <Button
                          onClick={() => handleSuperReject(sub.id)}
                          disabled={processing || !rejectionReason.trim()}
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                    <FileText className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">No submission selected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select a submission from the list to view details.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <AlertDialog open={confirmForward} onOpenChange={setConfirmForward}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forward to Super Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              This will forward "{sub?.title}" for final review by a Super Admin. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => sub && handleForward(sub.id)} disabled={processing}>
              Forward
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark "{sub?.title}" as finally approved. It will be available for future AI/RAG training.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => sub && handleFinalApprove(sub.id)} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default KnowledgeCuratorQueue;
