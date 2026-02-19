import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Sparkles } from 'lucide-react';

const PreROModePanel = ({ 
  workOrderNumber, 
  truckInfo = 'Unknown', 
  totalTasks = 0, 
  pendingTasks = 0, 
  inProgressTasks = 0, 
  completedTasks = 0,
  onAISummary 
}) => {
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Card className="mb-6 overflow-hidden border-0 shadow-md">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              Work Order: {workOrderNumber ? `#${workOrderNumber}` : 'Pre-RO Mode'}
            </h2>
            <p className="text-white/80 text-sm mt-0.5">{truckInfo}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onAISummary}
            className="bg-white/10 border-white/30 text-white hover:bg-white hover:text-[#1E7083] transition-colors"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI Summary
          </Button>
        </div>
      </div>

      {/* Progress Section */}
      <CardContent className="pt-5 pb-6 px-6">
        {/* Overall Progress */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-600">
              {completedTasks} of {totalTasks} tasks complete ({progressPercent}%)
            </span>
          </div>
          <Progress 
            value={progressPercent} 
            className="h-2.5 bg-gray-200"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="border rounded-xl p-4 text-center bg-gray-50 border-gray-200">
            <div className="text-2xl font-bold text-gray-800">{totalTasks}</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">Total</div>
          </div>
          <div className="border rounded-xl p-4 text-center bg-yellow-50 border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{pendingTasks}</div>
            <div className="text-xs text-yellow-600 font-medium uppercase tracking-wide mt-1">Pending</div>
          </div>
          <div className="border rounded-xl p-4 text-center bg-blue-50 border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
            <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mt-1">In Progress</div>
          </div>
          <div className="border rounded-xl p-4 text-center bg-green-50 border-green-200">
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <div className="text-xs text-green-600 font-medium uppercase tracking-wide mt-1">Completed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreROModePanel;
