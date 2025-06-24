'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  FolderKanban,
  UserCheck
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { CombinedStatCard } from '@/components/dashboard/combined-stat-card';
import { ClientTable } from '@/components/dashboard/client-table';
import { DocumentStats } from '@/components/dashboard/document-stats';
import api from '@/lib/api';

// Define types for our data
interface Client {
  id: string;
  name: string;
  projectType: string;
  status: 'onboarding' | 'active' | 'paused' | 'completed';
  onboardingProgress: number;
  lastActivity: string;
}

interface DocumentType {
  type: string;
  count: number;
  size: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalTeamMembers: 0,
    activeTeamMembers: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalDocuments: 0,
    totalDocumentSize: 0
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    setUser(currentUser);

    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch data from our dashboard API
        const [dashboardResponse, teamResponse, projectResponse] = await Promise.all([
          api.get('/dashboard'),
          api.get('/team-members/stats'),
          api.get('/analytics/projects/overview')
        ]);

        if (dashboardResponse.data.success) {
          const { data } = dashboardResponse.data;

          // Get team stats
          console.log('Team Response:', teamResponse.data);
          const teamStats = teamResponse.data.success ? teamResponse.data.data : { totalMembers: 0, statusDistribution: [] };
          const activeTeamMembers = teamStats.statusDistribution?.find((s: any) => s._id === 'active')?.count || 0;
          console.log('Team Stats:', teamStats, 'Active Members:', activeTeamMembers);

          // Get project stats
          console.log('Project Response:', projectResponse.data);
          const projectStats = projectResponse.data.success ? projectResponse.data.data : { summary: { totalProjects: 0 }, distributions: { byStatus: [] } };
          const activeProjects = projectStats.distributions?.byStatus?.find((s: any) => s._id === 'active')?.count || 0;
          console.log('Project Stats:', projectStats, 'Active Projects:', activeProjects);

          // Update stats
          setStats({
            totalClients: data.stats.totalClients,
            activeClients: data.stats.activeClients,
            totalTeamMembers: teamStats.totalMembers || 0,
            activeTeamMembers: activeTeamMembers,
            totalProjects: projectStats.summary?.totalProjects || 0,
            activeProjects: activeProjects,
            totalDocuments: data.stats.totalDocuments,
            totalDocumentSize: data.stats.totalDocumentSize
          });

          // Update clients and document types
          setClients(data.clients);
          setDocumentTypes(data.documentTypes);
        } else {
          console.error('API error:', dashboardResponse.data.message);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Log individual API call errors
        if (error.response) {
          console.error('API Error Response:', error.response.data);
          console.error('API Error Status:', error.response.status);

          // If it's an organization setup error, redirect to onboarding
          if (error.response.status === 400 &&
              error.response.data.message?.includes('organization')) {
            router.push('/onboarding/organization');
            return;
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-primary/20 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-primary/20 rounded mb-3"></div>
          <div className="h-3 w-24 bg-primary/10 rounded"></div>
        </div>
      </div>
    );
  }

  // Add error handling
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-primary/20 rounded mb-2"></div>
            <div className="h-4 w-64 bg-primary/10 rounded"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 animate-pulse">
              <div className="h-5 w-24 bg-primary/10 rounded mb-4"></div>
              <div className="h-8 w-16 bg-primary/20 rounded mb-2"></div>
              <div className="h-4 w-32 bg-primary/10 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.firstName}! Here's what's happening.</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <CombinedStatCard
          leftMetric={{
            title: "Total Clients",
            value: isLoading ? '...' : stats.totalClients,
            icon: <Users size={20} />,
            trend: { value: 12, isPositive: true }
          }}
          rightMetric={{
            title: "Active Clients",
            value: isLoading ? '...' : stats.activeClients,
            icon: <Users size={20} />,
            trend: { value: 8, isPositive: true }
          }}
        />
        <CombinedStatCard
          leftMetric={{
            title: "Total Team Members",
            value: isLoading ? '...' : stats.totalTeamMembers,
            icon: <UserCheck size={20} />,
            trend: { value: 5, isPositive: true }
          }}
          rightMetric={{
            title: "Active Team Members",
            value: isLoading ? '...' : stats.activeTeamMembers,
            icon: <UserCheck size={20} />,
            trend: { value: 3, isPositive: true }
          }}
        />
        <CombinedStatCard
          leftMetric={{
            title: "Total Projects",
            value: isLoading ? '...' : stats.totalProjects,
            icon: <FolderKanban size={20} />,
            trend: { value: 7, isPositive: true }
          }}
          rightMetric={{
            title: "Active Projects",
            value: isLoading ? '...' : stats.activeProjects,
            icon: <FolderKanban size={20} />,
            trend: { value: 4, isPositive: true }
          }}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Table */}
          <ClientTable clients={clients} isLoading={isLoading} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Document Stats */}
          <DocumentStats
            documentTypes={documentTypes}
            totalDocuments={stats.totalDocuments}
            totalSize={stats.totalDocumentSize}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
