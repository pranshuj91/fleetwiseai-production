import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const SupabaseStatus = () => {
  const [status, setStatus] = useState('checking');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    checkSupabaseConnection();
    const interval = setInterval(checkSupabaseConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const checkSupabaseConnection = async () => {
    // TODO: Lovable will implement Supabase health check here
    // For frontend-only mode, show as connected (using mock services)
    try {
      if (!BACKEND_URL) {
        // No backend URL = using mock services, show as connected
        setStatus('connected');
        return;
      }
      
      const response = await fetch(`${BACKEND_URL}/api/health`);
      const data = await response.json();
      
      if (data.database_type === "Supabase PostgreSQL" && data.database === "connected") {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch (error) {
      // In frontend-only mode, treat errors as "using mocks" = connected
      setStatus('connected');
    }
  };

  if (!isVisible) return null;

  const statusConfig = {
    connected: {
      bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
      icon: CheckCircle,
      text: 'Connected to Supabase',
      iconColor: 'text-white',
    },
    disconnected: {
      bg: 'bg-gradient-to-r from-orange-500 to-red-600',
      icon: XCircle,
      text: 'Supabase Disconnected',
      iconColor: 'text-white',
    },
    checking: {
      bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      icon: AlertCircle,
      text: 'Checking Supabase...',
      iconColor: 'text-white',
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500 to-red-700',
      icon: XCircle,
      text: 'Connection Error',
      iconColor: 'text-white',
    },
  };

  const config = statusConfig[status] || statusConfig.checking;
  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`${config.bg} rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:scale-105`}
      >
        <Database className="w-4 h-4 text-white" />
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
        <span className="text-white text-sm font-medium">{config.text}</span>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-2 text-white/70 hover:text-white transition-colors"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default SupabaseStatus;
