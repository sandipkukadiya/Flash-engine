import React, { useState } from 'react';
import api from '../api/client';
import { Zap, CheckCircle2, XCircle, RefreshCw, Clock, Activity, ShieldAlert } from 'lucide-react';

export const FlashSaleSimulator: React.FC = () => {
  const [requestCount, setRequestCount] = useState<number>(1000);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);

  const handleSimulate = async () => {
    setIsSimulating(true);
    const startTime = performance.now();

    try {
      await api.post('/inventory/prewarm', {
        productId: 'prod_flash_demo',
        warehouseId: 'wh_surat_01',
      });

      const reqs = Array.from({ length: requestCount }, (_, i) =>
        api
          .post('/reservations', {
            userId: `usr_buyer_${i + 1}`,
            productId: 'prod_flash_demo',
            warehouseId: 'wh_surat_01',
            quantity: Math.floor(Math.random() * 3) + 1,
          })
          .then((res) => res.data)
          .catch((err) => ({ success: false, err }))
      );

      const responses = await Promise.all(reqs);
      const endTime = performance.now();

      const successful = responses.filter((r) => r.success);
      const rejected = responses.filter((r) => !r.success);

      setResults({
        totalRequests: requestCount,
        successfulCount: successful.length,
        rejectedCount: rejected.length,
        executionTimeMs: (endTime - startTime).toFixed(2),
        successfulReservations: successful.map((s) => s.data),
      });
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleWebhook = async (reservationId: string, status: 'SUCCESS' | 'FAILED') => {
    try {
      await api.post('/reservations/webhook/payment', {
        eventId: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        reservationId,
        paymentStatus: status,
      });
      alert(`Webhook Triggered: Payment status set to ${status}`);
    } catch (err: any) {
      alert(`Webhook Error: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <Zap className="w-5 h-5 fill-amber-400/20" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Flash Sale Stress Tester</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Simulate thousands of concurrent purchase requests hitting your Redis Lua atomic lock layer to verify zero overselling under intense traffic spikes.
            </p>
          </div>
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
            Target SKU: <span className="text-indigo-400 font-bold">prod_flash_demo</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Concurrent Requests Load
            </label>
            <input
              type="number"
              value={requestCount}
              onChange={(e) => setRequestCount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              placeholder="e.g. 1000"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center space-x-2.5 transition-all shadow-lg shadow-indigo-600/30 ring-1 ring-white/10 disabled:opacity-50"
            >
              {isSimulating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
              <span>{isSimulating ? 'Executing High-Concurrency Stress Test...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics & Execution Output */}
      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Total Requests</span>
              </span>
              <p className="text-3xl font-black text-white mt-2 font-mono tracking-tight">{results.totalRequests}</p>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reserved (Success)</span>
              </span>
              <p className="text-3xl font-black text-emerald-400 mt-2 font-mono tracking-tight">{results.successfulCount}</p>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Rejected (OOS)</span>
              </span>
              <p className="text-3xl font-black text-rose-400 mt-2 font-mono tracking-tight">{results.rejectedCount}</p>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Roundtrip Latency</span>
              </span>
              <p className="text-3xl font-black text-cyan-400 mt-2 font-mono tracking-tight">
                {results.executionTimeMs} <span className="text-sm font-normal text-slate-400">ms</span>
              </p>
            </div>
          </div>

          {/* Active Reservations Table */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Active 15-Minute Reservations & Payment Webhook Controls</span>
              </h3>
              <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                {results.successfulReservations.length} Active Tokens
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-4 rounded-l-xl">Reservation Token ID</th>
                    <th className="p-4">TTL Timeout</th>
                    <th className="p-4 rounded-r-xl">Simulate Payment Webhook</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {results.successfulReservations.map((res: any) => (
                    <tr key={res.reservationId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-bold text-indigo-400">{res.reservationId}</td>
                      <td className="p-4 text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{res.expiresInSeconds}s</span>
                      </td>
                      <td className="p-4 flex space-x-2">
                        <button
                          onClick={() => handleWebhook(res.reservationId, 'SUCCESS')}
                          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl hover:bg-emerald-500/20 flex items-center space-x-1.5 transition-all font-sans font-semibold shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pay Success</span>
                        </button>
                        <button
                          onClick={() => handleWebhook(res.reservationId, 'FAILED')}
                          className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3.5 py-1.5 rounded-xl hover:bg-rose-500/20 flex items-center space-x-1.5 transition-all font-sans font-semibold shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Pay Fail (Release Stock)</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};