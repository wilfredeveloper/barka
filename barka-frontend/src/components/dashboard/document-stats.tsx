'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FileImage, FileCode, FileArchive, File } from 'lucide-react';
import Link from 'next/link';

interface DocumentType {
  type: string;
  count: number;
  size: number;
}

interface DocumentStatsProps {
  documentTypes: DocumentType[];
  totalDocuments: number;
  totalSize: number;
  isLoading?: boolean;
}

export function DocumentStats({
  documentTypes,
  totalDocuments,
  totalSize,
  isLoading = false
}: DocumentStatsProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'rtf':
      case 'odt':
        return <FileText size={20} className="text-primary" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <FileImage size={20} className="text-accent" />;
      case 'html':
      case 'css':
      case 'js':
      case 'json':
      case 'xml':
        return <FileCode size={20} className="text-orange-medium" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <FileArchive size={20} className="text-orange-dark" />;
      default:
        return <File size={20} className="text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-primary/10 rounded w-full"></div>
            <div className="h-4 bg-primary/10 rounded w-3/4"></div>
            <div className="h-4 bg-primary/10 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Document Statistics</CardTitle>
        <Button size="sm" asChild>
          <Link href="/dashboard/documents">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Documents</p>
            <p className="text-2xl font-bold">{totalDocuments}</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Size</p>
            <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
          </div>
        </div>

        <h3 className="text-sm font-medium mb-3">Document Types</h3>
        <div className="space-y-3">
          {documentTypes.map((doc) => (
            <div key={doc.type} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getFileIcon(doc.type)}
                <span className="text-sm font-medium">.{doc.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{doc.count} files</span>
                <span className="text-sm text-muted-foreground">{formatFileSize(doc.size)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
