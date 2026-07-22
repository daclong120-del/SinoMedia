"use client";

import React, { useState } from 'react';
import { MOCK_ASO_METRICS } from '@/lib/fixtures/release-ops-fixtures';
import { ASOConversionMetric, ASOGeoWarningDetail } from '@/types/release-ops';

export default function ASOAnalyticsPage() {
  const [selectedGeo, setSelectedGeo] = useState('all');
  const [selectedExperiment, setSelectedExperiment] = useState('all');
  const [activeWarningDetail, setActiveWarningDetail] = useState<{ appName: string; warnings: ASOGeoWarningDetail[] } | null>(null);

  const filteredMetrics = MOCK_ASO_METRICS.filter(aso => {
    const matchesGeo = selectedGeo === 'all' || aso.topGeo.toLowerCase().includes(selectedGeo.toLowerCase());
    const matchesExp = selectedExperiment === 'all' || (selectedExperiment === 'running' ? aso.experimentStatus === 'running_ab' : aso.experimentStatus === 'winner_applied');
    return matchesGeo && matchesExp;
  });

  return (
    <div suppressHydrationWarning className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Standard Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">Phân tích ASO & Chất lượng Store Listing</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Source: Play Developer Reporting API (Live)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tỷ lệ chuyển đổi trang ứng dụng (Store Listing Conversion Rate), Lượt ghé thăm (Visitors), Benchmark Peers & Cảnh báo GEO
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedGeo}
            onChange={(e) => setSelectedGeo(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-foreground focus:outline-none"
          >
            <option value="all">Tất cả quốc gia (All GEOs)</option>
            <option value="us">Hoa Kỳ (US)</option>
            <option value="de">Đức (DE)</option>
            <option value="id">Indonesia (ID)</option>
          </select>

          <select
            value={selectedExperiment}
            onChange={(e) => setSelectedExperiment(e.target.value)}
            className="px-3 py-1.5 bg-card border border-border rounded-lg text-foreground focus:outline-none"
          >
            <option value="all">Tất cả trạng thái Experiment</option>
            <option value="running">Đang chạy A/B Test</option>
            <option value="winner">Đã chọn Winner</option>
          </select>
        </div>
      </div>

      {/* ─── Metric Source & Date Filter Bar ─── */}
      <div className="bg-card border border-border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground">Khoảng thời gian: </span>
            <span className="font-semibold text-foreground">30 ngày qua (22/06 - 22/07)</span>
          </div>
          <div className="w-px h-3 bg-border hidden sm:block" />
          <div>
            <span className="text-muted-foreground">Nguồn số liệu: </span>
            <span className="font-mono text-foreground font-semibold">Play Console Reporting API v1</span>
          </div>
        </div>

        <span className="text-[11px] font-mono font-semibold text-muted-foreground">
          {filteredMetrics.length} / {MOCK_ASO_METRICS.length} ứng dụng phù hợp bộ lọc
        </span>
      </div>

      {/* ─── ASO Metrics Table ─── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Ứng dụng</th>
                <th className="py-3 px-4">Lượt ghé thăm (Visitors)</th>
                <th className="py-3 px-4">Tỷ lệ Chuyển đổi (CR)</th>
                <th className="py-3 px-4">vs Category Peers</th>
                <th className="py-3 px-4">Đánh giá ⭐</th>
                <th className="py-3 px-4">Top GEOs</th>
                <th className="py-3 px-4">A/B Testing</th>
                <th className="py-3 px-4 text-right">Chi tiết Cảnh báo GEO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMetrics.map(aso => (
                <tr key={aso.packageName} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-foreground block">{aso.appName}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{aso.packageName}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                    {(aso.monthlyVisitors / 1000).toFixed(0)}k visitors/tháng
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className="font-bold text-foreground text-sm">{aso.conversionRate}%</span>
                    <span className={`ml-1 text-[10px] font-bold ${aso.rateChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {aso.rateChange >= 0 ? `+${aso.rateChange}%` : `${aso.rateChange}%`}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">
                    <span className={aso.vsPeersPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {aso.vsPeersPct >= 0 ? `+${aso.vsPeersPct}% vs Peers` : `${aso.vsPeersPct}% vs Peers`}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-600">
                    ⭐ {aso.rating}
                  </td>
                  <td className="py-3 px-4 font-mono text-foreground">
                    {aso.topGeo}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${aso.experimentStatus === 'running_ab' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                      {aso.experimentStatus === 'running_ab' ? 'Đang chạy A/B Test' : 'Đã chọn Winner'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {aso.geoWarningDetails.length > 0 ? (
                      <button
                        onClick={() => setActiveWarningDetail({ appName: aso.appName, warnings: aso.geoWarningDetails })}
                        className="px-2.5 py-1 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                      >
                        {aso.geoWarningDetails.length} Cảnh báo GEO &rarr;
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-medium">Sạch (Clean)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── GEO Warning Detail Modal ─── */}
      {activeWarningDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Chi tiết Cảnh báo GEO - {activeWarningDetail.appName}</h3>
              <button onClick={() => setActiveWarningDetail(null)} className="text-muted-foreground text-sm font-bold">&times;</button>
            </div>

            <div className="space-y-3 text-xs">
              {activeWarningDetail.warnings.map((w, idx) => (
                <div key={idx} className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-700 dark:text-rose-400 font-mono text-sm">
                      {w.countryName} ({w.countryCode})
                    </span>
                    <span className="text-muted-foreground font-mono">Visitors: {w.visitors.toLocaleString()} | CR: {w.conversionRate}%</span>
                  </div>
                  <p className="text-foreground"><strong>Nguyên nhân:</strong> {w.reason}</p>
                  <p className="text-blue-600 dark:text-blue-400"><strong>Đề xuất khắc phục:</strong> {w.suggestedAction}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setActiveWarningDetail(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
