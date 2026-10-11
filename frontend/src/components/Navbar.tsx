import React from 'react';
import { Zap, Warehouse, TestTube, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'simulator' | 'inventory' | 'tests';
  setActiveTab: (tab: 'simulator' | 'inventory' | 'tests') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              FlashEngine
            </h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Ultra-High Concurrency Warehouse Portal</p>
        </div>
      </div>

      <nav className="flex space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800/80 shadow-inner">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'simulator'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Flash Sale Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'inventory'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Warehouse className="w-4 h-4 text-cyan-400" />
          <span>Inventory Manager</span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'tests'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <TestTube className="w-4 h-4 text-emerald-400" />
          <span>Integration Tests</span>
        </button>
      </nav>
    </header>
  );
};