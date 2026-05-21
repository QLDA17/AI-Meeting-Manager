/**
 * Layout Component (v2)
 * Main layout với Sidebar và Header mới
 */
import React from "react";
import { Outlet } from "react-router-dom";
import { useUIStore } from "../stores";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

const Layout: React.FC = () => {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  return (
    <div className="app-bg flex h-screen overflow-hidden bg-gray-50 text-gray-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-0">
        <Header />
        <div className="custom-scrollbar h-[calc(100vh-64px)] overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
