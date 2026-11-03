export function getWebviewStyles(): string {
  return `
:root {
  --bg-base: var(--vscode-sideBar-background, #080c14);
  --bg-surface: var(--vscode-editor-background, #0d131f);
  --bg-card: rgba(18, 25, 40, 0.75);
  --bg-card-hover: rgba(26, 36, 56, 0.85);
  --bg-card-sub: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(56, 189, 248, 0.3);
  --text-main: var(--vscode-foreground, #f3f4f6);
  --text-dim: var(--vscode-descriptionForeground, #94a3b8);
  --text-muted: #64748b;
  --accent-emerald: #10b981;
  --accent-emerald-glow: rgba(16, 185, 129, 0.2);
  --cyan-gemini: #38bdf8;
  --cyan-glow: rgba(56, 189, 248, 0.25);
  --purple-claude: #c084fc;
  --purple-glow: rgba(192, 132, 252, 0.25);
  --cache-violet: #a855f7;
  --amber-thinking: #f59e0b;
  --rose-danger: #f43f5e;
  --font-sans: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  --font-mono: var(--vscode-editor-font-family, "JetBrains Mono", Consolas, monospace);
}

* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }

body {
  font-family: var(--font-sans);
  background: var(--bg-base);
  color: var(--text-main);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-x: hidden;
  font-size: 11px;
  line-height: 1.4;
}

/* ==================== Brand Header ==================== */
.nexus-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 9px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(56, 189, 248, 0.08) 100%);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}
.brand-identity {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.brand-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #0b111b;
  border: 1px solid rgba(56, 189, 248, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
}
.brand-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.brand-name {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 4px;
}
.brand-sub {
  font-size: 8.5px;
  color: var(--accent-emerald);
  font-weight: 600;
  font-family: var(--font-mono);
}
.brand-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.pulse-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--accent-emerald);
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  padding: 2px 5px;
  border-radius: 8px;
}
.pulse-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-emerald);
  box-shadow: 0 0 6px var(--accent-emerald);
  animation: pulse-glow 2s infinite ease-in-out;
}
@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

/* ==================== Navigation Dock (Tabs) ==================== */
.tab-dock {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: rgba(14, 21, 33, 0.85);
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  padding: 2px;
  gap: 2px;
  backdrop-filter: blur(8px);
}
.dock-btn {
  background: transparent;
  border: none;
  border-radius: 5px;
  padding: 5px 2px;
  color: var(--text-dim);
  font-size: 9.5px;
  font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: all 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dock-btn .dock-icon { font-size: 12px; }
.dock-btn:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.05);
}
.dock-btn.active {
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.06) 100%);
  color: #fff;
  border: 1px solid rgba(16, 185, 129, 0.4);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
}

/* ==================== Workspaces ==================== */
.workspace {
  display: none;
  flex-direction: column;
  gap: 8px;
}
.workspace.active {
  display: flex;
}

/* ==================== Common Components ==================== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 5px;
  padding: 4px 7px;
  font-family: var(--font-sans);
  font-size: 9.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}
.btn-primary {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}
.btn-primary:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}
.btn-sec {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main);
  border: 1px solid var(--glass-border);
}
.btn-sec:hover {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.16);
}
.btn-accent {
  background: rgba(56, 189, 248, 0.12);
  color: var(--cyan-gemini);
  border: 1px solid rgba(56, 189, 248, 0.3);
}
.btn-accent:hover {
  background: rgba(56, 189, 248, 0.22);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
}
.btn-icon {
  padding: 2px 5px;
  font-size: 10px;
}
.switch {
  position: relative;
  display: inline-block;
  width: 24px;
  height: 13px;
  cursor: pointer;
  flex-shrink: 0;
}
.switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.slider {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  transition: 0.18s;
}
.slider::before {
  position: absolute;
  content: "";
  height: 7px;
  width: 7px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.18s;
}
.switch input:checked + .slider { background: var(--accent-emerald); }
.switch input:checked + .slider::before { transform: translateX(11px); }

/* ==================== Tab 1: Active Engine Spotlight ==================== */
.spotlight-card {
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 100%);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 8px;
  padding: 9px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.12);
  backdrop-filter: blur(10px);
}
.spotlight-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.spotlight-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.spotlight-avatar {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
}
.spotlight-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.spotlight-email {
  font-size: 11.5px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.spotlight-tags {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tag-badge {
  font-size: 8px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 4px;
  font-family: var(--font-mono);
  text-transform: uppercase;
}
.tag-active {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.4);
}
.tag-tier {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.spotlight-gauges {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  padding: 6px 8px;
}
.gauge-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gauge-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 8.5px;
}
.gauge-lbl {
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.gauge-val {
  font-weight: 800;
  font-family: var(--font-mono);
  font-size: 10px;
}
.gauge-val.gemini { color: var(--cyan-gemini); }
.gauge-val.claude { color: var(--purple-claude); }
.gauge-bar-track {
  width: 100%;
  height: 5px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}
.gauge-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.gauge-bar-fill.gemini {
  background: linear-gradient(90deg, #0284c7 0%, #38bdf8 100%);
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.5);
}
.gauge-bar-fill.claude {
  background: linear-gradient(90deg, #9333ea 0%, #c084fc 100%);
  box-shadow: 0 0 6px rgba(192, 132, 252, 0.5);
}
.gauge-reset {
  font-size: 7.5px;
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.spotlight-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

/* ==================== Tab 1: Account Deck ==================== */
.deck-filter-bar {
  display: flex;
  align-items: center;
  gap: 4px;
}
.search-input-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 5px;
  padding: 3px 6px 3px 20px;
  font-size: 9.5px;
  font-family: var(--font-sans);
  color: var(--text-main);
  outline: none;
  transition: border-color 0.15s ease;
}
.search-input:focus {
  border-color: var(--cyan-gemini);
}
.search-icon {
  position: absolute;
  left: 6px;
  font-size: 9px;
  color: var(--text-muted);
  pointer-events: none;
}
.filter-chip {
  padding: 2px 5px;
  font-size: 8.5px;
  font-weight: 600;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.15s ease;
}
.filter-chip.active {
  background: rgba(56, 189, 248, 0.15);
  color: var(--cyan-gemini);
  border-color: rgba(56, 189, 248, 0.35);
}

.account-deck-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* Accordion Card */
.acc-card-nexus {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.acc-card-nexus:hover {
  border-color: var(--glass-border-hover);
  background: var(--bg-card-hover);
}
.acc-card-nexus.is-active {
  border-color: var(--accent-emerald);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
}
.acc-card-nexus.is-disabled {
  opacity: 0.55;
  filter: grayscale(0.5);
}

/* Tier 1: Compact Summary Row */
.acc-row-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  cursor: pointer;
  gap: 6px;
}
.summary-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.acc-avatar-sm {
  width: 19px;
  height: 19px;
  border-radius: 5px;
  background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
  color: #fff;
  font-size: 8.5px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.acc-card-nexus.is-active .acc-avatar-sm {
  background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
}
.acc-headline {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}
.acc-name-txt {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.acc-mini-bars {
  display: flex;
  align-items: center;
  gap: 5px;
}
.mini-bar-unit {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 7.5px;
  font-family: var(--font-mono);
}
.mini-bar-track {
  width: 26px;
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}
.mini-bar-fill {
  height: 100%;
  border-radius: 2px;
}

.summary-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.btn-switch-sm {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-emerald);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 8.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.12s ease;
}
.btn-switch-sm:hover {
  background: var(--accent-emerald);
  color: #fff;
}
.drawer-toggle-icon {
  font-size: 9px;
  color: var(--text-muted);
  transition: transform 0.2s ease;
}
.acc-card-nexus.expanded .drawer-toggle-icon {
  transform: rotate(180deg);
}

/* Tier 2: Expandable Drawer */
.acc-row-drawer {
  display: none;
  flex-direction: column;
  gap: 6px;
  padding: 6px 8px 8px 8px;
  border-top: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.18);
}
.acc-card-nexus.expanded .acc-row-drawer {
  display: flex;
}
.drawer-meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.chip-interactive {
  font-size: 8px;
  font-family: var(--font-mono);
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  color: var(--text-dim);
  cursor: pointer;
}
.chip-interactive:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-main);
}
.chip-interactive.err {
  background: rgba(244, 63, 94, 0.15);
  border-color: rgba(244, 63, 94, 0.4);
  color: var(--rose-danger);
}
.model-chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 2px;
}
.chip-model {
  font-size: 7.5px;
  font-family: var(--font-mono);
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border);
  color: var(--text-dim);
}
.chip-model.warn {
  color: var(--amber-thinking);
  border-color: rgba(245, 158, 11, 0.3);
}
.chip-model.err {
  color: var(--rose-danger);
  border-color: rgba(244, 63, 94, 0.4);
}
.drawer-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 3px;
  padding-top: 4px;
  border-top: 1px dashed var(--glass-border);
}

/* ==================== Tab 2: Token Intelligence Radar ==================== */
.period-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}
.period-btn {
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 3px 2px;
  font-size: 9px;
  font-weight: 600;
  font-family: var(--font-sans);
  color: var(--text-dim);
  cursor: pointer;
  text-align: center;
  transition: all 0.12s ease;
}
.period-btn.active {
  background: var(--accent-emerald);
  color: #fff;
}
.chart-nexus-card {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chart-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 8px;
}
.legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  display: inline-block;
}
.chart-viewport {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 3px;
}
.chart-svg {
  height: 140px;
  display: block;
}

/* Bento KPI Grid */
.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}
.bento-box {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bento-lbl {
  font-size: 8px;
  color: var(--text-dim);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.bento-val {
  font-size: 13px;
  font-weight: 800;
  font-family: var(--font-mono);
  color: var(--text-main);
}

/* Drill-Down Studio */
.drill-down-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
}
.drill-h-scroll {
  display: flex;
  flex-direction: row;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 1px 6px 1px;
}
.drill-card {
  flex: 0 0 160px;
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  padding: 6px 7px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* ==================== Tab 3: Telemetry Console ==================== */
.console-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.console-chips {
  display: flex;
  align-items: center;
  gap: 3px;
  overflow-x: auto;
}
.console-box {
  background: #06090f;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 6px;
  font-family: var(--font-mono);
  max-height: 55vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.log-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.02);
  border-left: 2px solid transparent;
}
.log-row.rotate { border-left-color: var(--accent-emerald); }
.log-row.quota { border-left-color: var(--cyan-gemini); }
.log-row.uss { border-left-color: var(--purple-claude); }
.log-row.auth { border-left-color: var(--amber-thinking); }
.log-row.error { border-left-color: var(--rose-danger); background: rgba(244, 63, 94, 0.06); }
.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 8px;
  color: var(--text-muted);
}
.log-cat {
  font-weight: 700;
  text-transform: uppercase;
  padding: 0 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
}
.log-text {
  font-size: 9px;
  line-height: 1.35;
  word-break: break-all;
  color: var(--text-main);
  user-select: text;
}
.log-text * { user-select: text; }

/* ==================== Tab 4: Strategy & Settings Studio ==================== */
.strategy-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.strat-card-option {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  padding: 8px 9px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.strat-card-option:hover {
  background: var(--bg-card-hover);
  border-color: var(--glass-border-hover);
}
.strat-card-option.selected {
  border-color: var(--accent-emerald);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, var(--bg-card) 100%);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
}
.strat-radio {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  flex-shrink: 0;
}
.strat-card-option.selected .strat-radio {
  border-color: var(--accent-emerald);
}
.strat-card-option.selected .strat-radio::after {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-emerald);
}
.strat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.strat-title {
  font-size: 10.5px;
  font-weight: 700;
  color: #fff;
}
.strat-desc {
  font-size: 8.5px;
  color: var(--text-dim);
  line-height: 1.3;
}

.settings-group {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 7px;
  padding: 8px 9px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.settings-lbl {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--text-main);
}
.settings-sub {
  font-size: 8px;
  color: var(--text-dim);
}

.privacy-masked {
  filter: blur(4px);
  transition: filter 0.2s ease;
}
.privacy-masked:hover {
  filter: blur(0);
}
.empty-deck {
  padding: 18px 12px;
  text-align: center;
  color: var(--text-dim);
  font-size: 10px;
  border: 1px dashed var(--glass-border);
  border-radius: 6px;
}
`;
}
