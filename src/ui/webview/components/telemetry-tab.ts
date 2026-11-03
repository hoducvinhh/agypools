export function renderTelemetryTab(): string {
  return `
<div class="workspace" id="workspace-telemetry">
  <div class="console-toolbar">
    <div class="console-chips" id="log-filter-chips">
      <button class="filter-chip active" data-cat="ALL">TẤT CẢ</button>
      <button class="filter-chip" data-cat="ROTATION">ROTATION</button>
      <button class="filter-chip" data-cat="QUOTA">QUOTA</button>
      <button class="filter-chip" data-cat="USS">USS</button>
      <button class="filter-chip" data-cat="AUTH">AUTH</button>
      <button class="filter-chip" data-cat="ERROR" style="color:var(--rose-danger);">LỖI</button>
    </div>
    <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
      <button class="btn btn-sec btn-icon" data-action="copyLogs" title="Sao chép toàn bộ log dạng JSON">Copy</button>
      <button class="btn btn-sec btn-icon" data-action="clearLogs" title="Xóa toàn bộ log">&#128465;</button>
    </div>
  </div>

  <div class="search-input-box" style="margin-bottom:2px;">
    <span class="search-icon">🔍</span>
    <input type="text" class="search-input" id="search-logs" placeholder="Lọc từ khóa trong log..." />
  </div>

  <div class="console-box" id="console-log-stream">
    <div class="empty-deck">Chưa có nhật ký sự kiện nào.</div>
  </div>
</div>
`;
}
