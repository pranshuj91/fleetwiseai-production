import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pmAPI, estimateAPI, invoiceAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  AlertTriangle, Clock, FileText, DollarSign, Calendar, TrendingUp
} from 'lucide-react';

const AlertsWidget = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const [overduePMRes, pendingEstimatesRes, unpaidInvoicesRes] = await Promise.allSettled([
        pmAPI.schedules.overdue(),
        estimateAPI.list({ status: 'sent' }),
        invoiceAPI.list({ status: 'sent' })
      ]);

      const alertsList = [];

      // Overdue PM
      if (overduePMRes.status === 'fulfilled' && overduePMRes.value.data.length > 0) {
        alertsList.push({
          id: 'overdue-pm',
          type: 'critical',
          icon: AlertTriangle,
          title: `${overduePMRes.value.data.length} Overdue PM Schedules`,
          description: 'Preventive maintenance is past due',
          action: () => navigate('/pm/dashboard'),
          color: 'red'
        });
      }

      // Pending Estimates
      if (pendingEstimatesRes.status === 'fulfilled' && pendingEstimatesRes.value.data.length > 0) {
        const pendingCount = pendingEstimatesRes.value.data.length;
        const totalValue = pendingEstimatesRes.value.data.reduce((sum, e) => sum + e.estimated_total, 0);
        alertsList.push({
          id: 'pending-estimates',
          type: 'warning',
          icon: FileText,
          title: `${pendingCount} Estimates Awaiting Response`,
          description: `$${totalValue.toFixed(0)} in pending approvals`,
          action: () => navigate('/estimates'),
          color: 'blue'
        });
      }

      // Unpaid Invoices
      if (unpaidInvoicesRes.status === 'fulfilled' && unpaidInvoicesRes.value.data.length > 0) {
        const unpaidCount = unpaidInvoicesRes.value.data.length;
        const unpaidTotal = unpaidInvoicesRes.value.data.reduce((sum, i) => sum + i.total_amount, 0);
        alertsList.push({
          id: 'unpaid-invoices',
          type: 'warning',
          icon: DollarSign,
          title: `${unpaidCount} Unpaid Invoices`,
          description: `$${unpaidTotal.toFixed(0)} outstanding`,
          action: () => navigate('/invoices'),
          color: 'orange'
        });
      }

      setAlerts(alertsList);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">All Caught Up!</h3>
              <p className="text-sm text-green-700">No urgent items need attention</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Alerts & Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            onClick={alert.action}
            className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
              alert.color === 'red' ? 'border-red-200 bg-red-50' :
              alert.color === 'orange' ? 'border-orange-200 bg-orange-50' :
              alert.color === 'blue' ? 'border-blue-200 bg-blue-50' :
              'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 ${
                alert.color === 'red' ? 'text-red-600' :
                alert.color === 'orange' ? 'text-orange-600' :
                alert.color === 'blue' ? 'text-blue-600' :
                'text-gray-600'
              }`}>
                <alert.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold mb-1 ${
                  alert.color === 'red' ? 'text-red-900' :
                  alert.color === 'orange' ? 'text-orange-900' :
                  alert.color === 'blue' ? 'text-blue-900' :
                  'text-gray-900'
                }`}>
                  {alert.title}
                </h4>
                <p className={`text-sm ${
                  alert.color === 'red' ? 'text-red-700' :
                  alert.color === 'orange' ? 'text-orange-700' :
                  alert.color === 'blue' ? 'text-blue-700' :
                  'text-gray-700'
                }`}>
                  {alert.description}
                </p>
              </div>
              <Badge className={
                alert.type === 'critical' ? 'bg-red-600' :
                alert.type === 'warning' ? 'bg-orange-600' :
                'bg-blue-600'
              }>
                {alert.type === 'critical' ? 'Urgent' : 'Action Needed'}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AlertsWidget;
