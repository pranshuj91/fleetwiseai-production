import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import api from '../lib/api';

/**
 * Enhanced Voice Input Component
 * - Real audio recording using MediaRecorder API
 * - Send to backend for Whisper transcription
 * - Support for English and Spanish
 * - Auto-playback of TTS responses
 */

const VoiceInput = ({ onTranscript, language = 'en', autoSpeak = null, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(new Audio());

  // Auto-speak text when provided (silently fail if TTS unavailable)
  useEffect(() => {
    if (autoSpeak && typeof autoSpeak === 'string' && autoSpeak.trim()) {
      handleSpeak(autoSpeak).catch(err => {
        console.warn('Auto-speak failed:', err);
        // Silently ignore - TTS is enhancement, not required
      });
    }
  }, [autoSpeak]);

  const startRecording = async () => {
    try {
      setError('');
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Send to backend for transcription
        await transcribeAudio(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await api.post('/voice/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        params: {
          language: language
        }
      });
      
      const transcribedText = response.data.transcript;
      setTranscript(transcribedText);
      
      // Call parent callback with transcript
      if (onTranscript) {
        onTranscript(transcribedText);
      }
      
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSpeak = async (text) => {
    if (!text || isSpeaking) return;
    
    setIsSpeaking(true);
    
    try {
      const response = await api.post('/voice/speak', null, {
        params: {
          text: text,
          voice: 'alloy',
          language: language
        },
        responseType: 'blob'
      });
      
      // Verify we got a valid blob response
      if (response && response.data && response.data instanceof Blob && response.data.size > 0) {
        // Create audio URL from blob
        const audioUrl = URL.createObjectURL(response.data);
        
        // Play audio
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
      } else {
        // Invalid response, silently fail
        console.warn('TTS: Invalid or empty response');
        setIsSpeaking(false);
      }
      
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
      // Silently fail - TTS is not critical for functionality
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Record Button */}
        {!isRecording ? (
          <Button
            onClick={startRecording}
            disabled={disabled || isProcessing || isSpeaking}
            variant="outline"
            className="border-[#124481] text-[#124481] hover:bg-[#124481] hover:text-white"
          >
            <Mic className="mr-2 h-4 w-4" />
            {language === 'es' ? 'Presiona para Hablar' : 'Press to Speak'}
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            variant="destructive"
            className="animate-pulse"
          >
            <MicOff className="mr-2 h-4 w-4" />
            {language === 'es' ? 'Detener Grabación' : 'Stop Recording'}
          </Button>
        )}
        
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center text-sm text-gray-600">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {language === 'es' ? 'Procesando...' : 'Processing...'}
          </div>
        )}
        
        {/* Speaking Indicator */}
        {isSpeaking && (
          <div className="flex items-center text-sm text-blue-600">
            <Volume2 className="mr-2 h-4 w-4 animate-pulse" />
            {language === 'es' ? 'Reproduciendo...' : 'Speaking...'}
          </div>
        )}
      </div>
      
      {/* Transcript Display */}
      {transcript && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-900 mb-1">
            {language === 'es' ? 'Transcripción:' : 'Transcript:'}
          </p>
          <p className="text-sm text-gray-800">{transcript}</p>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {/* Language Indicator */}
      <div className="text-xs text-gray-500">
        {language === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}
      </div>
    </div>
  );
};

export default VoiceInput;
