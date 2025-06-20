'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CombinedStatCardProps {
  leftMetric: {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: {
      value: number;
      isPositive: boolean;
    };
  };
  rightMetric: {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: {
      value: number;
      isPositive: boolean;
    };
  };
  className?: string;
}

export function CombinedStatCard({
  leftMetric,
  rightMetric,
  className,
}: CombinedStatCardProps) {
  return (
    <Card
      variant="glass"
      className={cn("overflow-hidden transition-transform duration-300 ease-in-out hover:cursor-pointer", className)}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {/* Left Metric */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{leftMetric.title}</p>
                <h3 className="text-2xl font-bold mt-1">{leftMetric.value}</h3>
                {leftMetric.trend && (
                  <div className="flex items-center mt-2">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        leftMetric.trend.isPositive ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {leftMetric.trend.isPositive ? "+" : "-"}{Math.abs(leftMetric.trend.value)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">vs last month</span>
                  </div>
                )}
              </div>
              {leftMetric.icon && <div className="text-muted-foreground">{leftMetric.icon}</div>}
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-border to-transparent mx-6"></div>

          {/* Right Metric */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{rightMetric.title}</p>
                <h3 className="text-2xl font-bold mt-1">{rightMetric.value}</h3>
                {rightMetric.trend && (
                  <div className="flex items-center mt-2">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        rightMetric.trend.isPositive ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {rightMetric.trend.isPositive ? "+" : "-"}{Math.abs(rightMetric.trend.value)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">vs last month</span>
                  </div>
                )}
              </div>
              {rightMetric.icon && <div className="text-muted-foreground">{rightMetric.icon}</div>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
