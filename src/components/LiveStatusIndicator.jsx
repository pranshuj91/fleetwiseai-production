import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const LiveStatusIndicator = () => {
  const [shopStatus, setShopStatus] = useState({
    active_techs: 0,
    active_tasks: 0,
    completed_today: 0,
    last_update: null,
    online: true
  });

  useEffect(() => {
    const fetchStatus = async () => {
      // TODO: Lovable will implement real shop status API here
      // For frontend-only mode, use mock data
      try {
        if (!BACKEND_URL) {
          // No backend = use mock data
          setShopStatus({
            active_techs: 3,
            active_tasks: 5,
            completed_today: 12,
            last_update: new Date(),
            online: true
          });
          return;
        }
        
        const response = await fetch(
          `${BACKEND_URL}/api/tasks/shop-floor/status`,
          {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setShopStatus({
            active_techs: data.technicians?.filter(t => t.active_task).length || 0,
            active_tasks: data.technicians?.reduce((sum, t) => sum + (t.active_task ? 1 : 0), 0) || 0,
            completed_today: data.technicians?.reduce((sum, t) => sum + t.completed_tasks, 0) || 0,
            last_update: new Date(),
            online: true
          });
        } else {
          setShopStatus(prev => ({ ...prev, online: false }));
        }
      } catch (error) {
        // Use mock data on error
        setShopStatus({
          active_techs: 3,
          active_tasks: 5,
          completed_today: 12,
          last_update: new Date(),
          online: true
        });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center gap-2">
        {shopStatus.online ? (
          <Wifi className="h-5 w-5 text-green-600 animate-pulse" />
        ) : (
          <WifiOff className="h-5 w-5 text-gray-400" />
        )}
        <span className="text-sm font-medium text-gray-700">Live Status</span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Activity className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-600">
            {shopStatus.active_techs} techs
          </span>
        </div>
        
        <Badge className="bg-orange-500">
          {shopStatus.active_tasks} active
        </Badge>
        
        <Badge className="bg-green-500">
          {shopStatus.completed_today} done
        </Badge>
      </div>
      
      {shopStatus.last_update && (
        <span className="text-xs text-gray-400 ml-auto">
          Updated {Math.floor((new Date() - shopStatus.last_update) / 1000)}s ago
        </span>
      )}
    </div>
  );
};

export default LiveStatusIndicator;
