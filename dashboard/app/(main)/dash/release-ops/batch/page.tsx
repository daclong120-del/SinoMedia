"use client";

import React, { useState } from 'react';
import ReleaseOpsNavTabs from '@/components/dashboard/release-ops/ReleaseOpsNavTabs';

export default function BatchOpsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [rollbackPlanInput, setRollbackPlanInput] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const openModal = () => {
    setModalStep(1);
    setRollbackPlanInput('');
    setShowCreateModal(true);
  };

  const handleBatchAction = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div suppressHydrationWarning className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header Strip & Sub-nav Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">Creative Lutech Release Ops</h1>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-muted border border-border">102 apps</span>
            <span>&bull;</span>
            <span className="px-2 py-0.5 rounded bg-muted border border-border">4 dev accounts</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
        </div>
      </div>

      {/* Action Toast Feedback */}
      {actionNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs font-semibold animate-in fade-in duration-200">
          ✅ {actionNotice}
        </div>
      )}

      {/* ─── Batch Jobs Grid (Matching Image 1) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Bump AdMob 23.6.0 */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Bump AdMob 23.6.0 &mdash; batch IAA #1</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                running
              </span>
            </div>

            <span className="text-[11px] font-mono text-muted-foreground block">
              dependency_bump &bull; 30 apps &bull; concurrency 5 &bull; canary
            </span>

            {/* Segmented Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-700 dark:bg-emerald-500" style={{ width: '40%' }} />
                <div className="h-full bg-blue-600 dark:bg-blue-400" style={{ width: '17%' }} />
                <div className="h-full bg-rose-600 dark:bg-rose-500" style={{ width: '7%' }} />
                <div className="h-full bg-slate-300 dark:bg-zinc-700" style={{ width: '36%' }} />
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono font-semibold text-muted-foreground">
                <span className="flex items-center gap-1"><span className="size-2 rounded-xs bg-emerald-700" /> success 12</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-xs bg-blue-600" /> running 5</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-xs bg-rose-600" /> failed 2</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-xs bg-slate-300" /> pending 11</span>
              </div>
            </div>

            {/* Canary Passed Banner */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
              <strong className="block font-bold">Canary passed 3/3 &mdash; QR Scanner Plus, Sticker Studio, Photo Frame AI build + upload internal OK.</strong>
              <span>Đã mở van 27 apps còn lại.</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => handleBatchAction('Đã khởi chạy lại 2 app bị lỗi (Retry Failed triggered)')}
              className="px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted"
            >
              Retry failed
            </button>
            <button
              onClick={() => handleBatchAction('Đã hủy các app pending còn lại')}
              className="px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted text-rose-600"
            >
              Cancel pending
            </button>
          </div>
        </div>

        {/* Card 2: Promote production 10% */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Promote production 10% &mdash; tuần 27</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                completed
              </span>
            </div>

            <span className="text-[11px] font-mono text-muted-foreground block">
              mass_promote &bull; 8 releases &bull; production @ 10%
            </span>

            {/* 100% Success Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-emerald-700 dark:bg-emerald-500 rounded-full" />
              <div className="text-[10px] font-mono font-semibold text-muted-foreground">
                <span className="flex items-center gap-1"><span className="size-2 rounded-xs bg-emerald-700" /> success 8</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => handleBatchAction('Đã tăng Rollout từ 10% lên 25% cho 8 releases')}
              className="px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-foreground"
            >
              Tăng rollout &rarr; 25%
            </button>
          </div>
        </div>

        {/* Card 3: targetSdk 36 */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">targetSdk 36 &mdash; đợt 1</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
                pending
              </span>
            </div>

            <span className="text-[11px] font-mono text-muted-foreground block">
              target_sdk_update &bull; 17 apps &bull; chưa chạy
            </span>

            {/* Pending Bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-slate-200 dark:bg-zinc-700 rounded-full" />
              <div className="text-[10px] font-mono font-semibold text-muted-foreground">
                <span className="flex items-center gap-1"><span className="size-2 rounded-xs bg-slate-300" /> pending 17</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => handleBatchAction('Đã kích hoạt chạy thử Canary cho 3/17 apps')}
              className="px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted"
            >
              Start (canary)
            </button>
            <button
              onClick={openModal}
              className="px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted"
            >
              Xem danh sách apps
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2-Step Preview Modal ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Xem danh sách Apps &amp; Preview Batch (Bước {modalStep}/2)</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted font-semibold text-base"
              >
                &times;
              </button>
            </div>

            {modalStep === 1 ? (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">Loại Batch Job:</label>
                  <select className="w-full p-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none">
                    <option>Canary Staged Rollout (20%)</option>
                    <option>Mass Promote to 100% Live</option>
                    <option>Emergency Halt All Rollouts</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">Kế hoạch Rollback tự động:</label>
                  <textarea
                    value={rollbackPlanInput}
                    onChange={(e) => setRollbackPlanInput(e.target.value)}
                    placeholder="Ví dụ: Tự động Halt toàn bộ batch nếu crash rate > 0.1%..."
                    className="w-full h-20 p-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400">
                  <strong>Danh sách 17 Apps trong Batch:</strong> 15 apps đủ điều kiện, 2 apps bị khóa do policy.
                </div>

                <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto font-mono">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2 px-3">App</th>
                        <th className="py-2 px-3">Khả thi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr><td className="py-2 px-3 font-semibold font-sans">Home AI</td><td className="py-2 px-3 text-emerald-600 font-bold">✅ Đủ điều kiện</td></tr>
                      <tr><td className="py-2 px-3 font-semibold font-sans">Short Drama</td><td className="py-2 px-3 text-emerald-600 font-bold">✅ Đủ điều kiện</td></tr>
                      <tr><td className="py-2 px-3 font-semibold font-sans">Wallpaper 4K</td><td className="py-2 px-3 text-rose-600 font-bold">❌ Bị khóa (ANR &gt; 0.4%)</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-border">
              {modalStep === 2 ? (
                <button onClick={() => setModalStep(1)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted font-medium">
                  &larr; Quay lại
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted font-medium">
                  Đóng
                </button>
                {modalStep === 1 ? (
                  <button
                    onClick={() => setModalStep(2)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Xem Preview &rarr;
                  </button>
                ) : (
                  <button
                    onClick={() => { setShowCreateModal(false); handleBatchAction('Đã phê duyệt và kích hoạt Batch Job thành công'); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Xác nhận &amp; Khởi chạy
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
