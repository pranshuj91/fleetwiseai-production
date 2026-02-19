import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Clock, Save } from 'lucide-react';
import Navigation from '../components/Navigation';
import { BACKEND_URL } from '../lib/config';

const NonBillableTime = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState(15);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { value: 'shop_cleaning', label: '🧹 Shop Cleaning', color: 'bg-blue-100 text-blue-800' },
    { value: 'tool_maintenance', label: '🔧 Tool Maintenance', color: 'bg-green-100 text-green-800' },
    { value: 'training', label: '📚 Training/Learning', color: 'bg-purple-100 text-purple-800' },
    { value: 'safety_meeting', label: '🛡️ Safety Meeting', color: 'bg-red-100 text-red-800' },
    { value: 'inventory', label: '📦 Inventory/Organizing', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'break', label: '☕ Break', color: 'bg-gray-100 text-gray-800' },
    { value: 'other', label: '📋 Other', color: 'bg-orange-100 text-orange-800' }
  ];

  const durations = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  const handleSubmit = async () => {
    if (!category) {
      alert('Please select a category');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/time-tracking/non-billable`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            category,
            duration_minutes: duration,
            notes
          })
        }
      );

      if (!response.ok) throw new Error('Failed to log time');

      alert('Non-billable time logged successfully!');
      navigate('/technician');
    } catch (error) {
      console.error('Error logging time:', error);
      alert('Failed to log time');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#124481] to-[#289790] text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/technician')}
            className="text-white hover:bg-white/20 mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Log Non-Billable Time</h1>
            <p className="text-blue-100 text-sm">Track your productivity</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-900">
              <strong>Why track this?</strong> Logging non-billable time helps us understand shop utilization 
              and ensures accurate productivity metrics. This keeps you accountable and helps management make better decisions.
            </p>
          </CardContent>
        </Card>

        {/* Category Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What are you doing?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    category === cat.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{cat.label}</span>
                    {category === cat.value && (
                      <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Clock className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Duration Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How long?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {durations.map((dur) => (
                <button
                  key={dur.value}
                  onClick={() => setDuration(dur.value)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    duration === dur.value
                      ? 'border-blue-500 bg-blue-50 font-semibold'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Notes (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any details you'd like to add..."
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !category}
          className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg"
        >
          {submitting ? 'Logging...' : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Log {duration} Minutes
            </>
          )}
        </Button>
      </div>
    </div>
    </>
  );
};

export default NonBillableTime;
