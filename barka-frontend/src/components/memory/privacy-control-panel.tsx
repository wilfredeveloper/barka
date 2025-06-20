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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  Download,
  Trash2,
  Eye,
  FileText,
  Database,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { memoryApi, type MemorySettings, type TransparencyInfo } from '@/lib/memory-api';

interface PrivacyControlPanelProps {
  settings: MemorySettings | null;
  transparencyInfo: TransparencyInfo | null;
  onUpdate: () => void;
}

export function PrivacyControlPanel({ 
  settings, 
  transparencyInfo, 
  onUpdate 
}: PrivacyControlPanelProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async (dataTypes: string = 'all') => {
    try {
      setIsExporting(true);

      const exportData = await memoryApi.exportUserData(dataTypes);
      
      if (exportData) {
        // Create and download the file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `barka-memory-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: 'Data Exported',
          description: 'Your data has been exported and downloaded successfully.',
        });
      } else {
        toast({
          title: 'Export Failed',
          description: 'Failed to export your data. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Export Error',
        description: 'An error occurred while exporting your data.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async (dataTypes: string) => {
    try {
      setIsDeleting(true);

      const success = await memoryApi.deleteUserData(dataTypes, true);
      
      if (success) {
        toast({
          title: 'Data Deleted',
          description: `Your ${dataTypes} data has been permanently deleted.`,
        });
        onUpdate();
      } else {
        toast({
          title: 'Deletion Failed',
          description: 'Failed to delete your data. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      toast({
        title: 'Deletion Error',
        description: 'An error occurred while deleting your data.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const dataRights = settings?.dataRights || {
    canExportData: true,
    canDeleteData: true,
    canModifySettings: true,
    dataPortability: true,
  };

  return (
    <div className="space-y-6">
      {/* Data Rights Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Data Rights
          </CardTitle>
          <CardDescription>
            You have complete control over your personal data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Right to Access</p>
                <p className="text-sm text-muted-foreground">View all your stored data</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Right to Portability</p>
                <p className="text-sm text-muted-foreground">Export your data</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Right to Rectification</p>
                <p className="text-sm text-muted-foreground">Correct your information</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Right to Erasure</p>
                <p className="text-sm text-muted-foreground">Delete your data</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Download a copy of all your data in JSON format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => handleExportData('all')}
              disabled={isExporting || !dataRights.canExportData}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export All Data'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData('profile')}
              disabled={isExporting || !dataRights.canExportData}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Export Profile Only
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData('memories')}
              disabled={isExporting || !dataRights.canExportData}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Export Memories Only
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData('interests')}
              disabled={isExporting || !dataRights.canExportData}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Export Interests Only
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Your data will be exported in a machine-readable JSON format that you can 
            import into other services or keep for your records.
          </p>
        </CardContent>
      </Card>

      {/* Data Deletion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete Your Data
          </CardTitle>
          <CardDescription>
            Permanently remove your data from our systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Important Notice</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Data deletion is permanent and cannot be undone. Make sure to export 
                  your data first if you want to keep a copy.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isDeleting || !dataRights.canDeleteData}
                  className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Memories
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Memories?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your stored memories. This action 
                    cannot be undone. Your profile and settings will remain intact.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteData('memories')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Memories
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isDeleting || !dataRights.canDeleteData}
                  className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Profile
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Your Profile?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your profile, interests, and preferences. 
                    This action cannot be undone. Your memories will remain intact.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteData('profile')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Profile
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isDeleting || !dataRights.canDeleteData}
                  className="flex items-center gap-2 md:col-span-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Your Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete ALL your data including memories, 
                    profile, interests, and settings. This action cannot be undone 
                    and you will lose all personalization.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteData('all')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Status
          </CardTitle>
          <CardDescription>
            Current privacy and data protection status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Data Encryption</span>
              <Badge variant={transparencyInfo?.dataSharing?.externalServices?.encryptionEnabled ? 'default' : 'secondary'}>
                {transparencyInfo?.dataSharing?.externalServices?.encryptionEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">External Services</span>
              <Badge variant={transparencyInfo?.dataSharing?.externalServices?.mem0Integration ? 'outline' : 'default'}>
                {transparencyInfo?.dataSharing?.externalServices?.mem0Integration ? 'Connected' : 'Local Only'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Organization Sharing</span>
              <Badge variant={transparencyInfo?.dataSharing?.shareWithOrganization ? 'outline' : 'default'}>
                {transparencyInfo?.dataSharing?.shareWithOrganization ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Analytics</span>
              <Badge variant={transparencyInfo?.dataSharing?.allowAnalytics ? 'outline' : 'default'}>
                {transparencyInfo?.dataSharing?.allowAnalytics ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
