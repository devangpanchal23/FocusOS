import React from 'react';
import { Sidebar } from './Sidebar.js';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#09090b] flex text-zinc-100 font-sans">
      <Sidebar />
      <div className="flex-1 ml-64 min-w-0 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
};
