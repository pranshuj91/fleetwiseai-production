import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Keyboard, X, Command } from 'lucide-react';

const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['G', 'D'], description: 'Go to Dashboard' },
        { keys: ['G', 'T'], description: 'Go to Trucks' },
        { keys: ['G', 'W'], description: 'Go to Work Orders' },
        { keys: ['G', 'C'], description: 'Go to Customers' },
        { keys: ['G', 'I'], description: 'Go to Invoices' },
        { keys: ['G', 'P'], description: 'Go to Parts' },
        { keys: ['G', 'R'], description: 'Go to Reports' }
      ]
    },
    {
      category: 'Actions',
      items: [
        { keys: ['N', 'T'], description: 'New Truck' },
        { keys: ['N', 'W'], description: 'New Work Order' },
        { keys: ['N', 'C'], description: 'New Customer' },
        { keys: ['N', 'I'], description: 'New Invoice' },
        { keys: ['N', 'E'], description: 'New Estimate' }
      ]
    },
    {
      category: 'Search & Filter',
      items: [
        { keys: ['/'], description: 'Focus Search' },
        { keys: ['F'], description: 'Open Filters' },
        { keys: ['ESC'], description: 'Close Modals' }
      ]
    },
    {
      category: 'General',
      items: [
        { keys: ['?'], description: 'Show Keyboard Shortcuts' },
        { keys: ['S'], description: 'Open Settings' },
        { keys: ['N'], description: 'Open Notifications' }
      ]
    }
  ];

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Show shortcuts panel
      if (e.key === '?') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Close with ESC
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-auto">
        <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-xl">
              <Keyboard className="mr-3 h-6 w-6" />
              Keyboard Shortcuts
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {shortcuts.map((category, idx) => (
              <div key={idx}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.items.map((item, itemIdx) => (
                    <div 
                      key={itemIdx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-gray-700">{item.description}</span>
                      <div className="flex gap-1">
                        {item.keys.map((key, keyIdx) => (
                          <React.Fragment key={keyIdx}>
                            <Badge 
                              variant="outline" 
                              className="px-3 py-1 font-mono text-sm font-semibold border-2"
                            >
                              {key}
                            </Badge>
                            {keyIdx < item.keys.length - 1 && (
                              <span className="text-gray-400 mx-1">then</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Command className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Pro Tip:</p>
                <p>Press <Badge variant="outline" className="mx-1 font-mono">?</Badge> anytime to see this shortcuts menu.</p>
                <p className="mt-2">Shortcuts work when you're not typing in a text field.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeyboardShortcuts;
