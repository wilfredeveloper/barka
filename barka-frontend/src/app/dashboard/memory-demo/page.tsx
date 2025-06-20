'use client';

import { MemoryDashboard } from '@/components/memory/memory-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MemoryDemoPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Memory & Personalization Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete control over your data and personalization settings
            </p>
          </div>
        </div>
      </div>

      {/* Demo Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Demo Mode</CardTitle>
          <CardDescription className="text-blue-700">
            This is a demonstration of the Memory & Personalization Dashboard. 
            In production, this would be integrated into your profile settings and 
            connected to the ovara-agent memory system.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="space-y-2">
            <p><strong>Features demonstrated:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Privacy-first memory management with strict user access controls</li>
              <li>Comprehensive user profiling and interest tracking</li>
              <li>State-of-the-art personalization settings</li>
              <li>Complete data transparency and observability</li>
              <li>GDPR-compliant data export and deletion</li>
              <li>Real-time privacy controls and settings management</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Memory Dashboard */}
      <MemoryDashboard />
    </div>
  );
}
