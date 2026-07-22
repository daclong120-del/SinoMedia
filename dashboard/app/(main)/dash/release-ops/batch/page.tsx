"use client";

import React, { useState } from 'react';
import { MOCK_BATCH_OPERATIONS } from '@/lib/fixtures/release-ops-fixtures';

export default function BatchOpsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [rollbackPlanInput, setRollbackPlanInput] = useState('');

  const openModal = () => {
    setModalStep(1);
    setRollbackPlanInput('');
    setShowCreateModal(true);
  };

  return (
    <div suppressHydrationWarning className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Standard Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Điều phối Release Hàng loạt (Batch Operations & Canary Rollouts)</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Phát hành canary hàng loạt, xem trước danh sách ứng dụng ảnh hưởng (Batch Preview) & kế hoạch rollback tự động
          </p>
        </div>

        <button
          onClick={openModal}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Tạo Batch Job Mới
        </button>
      </div>

      {/* ─── Batch Jobs List ─── */}
      <div className="space-y-4">
        {MOCK_BATCH_OPERATIONS.map(batch => (
          <div key={batch.id} className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-foreground block">{batch.title}</span>
                <span className="text-xs text-muted-foreground">Lên lịch: {batch.scheduledTime} &bull; Mức độ rủi ro: <strong className="text-amber-600 uppercase">{batch.riskLevel}</strong></span>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                {batch.status.toUpperCase()} ({batch.completedApps}/{batch.totalApps} App)
              </span>
            </div>

            {/* Rollback Plan Card */}
            <div className="p-3 bg-muted/30 border border-border rounded-lg text-xs space-y-1">
              <span className="font-bold text-foreground block">Kế hoạch Rollback Tự động (Rollback Plan):</span>
              <p className="text-muted-foreground">{batch.rollbackPlan}</p>
            </div>

            {/* Pre-execution Affected Apps Preview Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Xem trước Bảng Ứng dụng Ảnh hưởng (Affected Apps Preview)</h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2 px-3">Tên Ứng dụng & Package</th>
                      <th className="py-2 px-3">Điều kiện Khả thi (Eligibility)</th>
                      <th className="py-2 px-3">Nhóm Canary (Canary Group)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {batch.affectedAppsPreview.map(app => (
                      <tr key={app.packageName} className="hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <span className="font-semibold text-foreground">{app.appName}</span>
                          <span className="font-mono text-[11px] text-muted-foreground ml-2">({app.packageName})</span>
                        </td>
                        <td className="py-2 px-3">
                          {app.isEligible ? (
                            <span className="text-emerald-600 font-bold">✅ Đủ điều kiện</span>
                          ) : (
                            <span className="text-rose-600 font-bold">❌ Bị khóa: {app.blockedReason}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-medium text-foreground">
                          {app.canaryGroup}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 2-Step Modal Creating Batch ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Tạo Batch Job Mới (Bước {modalStep}/2)</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground text-sm font-bold">&times;</button>
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
                  <label className="font-semibold text-foreground block">Kế hoạch Rollback tự động (Bắt buộc):</label>
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
                  <strong>Preview Danh sách Ảnh hưởng:</strong> Xem lại các app đủ điều kiện & bị khóa trước khi duyệt Batch Job.
                </div>

                <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2 px-3">App</th>
                        <th className="py-2 px-3">Trạng thái Khả thi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {MOCK_BATCH_OPERATIONS[0].affectedAppsPreview.map(app => (
                        <tr key={app.packageName}>
                          <td className="py-2 px-3 font-semibold">{app.appName}</td>
                          <td className="py-2 px-3">
                            {app.isEligible ? <span className="text-emerald-600 font-bold">✅ Đủ điều kiện</span> : <span className="text-rose-600 font-bold">❌ Bị khóa</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-border">
              {modalStep === 2 ? (
                <button onClick={() => setModalStep(1)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted font-medium">
                  &larr; Quay lại Bước 1
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted font-medium">
                  Hủy
                </button>
                {modalStep === 1 ? (
                  <button
                    disabled={!rollbackPlanInput.trim()}
                    onClick={() => setModalStep(2)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Xem Preview &rarr;
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Xác nhận & Khởi tạo Batch Job
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
