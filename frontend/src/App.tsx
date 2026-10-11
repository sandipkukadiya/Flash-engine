import React, { useState } from 'react';
import { InventoryManager } from './components/InventoryManager';
import { FlashSaleSimulator } from './components/FlashSaleSimulator';
import { AutomatedTestsRunner } from './components/AutomatedTestsRunner';
import { ShieldCheck, Zap, Warehouse, TestTube, Activity } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'simulator' | 'tests'>('simulator');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-xl text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10">
              <Zap className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                  FlashEngine
                </h1>
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  PROD
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Ultra-High Concurrency Inventory & Flash Sale Architecture</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center space-x-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'inventory'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>Inventory</span>
            </button>

            <button
              onClick={() => setActiveTab('tests')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'tests'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <TestTube className="w-3.5 h-3.5" />
              <span>Integration Tests</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-6 py-8 max-w-7xl w-full mx-auto">
        <div className="animate-in fade-in duration-300">
          {activeTab === 'simulator' && <FlashSaleSimulator />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'tests' && <AutomatedTestsRunner />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-slate-400">Zero Overselling Guarantee Powered by Atomic Redis Lua & BullMQ Queueing</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-600 font-mono">
            <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span>Node Cluster Online • Redis Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}