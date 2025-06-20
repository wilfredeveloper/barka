/**
 * Agent Status Indicator Component
 * 
 * Shows real-time status updates during agent processing with:
 * - Progressive status messages
 * - Visual indicators for different processing stages
 * - Smooth transitions between states
 * - Timeout handling
 */

import React, { useState, useEffect } from 'react';
import { StatusUpdate } from '@/lib/adk-event-consolidator';

interface AgentStatusIndicatorProps {
  statusUpdates: StatusUpdate[];
  isProcessing: boolean;
  timeElapsed: number;
  onTimeout?: () => void;
  className?: string;
}

const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  statusUpdates,
  isProcessing,
  timeElapsed,
  onTimeout,
  className = ''
}) => {
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  // Get current status message
  const currentStatus = statusUpdates[currentStatusIndex]?.message || 'Analyzing your request...';
  const currentType = statusUpdates[currentStatusIndex]?.type || 'analyzing';

  // Auto-advance through status updates
  useEffect(() => {
    if (statusUpdates.length > 1 && currentStatusIndex < statusUpdates.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStatusIndex(prev => Math.min(prev + 1, statusUpdates.length - 1));
      }, 2000); // Show each status for 2 seconds

      return () => clearTimeout(timer);
    }
  }, [statusUpdates, currentStatusIndex]);

  // Handle timeout warnings
  useEffect(() => {
    if (timeElapsed > 20000 && isProcessing) { // 20 seconds
      setShowTimeoutWarning(true);
    } else {
      setShowTimeoutWarning(false);
    }

    if (timeElapsed > 30000 && isProcessing && onTimeout) { // 30 seconds
      onTimeout();
    }
  }, [timeElapsed, isProcessing, onTimeout]);

  // Reset when processing starts
  useEffect(() => {
    if (isProcessing) {
      setCurrentStatusIndex(0);
      setShowTimeoutWarning(false);
    }
  }, [isProcessing]);

  if (!isProcessing) {
    return null;
  }

  return (
    <div className={`flex w-full gap-3 items-start justify-start ${className}`}>
      {/* Agent Avatar */}
      <div className="flex-shrink-0 w-16 flex flex-col items-center gap-1 mt-1 text-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-blue-600">
          <StatusIcon type={currentType} />
        </div>
        <span className="text-xs font-medium text-blue-400 truncate w-full">
          Agent
        </span>
      </div>

      {/* Status Content */}
      <div className="max-w-[80%] flex flex-col items-start">
        <div className="p-3 rounded-xl shadow-sm w-fit bg-zinc-800 text-zinc-100 border border-zinc-700">
          <div className="flex items-center gap-3">
            {/* Animated Dots */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>

            {/* Status Message */}
            <span className="text-sm font-medium">
              {currentStatus}
            </span>
          </div>

          {/* Progress Indicator */}
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            <div className="flex-1 bg-zinc-700 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${Math.min((currentStatusIndex + 1) / Math.max(statusUpdates.length, 1) * 100, 90)}%` 
                }}
              />
            </div>
            <span>{Math.floor(timeElapsed / 1000)}s</span>
          </div>

          {/* Timeout Warning */}
          {showTimeoutWarning && (
            <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Taking longer than usual...
            </div>
          )}

          {/* Status History (Debug Mode) */}
          {process.env.NODE_ENV === 'development' && statusUpdates.length > 1 && (
            <div className="mt-2 pt-2 border-t border-zinc-700">
              <div className="text-xs text-zinc-500">
                Status History:
                {statusUpdates.map((update, index) => (
                  <div 
                    key={update.id}
                    className={`ml-2 ${index === currentStatusIndex ? 'text-blue-400' : 'text-zinc-600'}`}
                  >
                    {index + 1}. {update.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Status Icon Component
 */
const StatusIcon: React.FC<{ type: StatusUpdate['type'] }> = ({ type }) => {
  const iconMap = {
    analyzing: '🤔',
    transferring: '🔄',
    gathering: '📊',
    processing: '⚙️',
    completing: '✅'
  };

  return <span>{iconMap[type] || '🤖'}</span>;
};

export default AgentStatusIndicator;
