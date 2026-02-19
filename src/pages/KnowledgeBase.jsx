import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BookOpen, Search, Star, TrendingUp, User, 
  ThumbsUp, Plus, Filter, Award, Loader2,
  CheckCircle, Clock, XCircle, AlertCircle, Send
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { toast } from 'sonner';

const statusConfig = {
  pending_company_admin: { label: 'Pending Admin', className: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  pending_super_admin: { label: 'Forwarded to Super Admin', className: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock },
  approved_final: { label: 'Approved', className: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
  rejected_by_company_admin: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
  rejected_by_super_admin: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
};

const KnowledgeBase = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isMasterAdmin, isCompanyAdmin, getRole } = usePermissions();
  const [articles, setArticles] = useState([]);
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('community');
  
  const [newSubmission, setNewSubmission] = useState({
    title: '',
    category: 'diagnosis',
    tags: '',
    content: '',
    source: '',
  });

  useEffect(() => {
    if (profile?.company_id || isMasterAdmin()) {
      fetchAll();
    }
  }, [filterCategory, profile?.company_id]);

  useEffect(() => {
    const channel = supabase
      .channel('knowledge-base-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_submissions' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filterCategory, profile?.company_id]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchArticles(), fetchSubmissions()]);
    setLoading(false);
  };

  const fetchArticles = async () => {
    if (!profile?.company_id && !isMasterAdmin()) return;
    try {
      let query = supabase.from('knowledge_articles').select('*').order('created_at', { ascending: false });
      if (!isMasterAdmin()) query = query.eq('company_id', profile.company_id);
      if (filterCategory !== 'all') query = query.eq('category', filterCategory);
      if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,symptoms.ilike.%${searchQuery}%,solution.ilike.%${searchQuery}%`);
      const { data, error } = await query;
      if (!error) setArticles(data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchSubmissions = async () => {
    if (!user?.id) return;
    try {
      // Approved submissions for the company
      let approvedQuery = supabase.from('knowledge_submissions').select('*').eq('status', 'approved_final').order('created_at', { ascending: false });
      if (!isMasterAdmin() && profile?.company_id) approvedQuery = approvedQuery.eq('company_id', profile.company_id);
      if (searchQuery) approvedQuery = approvedQuery.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      const { data: approved } = await approvedQuery;
      setApprovedSubmissions(approved || []);

      // My submissions
      if (!isMasterAdmin()) {
        let myQuery;
        if (isCompanyAdmin() && profile?.company_id) {
          myQuery = supabase.from('knowledge_submissions').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false });
        } else {
          myQuery = supabase.from('knowledge_submissions').select('*').eq('submitted_by', user.id).order('created_at', { ascending: false });
        }
        const { data: mine } = await myQuery;
        setMySubmissions(mine || []);
      }
    } catch (error) { console.error('Error fetching submissions:', error); }
  };

  // Submit knowledge through the approval workflow
  const handleSubmitKnowledge = async () => {
    if (!user?.id || !profile?.company_id) {
      toast.error('You must be logged in to submit knowledge');
      return;
    }
    if (!newSubmission.title || !newSubmission.content) {
      toast.error('Please fill in title and content');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('knowledge_submissions').insert({
        company_id: profile.company_id,
        submitted_by: user.id,
        submitted_by_name: profile?.full_name || profile?.username || user.email,
        submitted_by_role: getRole() || 'technician',
        title: newSubmission.title,
        content: newSubmission.content,
        category: newSubmission.category,
        tags: newSubmission.tags.split(',').map(t => t.trim()).filter(t => t),
        source: newSubmission.source || null,
        status: 'pending_company_admin',
      });
      if (error) throw error;
      
      toast.success('Knowledge submitted for admin review.');
      setShowAddModal(false);
      setNewSubmission({ title: '', category: 'diagnosis', tags: '', content: '', source: '' });
      setActiveTab('submissions');
      await fetchAll();
    } catch (error) {
      console.error('Error submitting knowledge:', error);
      toast.error('Failed to submit: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const voteArticle = async (articleId) => {
    try {
      const { data: article } = await supabase.from('knowledge_articles').select('helpful_count').eq('id', articleId).single();
      await supabase.from('knowledge_articles').update({ helpful_count: (article?.helpful_count || 0) + 1 }).eq('id', articleId);
      await fetchArticles();
      toast.success('Thanks for your feedback!');
    } catch (error) { toast.error('Failed to record vote'); }
  };

  const categories = [
    { value: 'all', label: 'All', icon: BookOpen },
    { value: 'diagnostic_tip', label: 'Diagnostic Tips', icon: TrendingUp },
    { value: 'common_fix', label: 'Common Fixes', icon: Star },
    { value: 'troubleshooting', label: 'Troubleshooting', icon: Search },
    { value: 'best_practice', label: 'Best Practices', icon: Award }
  ];

  const renderSubmissionCard = (submission, showStatus = false) => {
    const config = statusConfig[submission.status] || {};
    const StatusIcon = config.icon || AlertCircle;
    return (
      <Card key={submission.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground mb-2">{submission.title}</h3>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {submission.category && (
                  <Badge className="bg-[#124481]">{submission.category.replace('_', ' ')}</Badge>
                )}
                {submission.tags?.length > 0 && submission.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
                {showStatus && config.label && (
                  <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{submission.submitted_by_name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(submission.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{submission.content}</p>

          {/* Rejection reason */}
          {showStatus && submission.rejection_reason && (submission.status === 'rejected_by_company_admin' || submission.status === 'rejected_by_super_admin') && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
              <p className="text-sm text-red-700">{submission.rejection_reason}</p>
            </div>
          )}

          {showStatus && (
            <div className="flex items-center gap-4 pt-3 border-t text-xs text-muted-foreground">
              {submission.company_admin_name && submission.company_admin_reviewed_at && (
                <span>Company Admin: {submission.company_admin_name} · {new Date(submission.company_admin_reviewed_at).toLocaleDateString()}</span>
              )}
              {submission.super_admin_reviewed_at && (
                <span>Super Admin reviewed · {new Date(submission.super_admin_reviewed_at).toLocaleDateString()}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderArticleCard = (article) => (
    <Card key={article.id} className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-2">{article.title}</h3>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className="bg-[#124481]">{article.category?.replace('_', ' ')}</Badge>
              <Badge variant="outline">{article.difficulty}</Badge>
              {article.fault_codes?.length > 0 && article.fault_codes.map(code => (
                <Badge key={code} className="bg-red-600 text-white">{code}</Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{article.author_name}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ThumbsUp className="h-4 w-4" />
              <span>{article.helpful_count || 0} helpful</span>
            </div>
          </div>
        </div>
        <div className="space-y-3 mb-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Symptoms:</p>
            <p className="text-sm text-muted-foreground">{article.symptoms}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Solution:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{article.solution}</p>
          </div>
          {article.parts_needed?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground">Parts Needed:</p>
              <p className="text-sm text-muted-foreground">{article.parts_needed.join(', ')}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 pt-3 border-t">
          <Button size="sm" variant="outline" onClick={() => voteArticle(article.id)}>
            <ThumbsUp className="h-4 w-4 mr-1" /> Helpful
          </Button>
          <span className="text-xs text-muted-foreground">Added {new Date(article.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );

  const communityContent = [...approvedSubmissions, ...articles];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-[#124481]" />
              Tribal Knowledge Base
            </h1>
            <p className="text-muted-foreground mt-1">
              Learn from senior techs. Share your expertise. Build collective intelligence.
            </p>
          </div>
          {!isMasterAdmin() && (
            <Button onClick={() => setShowAddModal(true)} className="bg-[#289790] hover:bg-[#1E7083]">
              <Plus className="h-4 w-4 mr-2" />
              Share Knowledge
            </Button>
          )}
        </div>

        {/* Search & Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by fault code, symptom, or solution..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAll()}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {categories.map(cat => (
                  <Button
                    key={cat.value}
                    variant={filterCategory === cat.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterCategory(cat.value)}
                    className={filterCategory === cat.value ? 'bg-[#124481]' : ''}
                  >
                    <cat.icon className="h-4 w-4 mr-1" />
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Community Knowledge | My Submissions */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="community">Community Knowledge</TabsTrigger>
            {!isMasterAdmin() && <TabsTrigger value="submissions">My Submissions</TabsTrigger>}
          </TabsList>

          <TabsContent value="community" className="mt-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading knowledge base...</p>
                </CardContent>
              </Card>
            ) : communityContent.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No knowledge submissions yet</h3>
                  <p className="text-muted-foreground mb-4">For your company, no approved knowledge entries exist yet.</p>
                  {!isMasterAdmin() && (
                    <Button onClick={() => setShowAddModal(true)} className="bg-[#289790] hover:bg-[#1E7083]">
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Knowledge
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {approvedSubmissions.map(sub => renderSubmissionCard(sub, false))}
                {articles.map(article => renderArticleCard(article))}
              </div>
            )}
          </TabsContent>

          {!isMasterAdmin() && (
            <TabsContent value="submissions" className="mt-4">
              {loading ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading submissions...</p>
                  </CardContent>
                </Card>
              ) : mySubmissions.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Send className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No submissions yet</h3>
                    <p className="text-muted-foreground mb-4">
                      {isCompanyAdmin()
                        ? "No knowledge submissions for your company yet."
                        : "You haven't submitted any knowledge yet. Share your expertise!"}
                    </p>
                    <Button onClick={() => setShowAddModal(true)} className="bg-[#289790] hover:bg-[#1E7083]">
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Knowledge
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {mySubmissions.map(sub => renderSubmissionCard(sub, true))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Submit Knowledge Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <Card className="w-full max-w-3xl mx-4 my-8">
              <CardHeader>
                <CardTitle>Share Your Knowledge</CardTitle>
                <p className="text-sm text-muted-foreground">Your submission will go through admin review before being published.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <Input
                    placeholder="e.g., Diagnosing Detroit DD15 Low Power Issues"
                    value={newSubmission.title}
                    onChange={(e) => setNewSubmission({ ...newSubmission, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    value={newSubmission.category}
                    onChange={(e) => setNewSubmission({ ...newSubmission, category: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  >
                    <option value="triage">Triage & Initial Assessment</option>
                    <option value="diagnosis">Diagnostic Procedures</option>
                    <option value="correction">Repair & Correction</option>
                    <option value="safety">Safety & Compliance</option>
                    <option value="parts">Parts & Components</option>
                    <option value="reference">Reference Material</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Content *</label>
                  <Textarea
                    placeholder="Share your knowledge in detail — symptoms, steps, solutions..."
                    value={newSubmission.content}
                    onChange={(e) => setNewSubmission({ ...newSubmission, content: e.target.value })}
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Be specific. This will guide other technicians.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                  <Input
                    placeholder="e.g., DD15, low power, turbo, EGR"
                    value={newSubmission.tags}
                    onChange={(e) => setNewSubmission({ ...newSubmission, tags: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Source (optional)</label>
                  <Input
                    placeholder="e.g., TSB #12-345, OEM Manual, personal experience"
                    value={newSubmission.source}
                    onChange={(e) => setNewSubmission({ ...newSubmission, source: e.target.value })}
                  />
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Multi-Level Approval</p>
                    <p>Your submission will be reviewed by your Company Admin first, then forwarded to Super Admin for final approval.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={submitting}>Cancel</Button>
                  <Button
                    onClick={handleSubmitKnowledge}
                    disabled={!newSubmission.title || !newSubmission.content || submitting}
                    className="bg-[#289790] hover:bg-[#1E7083]"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Submit for Review</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
