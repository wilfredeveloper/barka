'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  projectType: string;
  status: 'onboarding' | 'active' | 'paused' | 'completed';
  onboardingProgress: number;
  lastActivity: string;
}

interface ClientTableProps {
  clients: Client[];
  isLoading?: boolean;
}

export function ClientTable({ clients, isLoading = false }: ClientTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'onboarding':
        return 'bg-primary/10 text-primary border border-primary/20';
      case 'active':
        return 'bg-success/10 text-success border border-success/20';
      case 'paused':
        return 'bg-brown_sugar-200 text-brown_sugar-800 border border-brown_sugar-300';
      case 'completed':
        return 'bg-muted text-muted-foreground border border-border';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground">No clients found</p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/clients/new">Add Client</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Clients</CardTitle>
        <Button size="sm" asChild>
          <Link href="/dashboard/clients">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-sm">Client</th>
                <th className="text-left py-3 px-2 font-medium text-sm">Project Type</th>
                <th className="text-left py-3 px-2 font-medium text-sm">Status</th>
                <th className="text-left py-3 px-2 font-medium text-sm">Progress</th>
                <th className="text-left py-3 px-2 font-medium text-sm">Last Activity</th>
                <th className="text-right py-3 px-2 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b last:border-0 hover:bg-brown_sugar-600/10 hover:text-black transition-colors duration-200">
                  <td className="py-3 px-2">
                    <Link href={`/dashboard/clients/${client.id}`} className="font-medium hover:underline">
                      {client.name}
                    </Link>
                  </td>
                  <td className="py-3 px-2 text-sm">{client.projectType}</td>
                  <td className="py-3 px-2">
                    <Badge variant="outline" className={getStatusColor(client.status)}>
                      {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3 px-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${client.onboardingProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">{client.onboardingProgress}%</span>
                  </td>
                  <td className="py-3 px-2 text-sm">{client.lastActivity}</td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/documents?client=${client.id}`}>
                          <FileText size={16} />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
