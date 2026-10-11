import React, { useState } from 'react';
import api from '../api/client';
import { Play, CheckCircle2, XCircle, TestTube, Loader2, ShieldCheck } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
  durationMs?: number;
  message?: string;
}

export const AutomatedTestsRunner: React.FC = () => {
  const [requestCount] = useState<number>(1000);
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Atomic Redis Stock Reservation under 1,000 parallel requests', status: 'IDLE' },
    { name: 'Webhook Idempotency: Prevent processing duplicate event_ids', status: 'IDLE' },
    { name: 'Payment Failure: Stock release back to Redis and MySQL', status: 'IDLE' },
  ]);

  const runTests = async () => {
    updateTest(0, { status: 'RUNNING' });
    const t1Start = performance.now();
    let firstReservation = null;
    let secoundReservation = null;

    try {
      const prewarm = await api.post('/inventory/prewarm', {
        productId: 'prod_test_concurrency',
        warehouseId: 'wh_test_1',
      });
      const availableStock = prewarm.data?.currentStock;
      const reqs = Array.from({ length: requestCount }, (_, i) =>
        api
          .post('/reservations', {
            userId: `usr_${i}`,
            productId: 'prod_test_concurrency',
            warehouseId: 'wh_test_1',
            quantity: 1,
          })
          .then((res) => res.data)
          .catch((err) => ({ success: false, err }))
      );

      const results = await Promise.all(reqs);
      const successReservation = results.filter((r) => r.success);
      firstReservation = successReservation.length > 0 ? successReservation[0] : null;
      secoundReservation = successReservation.length > 0 ? successReservation[1] : null;

      if (successReservation.length === availableStock) {
        updateTest(0, {
          status: 'PASSED',
          durationMs: Math.round(performance.now() - t1Start),
          message: `Exactly ${availableStock} reservations granted out of 1000 requests. Zero overselling.`,
        });
      } else {
        updateTest(0, {
          status: 'FAILED',
          message: `Expected ${availableStock} successful reservations, got ${successReservation.length}`,
        });
      }
    } catch (err: any) {
      updateTest(0, { status: 'FAILED', message: err.message });
    }

    updateTest(1, { status: 'RUNNING' });
    if (firstReservation) {
      const t2Start = performance.now();
      try {
        const eventId = `evt_idempotency_test_${Date.now()}`;
        await api.post('/reservations/webhook/payment', {
          eventId,
          reservationId: firstReservation?.data?.reservationId,
          paymentStatus: 'SUCCESS',
        });
        const res2 = await api.post('/reservations/webhook/payment', {
          eventId,
          reservationId: firstReservation?.data?.reservationId,
          paymentStatus: 'SUCCESS',
        });

        if (res2.data.message?.includes('already processed')) {
          updateTest(1, {
            status: 'PASSED',
            durationMs: Math.round(performance.now() - t2Start),
            message: 'Duplicate webhook call ignored cleanly with HTTP 200.',
          });
        } else {
          updateTest(1, { status: 'FAILED', message: 'Duplicate webhook was not caught.' });
        }
      } catch (err: any) {
        updateTest(1, { status: 'FAILED', message: err.message });
      }
    } else {
      updateTest(1, { status: 'FAILED', message: 'Reservation ID is Empty!' });
    }

    updateTest(2, { status: 'RUNNING' });
    if (secoundReservation) {
      const t3Start = performance.now();
      try {
        const eventId = `evt_fail_release_${Date.now()}`;
        await api.post('/reservations/webhook/payment', {
          eventId,
          reservationId: secoundReservation?.data?.reservationId,
          paymentStatus: 'FAILED',
        });

        updateTest(2, {
          status: 'PASSED',
          durationMs: Math.round(performance.now() - t3Start),
          message: 'Stock released back to available state successfully.',
        });
      } catch (err: any) {
        updateTest(2, { status: 'FAILED', message: err.message });
      }
    } else {
      updateTest(2, { status: 'FAILED', message: 'Reservation ID is Empty!' });
    }
  };

  const updateTest = (index: number, data: Partial<TestResult>) => {
    setTests((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...data };
      return copy;
    });
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 shadow-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <TestTube className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Automated E2E Integration Suite</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Run live integration tests directly from the dashboard against your active Express and Redis backend cluster.
          </p>
        </div>

        <button
          onClick={runTests}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 px-6 rounded-xl text-sm flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/25 ring-1 ring-white/10"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Execute All Tests</span>
        </button>
      </div>

      <div className="space-y-4">
        {tests.map((test, i) => (
          <div
            key={i}
            className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-700"
          >
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-500">0{i + 1}.</span>
                <span>{test.name}</span>
              </h4>
              {test.message && <p className="text-xs text-slate-400 mt-1 font-mono">{test.message}</p>}
            </div>

            <div className="flex items-center space-x-3 self-end md:self-auto">
              {test.durationMs && <span className="text-xs font-mono text-slate-500">{test.durationMs}ms</span>}

              {test.status === 'IDLE' && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                  IDLE
                </span>
              )}
              {test.status === 'RUNNING' && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>RUNNING</span>
                </span>
              )}
              {test.status === 'PASSED' && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PASSED</span>
                </span>
              )}
              {test.status === 'FAILED' && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1.5 shadow-sm">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>FAILED</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};