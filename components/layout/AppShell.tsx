"use client";

import { useState } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function AppShell({ children, user }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  function toggleSidebar() {
    setIsSidebarOpen((value) => !value);
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  function toggleSidebarCollapse() {
    setIsSidebarCollapsed((value) => !value);
  }

  return (
    <div className="relative flex min-h-screen lg:h-screen flex-col lg:flex-row overflow-hidden bg-background-light text-slate-900">
      <MobileNav
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isSidebarCollapsed}
      >
        <Sidebar
          onNavClick={closeSidebar}
          onToggleCollapse={toggleSidebarCollapse}
          isCollapsed={isSidebarCollapsed}
          user={user}
        />
      </MobileNav>

      <main className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
