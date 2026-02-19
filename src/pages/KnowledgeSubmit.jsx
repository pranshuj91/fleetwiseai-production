import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';

const KnowledgeSubmit = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isMasterAdmin, getRole } = usePermissions();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'diagnosis',
    tags: '',
    source: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const categories = [
    { value: 'triage', label: 'Triage & Initial Assessment' },
    { value: 'diagnosis', label: 'Diagnostic Procedures' },
    { value: 'correction', label: 'Repair & Correction' },
    { value: 'safety', label: 'Safety & Compliance' },
    { value: 'parts', label: 'Parts & Components' },
    { value: 'reference', label: 'Reference Material' }
  ];

  // Super Admins cannot submit knowledge
  if (isMasterAdmin()) {
    return (
      <>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Not Available</h2>
              <p className="text-muted-foreground">Super Admins do not submit knowledge. Knowledge is submitted by company employees and reviewed through the approval workflow.</p>
              <Button className="mt-4" onClick={() => navigate('/knowledge/curator')}>
                Go to Knowledge Curator
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const companyId = profile?.company_id;
      if (!companyId) {
        throw new Error('No company associated with your account');
      }

      const { error } = await supabase
        .from('knowledge_submissions')
        .insert({
          company_id: companyId,
          submitted_by: user.id,
          submitted_by_name: profile?.full_name || profile?.username || user.email,
          submitted_by_role: getRole() || 'technician',
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
          source: formData.source || null,
          status: 'pending_company_admin'
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/knowledge-base');
      }, 2000);
    } catch (error) {
      console.error('Error submitting knowledge:', error);
      alert('Failed to submit knowledge entry: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Submitted!</h2>
              <p className="text-muted-foreground">Your knowledge entry is pending Company Admin approval.</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Submit Knowledge</h1>
            <p className="text-muted-foreground">Share your expertise for review and approval</p>
          </div>
          <BookOpen className="h-12 w-12 text-primary" />
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Multi-Level Approval Process</p>
                <p>Your submission will first be reviewed by your Company Admin. If approved, it will be forwarded to the Super Admin for final verification.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Entry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Diagnosing Detroit DD15 Low Power Issues"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Content *</label>
                <Textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={12}
                  placeholder="Share your knowledge in detail..."
                />
                <p className="text-xs text-muted-foreground mt-1">Be specific and detailed. This will guide technicians through similar issues.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tags (comma-separated)</label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., DD15, low power, turbo, EGR"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Source (optional)</label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="e.g., TSB #12-345, OEM Manual, personal experience"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/knowledge-base')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-primary/90"
            >
              {submitting ? 'Submitting...' : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Review
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default KnowledgeSubmit;
