
import React from 'react';
import { AppView } from '../types';

interface LayoutProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onViewChange, children }) => {
  const menuItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: AppView.ANALYZE, label: 'Analyze', icon: 'fa-camera' },
    { id: AppView.TRAINING, label: 'Training DB', icon: 'fa-database' },
    { id: AppView.HISTORY, label: 'History & Export', icon: 'fa-history' },
  ];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-emerald-900 text-white flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
            <i className="fas fa-leaf text-2xl"></i>
          </div>
          <span className="text-xl font-bold tracking-tight">FloraID Pro</span>
        </div>

        <nav className="flex-1 mt-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${
                currentView === item.id ? 'bg-emerald-800 border-l-4 border-emerald-400' : 'hover:bg-emerald-800/50'
              }`}
            >
              <i className={`fas ${item.icon} w-5`}></i>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 text-xs text-emerald-300 border-t border-emerald-800">
          <p>© 2024 FloraID Analytics</p>
          <p>Version 2.0.4 - Enterprise</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-auto">
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-slate-800">
            {menuItems.find(m => m.id === currentView)?.label}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Live Tracking Active
            </div>
            <img src="https://picsum.photos/32/32" className="w-8 h-8 rounded-full ring-2 ring-emerald-500" alt="Avatar" />
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
