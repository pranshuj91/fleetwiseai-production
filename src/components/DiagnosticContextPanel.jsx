import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  History, AlertTriangle, TrendingUp, Wrench, 
  Calendar, Package, DollarSign, Clock
} from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const DiagnosticContextPanel = ({ truckId, currentFaultCodes = [] }) => {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (truckId) {
      fetchDiagnosticContext();
    }
  }, [truckId]);

  const fetchDiagnosticContext = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/diagnostic/context/${truckId}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setContext(data);
      }
    } catch (error) {
      console.error('Error fetching context:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !context) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Truck Quick Info */}
      <Card className="border-l-4 border-[#289790]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            🚛 Truck Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">VIN</p>
              <p className="font-mono font-semibold">{context.vin}</p>
            </div>
            <div>
              <p className="text-gray-600">Mileage</p>
              <p className="font-semibold">{context.mileage?.toLocaleString()} mi</p>
            </div>
            <div>
              <p className="text-gray-600">Engine</p>
              <p className="font-semibold">{context.engine}</p>
            </div>
            <div>
              <p className="text-gray-600">Last Service</p>
              <p className="font-semibold">
                {context.last_service ? new Date(context.last_service).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Repairs - Critical Context! */}
      {context.recent_repairs && context.recent_repairs.length > 0 && (
        <Card className="border-l-4 border-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Repairs (Last 90 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {context.recent_repairs.slice(0, 3).map((repair, idx) => (
                <div key={idx} className="border-b pb-2 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{repair.complaint}</p>
                      <p className="text-xs text-gray-600">{repair.component}</p>
                      {repair.fault_codes && repair.fault_codes.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {repair.fault_codes.map((code, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{new Date(repair.date).toLocaleDateString()}</p>
                      <p className="text-green-600 font-semibold">${repair.cost}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring Issues Alert */}
      {context.recurring_issues && context.recurring_issues.length > 0 && (
        <Card className="border-l-4 border-red-500 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 animate-pulse" />
              ⚠️ RECURRING ISSUES DETECTED
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {context.recurring_issues.map((issue, idx) => (
                <div key={idx} className="bg-white p-3 rounded border border-red-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{issue.issue}</p>
                    <Badge className="bg-red-600">
                      {issue.occurrences}x in {issue.timeframe}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-700">{issue.recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictive Alerts */}
      {context.predictive_alerts && context.predictive_alerts.length > 0 && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              🔮 Predictive Maintenance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {context.predictive_alerts.map((alert, idx) => (
                <div key={idx} className="bg-white p-3 rounded border border-yellow-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{alert.component}</p>
                    <Badge className="bg-yellow-600">{alert.risk_level}</Badge>
                  </div>
                  <p className="text-xs text-gray-700 mb-1">{alert.prediction}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="h-3 w-3" />
                    <span>Est. {alert.estimated_time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Fault Codes */}
      {context.related_fault_codes && context.related_fault_codes.length > 0 && (
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Related Issues Seen on Similar Trucks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {context.related_fault_codes.map((related, idx) => (
                <div key={idx} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{related.code}</Badge>
                    <span className="text-xs text-gray-600">
                      ({related.frequency} times on {related.truck_count} similar trucks)
                    </span>
                  </div>
                  <p className="text-xs text-gray-700">{related.common_fix}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warranty Status */}
      {context.warranty_status && (
        <Card className="border-l-4 border-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              💰 Warranty Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Powertrain</span>
                <Badge className={context.warranty_status.powertrain_active ? 'bg-green-600' : 'bg-gray-400'}>
                  {context.warranty_status.powertrain_active ? 'Active' : 'Expired'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Emission</span>
                <Badge className={context.warranty_status.emission_active ? 'bg-green-600' : 'bg-gray-400'}>
                  {context.warranty_status.emission_active ? 'Active' : 'Expired'}
                </Badge>
              </div>
              {context.warranty_status.notes && (
                <p className="text-xs text-gray-600 mt-2 p-2 bg-green-50 rounded">
                  {context.warranty_status.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parts Recommendations */}
      {context.recommended_parts && context.recommended_parts.length > 0 && (
        <Card className="border-l-4 border-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-purple-700 flex items-center gap-2">
              <Package className="h-4 w-4" />
              🔧 Recommended Parts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {context.recommended_parts.map((part, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                  <div>
                    <p className="font-semibold">{part.name}</p>
                    <p className="text-xs text-gray-600">{part.part_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${part.price}</p>
                    <Badge variant="outline" className="text-xs">
                      {part.availability}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-gray-500 text-center p-2">
        🤖 Context powered by AI analysis of {context.total_records} historical records
      </div>
    </div>
  );
};

export default DiagnosticContextPanel;
