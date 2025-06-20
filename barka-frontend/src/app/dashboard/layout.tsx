"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat-sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ConversationProvider } from "@/contexts/ConversationContext";
import { getCurrentUser } from "@/lib/auth";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const isClientChat = pathname.includes("/dashboard/client/chat");


  // Load user data
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  // Handle client redirect - must be called unconditionally
  useEffect(() => {
    // Only attempt redirect if user exists and is a client
    if (
      user &&
      user.role === "org_client" &&
      window.location.pathname === "/dashboard"
    ) {
      router.push("/dashboard/client");
    }
  }, [user, router]);

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  // For client users, use the new sidebar layout
  if (user.role === "org_client") {
    return (
      <ConversationProvider>
        <SidebarProvider>
          <ChatSidebar user={user} />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">Barka Dashboard</h1>
              </div>
            </header>
            <div className={`flex flex-1 flex-col gap-4 p-4 ${isClientChat ? 'overflow-hidden' : ''}`}>
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ConversationProvider>
    );
  }

  // For admin users, use the new sidebar layout
  return (
    <SidebarProvider>
      <AdminSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Barka Admin Dashboard</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
