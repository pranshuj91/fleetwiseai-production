import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
  Shield, Camera, CheckCircle, AlertTriangle, X 
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const SafetyChecklist = ({ taskId, onComplete }) => {
  const [checklist, setChecklist] = useState({
    ppe_verified: false,
    ppe_photo: null,
    work_area_safe: false,
    hazards_identified: [],
    lock_out_tag_out: null,
    fire_extinguisher_nearby: null,
    ventilation_adequate: null,
    notes: ''
  });
  
  const [hazardInput, setHazardInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handlePPEPhoto = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChecklist({...checklist, ppe_photo: reader.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const addHazard = () => {
    if (hazardInput.trim()) {
      setChecklist({
        ...checklist,
        hazards_identified: [...checklist.hazards_identified, hazardInput.trim()]
      });
      setHazardInput('');
    }
  };

  const removeHazard = (index) => {
    setChecklist({
      ...checklist,
      hazards_identified: checklist.hazards_identified.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const response = await fetch(`${BACKEND_URL}/api/safety/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          task_id: taskId,
          ...checklist
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Safety checklist submitted! Score: ${data.safety_score}/100`);
        if (onComplete) onComplete(data);
      } else {
        alert('Failed to submit safety checklist');
      }
    } catch (error) {
      console.error('Error submitting checklist:', error);
      alert('Error submitting safety checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const isComplete = checklist.ppe_verified && checklist.work_area_safe;

  return (
    <Card className="border-4 border-orange-500">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
        <CardTitle className="flex items-center text-xl">
          <Shield className="mr-2 h-6 w-6" />
          Safety Checklist Required
        </CardTitle>
        <p className="text-sm opacity-90 mt-1">Complete before starting work</p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* PPE Verification */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-base font-semibold text-gray-900">
              Personal Protective Equipment (PPE) ✓
            </label>
            <button
              onClick={() => setChecklist({...checklist, ppe_verified: !checklist.ppe_verified})}
              className={`w-20 h-10 rounded-full transition-colors ${
                checklist.ppe_verified 
                  ? 'bg-green-500' 
                  : 'bg-gray-300'
              }`}
            >
              <span className={`block w-8 h-8 rounded-full bg-white transition-transform ${
                checklist.ppe_verified ? 'translate-x-10' : 'translate-x-1'
              }`}></span>
            </button>
          </div>
          
          <p className="text-sm text-gray-600">
            Hard hat, safety glasses, steel-toed boots, gloves
          </p>
          
          {checklist.ppe_verified && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePPEPhoto}
                className="hidden"
              />
              
              {checklist.ppe_photo ? (
                <div className="relative">
                  <img 
                    src={checklist.ppe_photo} 
                    alt="PPE verification" 
                    className="w-full h-40 object-cover rounded-lg border-2 border-green-500"
                  />
                  <button
                    onClick={() => setChecklist({...checklist, ppe_photo: null})}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Take PPE Photo
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Work Area Safe */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-base font-semibold text-gray-900">
              Work Area Inspected & Safe ✓
            </label>
            <button
              onClick={() => setChecklist({...checklist, work_area_safe: !checklist.work_area_safe})}
              className={`w-20 h-10 rounded-full transition-colors ${
                checklist.work_area_safe 
                  ? 'bg-green-500' 
                  : 'bg-gray-300'
              }`}
            >
              <span className={`block w-8 h-8 rounded-full bg-white transition-transform ${
                checklist.work_area_safe ? 'translate-x-10' : 'translate-x-1'
              }`}></span>
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Clear of debris, good lighting, proper tools available
          </p>
        </div>

        {/* Hazards Identified */}
        <div className="space-y-3">
          <label className="text-base font-semibold text-gray-900">
            Hazards Identified
          </label>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={hazardInput}
              onChange={(e) => setHazardInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addHazard()}
              placeholder="Type hazard and press Enter"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base"
            />
            <Button onClick={addHazard} className="bg-orange-500 hover:bg-orange-600">
              Add
            </Button>
          </div>

          {checklist.hazards_identified.length > 0 && (
            <div className="space-y-2">
              {checklist.hazards_identified.map((hazard, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-sm font-medium text-red-800">{hazard}</span>
                  <button
                    onClick={() => removeHazard(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional Checks */}
        <div className="space-y-4 pt-4 border-t">
          <p className="text-sm font-semibold text-gray-700">If Applicable:</p>
          
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-900">Lock Out / Tag Out</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={checklist.lock_out_tag_out === true ? "default" : "outline"}
                onClick={() => setChecklist({...checklist, lock_out_tag_out: true})}
              >
                Yes
              </Button>
              <Button
                size="sm"
                variant={checklist.lock_out_tag_out === false ? "default" : "outline"}
                onClick={() => setChecklist({...checklist, lock_out_tag_out: false})}
              >
                No
              </Button>
              <Button
                size="sm"
                variant={checklist.lock_out_tag_out === null ? "default" : "outline"}
                onClick={() => setChecklist({...checklist, lock_out_tag_out: null})}
              >
                N/A
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-900">Fire Extinguisher Nearby</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={checklist.fire_extinguisher_nearby === true ? "default" : "outline"}
                onClick={() => setChecklist({...checklist, fire_extinguisher_nearby: true})}
              >
                Yes
              </Button>
              <Button
                size="sm"
                variant={checklist.fire_extinguisher_nearby === false ? "default" : "outline"}
                onClick={() => setChecklist({...checklist, fire_extinguisher_nearby: false})}
              >
                No
              </Button>
              <Button
                size="sm"
                variant={checklist.fire_extinguisher_nearby === null ? "default" : "outline"}
                onClick={() => setChecklist({...checklist, fire_extinguisher_nearby: null})}
              >
                N/A
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-900">Adequate Ventilation</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={checklist.ventilation_adequate === true ? "default" : "outline"}
                onClick={() => setChecklist({...checklist, ventilation_adequate: true})}
              >
                Yes
              </Button>
              <Button
                size="sm"
                variant={checklist.ventilation_adequate === false ? "default" : "outline"}
                onClick={() => setChecklist({...checklist, ventilation_adequate: false})}
              >
                No
              </Button>
              <Button
                size="sm"
                variant={checklist.ventilation_adequate === null ? "default" : "outline"}
                onClick={() => setChecklist({...checklist, ventilation_adequate: null})}
              >
                N/A
              </Button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-base font-semibold text-gray-900 block mb-2">
            Additional Safety Notes
          </label>
          <Textarea
            value={checklist.notes}
            onChange={(e) => setChecklist({...checklist, notes: e.target.value})}
            rows={3}
            placeholder="Any additional safety concerns or notes..."
            className="text-base"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isComplete || submitting}
          className={`w-full h-14 text-lg ${
            isComplete 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            'Submitting...'
          ) : isComplete ? (
            <><CheckCircle className="mr-2 h-5 w-5" />Submit Safety Checklist</>
          ) : (
            <><AlertTriangle className="mr-2 h-5 w-5" />Complete Required Items</>
          )}
        </Button>

        {!isComplete && (
          <p className="text-center text-sm text-red-600">
            ⚠️ PPE and Work Area checks are mandatory
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SafetyChecklist;
