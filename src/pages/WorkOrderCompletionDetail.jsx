import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, CheckCircle, MessageSquare, Send, 
  FileText, User, Calendar, Truck, Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import Navigation from '../components/Navigation';
import { BACKEND_URL } from '../lib/config';

const WorkOrderCompletionDetail = () => {
  const { completionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchCompletion();
  }, [completionId]);

  const fetchCompletion = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/completions/${completionId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch completion');

      const data = await response.json();
      setCompletion(data);
    } catch (error) {
      console.error('Error fetching completion:', error);
    } finally {
      setLoading(false);
    }
  };

  const addManagerNote = async () => {
    if (!newNote.trim()) return;

    try {
      setAddingNote(true);
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/completions/${completionId}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ note: newNote })
        }
      );

      if (!response.ok) throw new Error('Failed to add note');

      setNewNote('');
      await fetchCompletion();
      alert('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const approveWorkOrder = async () => {
    try {
      setApproving(true);
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/completions/${completionId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to approve');

      await fetchCompletion();
      alert('Work order approved successfully');
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve work order');
    } finally {
      setApproving(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/completions/${completionId}/pdf`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to download PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = completion.pdf_filename || 'work_order_completion.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </>
    );
  }

  if (!completion) {
    return (
      <>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-500">Completion not found</p>
            <Button onClick={() => navigate('/work-orders/completions')} className="mt-4">
              Back to Completions
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/work-orders/completions')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Completions
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Work Order Completion</h1>
            <p className="text-gray-600">Completed on {new Date(completion.completed_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          {!completion.manager_approved && (
            <Button
              onClick={approveWorkOrder}
              disabled={approving}
              className="bg-green-600 hover:bg-green-700"
            >
              {approving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Approve
            </Button>
          )}
        </div>
      </div>

      <div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
          completion.manager_approved 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {completion.manager_approved ? '✓ Approved by Manager' : 'Pending Manager Review'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><span className="font-semibold">Truck:</span> {completion.truck_info}</div>
              <div><span className="font-semibold">Unit #:</span> {completion.truck_number}</div>
              <div><span className="font-semibold">VIN:</span> {completion.vin}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Technician Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><span className="font-semibold">Name:</span> {completion.technician_name}</div>
              <div><span className="font-semibold">Completed:</span> {new Date(completion.completed_at).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Complaint</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{completion.customer_complaint}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-wrap">{completion.diagnostic_findings}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Root Cause</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{completion.root_cause}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Corrections Made</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 whitespace-pre-wrap">{completion.corrections_made}</p>
        </CardContent>
      </Card>

      {completion.parts_used && completion.parts_used.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parts Used</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">Part Number</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {completion.parts_used.map((part, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">{part.part_number}</td>
                    <td className="py-2">{part.description}</td>
                    <td className="text-right py-2">{part.quantity}</td>
                    <td className="text-right py-2">${part.price?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {completion.labor_entries && completion.labor_entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Labor</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Hours</th>
                  <th className="text-right py-2">Rate</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {completion.labor_entries.map((labor, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">{labor.description}</td>
                    <td className="text-right py-2">{labor.hours}</td>
                    <td className="text-right py-2">${labor.rate?.toFixed(2)}</td>
                    <td className="text-right py-2">${(labor.hours * labor.rate)?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Manager Notes & Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {completion.manager_notes && completion.manager_notes.length > 0 ? (
            <div className="space-y-3">
              {completion.manager_notes.map((note, idx) => (
                <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-blue-900">{note.manager_name}</span>
                    <span className="text-xs text-blue-700">{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-700">{note.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No manager notes yet</p>
          )}

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Note</label>
            <div className="flex space-x-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add your note or feedback..."
                rows={3}
                className="flex-1"
              />
              <Button
                onClick={addManagerNote}
                disabled={addingNote || !newNote.trim()}
              >
                {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default WorkOrderCompletionDetail;
