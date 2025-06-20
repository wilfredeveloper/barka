'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  BarChart3,
  Database,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Shield,
  TrendingUp,
  MessageSquare,
  Clock,
  Users,
  ExternalLink,
} from 'lucide-react';
import { type TransparencyInfo } from '@/lib/memory-api';

interface DataTransparencyPanelProps {
  transparencyInfo: TransparencyInfo | null;
  onRefresh: () => void;
}

export function DataTransparencyPanel({ 
  transparencyInfo, 
  onRefresh 
}: DataTransparencyPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    personalization: false,
    sharing: false,
    purposes: false,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!transparencyInfo) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No transparency data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { dataOverview, personalizationUsage, dataSharing, userRights, dataProcessingPurposes } = transparencyInfo;

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Data Transparency Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Complete overview of your data and how it's being used
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Data Overview */}
      <Collapsible
        open={expandedSections.overview}
        onOpenChange={() => toggleSection('overview')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Overview
                </div>
                {expandedSections.overview ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CardTitle>
              <CardDescription>
                Summary of all data stored about you
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{dataOverview.totalMemories}</div>
                  <p className="text-sm text-muted-foreground">Total Memories</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{dataOverview.memoryTypes.length}</div>
                  <p className="text-sm text-muted-foreground">Memory Categories</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{dataOverview.dataRetentionDays}</div>
                  <p className="text-sm text-muted-foreground">Retention Days</p>
                </div>
              </div>

              {dataOverview.memoryTypes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Memory Types Breakdown</h4>
                  <div className="space-y-2">
                    {dataOverview.memoryTypes.map((type) => (
                      <div key={type._id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {type._id}
                          </Badge>
                          <span className="text-sm">{type.count} items</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {type.totalAccess} total views
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Profile exists: {dataOverview.profileExists ? 'Yes' : 'No'}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Personalization Usage */}
      <Collapsible
        open={expandedSections.personalization}
        onOpenChange={() => toggleSection('personalization')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Personalization Usage
                </div>
                {expandedSections.personalization ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CardTitle>
              <CardDescription>
                How your data is used for personalization
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Personalization Enabled</span>
                  </div>
                  <Badge variant={personalizationUsage.isPersonalizationEnabled ? 'default' : 'secondary'}>
                    {personalizationUsage.isPersonalizationEnabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Communication Style Adaptation</span>
                  </div>
                  <Badge variant={personalizationUsage.communicationStyleAdaptation ? 'default' : 'secondary'}>
                    {personalizationUsage.communicationStyleAdaptation ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Interest-Based Recommendations</span>
                  </div>
                  <Badge variant={personalizationUsage.interestBasedRecommendations ? 'default' : 'secondary'}>
                    {personalizationUsage.interestBasedRecommendations ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Interaction Pattern Tracking</span>
                  </div>
                  <Badge variant={personalizationUsage.interactionPatternTracking ? 'default' : 'secondary'}>
                    {personalizationUsage.interactionPatternTracking ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Data Sharing */}
      <Collapsible
        open={expandedSections.sharing}
        onOpenChange={() => toggleSection('sharing')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Data Sharing & Security
                </div>
                {expandedSections.sharing ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CardTitle>
              <CardDescription>
                How your data is shared and protected
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Share with Organization</span>
                  </div>
                  <Badge variant={dataSharing.shareWithOrganization ? 'outline' : 'default'}>
                    {dataSharing.shareWithOrganization ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Analytics Collection</span>
                  </div>
                  <Badge variant={dataSharing.allowAnalytics ? 'outline' : 'default'}>
                    {dataSharing.allowAnalytics ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">External Services</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Mem0 Integration</span>
                      </div>
                      <Badge variant={dataSharing.externalServices.mem0Integration ? 'outline' : 'default'}>
                        {dataSharing.externalServices.mem0Integration ? 'Connected' : 'Local Only'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Data Encryption</span>
                      </div>
                      <Badge variant={dataSharing.externalServices.encryptionEnabled ? 'default' : 'secondary'}>
                        {dataSharing.externalServices.encryptionEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Data Processing Purposes */}
      <Collapsible
        open={expandedSections.purposes}
        onOpenChange={() => toggleSection('purposes')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Data Processing Purposes
                </div>
                {expandedSections.purposes ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CardTitle>
              <CardDescription>
                Why we collect and process your data
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-2">
                {dataProcessingPurposes.map((purpose, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-sm">{purpose}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* User Rights Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Rights Summary
          </CardTitle>
          <CardDescription>
            What you can do with your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(userRights).map(([right, enabled]) => (
              <div key={right} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm capitalize">
                  {right.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date(transparencyInfo.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}
