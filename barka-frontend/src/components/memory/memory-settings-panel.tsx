'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Brain,
  Settings,
  Clock,
  MessageSquare,
  TrendingUp,
  Bell,
  Save,
} from 'lucide-react';
import { memoryApi, type MemorySettings } from '@/lib/memory-api';

interface MemorySettingsPanelProps {
  settings: MemorySettings | null;
  onUpdate: () => void;
}

export function MemorySettingsPanel({ settings, onUpdate }: MemorySettingsPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    privacyLevel: settings?.privacyLevel || 'standard',
    dataRetentionDays: settings?.dataRetentionDays || 365,
    allowPersonalization: settings?.allowPersonalization ?? true,
    allowAnalytics: settings?.allowAnalytics ?? true,
    shareWithOrganization: settings?.shareWithOrganization ?? true,
  });

  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);

      // Update each setting
      const updates = [
        { setting: 'privacyLevel', value: localSettings.privacyLevel },
        { setting: 'dataRetentionDays', value: localSettings.dataRetentionDays.toString() },
        { setting: 'allowPersonalization', value: localSettings.allowPersonalization.toString() },
        { setting: 'allowAnalytics', value: localSettings.allowAnalytics.toString() },
        { setting: 'shareWithOrganization', value: localSettings.shareWithOrganization.toString() },
      ];

      const results = await Promise.all(
        updates.map(({ setting, value }) => 
          memoryApi.updateMemorySetting(setting, value)
        )
      );

      const allSuccessful = results.every(result => result);

      if (allSuccessful) {
        toast({
          title: 'Settings Updated',
          description: 'Your memory and personalization settings have been saved.',
        });
        onUpdate();
      } else {
        toast({
          title: 'Partial Update',
          description: 'Some settings may not have been saved. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const privacyLevelDescriptions = {
    minimal: 'Store only essential information with limited personalization',
    standard: 'Balanced approach with moderate personalization and data collection',
    enhanced: 'Advanced personalization with detailed interaction tracking',
    full: 'Maximum personalization with comprehensive data collection'
  };

  return (
    <div className="space-y-6">
      {/* Privacy Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Privacy Level
          </CardTitle>
          <CardDescription>
            Control how much information is collected and used for personalization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="privacy-level">Privacy Level</Label>
            <Select
              value={localSettings.privacyLevel}
              onValueChange={(value) => handleSettingChange('privacyLevel', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select privacy level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="enhanced">Enhanced</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {privacyLevelDescriptions[localSettings.privacyLevel as keyof typeof privacyLevelDescriptions]}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Data Retention
          </CardTitle>
          <CardDescription>
            How long your data should be stored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retention-days">Retention Period (Days)</Label>
            <Input
              id="retention-days"
              type="number"
              min="1"
              max="3650"
              value={localSettings.dataRetentionDays}
              onChange={(e) => handleSettingChange('dataRetentionDays', parseInt(e.target.value) || 365)}
            />
            <p className="text-sm text-muted-foreground">
              Data will be automatically deleted after this period (1-3650 days)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Personalization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Personalization
          </CardTitle>
          <CardDescription>
            Control how your data is used to personalize your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Enable Personalization
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow the system to adapt responses based on your preferences and interests
              </p>
            </div>
            <Switch
              checked={localSettings.allowPersonalization}
              onCheckedChange={(checked) => handleSettingChange('allowPersonalization', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Communication Style Adaptation
              </Label>
              <p className="text-sm text-muted-foreground">
                Adapt communication style based on your preferences and interaction patterns
              </p>
            </div>
            <Switch
              checked={localSettings.allowPersonalization}
              onCheckedChange={(checked) => handleSettingChange('allowPersonalization', checked)}
              disabled={!localSettings.allowPersonalization}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Analytics and Insights
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow collection of usage analytics to improve the service
              </p>
            </div>
            <Switch
              checked={localSettings.allowAnalytics}
              onCheckedChange={(checked) => handleSettingChange('allowAnalytics', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Organization Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Organization Sharing
          </CardTitle>
          <CardDescription>
            Control what information is shared with your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Share with Organization</Label>
              <p className="text-sm text-muted-foreground">
                Allow your organization to access aggregated insights from your interactions
              </p>
            </div>
            <Switch
              checked={localSettings.shareWithOrganization}
              onCheckedChange={(checked) => handleSettingChange('shareWithOrganization', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
