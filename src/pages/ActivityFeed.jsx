import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  Activity, FileText, Truck, Users, DollarSign, Package, 
  Wrench, Calendar, CheckCircle, Clock, TrendingUp, Filter
} from 'lucide-react';

const ActivityFeed = () => {
  const [filter, setFilter] = useState('all');

  const activities = [
    {
      id: '1',
      type: 'work_order_created',
      user: 'John Doe',
      action: 'created work order',
      target: 'WO-2025-001',
      details: 'for Unit 123 - Check engine light',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      icon: FileText,
      color: 'blue'
    },
    {
      id: '2',
      type: 'truck_added',
      user: 'Jane Smith',
      action: 'added truck',
      target: '2023 Freightliner Cascadia',
      details: 'VIN: 3AKJHHDR5NSJK1234',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      icon: Truck,
      color: 'green'
    },
    {
      id: '3',
      type: 'estimate_sent',
      user: 'System',
      action: 'sent estimate',
      target: 'EST-00001',
      details: 'to ABC Logistics ($400)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      icon: DollarSign,
      color: 'purple'
    },
    {
      id: '4',
      type: 'invoice_paid',
      user: 'XYZ Transport',
      action: 'paid invoice',
      target: 'INV-2025-001',
      details: 'Amount: $1,250.00',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      icon: CheckCircle,
      color: 'green'
    },
    {
      id: '5',
      type: 'customer_added',
      user: 'Sarah Johnson',
      action: 'added customer',
      target: 'ABC Logistics',
      details: 'Contact: john@abclogistics.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      icon: Users,
      color: 'blue'
    },
    {
      id: '6',
      type: 'part_ordered',
      user: 'Mike Wilson',
      action: 'ordered parts',
      target: 'Oil Filter (10 units)',
      details: 'Supplier: AutoParts Plus',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      icon: Package,
      color: 'orange'
    },
    {
      id: '7',
      type: 'pm_scheduled',
      user: 'System',
      action: 'scheduled PM service',
      target: 'Unit 456',
      details: 'Due date: Dec 15, 2024',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      icon: Calendar,
      color: 'teal'
    },
    {
      id: '8',
      type: 'work_order_completed',
      user: 'Tech Team',
      action: 'completed work order',
      target: 'WO-2025-002',
      details: 'Total time: 3.5 hours',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      icon: Wrench,
      color: 'green'
    }
  ];

  const filterTypes = [
    { value: 'all', label: 'All Activity', icon: Activity },
    { value: 'work_orders', label: 'Work Orders', icon: FileText },
    { value: 'trucks', label: 'Trucks', icon: Truck },
    { value: 'financial', label: 'Financial', icon: DollarSign },
    { value: 'customers', label: 'Customers', icon: Users }
  ];

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600 border-blue-200',
      green: 'bg-green-100 text-green-600 border-green-200',
      purple: 'bg-purple-100 text-purple-600 border-purple-200',
      orange: 'bg-orange-100 text-orange-600 border-orange-200',
      teal: 'bg-teal-100 text-teal-600 border-teal-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Activity className="mr-3 h-8 w-8 text-[#124481]" />
            Activity Feed
          </h1>
          <p className="text-gray-600 mt-1">Real-time updates from your fleet management system</p>
        </div>

        {/* Filter Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {filterTypes.map(type => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={filter === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(type.value)}
                    className={filter === type.value ? "bg-[#124481]" : ""}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {type.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <Card key={activity.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 ${getColorClasses(activity.color)} flex items-center justify-center`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <p className="text-gray-900 font-medium">
                            <span className="font-semibold text-[#124481]">{activity.user}</span>
                            {' '}{activity.action}{' '}
                            <span className="font-semibold">{activity.target}</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                        </div>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {getTimeAgo(activity.timestamp)}
                        </Badge>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.timestamp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Load More */}
        <div className="mt-6 text-center">
          <Button variant="outline" className="w-full">
            <TrendingUp className="mr-2 h-4 w-4" />
            Load More Activity
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActivityFeed;
