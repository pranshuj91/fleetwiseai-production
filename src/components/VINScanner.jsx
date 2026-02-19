import React, { useState } from 'react';
import { Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import CameraCapture from './CameraCapture';
import { BACKEND_URL } from '../lib/config';

const VINScanner = ({ onScanComplete, buttonText = "Scan VIN Plate", buttonVariant = "outline", buttonSize = "default" }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCapture = async (imageData) => {
    setScanning(true);
    setError(null);
    setShowCamera(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/ocr/vin-scan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image_data: imageData })
        }
      );

      if (!response.ok) {
        throw new Error('VIN scan failed');
      }

      const data = await response.json();
      setResult(data);

      // Call parent callback with results
      if (onScanComplete) {
        onScanComplete(data);
      }

      // Auto-clear result after 3 seconds
      setTimeout(() => {
        setResult(null);
      }, 3000);

    } catch (err) {
      console.error('Error scanning VIN:', err);
      setError('Failed to scan VIN. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => setShowCamera(true)}
        disabled={scanning}
        className="relative"
      >
        {scanning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Scanning...
          </>
        ) : result ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            VIN Scanned
          </>
        ) : error ? (
          <>
            <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
            Scan Failed
          </>
        ) : (
          <>
            <Camera className="h-4 w-4 mr-2" />
            {buttonText}
          </>
        )}
      </Button>

      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
          title="Scan VIN Plate"
        />
      )}

      {/* Result Toast */}
      {result && result.vin && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg animate-slide-up">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">VIN Detected!</p>
              <p className="text-sm text-green-700 mt-1">VIN: {result.vin}</p>
              {result.make && <p className="text-sm text-green-700">Make: {result.make}</p>}
              {result.model && <p className="text-sm text-green-700">Model: {result.model}</p>}
              {result.year && <p className="text-sm text-green-700">Year: {result.year}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Scan Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VINScanner;
