import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { projectAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Zap, AlertTriangle, Wrench, Gauge, Wind, Droplet, 
  TrendingDown, Thermometer, Settings, Loader2
} from 'lucide-react';

const DiagnosticTemplates = () => {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(null);

  const templates = [
    {
      id: 'no-start',
      name: 'No Start Condition',
      icon: AlertTriangle,
      color: 'red',
      description: 'Engine cranks but won\'t start',
      complaint: 'Engine cranks but will not start. No ignition.',
      faultCodes: ['P0335', 'P0340', 'P0107'],
      services: ['Battery test', 'Fuel pressure test', 'Check fault codes', 'Inspect sensors']
    },
    {
      id: 'check-engine',
      name: 'Check Engine Light',
      icon: Gauge,
      color: 'orange',
      description: 'CEL/MIL illuminated',
      complaint: 'Check engine light is illuminated. Customer reports no other symptoms.',
      faultCodes: ['P0420', 'P0171', 'P0300'],
      services: ['Scan fault codes', 'Emissions system check', 'Sensor diagnostics']
    },
    {
      id: 'dpf-regen',
      name: 'DPF Regeneration',
      icon: Wind,
      color: 'blue',
      description: 'Diesel particulate filter issues',
      complaint: 'DPF warning light illuminated. Vehicle requesting regeneration.',
      faultCodes: ['P2002', 'P2463', 'P244B'],
      services: ['Force DPF regeneration', 'Check differential pressure', 'Inspect exhaust system', 'Clean DPF sensor']
    },
    {
      id: 'coolant-leak',
      name: 'Coolant Leak',
      icon: Droplet,
      color: 'green',
      description: 'Coolant system leak',
      complaint: 'Customer reports coolant leaking underneath vehicle. Low coolant warning.',
      faultCodes: ['P0128', 'P0217'],
      services: ['Pressure test cooling system', 'Inspect hoses and clamps', 'Check radiator', 'Inspect water pump']
    },
    {
      id: 'low-power',
      name: 'Loss of Power',
      icon: TrendingDown,
      color: 'yellow',
      description: 'Reduced engine performance',
      complaint: 'Vehicle experiencing significant loss of power, especially under load.',
      faultCodes: ['P0087', 'P0234', 'P0299'],
      services: ['Turbo inspection', 'Fuel system diagnosis', 'Air intake check', 'EGR valve inspection']
    },
    {
      id: 'overheating',
      name: 'Overheating',
      icon: Thermometer,
      color: 'red',
      description: 'Engine temperature too high',
      complaint: 'Engine temperature gauge reading high. Temperature warning light activated.',
      faultCodes: ['P0217', 'P0597', 'P0218'],
      services: ['Inspect cooling fan', 'Check thermostat', 'Test radiator cap', 'Flush cooling system']
    },
    {
      id: 'transmission',
      name: 'Transmission Issues',
      icon: Settings,
      color: 'purple',
      description: 'Transmission problems',
      complaint: 'Transmission slipping between gears. Delayed engagement.',
      faultCodes: ['P0700', 'P0730', 'P0750'],
      services: ['Check transmission fluid', 'Scan TCM codes', 'Road test', 'Inspect shift solenoids']
    },
    {
      id: 'electrical',
      name: 'Electrical System',
      icon: Zap,
      color: 'yellow',
      description: 'Electrical issues',
      complaint: 'Intermittent electrical problems. Battery draining overnight.',
      faultCodes: ['U0100', 'U0101', 'B1000'],
      services: ['Battery and alternator test', 'Check for parasitic draw', 'Inspect wiring harness', 'Module diagnostics']
    }
  ];

  const handleCreateFromTemplate = async (template) => {
    setCreating(template.id);
    try {
      // In a real implementation, you'd select a truck first
      // For now, we'll navigate to project creation with template data
      navigate('/projects/new', { 
        state: { 
          template: {
            complaint: template.complaint,
            faultCodes: template.faultCodes,
            services: template.services
          }
        }
      });
    } catch (error) {
      console.error('Error creating from template:', error);
    } finally {
      setCreating(null);
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      red: 'border-red-200 bg-red-50 hover:bg-red-100',
      orange: 'border-orange-200 bg-orange-50 hover:bg-orange-100',
      blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
      green: 'border-green-200 bg-green-50 hover:bg-green-100',
      yellow: 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100',
      purple: 'border-purple-200 bg-purple-50 hover:bg-purple-100'
    };
    return colors[color] || colors.blue;
  };

  const getIconColorClass = (color) => {
    const colors = {
      red: 'text-red-600',
      orange: 'text-orange-600',
      blue: 'text-blue-600',
      green: 'text-green-600',
      yellow: 'text-yellow-600',
      purple: 'text-purple-600'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Zap className="mr-3 h-8 w-8 text-[#124481]" />
            Quick Diagnostic Templates
          </h1>
          <p className="text-gray-600 mt-1">
            Start work orders with pre-configured templates for common issues
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Card 
                key={template.id}
                className={`${getColorClasses(template.color)} border-2 hover:shadow-lg transition-all cursor-pointer`}
                onClick={() => handleCreateFromTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Icon className={`h-10 w-10 ${getIconColorClass(template.color)}`} />
                    <Badge className={`${getIconColorClass(template.color)}`}>
                      Template
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-4">{template.description}</p>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-gray-700">Fault Codes:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.faultCodes.slice(0, 3).map(code => (
                          <Badge key={code} variant="outline" className="text-xs">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-semibold text-gray-700">Services:</span>
                      <p className="text-gray-600 mt-1">{template.services.length} pre-configured</p>
                    </div>
                  </div>

                  <Button 
                    className="w-full mt-4 bg-[#124481] hover:bg-[#1E7083]"
                    disabled={creating === template.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateFromTemplate(template);
                    }}
                  >
                    {creating === template.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Use Template
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="mt-8 border-[#124481] border-2">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[#124481] rounded-lg flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Use Templates</h3>
                <p className="text-gray-700 mb-3">
                  Quick diagnostic templates help you start work orders faster with pre-configured:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Common complaint descriptions</li>
                  <li>Typical fault codes for the issue</li>
                  <li>Recommended diagnostic services</li>
                  <li>Industry best practices</li>
                </ul>
                <p className="text-gray-600 mt-3 text-sm">
                  💡 <strong>Tip:</strong> After selecting a template, you can customize the work order before creating it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DiagnosticTemplates;
