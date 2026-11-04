export function renderHeader(): string {
  return `
<div class="nexus-header">
  <div class="brand-identity">
    <div class="brand-icon" title="AgyPool Nexus Studio">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" stroke="#38bdf8" />
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" stroke="#a855f7" stroke-dasharray="3 2" />
        <circle cx="12" cy="12" r="2.5" fill="#10b981" />
      </svg>
    </div>
    <div class="brand-meta">
      <div class="brand-name">
        <span>AGYPOOL</span>
        <span class="brand-ver-badge">v1.4.5</span>
      </div>
      <div class="brand-sub">hoducvinhh • Antigravity</div>
    </div>
  </div>
  <div class="brand-controls">
    <span class="pulse-badge" id="pool-status-badge">
      <span class="pulse-dot"></span>
      <span id="pool-status-text">ONLINE</span>
    </span>
    <label class="switch" title="Enable/Disable Automatic Quota Pool">
      <input type="checkbox" id="master-power-toggle" data-action="toggleMasterPower" checked />
      <span class="slider"></span>
    </label>
  </div>
</div>

<div class="tab-dock" id="nexus-tab-dock">
  <button class="dock-btn active" data-tab="overview" title="Engine & Account Matrix">
    <span class="dock-icon">⚡</span>
    <span>Engine</span>
  </button>
  <button class="dock-btn" data-tab="analytics" title="Token Intelligence Radar">
    <span class="dock-icon">📊</span>
    <span>Radar</span>
  </button>
  <button class="dock-btn" data-tab="telemetry" title="Live Telemetry Console">
    <span class="dock-icon">📜</span>
    <span>Console</span>
  </button>
  <button class="dock-btn" data-tab="settings" title="Strategy & Preferences">
    <span class="dock-icon">⚙️</span>
    <span>Strategy</span>
  </button>
</div>
`;
}
