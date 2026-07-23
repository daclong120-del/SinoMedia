"use client";

import React, { useState } from 'react';
import ReleaseOpsNavTabs from '@/components/dashboard/release-ops/ReleaseOpsNavTabs';

// Helper function to build a smooth cubic bezier spline curve through points
function buildSmoothSplinePath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export default function ASOAnalyticsPage() {
  const [activeWarningDetail, setActiveWarningDetail] = useState<{ appGeo: string; reason: string; suggestedAction: string } | null>(null);

  // Mock CR trend line data (6/6 to 3/7 matching exact curve in reference image)
  const trendPoints = [
    { date: '6/6', cr: 26.4 },
    { date: '9/6', cr: 26.0 },
    { date: '12/6', cr: 26.3 },
    { date: '15/6', cr: 27.2 },
    { date: '18/6', cr: 27.8 },
    { date: '21/6', cr: 28.5 },
    { date: '24/6', cr: 32.6 },
    { date: '27/6', cr: 33.8 },
    { date: '30/6', cr: 34.1 },
    { date: '3/7', cr: 33.7 }
  ];

  const minCr = 22;
  const maxCr = 38;
  const range = maxCr - minCr;
  const svgW = 1000;
  const svgH = 220;
  const padLeft = 35;
  const padRight = 0;
  const padTop = 25;
  const padBottom = 25;
  const chartW = svgW - padLeft - padRight;
  const chartH = svgH - padTop - padBottom;

  const pts = trendPoints.map((pt, idx) => {
    const x = padLeft + (idx / (trendPoints.length - 1)) * chartW;
    const y = padTop + chartH - ((pt.cr - minCr) / range) * chartH;
    return { x, y };
  });

  const smoothLineD = buildSmoothSplinePath(pts);
  const bottomY = padTop + chartH;
  const smoothAreaD = `${smoothLineD} L ${pts[pts.length - 1].x},${bottomY} L ${pts[0].x},${bottomY} Z`;

  // Event marker line date index (22/6 is between index 5 and 6)
  const eventX = padLeft + (5.3 / (trendPoints.length - 1)) * chartW;

  // Table data 1: CR theo app - 28 ngày
  const crAppRows = [
    { app: 'Home AI', visitors: '184K', cr: '33.8%', vsPeers: '+6.2%', isPositive: true },
    { app: 'Short Drama', visitors: '1.2M', cr: '41.5%', vsPeers: '+11.4%', isPositive: true },
    { app: 'Vibely', visitors: '96K', cr: '27.1%', vsPeers: '-3.0%', isPositive: false },
    { app: 'Wallpaper 4K', visitors: '318K', cr: '22.4%', vsPeers: '-9.1%', isPositive: false },
    { app: 'QR Scanner Plus', visitors: '78K', cr: '35.9%', vsPeers: '+2.0%', isPositive: true },
  ];

  // Table data 2: GEO scan - visitors cao, CR thấp
  const geoScanRows = [
    { appGeo: 'Home AI - BR', visitors: '41K', cr: '14.2%', note: 'Chưa có bản pt-BR', action: 'Tạo Custom Store Listing tiếng Bồ Đào Nha' },
    { appGeo: 'Vibely - IN', visitors: '38K', cr: '11.7%', note: 'Screenshot chỉ EN', action: 'Đổi bộ screenshot bản địa hóa cho thị trường Ấn Độ' },
    { appGeo: 'Wallpaper 4K - MX', visitors: '29K', cr: '13.5%', note: 'Bản dịch máy tra', action: 'Biên tập lại bản dịch tiếng Tây Ban Nha bởi translator' },
    { appGeo: 'Short Drama - ID', visitors: '96K', cr: '19.0%', note: 'CR dưới median', action: 'Tối ưu lại 3 câu short description đầu tiên' },
  ];

  return (
    <div suppressHydrationWarning className="px-4 md:px-8 py-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header Strip & Sub-nav Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">Lutech Release Ops</h1>
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

      {/* ─── Main Chart: CR trend — Home AI · US · organic search ─── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">CR trend &mdash; Home AI &bull; US &bull; organic search</h3>
            <span className="text-xs text-muted-foreground block">
              Nguồn: GCS store_performance export &bull; <strong className="text-amber-600 font-semibold">vạch cam = ngày thay listing (từ release timeline)</strong>
            </span>
          </div>
        </div>

        {/* Smooth Area Line Chart SVG */}
        <div className="relative border-t border-border pt-4">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto max-h-64" preserveAspectRatio="none">
            <defs>
              <linearGradient id="crGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#047857" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[22, 24, 28, 32, 36].map((tick) => {
              const y = padTop + chartH - ((tick - minCr) / range) * chartH;
              return (
                <g key={tick}>
                  <line x1={padLeft} y1={y} x2={svgW} y2={y} stroke="currentColor" strokeDasharray="2 2" className="text-border" strokeWidth="1" />
                  <text x={padLeft - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
                    {tick}%
                  </text>
                </g>
              );
            })}

            {/* Gradient Area Under Curve */}
            <path d={smoothAreaD} fill="url(#crGradient)" />

            {/* Smooth Spline Curve Line */}
            <path d={smoothLineD} fill="none" stroke="#047857" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Event Marker Line (Vạch cam nét đứt & nhãn chữ cam thuần không khung) */}
            <g>
              <line x1={eventX} y1={padTop} x2={eventX} y2={bottomY} stroke="#d97706" strokeDasharray="3 3" strokeWidth="1.5" />
              <text x={eventX + 6} y={padTop + 14} fill="#d97706" className="font-mono text-[10px] font-bold">
                Đổi bộ screenshots
              </text>
            </g>

            {/* X-Axis Date Labels */}
            {trendPoints.map((pt, idx) => {
              const x = padLeft + (idx / (trendPoints.length - 1)) * chartW;
              return (
                <text key={pt.date} x={x} y={svgH - 6} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                  {pt.date}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ─── Bottom Row: CR theo app & GEO scan ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Table 1: CR theo app - 28 ngày */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-foreground">CR theo app &mdash; 28 ngày</h3>
            <span className="text-xs text-muted-foreground block">
              Visitors &rarr; acquisitions, so với peer benchmark của Google
            </span>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3">APP</th>
                  <th className="py-2.5 px-3 font-mono">VISITORS</th>
                  <th className="py-2.5 px-3 font-mono">CR</th>
                  <th className="py-2.5 px-3 font-mono">VS PEERS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {crAppRows.map(row => (
                  <tr key={row.app} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-semibold text-foreground">{row.app}</td>
                    <td className="py-2.5 px-3 font-bold text-foreground">{row.visitors}</td>
                    <td className="py-2.5 px-3 font-bold text-foreground">{row.cr}</td>
                    <td className={`py-2.5 px-3 font-bold ${row.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {row.vsPeers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: GEO scan - visitors cao, CR thấp */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-foreground">GEO scan &mdash; visitors cao, CR thấp</h3>
            <span className="text-xs text-muted-foreground block">
              Ứng viên custom store listing / sửa bản dịch
            </span>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3">APP &bull; GEO</th>
                  <th className="py-2.5 px-3 font-mono">VISITORS</th>
                  <th className="py-2.5 px-3 font-mono">CR</th>
                  <th className="py-2.5 px-3">CẢNH BÁO / GỢI Ý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {geoScanRows.map(row => (
                  <tr
                    key={row.appGeo}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setActiveWarningDetail({ appGeo: row.appGeo, reason: row.note, suggestedAction: row.action })}
                  >
                    <td className="py-2.5 px-3 font-semibold text-foreground">{row.appGeo}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">{row.visitors}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-600">{row.cr}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        {row.note}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Warning Detail Centered Modal Popup */}
      {activeWarningDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Chi tiết Gợi ý GEO &mdash; {activeWarningDetail.appGeo}</h3>
              <button
                onClick={() => setActiveWarningDetail(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted font-semibold text-base"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1">
                <span className="font-bold text-amber-700 dark:text-amber-400 block">Hiện trạng / Vấn đề:</span>
                <p className="text-muted-foreground">{activeWarningDetail.reason}</p>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block">Đề xuất Hành động:</span>
                <p className="text-muted-foreground">{activeWarningDetail.suggestedAction}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setActiveWarningDetail(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
