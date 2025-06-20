'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Shield,
  Eye,
  Database,
  TrendingUp,
  Clock,
  Tag,
  BarChart3,
} from 'lucide-react';
import { memoryApi, type MemorySettings, type TransparencyInfo, type UserMemory, type UserInterest } from '@/lib/memory-api';
import { MemorySettingsPanel } from './memory-settings-panel';
import { PrivacyControlPanel } from './privacy-control-panel';
import { DataTransparencyPanel } from './data-transparency-panel';

interface MemoryDashboardProps {
  className?: string;
}

export function MemoryDashboard({ className }: MemoryDashboardProps) {
  const [memorySettings, setMemorySettings] = useState<MemorySettings | null>(null);
  const [transparencyInfo, setTransparencyInfo] = useState<TransparencyInfo | null>(null);
  const [recentMemories, setRecentMemories] = useState<UserMemory[]>([]);
  const [userInterests, setUserInterests] = useState<UserInterest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load all dashboard data in parallel
      const [settings, transparency, memories, interests] = await Promise.all([
        memoryApi.getMemorySettings(),
        memoryApi.getTransparencyInfo(),
        memoryApi.searchMemories('', '', 5), // Get 5 recent memories
        memoryApi.getUserInterests(5), // Get top 5 interests
      ]);

      setMemorySettings(settings);
      setTransparencyInfo(transparency);
      setRecentMemories(memories);
      setUserInterests(interests);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsUpdate = () => {
    // Reload data when settings are updated
    loadDashboardData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading memory dashboard...</p>
        </div>
      </div>
    );
  }

  const privacyLevel = memorySettings?.privacyLevel || 'standard';
  const totalMemories = memorySettings?.memoryStatistics?.totalMemories || 0;
  const personalizationEnabled = memorySettings?.allowPersonalization || false;

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Privacy Level</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{privacyLevel}</div>
              <Badge 
                variant={privacyLevel === 'minimal' ? 'secondary' : 
                        privacyLevel === 'standard' ? 'default' : 
                        privacyLevel === 'enhanced' ? 'outline' : 'destructive'}
                className="mt-1"
              >
                {privacyLevel === 'minimal' && 'Basic Protection'}
                {privacyLevel === 'standard' && 'Balanced'}
                {privacyLevel === 'enhanced' && 'Advanced'}
                {privacyLevel === 'full' && 'Maximum Data'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stored Memories</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMemories}</div>
              <p className="text-xs text-muted-foreground">
                Across {memorySettings?.memoryStatistics?.typeBreakdown?.length || 0} categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personalization</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {personalizationEnabled ? 'Active' : 'Disabled'}
              </div>
              <Badge variant={personalizationEnabled ? 'default' : 'secondary'} className="mt-1">
                {personalizationEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Retention</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {memorySettings?.dataRetentionDays || 365}
              </div>
              <p className="text-xs text-muted-foreground">Days</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="transparency" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Data View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Memory Types Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Memory Types
                  </CardTitle>
                  <CardDescription>
                    Breakdown of your stored memories by type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {memorySettings?.memoryStatistics?.typeBreakdown?.map((type) => (
                      <div key={type._id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{type._id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{type.count}</span>
                          <Badge variant="outline" className="text-xs">
                            {type.totalAccess} views
                          </Badge>
                        </div>
                      </div>
                    )) || (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No memories stored yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Interests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Your Interests
                  </CardTitle>
                  <CardDescription>
                    Topics you've shown interest in
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userInterests.length > 0 ? (
                      userInterests.map((interest) => (
                        <div key={interest.topic} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize">{interest.topic}</span>
                            <span className="text-muted-foreground">
                              {Math.round(interest.score * 100)}%
                            </span>
                          </div>
                          <Progress value={interest.score * 100} className="h-2" />
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No interests tracked yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Memories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Recent Memories
                </CardTitle>
                <CardDescription>
                  Your most recently stored information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentMemories.length > 0 ? (
                    recentMemories.map((memory) => (
                      <div key={memory.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="capitalize">
                            {memory.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(memory.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">
                          {memory.summary || memory.content.substring(0, 100)}
                          {memory.content.length > 100 && '...'}
                        </p>
                        {memory.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {memory.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No memories stored yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <MemorySettingsPanel 
              settings={memorySettings} 
              onUpdate={handleSettingsUpdate}
            />
          </TabsContent>

          <TabsContent value="privacy">
            <PrivacyControlPanel 
              settings={memorySettings}
              transparencyInfo={transparencyInfo}
              onUpdate={handleSettingsUpdate}
            />
          </TabsContent>

          <TabsContent value="transparency">
            <DataTransparencyPanel 
              transparencyInfo={transparencyInfo}
              onRefresh={loadDashboardData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
