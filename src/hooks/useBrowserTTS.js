import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Browser-native Text-to-Speech hook using Web Speech API
 * Provides automatic voice playback for AI responses with smart controls
 */
const useBrowserTTS = (options = {}) => {
  const {
    defaultEnabled = false,  // Disabled by default - user can enable manually
    defaultRate = 0.95,      // Slightly slower for clarity
    defaultPitch = 1.0,
    defaultVoiceLang = 'en-US',
  } = options;

  const [isEnabled, setIsEnabled] = useState(() => {
    // Check session storage for user preference
    if (typeof window === 'undefined') return defaultEnabled;
    const stored = sessionStorage.getItem('tts-enabled');
    return stored !== null ? stored === 'true' : defaultEnabled;
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  
  const utteranceRef = useRef(null);
  const lastSpokenRef = useRef(''); // Track last spoken text to prevent repeats
  const synthRef = useRef(null);

  const hasUserInteracted = useRef(false);
  const pendingSpeechRef = useRef(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      synthRef.current = window.speechSynthesis;

      const loadVoices = () => {
        const voices = synthRef.current.getVoices();
        setAvailableVoices(voices);
        
        // Find a good English US voice
        const preferredVoice = voices.find(v => 
          v.lang === 'en-US' && (
            v.name.includes('Google') || 
            v.name.includes('Samantha') || 
            v.name.includes('Daniel') ||
            v.name.includes('Natural') ||
            v.name.includes('Enhanced')
          )
        ) || voices.find(v => v.lang === 'en-US') 
          || voices.find(v => v.lang.startsWith('en'));
        
        if (preferredVoice) {
          setSelectedVoice(preferredVoice);
        }
      };

      // Voices may load asynchronously
      loadVoices();
      synthRef.current.onvoiceschanged = loadVoices;
      
      // Listen for user interaction to unlock audio
      const unlockAudio = () => {
        hasUserInteracted.current = true;
        // If there's pending speech, play it now
        if (pendingSpeechRef.current) {
          const { text, options } = pendingSpeechRef.current;
          pendingSpeechRef.current = null;
          // Small delay to ensure unlock is complete
          setTimeout(() => speakInternal(text, options), 100);
        }
      };
      
      document.addEventListener('click', unlockAudio, { once: true });
      document.addEventListener('touchstart', unlockAudio, { once: true });
      document.addEventListener('keydown', unlockAudio, { once: true });

      return () => {
        if (synthRef.current) {
          synthRef.current.cancel();
        }
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      };
    }
  }, []);

  // Persist enabled state to session storage
  useEffect(() => {
    sessionStorage.setItem('tts-enabled', String(isEnabled));
  }, [isEnabled]);

  /**
   * Clean text for better speech output
   */
  const cleanTextForSpeech = useCallback((text) => {
    if (!text) return '';
    
    return text
      // Remove markdown formatting
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      // Remove emojis (most common ones)
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[🚛⚙️🔖📏⚠️📋💡🔍✅❌⚡🔧🛠️📦🔩]/g, '')
      // Clean up links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove excessive punctuation
      .replace(/[#*_~|]/g, '')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }, []);

  /**
   * Split long text into manageable chunks for better TTS handling
   */
  const splitIntoChunks = useCallback((text, maxLength = 200) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxLength) {
        currentChunk += sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    
    return chunks;
  }, []);

  /**
   * Cancel any ongoing speech
   */
  const cancel = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Internal speak function (after user interaction check)
   */
  const speakInternal = useCallback((text, speakOptions = {}) => {
    if (!synthRef.current) return false;

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return false;

    // Prevent speaking the same text twice in a row
    if (cleanedText === lastSpokenRef.current && !speakOptions.allowRepeat) {
      return false;
    }

    // Cancel any ongoing speech
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    lastSpokenRef.current = cleanedText;
    setIsSpeaking(true);

    // Split long text into chunks for better handling
    const chunks = splitIntoChunks(cleanedText);
    let chunkIndex = 0;

    const speakNextChunk = () => {
      if (chunkIndex >= chunks.length) {
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      utteranceRef.current = utterance;

      // Configure voice settings
      utterance.rate = speakOptions.rate ?? defaultRate;
      utterance.pitch = speakOptions.pitch ?? defaultPitch;
      utterance.volume = speakOptions.volume ?? 1.0;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        chunkIndex++;
        speakNextChunk();
      };

      utterance.onerror = (event) => {
        // Ignore 'interrupted' and 'canceled' errors as they're expected
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.error('TTS Error:', event.error);
        }
        setIsSpeaking(false);
      };

      synthRef.current.speak(utterance);
    };

    speakNextChunk();
    return true;
  }, [cleanTextForSpeech, splitIntoChunks, selectedVoice, defaultRate, defaultPitch]);

  /**
   * Speak the provided text
   * @param {string} text - Text to speak
   * @param {Object} speakOptions - Override options for this utterance
   */
  const speak = useCallback((text, speakOptions = {}) => {
    if (!isSupported || !synthRef.current) {
      console.warn('TTS not supported in this browser');
      return false;
    }

    if (!isEnabled && !speakOptions.force) {
      return false;
    }

    // If user hasn't interacted yet, queue the speech for later
    if (!hasUserInteracted.current) {
      console.log('TTS: Queuing speech until user interaction');
      pendingSpeechRef.current = { text, options: speakOptions };
      return false;
    }

    return speakInternal(text, speakOptions);
  }, [isSupported, isEnabled, speakInternal]);

  /**
   * Toggle TTS on/off
   */
  const toggle = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      if (!newValue) {
        cancel(); // Stop speaking when disabled
      }
      return newValue;
    });
  }, [cancel]);

  /**
   * Reset the last spoken text (allows repeating)
   */
  const resetLastSpoken = useCallback(() => {
    lastSpokenRef.current = '';
  }, []);

  /**
   * Mark that user has interacted (call this when user performs an action like clicking a button)
   */
  const markUserInteracted = useCallback(() => {
    hasUserInteracted.current = true;
  }, []);

  return {
    // State
    isEnabled,
    isSpeaking,
    isSupported,
    availableVoices,
    selectedVoice,
    
    // Actions
    speak,
    cancel,
    toggle,
    setIsEnabled,
    setSelectedVoice,
    resetLastSpoken,
    markUserInteracted,
  };
};

export default useBrowserTTS;
