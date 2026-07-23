"use client";

import React from 'react';
import { MOCK_RELEASES, MOCK_SUMMARY_STATS } from '@/lib/fixtures/release-ops-fixtures';
import { ReleaseStatus, DataSourceType } from '@/types/release-ops';
import Link from 'next/link';

function StatusBadge({ status }: { status: ReleaseStatus }) {
  const map: Record<ReleaseStatus, { label: string; style: string }> = {
    draft: { label: 'Bản nháp', style: 'bg-muted text-muted-foreground border-border' },
    building: { label: 'Đang Build', style: 'bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse' },
    in_review: { label: 'Chờ duyệt Play', style: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    rolling_out: { label: 'Đang Staged Rollout', style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    live: { label: 'Đã Live Store', style: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30' },
    rejected: { label: 'Bị Từ chối', style: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
    halted: { label: 'Đã Tạm dừng', style: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    failed: { label: 'Lỗi Build', style: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
    policy_blocked: { label: 'Khóa Chính sách', style: 'bg-red-600/15 text-red-700 font-bold border-red-600/30' },
  };

  const item = map[status] || { label: status, style: 'bg-muted text-muted-foreground border-border' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${item.style}`}>
      {item.label}
    </span>
  );
}

function SourceBadge({ source }: { source: DataSourceType }) {
  const map: Record<DataSourceType, string> = {
    play_api: 'Play API',
    ci_webhook: 'CI Webhook',
    manual_checklist: 'Manual Action',
    report_import: 'Report Import',
    estimated: 'Estimated',
  };
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
      {map[source] || source}
    </span>
  );
}

export default function OverviewPage() {
  const rollouts = MOCK_RELEASES.filter(r => r.status === 'rolling_out');
  const reviews = MOCK_RELEASES.filter(r => r.status === 'in_review');
  const issues = MOCK_RELEASES.filter(r => ['rejected', 'halted', 'failed', 'policy_blocked'].includes(r.status));

  // Mock CI builds data
  const mockBuilds14Days = [
    { day: '09/07', status: 'success' }, { day: '10/07', status: 'success' },
    { day: '11/07', status: 'failed' },  { day: '12/07', status: 'success' },
    { day: '13/07', status: 'success' }, { day: '14/07', status: 'success' },
    { day: '15/07', status: 'success' }, { day: '16/07', status: 'failed' },
    { day: '17/07', status: 'success' }, { day: '18/07', status: 'success' },
    { day: '19/07', status: 'success' }, { day: '20/07', status: 'success' },
    { day: '21/07', status: 'success' }, { day: '22/07', status: 'success' },
  ];

  return (
    <div suppressHydrationWarning className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Standard Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">Tổng quan Release Operations</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Freshness: Live (10s)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vòng đời phát hành, CI build pipeline health và kiểm duyệt khẩn cấp cho toàn bộ 102 ứng dụng
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-1.5 shadow-xs">
            <div>
              <span className="text-muted-foreground">Apps: </span>
              <span className="font-semibold text-foreground">{MOCK_SUMMARY_STATS.totalApps}</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div>
              <span className="text-muted-foreground">Dev: </span>
              <span className="font-semibold text-foreground">{MOCK_SUMMARY_STATS.totalAccounts}</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div>
              <span className="text-muted-foreground">Rollouts: </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{MOCK_SUMMARY_STATS.activeRollouts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CI Pipeline Health Widget (Builds 14 ngày qua) ─── */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sức khỏe Pipeline CI/CD (Lịch sử Builds 14 ngày qua)
            </h2>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Pass Rate: 92.8% (26/28 builds)
            </span>
          </div>
          <SourceBadge source="ci_webhook" />
        </div>

        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
          {mockBuilds14Days.map((b, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 min-w-[36px]">
              <div
                className={`w-full h-8 rounded-md transition-transform hover:scale-105 ${b.status === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-600' : 'bg-rose-500/20 border border-rose-500/40 text-rose-600'} flex items-center justify-center font-mono text-[10px] font-bold`}
                title={`Ngày ${b.day}: Build ${b.status === 'success' ? 'Thành công' : 'Thất bại'}`}
              >
                {b.status === 'success' ? '✓' : '✗'}
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">{b.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Pipeline Strip ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Luồng Vòng đời Release (Pipeline Stage Strip)
          </h2>
          <SourceBadge source="play_api" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <span className="text-xs text-muted-foreground block">1. Draft / Dev</span>
            <span className="text-lg font-bold text-foreground">3</span>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <span className="text-xs text-blue-600 dark:text-blue-400 block font-medium">2. Building / Pre-check</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">1</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <span className="text-xs text-amber-600 dark:text-amber-400 block font-medium">3. In Review (Play Console)</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{MOCK_SUMMARY_STATS.pendingReviews}</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">4. Staged Rollout</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{MOCK_SUMMARY_STATS.activeRollouts}</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-xs text-emerald-700 dark:text-emerald-300 block font-semibold">5. Live Production</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">84</span>
          </div>
        </div>
      </div>

      {/* ─── Fail / Attention Lane ─── */}
      {issues.length > 0 && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-rose-500" />
              <h2 className="text-sm font-bold text-rose-700 dark:text-rose-400">
                Luồng Sự cố / Cần can thiệp ngay ({issues.length})
              </h2>
            </div>
            <Link href="/dash/release-ops/releases" className="text-xs text-rose-600 hover:underline font-medium">
              Xem tất cả sự cố &rarr;
            </Link>
          </div>
          <div className="space-y-2">
            {issues.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-card border border-border">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">{item.appName}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">({item.packageName})</span>
                    <StatusBadge status={item.status} />
                    <SourceBadge source={item.provenance.source} />
                  </div>
                  {item.rejectionReason && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      Lý do: {item.rejectionReason}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{item.accountName}</span>
                  <button className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors">
                    Xử lý ngay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Active Staged Rollouts & Review Queue ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Rollouts */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Staged Rollouts Đang Hoạt động</h3>
            <span className="text-xs font-medium text-muted-foreground">{rollouts.length} bản phát hành</span>
          </div>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {rollouts.map(r => (
              <div key={r.id} className="p-3 bg-card hover:bg-muted/30 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-foreground block">{r.appName}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">v{r.versionName} ({r.versionCode})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Health: Crash {r.healthGuard.crashRatePct}% | ANR {r.healthGuard.anrRatePct}%
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Tỷ lệ phân phối:</span>
                    <span className="font-bold text-foreground">{r.rolloutPercentage}% &bull; {r.healthGuard.recommendation === 'safe_to_increase' ? '✅ Đề xuất tăng Rollout' : '⚠️ Giữ nguyên'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${r.rolloutPercentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Hàng chờ Duyệt Play Console (SLA Status)</h3>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{reviews.length} ứng dụng</span>
          </div>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {reviews.map(r => (
              <div key={r.id} className="p-3 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between">
                <div>
                  <span className="font-semibold text-xs text-foreground block">{r.appName}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    v{r.versionName} &bull; {r.reviewLifecycle ? `Đang duyệt ${r.reviewLifecycle.reviewAgeHours}h (SLA < ${r.reviewLifecycle.slaHours}h)` : r.accountName}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge status={r.status} />
                  <span className="text-[10px] text-muted-foreground block">{r.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
