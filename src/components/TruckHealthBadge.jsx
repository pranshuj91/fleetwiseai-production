import React from 'react';
import { Badge } from '../components/ui/badge';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, TrendingUp
} from 'lucide-react';

const TruckHealthBadge = ({ truck }) => {
  const calculateHealthScore = () => {
    let score = 100;
    const now = new Date();

    // Check data completeness
    if (truck.data_completeness < 50) {
      score -= 20;
    } else if (truck.data_completeness < 80) {
      score -= 10;
    }

    // Check for recent issues (would need work order data)
    // This is a simplified version
    
    // Check odometer (high mileage = lower score)
    if (truck.identity?.odometer_mi > 500000) {
      score -= 15;
    } else if (truck.identity?.odometer_mi > 300000) {
      score -= 10;
    }

    // Check engine hours
    if (truck.identity?.engine_hours > 15000) {
      score -= 10;
    } else if (truck.identity?.engine_hours > 10000) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  };

  const score = calculateHealthScore();

  const getHealthStatus = () => {
    if (score >= 80) return { status: 'Excellent', color: 'green', icon: CheckCircle };
    if (score >= 60) return { status: 'Good', color: 'blue', icon: TrendingUp };
    if (score >= 40) return { status: 'Fair', color: 'yellow', icon: Activity };
    return { status: 'Needs Attention', color: 'red', icon: AlertTriangle };
  };

  const health = getHealthStatus();
  const Icon = health.icon;

  const getColorClasses = () => {
    switch (health.color) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${getColorClasses()}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-semibold">{score}%</span>
      <span className="text-xs font-medium">{health.status}</span>
    </div>
  );
};

export default TruckHealthBadge;
