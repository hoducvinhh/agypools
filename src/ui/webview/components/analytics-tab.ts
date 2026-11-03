export function renderAnalyticsTab(): string {
  return `
<div class="workspace" id="workspace-analytics">
  <!-- Period Selector & Sync Action -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
    <div class="period-tabs" style="flex:1;">
      <button class="period-btn active" data-range="today">Hôm Nay</button>
      <button class="period-btn" data-range="daily">7 Ngày</button>
      <button class="period-btn" data-range="weekly">4 Tuần</button>
      <button class="period-btn" data-range="monthly">12 Tháng</button>
    </div>
    <button class="btn btn-sec btn-icon" data-action="recalculateStats" title="Quét và đồng bộ lại transcripts">&#x21bb; Sync</button>
  </div>

  <!-- Interactive SVG Glow Chart Card -->
  <div class="chart-nexus-card">
    <div class="chart-header">
      <span style="font-size:10px;font-weight:700;color:#fff;" id="chart-time-title">Tiêu Thụ Token</span>
      <div class="chart-legend">
        <span style="display:flex;align-items:center;gap:3px;"><span class="legend-dot" style="background:var(--cache-violet);"></span>Cache</span>
        <span style="display:flex;align-items:center;gap:3px;"><span class="legend-dot" style="background:var(--cyan-gemini);"></span>Input</span>
        <span style="display:flex;align-items:center;gap:3px;"><span class="legend-dot" style="background:var(--amber-thinking);"></span>Thinking</span>
        <span style="display:flex;align-items:center;gap:3px;"><span class="legend-dot" style="background:var(--accent-emerald);"></span>Output</span>
      </div>
    </div>
    <div class="chart-viewport" id="chart-viewport"></div>
  </div>

  <!-- Bento KPI Grid -->
  <div class="bento-grid">
    <div class="bento-box">
      <span class="bento-lbl">TỔNG TOKEN TIÊU THỤ</span>
      <span class="bento-val" id="bento-total-tokens">0</span>
    </div>
    <div class="bento-box">
      <span class="bento-lbl">TỈ LỆ CACHE HIT (GPU)</span>
      <span class="bento-val" style="color:var(--cache-violet);" id="bento-cache-rate">0%</span>
    </div>
    <div class="bento-box">
      <span class="bento-lbl">TỐC ĐỘ BURN RATE (15P)</span>
      <span class="bento-val" style="color:var(--cyan-gemini);" id="bento-burn-rate">0 tok/m</span>
    </div>
    <div class="bento-box">
      <span class="bento-lbl">TỔNG LƯỢT YÊU CẦU</span>
      <span class="bento-val" style="color:var(--accent-emerald);" id="bento-turns">0 turns</span>
    </div>
  </div>

  <!-- Drill-Down: Requests -->
  <div class="drill-down-header">
    <span>Lượt Yêu Cầu Gần Nhất (Requests)</span>
    <span id="drill-req-count" style="font-family:var(--font-mono);font-size:8.5px;color:var(--text-muted);">0 reqs</span>
  </div>
  <div class="drill-h-scroll" id="drill-requests-container"></div>

  <!-- Drill-Down: Models -->
  <div class="drill-down-header">
    <span>Tiêu Thụ Theo Model</span>
    <span id="drill-model-count" style="font-family:var(--font-mono);font-size:8.5px;color:var(--text-muted);">0 models</span>
  </div>
  <div class="drill-h-scroll" id="drill-models-container"></div>

  <!-- Drill-Down: Sessions -->
  <div class="drill-down-header">
    <span>Phiên Làm Việc (Sessions)</span>
    <span id="drill-session-count" style="font-family:var(--font-mono);font-size:8.5px;color:var(--text-muted);">0 sessions</span>
  </div>
  <div class="drill-h-scroll" id="drill-sessions-container"></div>
</div>
`;
}
