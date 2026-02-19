import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { 
  Camera, Truck, User, Calendar, Clock, 
  DollarSign, FileSignature, CheckCircle, AlertCircle
} from 'lucide-react';
import Navigation from '../components/Navigation';
import { BACKEND_URL } from '../lib/config';

const WalkInEstimate = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Truck Info, 2: Details, 3: Pricing (if needed), 4: Signature
  const [formData, setFormData] = useState({
    truck_number: '',
    vin: '',
    license_plate: '',
    make: '',
    model: '',
    year: '',
    mileage: '',
    complaint: '',
    customer_name: '',
    customer_phone: '',
    due_by: '',
    shop_code: '', // L1, R1, etc.
    estimated_labor_hours: 0,
    estimated_labor_rate: 0,
    estimated_parts_cost: 0
  });
  const [vinPhoto, setVinPhoto] = useState(null);
  const [licensePhoto, setLicensePhoto] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [isLease, setIsLease] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const vinFileRef = useRef(null);
  const licenseFileRef = useRef(null);
  const signatureCanvasRef = useRef(null);

  // Lease codes (L prefix = lease, R prefix = retail/non-lease)
  const leaseDetection = (code) => {
    if (!code) return null;
    return code.toUpperCase().startsWith('L');
  };

  const handleShopCodeChange = (code) => {
    setFormData(prev => ({ ...prev, shop_code: code }));
    const detected = leaseDetection(code);
    setIsLease(detected);
  };

  const handleImageCapture = (type, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'vin') {
          setVinPhoto(reader.result);
        } else {
          setLicensePhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let drawing = false;

    canvas.addEventListener('mousedown', () => { drawing = true; });
    canvas.addEventListener('mouseup', () => { 
      drawing = false; 
      ctx.beginPath();
      setSignatureData(canvas.toDataURL());
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });

    // Touch support
    canvas.addEventListener('touchstart', (e) => { 
      e.preventDefault();
      drawing = true; 
    });
    canvas.addEventListener('touchend', (e) => { 
      e.preventDefault();
      drawing = false; 
      ctx.beginPath();
      setSignatureData(canvas.toDataURL());
    });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    });
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };

  const calculateTotal = () => {
    const labor = formData.estimated_labor_hours * formData.estimated_labor_rate;
    const parts = formData.estimated_parts_cost;
    return labor + parts;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        is_lease: isLease,
        vin_photo: vinPhoto,
        license_photo: licensePhoto,
        signature: signatureData,
        estimated_total: calculateTotal(),
        created_via: 'walk_in'
      };

      const response = await fetch(
        `${BACKEND_URL}/api/estimates/walk-in`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) throw new Error('Failed to create estimate');

      const result = await response.json();
      alert('Estimate created successfully!');
      navigate(`/estimates/${result.estimate_id}`);
    } catch (error) {
      console.error('Error creating estimate:', error);
      alert('Failed to create estimate');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedToStep2 = formData.truck_number && formData.shop_code;
  const canProceedToStep3 = formData.complaint && formData.customer_name && formData.due_by;
  const needsPricing = isLease === false; // Non-lease requires pricing
  const needsSignature = needsPricing; // If pricing shown, need signature

  return (
    <>
      <Navigation />
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Walk-In Estimate</h1>
        <p className="text-gray-600">Quick capture for walk-in customers</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {['Truck Info', 'Details', needsPricing ? 'Pricing' : null, needsSignature ? 'Signature' : null].filter(Boolean).map((label, idx) => {
          const stepNum = idx + 1;
          return (
            <div key={idx} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step > stepNum ? <CheckCircle className="h-5 w-5" /> : stepNum}
              </div>
              <div className="ml-2 font-medium">{label}</div>
              {idx < 3 && <div className="flex-1 h-1 mx-4 bg-gray-200"></div>}
            </div>
          );
        })}
      </div>

      {/* Lease Detection Alert */}
      {isLease !== null && (
        <Card className={isLease ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
          <CardContent className="p-4">
            <div className="flex items-center">
              {isLease ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div className="text-sm text-green-900">
                    <strong>Lease Detected (Code: {formData.shop_code})</strong>
                    <p>Common maintenance - no pricing or signature required</p>
                  </div>
                </>
              ) : (
                <>
                  <DollarSign className="h-5 w-5 text-orange-600 mr-3" />
                  <div className="text-sm text-orange-900">
                    <strong>Non-Lease / Retail (Code: {formData.shop_code})</strong>
                    <p>Price estimate and customer signature required before work begins</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Truck Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Step 1: Truck Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Truck Number *
                </label>
                <Input
                  value={formData.truck_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, truck_number: e.target.value }))}
                  placeholder="e.g., 1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Code * (L1=Lease, R1=Retail)
                </label>
                <Input
                  value={formData.shop_code}
                  onChange={(e) => handleShopCodeChange(e.target.value)}
                  placeholder="e.g., L1 or R1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VIN
                </label>
                <Input
                  value={formData.vin}
                  onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                  placeholder="17-digit VIN"
                />
                <input
                  type="file"
                  ref={vinFileRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleImageCapture('vin', e.target.files[0])}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => vinFileRef.current?.click()}
                  className="mt-2"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {vinPhoto ? 'VIN Photo Captured' : 'Capture VIN Photo'}
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Plate
                </label>
                <Input
                  value={formData.license_plate}
                  onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value }))}
                  placeholder="License plate"
                />
                <input
                  type="file"
                  ref={licenseFileRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleImageCapture('license', e.target.files[0])}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => licenseFileRef.current?.click()}
                  className="mt-2"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {licensePhoto ? 'License Photo Captured' : 'Capture License Photo'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                <Input
                  value={formData.make}
                  onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                  placeholder="Freightliner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Cascadia"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Mileage</label>
              <Input
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData(prev => ({ ...prev, mileage: e.target.value }))}
                placeholder="150000"
              />
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Continue to Details
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Step 2: Work Details & Customer Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Complaint / Issue *
              </label>
              <Textarea
                value={formData.complaint}
                onChange={(e) => setFormData(prev => ({ ...prev, complaint: e.target.value }))}
                rows={4}
                placeholder="Describe the issue..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Phone
                </label>
                <Input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due By / Promised Time *
              </label>
              <Input
                type="datetime-local"
                value={formData.due_by}
                onChange={(e) => setFormData(prev => ({ ...prev, due_by: e.target.value }))}
              />
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  if (needsPricing) {
                    setStep(3);
                  } else {
                    // Lease - skip to submit
                    handleSubmit();
                  }
                }}
                disabled={!canProceedToStep3}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {needsPricing ? 'Continue to Pricing' : 'Create Estimate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Pricing (Non-Lease Only) */}
      {step === 3 && needsPricing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Step 3: Price Estimate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Labor Hours
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.estimated_labor_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_labor_hours: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Labor Rate ($/hr)
                </label>
                <Input
                  type="number"
                  value={formData.estimated_labor_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_labor_rate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Parts Cost
              </label>
              <Input
                type="number"
                value={formData.estimated_parts_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_parts_cost: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Estimated Total:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Continue to Signature
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Signature (Non-Lease Only) */}
      {step === 4 && needsSignature && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileSignature className="h-5 w-5 mr-2" />
              Step 4: Customer Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                <strong>Customer Acknowledgment:</strong> By signing below, the customer acknowledges 
                the estimated price of <strong>${calculateTotal().toFixed(2)}</strong> and the promised 
                completion time of <strong>{new Date(formData.due_by).toLocaleString()}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sign below:
              </label>
              <canvas
                ref={signatureCanvasRef}
                width={600}
                height={200}
                className="border-2 border-gray-300 rounded bg-white w-full cursor-crosshair"
                onMouseEnter={startSignature}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={clearSignature}
                className="mt-2"
              >
                Clear Signature
              </Button>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setStep(3)}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !signatureData}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Creating...' : 'Create Estimate'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
};

export default WalkInEstimate;
