import * as vscode from "vscode";
import type { LogManager } from "../core/log-manager.js";
import type { QuotaMonitor } from "../core/quota-monitor.js";
import { BRAIN_DIR } from "../core/sqlite-utils.js";
import type { StatsManager } from "../core/stats-manager.js";
import type { TokenManager } from "../core/token-manager.js";
import type { UsageTracker } from "../core/usage-tracker.js";
import type { AgyPoolConfig } from "../types.js";

type WebviewMessage =
  | { action: "ready"; payload?: undefined }
  | { action: "addAccount"; payload?: undefined }
  | { action: "refreshQuotas"; payload?: undefined }
  | { action: "selectAccount"; payload: string }
  | { action: "toggleAccount"; payload: { email: string; enabled: boolean } }
  | { action: "updateAccountMeta"; payload: { email: string; alias?: string; affinity?: import("../types.js").ModelAffinity; role?: import("../types.js").PoolRole } }
  | { action: "reauthAccount"; payload: string }
  | { action: "refreshAccount"; payload: string }
  | { action: "removeAccount"; payload: string }
  | { action: "clearLogs"; payload?: undefined }
  | { action: "updateConfig"; payload: Partial<AgyPoolConfig> }
  | { action: "recalculateStats"; payload?: undefined };

export class WebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "agypool.accounts";
  private view?: vscode.WebviewView;
  private isDirty = false;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly tokenManager: TokenManager,
    private readonly quotaMonitor: QuotaMonitor,
    private readonly log: (msg: string) => void,
    private readonly logManager: LogManager,
    private readonly statsManager?: StatsManager,
    private readonly usageTracker?: UsageTracker,
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview();
    this.setWebviewMessageListener(webviewView.webview);

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible && (this.isDirty || !this.view)) {
        this.postState();
      }
    });

    this.postState();
  }

  public refresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.postState();
    }, 150);
  }

  private getCurrentStateData(): Record<string, unknown> {
    const accounts = this.tokenManager.getAccounts();
    const activeEmail = this.tokenManager.getActiveEmail();
    const quotas = this.quotaMonitor.getAllQuotas();
    const config = this.tokenManager.getConfig();
    const logs = this.logManager.getLogs();
    const todayStats = this.statsManager?.getTodayStats() || {
      date: new Date().toISOString().slice(0, 10),
      inputTokens: 0,
      outputTokens: 0,
      cacheHitTokens: 0,
      cacheMissTokens: 0,
      totalTokens: 0,
      models: {},
      conversations: {},
    };
    const hourlyStats = this.statsManager?.getTodayHourlyStats() || [];
    const dailyStats = this.statsManager?.getDailyStats(7) || [];
    const weeklyStats = this.statsManager?.getWeeklyStats(4) || [];
    const monthlyStats = this.statsManager?.getMonthlyStats(12) || [];
    const conversationsList = this.statsManager?.getConversationsList(40) || [];
    const requestsList = this.statsManager?.getRequestsList(40) || [];
    const allTimeSummary = this.statsManager?.getAllTimeSummary() || {
      inputTokens: 0,
      outputTokens: 0,
      cacheHitTokens: 0,
      cacheMissTokens: 0,
      totalTokens: 0,
      totalTurns: 0,
      cacheHitRate: 0,
    };

    return {
      accounts,
      activeEmail,
      quotas,
      config,
      logs,
      stats: {
        today: todayStats,
        hourly: hourlyStats,
        daily: dailyStats,
        weekly: weeklyStats,
        monthly: monthlyStats,
        conversations: conversationsList,
        requests: requestsList,
        allTime: allTimeSummary,
        burnRate: this.statsManager?.getBurnRate(15) || { tokensPerMin: 0, recentTurns: 0 },
      },
    };
  }

  private postState(): void {
    if (!this.view) return;
    if (!this.view.visible) {
      this.isDirty = true;
      return;
    }
    this.isDirty = false;
    try {
      void this.view.webview.postMessage({
        type: "state",
        data: this.getCurrentStateData(),
      });
    } catch (e: unknown) {
      this.log(`postState error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private setWebviewMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      try {
        switch (message.action) {
          case "ready":
            this.postState();
            break;
          case "addAccount":
            await vscode.commands.executeCommand("agypool.addAccount");
            break;
          case "refreshQuotas":
            await this.quotaMonitor.pollAllAccounts();
            this.refresh();
            break;
          case "selectAccount":
            if (message.payload) {
              await this.tokenManager.selectAccount(message.payload);
              this.refresh();
            }
            break;
          case "toggleAccount":
            if (message.payload) {
              await this.tokenManager.toggleAccountEnabled(message.payload.email, message.payload.enabled);
              void this.quotaMonitor.pollAllAccounts();
              this.refresh();
            }
            break;
          case "updateAccountMeta":
            if (message.payload) {
              await this.tokenManager.updateAccountMeta(message.payload.email, message.payload);
              this.refresh();
            }
            break;
          case "reauthAccount":
            if (message.payload) {
              try {
                const acc = await this.tokenManager.reauthAccount(message.payload);
                void this.quotaMonitor.refreshAccountQuota(acc.email);
                void vscode.window.showInformationMessage(`Account Pool: Re-authenticated ${acc.email}`);
              } catch (e: unknown) {
                void vscode.window.showErrorMessage(`Account Pool: Re-auth failed - ${e instanceof Error ? e.message : String(e)}`);
              }
              this.refresh();
            }
            break;
          case "refreshAccount":
            if (message.payload) {
              await this.quotaMonitor.refreshAccountQuota(message.payload);
              this.refresh();
            }
            break;
          case "removeAccount":
            if (message.payload) {
              await this.tokenManager.removeAccount(message.payload);
              this.refresh();
            }
            break;
          case "clearLogs":
            this.logManager.clear();
            this.refresh();
            break;
          case "updateConfig":
            if (message.payload) {
              await this.tokenManager.updateConfig(message.payload);
              this.refresh();
            }
            break;
          case "recalculateStats":
            if (this.statsManager) {
              await this.statsManager.resetAndRecalculate(BRAIN_DIR);
              this.usageTracker?.resetProcessedLines();
              this.refresh();
            }
            break;
        }
      } catch (err: unknown) {
        this.log(`Message handler error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  private getHtmlForWebview(): string {
    const initialStateJson = JSON.stringify(this.getCurrentStateData()).replace(/</g, "\\u003c");
    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>
:root {
  --bg: var(--vscode-sideBar-background, #090d16);
  --card: var(--vscode-editor-background, #101726);
  --card-sub: rgba(255, 255, 255, 0.03);
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(16, 185, 129, 0.35);
  --text: var(--vscode-foreground, #f3f4f6);
  --dim: var(--vscode-descriptionForeground, #94a3b8);
  --accent: #10b981;
  --accent-glow: rgba(16, 185, 129, 0.25);
  --accent-h: #059669;
  --gemini: #38bdf8;
  --gemini-grad: linear-gradient(90deg, #0284c7, #38bdf8);
  --claude: #c084fc;
  --claude-grad: linear-gradient(90deg, #9333ea, #c084fc);
  --warn: #f59e0b;
  --danger: #ef4444;
  --cached: #a855f7;
  --input-col: #38bdf8;
  --output-col: #10b981;
  --thinking-col: #f59e0b;
  --font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  --mono: var(--vscode-editor-font-family, "JetBrains Mono", Consolas, monospace);
}

* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-x: hidden;
  font-size: 11px;
}

/* Brand Header */
.brand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}
.brand-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand-logo {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: linear-gradient(135deg, #10b981, #0284c7);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 13px;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
}
.brand-title {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #fff;
  line-height: 1.2;
}
.brand-sub {
  font-size: 8.5px;
  color: #10b981;
  font-weight: 600;
}
.brand-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pulse-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 8.5px;
  font-weight: 700;
  font-family: var(--mono);
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  padding: 2px 5px;
  border-radius: 10px;
}
.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

/* KPI Hero Dashboard */
.kpi-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
}
.kpi-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}
.kpi-card.highlight {
  border-color: rgba(16, 185, 129, 0.4);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, var(--card) 100%);
}
.kpi-lbl {
  font-size: 7.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--dim);
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kpi-val {
  font-size: 11px;
  font-weight: 800;
  font-family: var(--mono);
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kpi-sub {
  font-size: 7.5px;
  color: var(--dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Controls & Strategy */
.control-box {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.control-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.strat-select {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 9.5px;
  font-family: var(--font);
  font-weight: 600;
  outline: none;
  cursor: pointer;
  flex: 1;
}
.strat-select:focus { border-color: var(--accent); }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: 4px;
  padding: 3px 7px;
  font-family: var(--font);
  font-size: 9.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}
.btn-primary {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}
.btn-primary:hover { background: linear-gradient(135deg, #059669, #047857); }
.btn-sec {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border-color: var(--border);
}
.btn-sec:hover { background: rgba(255, 255, 255, 0.1); }
.btn-icon { padding: 1px 4px; font-size: 9px; }

/* Switch Slider */
.switch { position: relative; display: inline-block; width: 26px; height: 14px; cursor: pointer; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.slider { position: absolute; inset: 0; background: rgba(255,255,255,.15); border-radius: 10px; transition: .18s; }
.slider::before { position: absolute; content: ""; height: 8px; width: 8px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: .18s; }
.switch input:checked + .slider { background: var(--accent); }
.switch input:checked + .slider::before { transform: translateX(12px); }

/* Account Cards */
.acc-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 9px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  transition: all 0.2s ease;
}
.acc-card:hover { border-color: rgba(255, 255, 255, 0.16); }
.acc-card.active {
  border-color: var(--accent);
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.2), inset 0 0 0 1px var(--accent);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, var(--card) 100%);
}
.acc-card.disabled { opacity: 0.5; filter: grayscale(0.4); }

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
}
.card-identity {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.avatar-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0284c7, #38bdf8);
  color: #fff;
  font-size: 9.5px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.acc-card.active .avatar-badge {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}
.id-col {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}
.id-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.acc-email-txt {
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  user-select: text;
}
.acc-email-txt:hover { color: var(--accent); text-decoration: underline; }

.pill-tier {
  font-size: 7.5px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.pill-tier.pro { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
.pill-tier.ultra { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); }
.pill-tier.free { background: rgba(255, 255, 255, 0.08); color: var(--dim); border: 1px solid var(--border); }

.badges-flow {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
}
.badge-active {
  font-size: 7.5px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.5);
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.badge-max-quota {
  font-size: 7.5px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 3px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(16, 185, 129, 0.2));
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.5);
  display: inline-flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.25);
}
.chip-meta {
  font-size: 7.5px;
  font-weight: 700;
  font-family: var(--mono);
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  border: 1px solid var(--border);
  cursor: pointer;
}
.chip-meta:hover { background: rgba(255,255,255,0.12); border-color: var(--accent); }

.card-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}
.btn-activate {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 8.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
  transition: all 0.15s ease;
}
.btn-activate:hover {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

/* Quota Box */
.quota-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  padding: 6px 7px;
}
.gauge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  font-size: 9.5px;
}
.gauge-label-col {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.gauge-title {
  color: var(--dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reset-pill {
  font-size: 8px;
  font-family: var(--mono);
  padding: 1px 3px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--dim);
  white-space: nowrap;
  flex-shrink: 0;
}
.reset-pill.active {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.bar-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 45%;
  min-width: 55px;
  max-width: 105px;
  flex-shrink: 0;
}
.bar-track {
  position: relative;
  flex: 1;
  height: 5px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  width: 100%;
  transform-origin: 0% 50%;
  border-radius: 3px;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  background: var(--accent);
}
.bar-fill.gemini { background: var(--gemini-grad); }
.bar-fill.claude { background: var(--claude-grad); }
.bar-fill.warn { background: var(--warn); }
.bar-fill.err { background: var(--danger); }
.bar-num {
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 700;
  width: 26px;
  text-align: right;
  flex-shrink: 0;
}

.model-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 2px;
  padding-top: 3px;
  border-top: 1px dashed rgba(255, 255, 255, 0.06);
}
.chip-model {
  font-size: 7.5px;
  font-family: var(--mono);
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text);
  white-space: nowrap;
}
.chip-model.warn { color: #fbbf24; border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.1); }
.chip-model.err { color: #f87171; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.1); }

/* Stats Bar & Charts */
.segmented-bar { display: flex; width: 100%; height: 6px; border-radius: 3px; overflow: hidden; background: rgba(255,255,255,.08); }
.seg-inp { background: var(--input-col); height: 100%; transition: width .3s; }
.seg-out { background: var(--output-col); height: 100%; transition: width .3s; }
.seg-cac { background: var(--cached); height: 100%; transition: width .3s; }
.seg-thk { background: var(--thinking-col); height: 100%; transition: width .3s; }

.segmented-tabs { display: flex; background: var(--card); border: 1px solid var(--border); border-radius: 5px; padding: 2px; gap: 2px; width: 100%; }
.tab-btn { flex: 1; min-width: 0; padding: 3px 2px; font-size: 10px; font-weight: 600; font-family: var(--font); background: transparent; color: var(--dim); border: none; border-radius: 3px; cursor: pointer; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: background .12s, color .12s; }
.tab-btn:hover { color: var(--text); background: rgba(255,255,255,0.06); }
.tab-btn.active { background: var(--accent); color: #fff; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.stat-box { background: var(--card); border: 1px solid var(--border); border-radius: 5px; padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; }
.stat-val { font-size: 13px; font-weight: 700; font-family: var(--mono); color: var(--text); }
.stat-lbl { font-size: 9px; color: var(--dim); }

.chart-scroll-box { width: 100%; overflow-x: auto; overflow-y: hidden; margin-top: 6px; contain: content; will-change: scroll-position; scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
.chart-scroll-box::-webkit-scrollbar { height: 4px; }
.chart-scroll-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 2px; }
.chart-svg { height: 145px; overflow: visible; display: block; }
.h-scroll-box { display: flex; flex-direction: row; gap: 6px; overflow-x: auto; overflow-y: hidden; padding: 2px 1px 6px 1px; scrollbar-width: thin; -webkit-overflow-scrolling: touch; will-change: scroll-position; }
.square-card { flex: 0 0 168px; width: 168px; background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 7px 8px; display: flex; flex-direction: column; gap: 3px; user-select: text; contain: content; }
.square-card .card-title { flex: 0 0 auto; margin: 1px 0 2px 0; font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.log-scroll { display: flex; flex-direction: column; gap: 4px; max-height: 24vh; overflow-y: auto; overflow-x: hidden; padding-right: 1px; contain: content; will-change: scroll-position; }
.log-card { background: var(--card); border: 1px solid var(--border); border-radius: 5px; padding: 4px 6px; display: flex; flex-direction: column; gap: 2px; min-width: 0; user-select: text; }
.log-card * { user-select: text; }
.log-meta { display: flex; align-items: center; justify-content: space-between; gap: 4px; font-size: 8.5px; color: var(--dim); }
.log-msg { font-size: 9.5px; line-height: 1.4; word-break: normal; overflow-wrap: anywhere; }
.log-msg.error { color: #f87171; }
.log-msg.warn { color: #fbbf24; }
.log-msg.rotate { color: #6ee7b7; }
.empty { padding: 12px; text-align: center; color: var(--dim); font-size: 10px; }
.sec-head { font-size: 10px; font-weight: 700; color: var(--dim); margin-top: 2px; display: flex; align-items: center; justify-content: space-between; text-transform: uppercase; letter-spacing: 0.3px; }
.sort-select { background: var(--card); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 1px 3px; font-size: 9px; font-family: var(--font); outline: none; cursor: pointer; }
.card-breakdown { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; background: transparent; border: none; padding: 0; margin-top: 1px; }
.cb-item { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cb-lbl { font-size: 8px; color: var(--dim); text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; }
.cb-val { font-size: 10.5px; font-weight: 700; font-family: var(--mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta { font-size: 8.5px; font-family: var(--mono); color: var(--dim); display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style></head><body>

<div id="view-home" style="display:flex;flex-direction:column;gap:8px;">
  <!-- Brand Banner -->
  <div class="brand-header">
    <div class="brand-left">
      <div class="brand-logo">⚡</div>
      <div>
        <div class="brand-title">ACCOUNT POOL</div>
        <div class="brand-sub">Hồ Đức Vinh • Antigravity Edition</div>
      </div>
    </div>
    <div class="brand-right">
      <span class="pulse-indicator">
        <span class="pulse-dot"></span>
        <span id="pool-online-label">ONLINE</span>
      </span>
      <label class="switch" title="Bật/Tắt Tự Động Quota Pool">
        <input type="checkbox" id="cfg-enabled" data-action="toggleEnabled" checked />
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <!-- Hero KPI Metrics -->
  <div class="kpi-row">
    <div class="kpi-card" id="kpi-active-card">
      <span class="kpi-lbl">Active Account</span>
      <span class="kpi-val" id="kpi-active-email">---</span>
      <span class="kpi-sub" id="kpi-active-tier">PRO Tier</span>
    </div>
    <div class="kpi-card highlight" id="kpi-max-card">
      <span class="kpi-lbl">👑 Max Quota</span>
      <span class="kpi-val" id="kpi-max-email">---</span>
      <span class="kpi-sub" id="kpi-max-score">100% available</span>
    </div>
    <div class="kpi-card" id="kpi-pool-card">
      <span class="kpi-lbl">Pool Capacity</span>
      <span class="kpi-val" id="kpi-pool-avg">100%</span>
      <span class="kpi-sub" id="kpi-pool-count">0 accounts</span>
    </div>
  </div>

  <!-- Controls & Action Toolbar -->
  <div class="control-box">
    <div class="control-line">
      <span class="kpi-lbl" style="min-width:55px;">Chiến Lược:</span>
      <select class="strat-select" id="cfg-strategy" data-action="changeStrategy">
        <option value="auto_highest">⚡ Tối Đa Quota (Auto Highest - Tuyệt Đối)</option>
        <option value="cache_optimized">🎯 Tối Ưu Cache GPU (Giữ Cache > 15%)</option>
        <option value="round_robin">🔄 Luân Chuyển Đều (Round Robin)</option>
      </select>
    </div>
    <div class="control-line" style="justify-content:space-between;">
      <div style="display:flex;gap:4px;">
        <button class="btn btn-primary" data-action="addAccount" title="Thêm tài khoản Google">+ Thêm Account</button>
        <button class="btn btn-sec" data-action="refreshQuotas" title="Làm mới hạn mức toàn bộ pool">&#x21bb; Làm Mới</button>
      </div>
      <button class="btn btn-sec" data-action="toggleHideEmail" id="btn-hide-email" title="Ẩn/Hiện địa chỉ email">Ẩn Email</button>
    </div>
  </div>

  <!-- Accounts List Section -->
  <div class="sec-head">
    <span>Danh Sách Tài Khoản Trong Pool</span>
    <span id="quota-last-refreshed" style="font-size:8px;font-family:var(--mono);color:var(--dim);text-transform:none;"></span>
  </div>
  <div id="acc-list" style="display:flex;flex-direction:column;gap:6px;"></div>

  <!-- Token Statistics Widget -->
  <div class="sec-head">
    <span>Thống Kê Tiêu Thụ Token</span>
  </div>
  <div id="stats-widget"></div>

  <!-- Event Stream Section -->
  <div class="sec-head">
    <span>Nhật Ký Luân Chuyển Sự Kiện</span>
    <div style="display:flex;gap:4px;align-items:center;">
      <span id="log-count" style="font-size:8.5px;font-family:var(--mono);color:var(--dim);">0 logs</span>
      <button class="btn btn-sec btn-icon" data-action="clearLogs" title="Xóa nhật ký">Clear</button>
    </div>
  </div>
  <div class="log-scroll" id="log-scroll"></div>
</div>

<!-- View Token Stats Details -->
<div id="view-stats" style="display:none;flex-direction:column;gap:8px;">
  <div class="brand-header">
    <div class="brand-left">
      <div class="brand-logo" style="background:linear-gradient(135deg, #a855f7, #38bdf8);">📈</div>
      <div>
        <div class="brand-title">TOKEN ANALYTICS</div>
        <div class="brand-sub">Hồ Đức Vinh • Antigravity Edition</div>
      </div>
    </div>
    <button class="btn btn-sec" data-action="nav" data-view="home">&larr; Quay Lại</button>
  </div>

  <div class="sec-head" style="margin-top:0;">
    <span>Chu Kỳ Thời Gian</span>
    <button class="btn btn-sec btn-icon" data-action="recalculateStats" title="Đồng bộ lại từ transcripts">&#x21bb; Sync</button>
  </div>

  <div class="segmented-tabs">
    <button class="tab-btn active" id="tab-today" data-action="range" data-range="today">Hôm Nay</button>
    <button class="tab-btn" id="tab-daily" data-action="range" data-range="daily">7 Ngày</button>
    <button class="tab-btn" id="tab-weekly" data-action="range" data-range="weekly">4 Tuần</button>
    <button class="tab-btn" id="tab-monthly" data-action="range" data-range="monthly">12 Tháng</button>
  </div>

  <div class="acc-card" style="padding:10px 8px;">
    <div class="card-top" style="flex-wrap:wrap;gap:4px;">
      <span class="acc-email-txt" id="chart-title" style="min-width:110px;">Token Consumption</span>
      <div style="display:flex;gap:7px;font-size:8.5px;flex-shrink:0;margin-left:auto;">
        <span style="display:flex;align-items:center;gap:3px;"><span style="width:7px;height:7px;border-radius:2px;background:var(--cached);"></span>Cache Hit</span>
        <span style="display:flex;align-items:center;gap:3px;"><span style="width:7px;height:7px;border-radius:2px;background:var(--input-col);"></span>New Input</span>
        <span style="display:flex;align-items:center;gap:3px;"><span style="width:7px;height:7px;border-radius:2px;background:var(--thinking-col);"></span>Thinking</span>
        <span style="display:flex;align-items:center;gap:3px;"><span style="width:7px;height:7px;border-radius:2px;background:var(--output-col);"></span>Output</span>
      </div>
    </div>
    <div class="chart-scroll-box" id="chart-container"></div>
  </div>

  <div class="sec-head">
    <span id="cumulative-title">Chỉ Số Tổng Hợp</span>
  </div>
  <div class="stats-grid" id="alltime-grid"></div>

  <div class="sec-head">
    <span>Tiêu Thụ Theo Lượt Yêu Cầu (Requests)</span>
    <div style="display:flex;align-items:center;gap:3px;">
      <span id="req-count" style="font-size:9px;font-family:var(--mono);color:var(--dim);">0 reqs</span>
      <select class="sort-select" id="sort-sel-requests" data-action="changeSortField" data-section="requests">
        <option value="recent" selected>Recent</option>
        <option value="total">Volume</option>
        <option value="cachePct">Cache Rate</option>
        <option value="input">Input</option>
        <option value="output">Output</option>
        <option value="cache">Cache</option>
        <option value="turns">Turns</option>
      </select>
      <button class="btn btn-sec btn-icon" id="sort-dir-requests" data-action="toggleSortDir" data-section="requests">▼</button>
    </div>
  </div>
  <div class="h-scroll-box" id="request-breakdown"></div>

  <div class="sec-head">
    <span>Tiêu Thụ Theo Model</span>
    <div style="display:flex;align-items:center;gap:3px;">
      <span id="model-count" style="font-size:9px;font-family:var(--mono);color:var(--dim);">0 models</span>
      <select class="sort-select" id="sort-sel-models" data-action="changeSortField" data-section="models">
        <option value="total" selected>Volume</option>
        <option value="cachePct">Cache Rate</option>
        <option value="input">Input</option>
        <option value="output">Output</option>
        <option value="cache">Cache</option>
        <option value="name">Name</option>
      </select>
      <button class="btn btn-sec btn-icon" id="sort-dir-models" data-action="toggleSortDir" data-section="models">▼</button>
    </div>
  </div>
  <div class="h-scroll-box" id="model-breakdown"></div>

  <div class="sec-head">
    <span>Tiêu Thụ Theo Phiên Chat (Sessions)</span>
    <div style="display:flex;align-items:center;gap:3px;">
      <span id="conv-count" style="font-size:9px;font-family:var(--mono);color:var(--dim);">0 sessions</span>
      <select class="sort-select" id="sort-sel-conversations" data-action="changeSortField" data-section="conversations">
        <option value="recent" selected>Recent</option>
        <option value="total">Volume</option>
        <option value="cachePct">Cache Rate</option>
        <option value="input">Input</option>
        <option value="output">Output</option>
        <option value="cache">Cache</option>
        <option value="turns">Turns</option>
      </select>
      <button class="btn btn-sec btn-icon" id="sort-dir-conversations" data-action="toggleSortDir" data-section="conversations">▼</button>
    </div>
  </div>
  <div class="h-scroll-box" id="conv-breakdown"></div>
</div>

<script>
var vscode = acquireVsCodeApi();
var state = ${initialStateJson};
var currentView = "home";
var statsRange = "today";
var selectedBarIndex = null;
var selectedBarLabel = null;
var hideEmail = false;
var accountsExpanded = false;
var sortConfig = {
  requests: { field: "recent", dir: "desc" },
  models: { field: "total", dir: "desc" },
  conversations: { field: "recent", dir: "desc" }
};

function send(action, payload) { vscode.postMessage({ action: action, payload: payload }); }
function esc(s) { return s ? String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;") : ""; }
function fmtNum(n) { return typeof n === "number" ? (n >= 1e6 ? (n/1e6).toFixed(2)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"k" : n.toLocaleString()) : "0"; }
function fmtDateTime(ts) { return ts ? new Date(ts).toLocaleString() : ""; }

function maskEmail(email, index) {
  if (!email) return "";
  if (!hideEmail) return email;
  if (typeof index === "number") return "Account " + (index + 1);
  var accs = (state && Array.isArray(state.accounts)) ? state.accounts.filter(Boolean) : [];
  for (var i = 0; i < accs.length; i++) {
    if (accs[i].email && accs[i].email.toLowerCase() === email.toLowerCase()) {
      return "Account " + (i + 1);
    }
  }
  return "Account";
}

function sanitizeTextForDisplay(text) {
  if (!text || !hideEmail) return text || "";
  var accs = (state && Array.isArray(state.accounts)) ? state.accounts.filter(Boolean) : [];
  var res = String(text);
  for (var i = 0; i < accs.length; i++) {
    if (accs[i].email) {
      res = res.split(accs[i].email).join("Account " + (i + 1));
    }
  }
  res = res.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.][a-zA-Z]{2,}/g, "Account");
  return res;
}

document.addEventListener("click", function(e) {
  var target = e.target && e.target.closest ? e.target.closest("[data-action]") : null;
  if (!target) return;
  var action = target.getAttribute("data-action");
  if (action === "nav") {
    navTo(target.getAttribute("data-view"));
  } else if (action === "range") {
    setStatsRange(target.getAttribute("data-range"));
  } else if (action === "selectBar") {
    var bIdx = parseInt(target.getAttribute("data-index"), 10);
    if (!isNaN(bIdx)) {
      if (selectedBarIndex === bIdx) {
        selectedBarIndex = null;
        selectedBarLabel = null;
      } else {
        selectedBarIndex = bIdx;
        selectedBarLabel = target.getAttribute("data-label") || null;
      }
      renderStatsPage(true);
    }
  } else if (action === "clearBarFilter") {
    selectedBarIndex = null;
    selectedBarLabel = null;
    renderStatsPage(true);
  } else if (action === "toggleHideEmail") {
    hideEmail = !hideEmail;
    var btn = document.getElementById("btn-hide-email");
    if (btn) btn.textContent = hideEmail ? "Hiện Email" : "Ẩn Email";
    send("updateConfig", { hideEmail: hideEmail });
    lastAccountsFp = "";
    lastLogHideEmail = null;
    renderAccounts();
    renderLogs();
  } else if (action === "toggleExpandAccounts") {
    accountsExpanded = !accountsExpanded;
    lastAccountsFp = "";
    renderAccounts();
  } else if (action === "toggleSortDir") {
    var sec = target.getAttribute("data-section");
    if (sec && sortConfig[sec]) {
      sortConfig[sec].dir = sortConfig[sec].dir === "desc" ? "asc" : "desc";
      renderStatsPage(true);
    }
  } else if (action === "toggleAffinity") {
    var affEmail = target.getAttribute("data-email");
    var curAff = target.getAttribute("data-affinity") || "all";
    var nextAff = curAff === "all" ? "claude" : curAff === "claude" ? "gemini" : "all";
    send("updateAccountMeta", { email: affEmail, affinity: nextAff });
  } else if (action === "toggleRole") {
    var roleEmail = target.getAttribute("data-email");
    var curRole = target.getAttribute("data-role") || "primary";
    var nextRole = curRole === "primary" ? "reserve" : "primary";
    send("updateAccountMeta", { email: roleEmail, role: nextRole });
  } else if (action === "editAlias") {
    var aliasEmail = target.getAttribute("data-email");
    var curAlias = target.getAttribute("data-alias") || "";
    var newAlias = prompt("Nhập tên hiển thị (alias) cho " + aliasEmail + " (để trống để xóa):", curAlias);
    if (newAlias !== null) {
      send("updateAccountMeta", { email: aliasEmail, alias: newAlias.trim() });
    }
  } else if (action === "selectAccount") {
    send("selectAccount", target.getAttribute("data-email"));
  } else if (action === "reauthAccount") {
    send("reauthAccount", target.getAttribute("data-email"));
  } else if (action === "refreshAccount") {
    send("refreshAccount", target.getAttribute("data-email"));
  } else if (action === "removeAccount") {
    if (confirm("Bạn có chắc chắn muốn xóa tài khoản này khỏi pool?")) {
      send("removeAccount", target.getAttribute("data-email"));
    }
  } else if (action === "addAccount") {
    send("addAccount");
  } else if (action === "refreshQuotas") {
    send("refreshQuotas");
  } else if (action === "clearLogs") {
    send("clearLogs");
  } else if (action === "recalculateStats") {
    send("recalculateStats");
  }
});

document.addEventListener("change", function(e) {
  var target = e.target;
  if (!target) return;
  var action = target.getAttribute("data-action");
  if (action === "changeSortField") {
    var sec = target.getAttribute("data-section");
    if (sec && sortConfig[sec]) {
      sortConfig[sec].field = target.value;
      renderStatsPage(true);
    }
  } else if (action === "toggleAccount") {
    send("toggleAccount", { email: target.getAttribute("data-email"), enabled: target.checked });
  } else if (action === "toggleEnabled") {
    send("updateConfig", { enabled: target.checked });
  } else if (action === "changeStrategy") {
    send("updateConfig", { rotationStrategy: target.value });
  }
});

var viewStatsEl = document.getElementById("view-stats");
if (viewStatsEl) {
  viewStatsEl.addEventListener("wheel", function(e) {
    var hScroll = e.target && e.target.closest ? e.target.closest(".h-scroll-box, .chart-scroll-box") : null;
    if (hScroll && Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
      var canScrollRight = e.deltaY > 0 && (hScroll.scrollLeft + hScroll.clientWidth < hScroll.scrollWidth - 4);
      var canScrollLeft = e.deltaY < 0 && hScroll.scrollLeft > 4;
      if (canScrollRight || canScrollLeft) {
        hScroll.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }
  }, { passive: false });
}

var pendingRender = false;
function scheduleRender() {
  if (pendingRender) return;
  pendingRender = true;
  requestAnimationFrame(function() {
    pendingRender = false;
    render();
  });
}

window.addEventListener("message", function(e) {
  if (e.data && e.data.type === "state" && e.data.data) {
    state = e.data.data;
    scheduleRender();
  }
});

var shouldScrollChart = true;
function navTo(view) {
  currentView = view;
  var homeEl = document.getElementById("view-home");
  var statsEl = document.getElementById("view-stats");
  if (homeEl) homeEl.style.display = view === "home" ? "flex" : "none";
  if (statsEl) statsEl.style.display = view === "stats" ? "flex" : "none";
  if (view === "home") {
    lastAccountsFp = "";
    lastStatsWidgetFp = "";
    renderAccounts();
    renderStatsWidget();
    renderLogs();
  } else if (view === "stats") {
    shouldScrollChart = true;
    renderStatsPage(true);
  }
}

function updateTabStyles() {
  var tabs = { today: document.getElementById("tab-today"), daily: document.getElementById("tab-daily"), weekly: document.getElementById("tab-weekly"), monthly: document.getElementById("tab-monthly") };
  for (var k in tabs) {
    var el = tabs[k];
    if (el) {
      if (k === statsRange) el.classList.add("active");
      else el.classList.remove("active");
    }
  }
}

function setStatsRange(range) {
  statsRange = range;
  selectedBarIndex = null;
  selectedBarLabel = null;
  shouldScrollChart = true;
  updateTabStyles();
  renderStatsPage(true);
}

function fmtTime(s) {
  if (!s) return "";
  var target = new Date(s);
  var d = target.getTime() - Date.now();
  if (d <= 0 || isNaN(d)) return "sẵn sàng";
  var days = Math.floor(d / 864e5), hrs = Math.floor((d % 864e5) / 36e5), mins = Math.floor((d % 36e5) / 6e4);
  var rel = days > 0 ? days + "d " + hrs + "h" : hrs > 0 ? hrs + "h " + mins + "m" : mins + "m";
  var hrsStr = String(target.getHours()).padStart(2, "0");
  var minsStr = String(target.getMinutes()).padStart(2, "0");
  var localClock = hrsStr + ":" + minsStr;
  return rel + " (" + localClock + ")";
}

function render() {
  try {
    if (state && state.config) {
      var cfgEnabled = document.getElementById("cfg-enabled");
      if (cfgEnabled) {
        cfgEnabled.checked = state.config.enabled !== false;
      }
      var cfgStrat = document.getElementById("cfg-strategy");
      if (cfgStrat) {
        cfgStrat.value = state.config.rotationStrategy || "auto_highest";
      }
      if (typeof state.config.hideEmail === "boolean") {
        hideEmail = state.config.hideEmail;
      }
    }
    var btn = document.getElementById("btn-hide-email");
    if (btn) btn.textContent = hideEmail ? "Hiện Email" : "Ẩn Email";

    if (currentView === "home") {
      renderAccounts();
      renderStatsWidget();
      renderLogs();
    } else if (currentView === "stats") {
      renderStatsPage(false);
    }
  } catch (err) {
    console.error("render error:", err);
  }
}

function makeBarHtml(label, pct, resetIso, isClaude) {
  var p = typeof pct === "number" ? Math.min(100, Math.max(0, pct)) : 100;
  var cls = p < 20 ? "err" : p < 40 ? "warn" : isClaude ? "claude" : "gemini";
  var resetText = fmtTime(resetIso);
  var rTag = resetIso ? '<span class="reset-pill ' + (resetText !== "sẵn sàng" ? "active" : "") + '" data-reset="' + resetIso + '">' + resetText + '</span>' : '';
  var scale = (p / 100).toFixed(3);
  return '<div class="gauge-row">' +
    '<div class="gauge-label-col">' +
      '<span class="gauge-title">' + esc(label) + '</span>' +
      rTag +
    '</div>' +
    '<div class="bar-wrap">' +
      '<div class="bar-track"><div class="bar-fill ' + cls + '" style="transform:scaleX(' + scale + ');"></div></div>' +
      '<span class="bar-num">' + p + '%</span>' +
    '</div>' +
  '</div>';
}

var lastAccountsFp = "";
function renderAccounts() {
  var list = document.getElementById("acc-list");
  if (!list) return;
  var accs = (state && Array.isArray(state.accounts)) ? state.accounts.filter(Boolean) : [];
  var quotas = (state && state.quotas && typeof state.quotas === "object") ? state.quotas : {};

  // Find active and highest quota accounts
  var activeEmail = (state && state.activeEmail) || "";
  var activeAcc = null;
  var highestEmail = "";
  var highestScore = -1;
  var highestPct = 0;
  var totalQuotaSum = 0;
  var healthyCount = 0;

  for (var hi = 0; hi < accs.length; hi++) {
    var ha = accs[hi];
    var isDis = ha.status === "disabled";
    if (ha.email && ha.email.toLowerCase() === activeEmail.toLowerCase()) {
      activeAcc = ha;
    }
    if (isDis) continue;

    var hq = ha.email ? quotas[ha.email.toLowerCase()] : null;
    var hPct = 100;
    if (hq && Array.isArray(hq.families) && hq.families.length) {
      var minFam = 100;
      for (var hf = 0; hf < hq.families.length; hf++) {
        var famObj = hq.families[hf];
        var p = famObj.limit5h ? famObj.limit5h.percent : (famObj.percent || 100);
        if (p < minFam) minFam = p;
      }
      hPct = minFam;
    }
    totalQuotaSum += hPct;
    healthyCount++;

    var tierBonus = ha.tier === "ultra" ? 2 : ha.tier === "pro" ? 1 : 0;
    var score = hPct + tierBonus / 10;
    if (score > highestScore) {
      highestScore = score;
      highestEmail = ha.email;
      highestPct = hPct;
    }
  }

  var avgQuota = healthyCount > 0 ? Math.round(totalQuotaSum / healthyCount) : 100;

  // Update Top Hero KPI Cards
  var kpiActiveVal = document.getElementById("kpi-active-email");
  var kpiActiveSub = document.getElementById("kpi-active-tier");
  var kpiMaxVal = document.getElementById("kpi-max-email");
  var kpiMaxSub = document.getElementById("kpi-max-score");
  var kpiPoolAvg = document.getElementById("kpi-pool-avg");
  var kpiPoolCount = document.getElementById("kpi-pool-count");

  if (kpiActiveVal) {
    kpiActiveVal.textContent = activeAcc ? (hideEmail ? maskEmail(activeAcc.email) : (activeAcc.alias || activeAcc.email.split("@")[0])) : "Chưa chọn";
  }
  if (kpiActiveSub) {
    kpiActiveSub.textContent = activeAcc ? ("[" + (activeAcc.tier || "pro").toUpperCase() + "] Active") : "Sẵn sàng";
  }
  if (kpiMaxVal) {
    var hAcc = accs.find(function(a) { return a.email.toLowerCase() === highestEmail.toLowerCase(); });
    kpiMaxVal.textContent = highestEmail ? (hideEmail ? maskEmail(highestEmail) : (hAcc && hAcc.alias ? hAcc.alias : highestEmail.split("@")[0])) : "---";
  }
  if (kpiMaxSub) {
    kpiMaxSub.textContent = highestEmail ? ("👑 " + highestPct + "% quota cao nhất") : "Chưa có dữ liệu";
  }
  if (kpiPoolAvg) {
    kpiPoolAvg.textContent = avgQuota + "%";
  }
  if (kpiPoolCount) {
    kpiPoolCount.textContent = healthyCount + "/" + accs.length + " tài khoản sẵn sàng";
  }

  if (!accs.length) {
    lastAccountsFp = "";
    list.innerHTML = '<div class="empty">Chưa có tài khoản nào trong pool.<br>Bấm <strong>+ Thêm Account</strong> để đăng nhập tài khoản Google.</div>';
    var emptyRefEl = document.getElementById("quota-last-refreshed");
    if (emptyRefEl) emptyRefEl.textContent = "";
    return;
  }

  var visibleAccs = (!accountsExpanded && accs.length > 4) ? accs.slice(0, 4) : accs;
  var fp = (hideEmail ? "1" : "0") + "|" + (accountsExpanded ? "1" : "0") + "|" + (activeEmail || "") + "|" + (highestEmail || "") + "|" + visibleAccs.length;
  for (var fi = 0; fi < visibleAccs.length; fi++) {
    var fa = visibleAccs[fi];
    var fq = fa.email ? quotas[fa.email.toLowerCase()] : null;
    fp += "|" + fa.email + ":" + fa.status + ":" + fa.tier + ":" + fa.alias + ":" + fa.affinity + ":" + fa.role + ":" + fa.health;
    if (fq) {
      fp += ":" + (fq.lastUpdated || 0) + ":" + (fq.percent || 0);
      if (Array.isArray(fq.families)) {
        for (var ff = 0; ff < fq.families.length; ff++) {
          var fam = fq.families[ff];
          if (fam) fp += ":" + fam.key + ":" + (fam.limit5h ? fam.limit5h.percent : fam.percent) + ":" + (fam.limitWeekly ? fam.limitWeekly.percent : "");
        }
      }
      if (Array.isArray(fq.models)) {
        for (var fm = 0; fm < fq.models.length; fm++) {
          var mod = fq.models[fm];
          if (mod) fp += ":" + mod.name + ":" + mod.percent;
        }
      }
    }
  }
  if (fp === lastAccountsFp) return;
  lastAccountsFp = fp;

  var latestRefresh = 0;
  for (var k in quotas) {
    if (quotas[k] && typeof quotas[k].lastUpdated === "number" && quotas[k].lastUpdated > latestRefresh) {
      latestRefresh = quotas[k].lastUpdated;
    }
  }
  var qRefEl = document.getElementById("quota-last-refreshed");
  if (qRefEl) {
    qRefEl.textContent = latestRefresh > 0 ? ("Cập nhật: " + fmtDateTime(latestRefresh)) : "";
  }

  var cardsHtml = visibleAccs.map(function(acc, idx) {
    var email = acc.email || "";
    var displayEmail = hideEmail ? ("Account " + (idx + 1)) : (acc.alias ? (acc.alias + " (" + email + ")") : email);
    var titleAttr = hideEmail ? ("Account " + (idx + 1)) : email;
    var isDis = acc.status === "disabled";
    var isAct = !isDis && email && email.toLowerCase() === activeEmail.toLowerCase();
    var isHighest = !isDis && highestEmail && email && email.toLowerCase() === highestEmail.toLowerCase();
    var q = (email && quotas[email.toLowerCase()]) || {};
    var fams = (Array.isArray(q.families) && q.families.length) ? q.families : [{ key: "gemini", label: "Gemini", percent: 100 }, { key: "claude", label: "Claude", percent: 100 }];

    var modelsHtml = "";
    if (Array.isArray(q.models) && q.models.length > 0) {
      modelsHtml = '<div class="model-chips-row">' +
        q.models.map(function(m) {
          var mp = typeof m.percent === "number" ? m.percent : 100;
          var mCls = mp < 20 ? "chip-model err" : mp < 40 ? "chip-model warn" : "chip-model";
          var mReset = m.resetTime ? ' (reset ' + fmtTime(m.resetTime) + ')' : '';
          return '<span class="' + mCls + '" title="' + esc(m.name) + ': ' + mp + '%' + mReset + '">' + esc(m.name) + ': ' + mp + '%</span>';
        }).join("") +
      '</div>';
    }

    var qHtml = '<div class="quota-container">' + fams.map(function(f) {
      if (!f) return "";
      var isCl = f.key === "claude";
      var html = makeBarHtml((f.label || "Model") + " (5h)", f.limit5h ? f.limit5h.percent : (f.percent || 100), f.limit5h ? f.limit5h.resetTime : f.resetTime, isCl);
      if (f.limitWeekly) html += makeBarHtml((f.label || "Model") + " (7d)", f.limitWeekly.percent, f.limitWeekly.resetTime, isCl);
      return html;
    }).join("") + modelsHtml + '</div>';

    var activeBadge = isAct ? '<span class="badge-active">● ACTIVE</span>' : '';
    var highestBadge = isHighest ? '<span class="badge-max-quota">👑 MAX</span>' : '';
    var affTag = '<span class="chip-meta" data-action="toggleAffinity" data-email="' + esc(email) + '" data-affinity="' + esc(acc.affinity || "all") + '" title="Model Affinity: ' + esc(acc.affinity || "all") + '">' + esc((acc.affinity || "all").toUpperCase()) + '</span>';
    var roleTag = '<span class="chip-meta" data-action="toggleRole" data-email="' + esc(email) + '" data-role="' + esc(acc.role || "primary") + '" title="Pool Role: ' + esc(acc.role || "primary") + '">' + esc((acc.role || "primary").toUpperCase()) + '</span>';

    var healthBadge = (acc.health && acc.health !== "healthy")
      ? ('<span class="chip-model err" title="' + esc(acc.healthError || "Token cần xác thực lại") + '">' + (acc.health === "expired" ? "HẾT HẠN" : acc.health === "tos_required" ? "TOS REQ" : "LỖI") + '</span>')
      : "";
    var reauthBtn = (acc.health && acc.health !== "healthy")
      ? ('<button class="btn btn-sec btn-icon" data-action="reauthAccount" data-email="' + esc(email) + '" title="Đăng nhập lại" style="color:var(--warn);border-color:var(--warn);font-size:8.5px;padding:1px 4px;">Re-Auth</button>')
      : "";
    var switchBtn = (!isAct && !isDis)
      ? ('<button class="btn-activate" data-action="selectAccount" data-email="' + esc(email) + '" title="Chuyển ngay sang tài khoản này trên IDE">⚡ Switch</button>')
      : "";

    var userInitial = (acc.alias ? acc.alias[0] : (email ? email[0] : "G")).toUpperCase();

    return '<div class="acc-card ' + (isAct ? "active" : "") + ' ' + (isDis ? "disabled" : "") + '">' +
      '<div class="card-top">' +
        '<div class="card-identity">' +
          '<div class="avatar-badge">' + esc(userInitial) + '</div>' +
          '<div class="id-col">' +
            '<div class="id-title-row">' +
              '<span class="acc-email-txt" title="' + esc(titleAttr) + '" data-action="editAlias" data-email="' + esc(email) + '" data-alias="' + esc(acc.alias || "") + '">' + esc(displayEmail) + '</span>' +
              '<span class="pill-tier ' + esc(acc.tier || "pro") + '">' + esc(acc.tier || "pro") + '</span>' +
            '</div>' +
            '<div class="badges-flow">' +
              activeBadge +
              highestBadge +
              affTag +
              roleTag +
              healthBadge +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card-actions">' +
          switchBtn +
          reauthBtn +
          '<label class="switch" title="' + (isDis ? "Bật lại trong pool" : "Tạm ngưng trong pool") + '">' +
            '<input type="checkbox" ' + (isDis ? "" : "checked") + ' data-action="toggleAccount" data-email="' + esc(email) + '" />' +
            '<span class="slider"></span>' +
          '</label>' +
          '<button class="btn btn-sec btn-icon" data-action="refreshAccount" data-email="' + esc(email) + '" title="Làm mới hạn mức">&#x21bb;</button>' +
          '<button class="btn btn-sec btn-icon" data-action="removeAccount" data-email="' + esc(email) + '" title="Xóa tài khoản khỏi pool">&times;</button>' +
        '</div>' +
      '</div>' +
      qHtml +
    '</div>';
  }).join("");

  var expandBtn = "";
  if (accs.length > 4) {
    expandBtn = !accountsExpanded
      ? '<button class="btn btn-sec" data-action="toggleExpandAccounts" style="width:100%;margin-top:2px;font-size:9.5px;padding:3px 6px;">Xem thêm (' + (accs.length - 4) + ' tài khoản khác) &#x25bc;</button>'
      : '<button class="btn btn-sec" data-action="toggleExpandAccounts" style="width:100%;margin-top:2px;font-size:9.5px;padding:3px 6px;">Thu gọn &#x25b2;</button>';
  }

  list.innerHTML = cardsHtml + expandBtn;
}

var lastStatsWidgetFp = "";
function renderStatsWidget() {
  var container = document.getElementById("stats-widget");
  if (!container) return;
  var s = (state && state.stats) || {};
  var t = s.today || { totalTokens: 0, inputTokens: 0, outputTokens: 0, cacheHitTokens: 0, thinkingTokens: 0, contentTokens: 0, cacheMissTokens: 0 };
  var br = s.burnRate || { tokensPerMin: 0, recentTurns: 0 };
  var fp = (t.totalTokens || 0) + ":" + (t.inputTokens || 0) + ":" + (t.outputTokens || 0) + ":" + (t.cacheHitTokens || 0) + ":" + (t.thinkingTokens || 0) + ":" + (t.cacheMissTokens || 0) + ":" + br.tokensPerMin + ":" + br.recentTurns;
  if (fp === lastStatsWidgetFp) return;
  lastStatsWidgetFp = fp;

  var hasTokens = (t.totalTokens || 0) > 0;
  var tot = t.totalTokens || 1;
  var pCac = hasTokens ? Math.round(((t.cacheHitTokens || 0) / tot) * 100) : 0;
  var pInp = hasTokens ? Math.round(((t.cacheMissTokens || Math.max(0, (t.inputTokens || 0) - (t.cacheHitTokens || 0))) / tot) * 100) : 0;
  var pThk = hasTokens ? Math.round(((t.thinkingTokens || 0) / tot) * 100) : 0;
  var pOut = hasTokens ? Math.max(0, 100 - pCac - pInp - pThk) : 0;
  var cacHover = 'Cache Hit: ' + fmtNum(t.cacheHitTokens || 0) + ' tokens';

  var breakdownHtml = '<div class="cb-item"><span class="cb-lbl">In</span><span class="cb-val" style="color:var(--input-col);">' + fmtNum(t.inputTokens || 0) + '</span></div>' +
    '<div class="cb-item"><span class="cb-lbl">Out</span><span class="cb-val" style="color:var(--output-col);">' + fmtNum(t.contentTokens || ((t.outputTokens || 0) - (t.thinkingTokens || 0))) + '</span></div>' +
    '<div class="cb-item" title="' + esc(cacHover) + '"><span class="cb-lbl">Cache</span><span class="cb-val" style="color:var(--cached);">' + fmtNum(t.cacheHitTokens || 0) + '</span></div>';
  if ((t.thinkingTokens || 0) > 0) {
    breakdownHtml += '<div class="cb-item"><span class="cb-lbl">Thinking</span><span class="cb-val" style="color:var(--thinking-col);">' + fmtNum(t.thinkingTokens || 0) + '</span></div>';
  }

  container.innerHTML = '<div class="acc-card">' +
    '<div class="card-top">' +
      '<div style="display:flex;align-items:center;gap:4px;overflow:hidden;flex:1;min-width:0;">' +
        '<span class="pill-tier pro">HÔM NAY</span>' +
        '<span style="font-size:11px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Tổng: ' + fmtNum(t.totalTokens || 0) + ' <span style="font-size:9.5px;font-weight:700;color:var(--cached);" title="' + esc(cacHover) + '">(' + pCac + '% Cache)</span></span>' +
      '</div>' +
      '<button class="btn btn-sec" data-action="nav" data-view="stats" style="font-size:9px;padding:2px 6px;flex-shrink:0;">Chi Tiết &rarr;</button>' +
    '</div>' +
    '<div class="segmented-bar">' +
      '<div class="seg-cac" style="width:' + pCac + '%;" title="Cache Hit: ' + fmtNum(t.cacheHitTokens || 0) + '"></div>' +
      '<div class="seg-inp" style="width:' + pInp + '%;" title="New Input: ' + fmtNum(t.cacheMissTokens || Math.max(0, (t.inputTokens || 0) - (t.cacheHitTokens || 0))) + '"></div>' +
      '<div class="seg-thk" style="width:' + pThk + '%;" title="Thinking: ' + fmtNum(t.thinkingTokens || 0) + '"></div>' +
      '<div class="seg-out" style="width:' + pOut + '%;" title="Output: ' + fmtNum(t.contentTokens || ((t.outputTokens || 0) - (t.thinkingTokens || 0))) + '"></div>' +
    '</div>' +
    '<div class="card-breakdown" style="' + ((t.thinkingTokens || 0) > 0 ? 'grid-template-columns:repeat(4,1fr);' : 'grid-template-columns:repeat(3,1fr);') + '">' +
      breakdownHtml +
    '</div>' +
    (s.burnRate && s.burnRate.tokensPerMin > 0
      ? ('<div class="card-meta" style="margin-top:2px;font-size:8px;color:var(--dim);border-top:1px solid var(--border);padding-top:2px;">Tốc độ: <strong style="color:var(--text);font-family:var(--mono);">~' + fmtNum(s.burnRate.tokensPerMin) + '/min</strong> (' + s.burnRate.recentTurns + ' turns / 15m)</div>')
      : '') +
  '</div>';
}

var lastStatsPageFp = "";
function renderStatsPage(force) {
  updateTabStyles();
  var s = (state && state.stats) || {};
  var t = s.today || {};
  var req0 = (s.requests && s.requests[0]) || {};
  var conv0 = (s.conversations && s.conversations[0]) || {};

  var fp = statsRange + "|" + (selectedBarIndex !== null ? selectedBarIndex : "") + "|" +
    sortConfig.requests.field + ":" + sortConfig.requests.dir + "|" +
    sortConfig.models.field + ":" + sortConfig.models.dir + "|" +
    sortConfig.conversations.field + ":" + sortConfig.conversations.dir + "|" +
    (t.totalTokens || 0) + ":" + (t.inputTokens || 0) + ":" +
    (s.requests ? s.requests.length : 0) + ":" + (req0.timestamp || 0) + ":" + (req0.totalTokens || 0) + "|" +
    (s.conversations ? s.conversations.length : 0) + ":" + (conv0.lastActive || 0);

  if (!force && fp === lastStatsPageFp) return;
  lastStatsPageFp = fp;

  var startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  var cutoffMs = startOfToday.getTime();

  var rawData = [];
  if (statsRange === "monthly") {
    rawData = Array.isArray(s.monthly) ? s.monthly : [];
    cutoffMs = Date.now() - 365 * 864e5;
  } else if (statsRange === "weekly") {
    rawData = Array.isArray(s.weekly) ? s.weekly : [];
    cutoffMs = Date.now() - 28 * 864e5;
  } else if (statsRange === "daily") {
    rawData = Array.isArray(s.daily) ? s.daily : [];
    cutoffMs = Date.now() - 7 * 864e5;
  } else {
    rawData = Array.isArray(s.hourly) ? s.hourly : [];
    cutoffMs = startOfToday.getTime();
  }

  var data = rawData.filter(Boolean);
  var chartBox = document.getElementById("chart-container");
  if (!chartBox) return;

  var maxVal = Math.max.apply(Math, data.map(function(d) { return (d && d.totalTokens) || 0; }).concat([100]));
  var barWidth = statsRange === "monthly" ? 22 : statsRange === "today" ? 22 : statsRange === "weekly" ? 36 : 26;
  var stepX = statsRange === "monthly" ? 38 : statsRange === "today" ? 36 : statsRange === "weekly" ? 64 : 44;
  var yBase = 116;
  var maxBarH = 75;

  var svgBars = data.map(function(d, i) {
    var total = (d && d.totalTokens) || 0;
    var isSelected = selectedBarIndex === i;
    var isDimmed = selectedBarIndex !== null && !isSelected;
    var h = total > 0 ? Math.min(maxBarH, Math.max(4, Math.round((total / maxVal) * maxBarH))) : 0;
    var hCac = Math.round((((d && d.cacheHitTokens) || 0) / (total || 1)) * h);
    var hInp = Math.round((((d && d.cacheMissTokens) || Math.max(0, ((d && d.inputTokens) || 0) - ((d && d.cacheHitTokens) || 0))) / (total || 1)) * h);
    var hThk = Math.round((((d && d.thinkingTokens) || 0) / (total || 1)) * h);
    var hOut = Math.max(0, h - hCac - hInp - hThk);

    var x = 10 + i * stepX;
    var lbl = d && (d.hourLabel || d.dayLabel || d.weekLabel || d.monthLabel || "");
    var yCac = yBase - hCac;
    var yInp = yCac - hInp;
    var yThk = yInp - hThk;
    var yOut = yThk - hOut;

    var rects = '';
    if (hCac > 0) rects += '<rect x="' + x + '" y="' + yCac + '" width="' + barWidth + '" height="' + hCac + '" fill="var(--cached)" rx="1" />';
    if (hInp > 0) rects += '<rect x="' + x + '" y="' + yInp + '" width="' + barWidth + '" height="' + hInp + '" fill="var(--input-col)" rx="1" />';
    if (hThk > 0) rects += '<rect x="' + x + '" y="' + yThk + '" width="' + barWidth + '" height="' + hThk + '" fill="var(--thinking-col)" rx="1" />';
    if (hOut > 0) rects += '<rect x="' + x + '" y="' + yOut + '" width="' + barWidth + '" height="' + hOut + '" fill="var(--output-col)" rx="1" />';
    if (h === 0) rects += '<rect x="' + x + '" y="' + (yBase - 2) + '" width="' + barWidth + '" height="2" fill="rgba(255,255,255,.1)" rx="1" />';

    var selStroke = isSelected ? ' stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="2,2"' : '';
    var gCls = 'bar-group' + (isDimmed ? ' dimmed' : '') + (isSelected ? ' selected' : '');

    return '<g class="' + gCls + '" data-action="selectBar" data-index="' + i + '" data-label="' + esc(lbl) + '"' + selStroke + '>' +
      rects +
      '<text x="' + (x + barWidth / 2) + '" y="' + (yBase + 14) + '" text-anchor="middle" fill="var(--dim)" font-size="8.5" font-family="var(--mono)">' + esc(lbl) + '</text>' +
      (total > 0 ? ('<text x="' + (x + barWidth / 2) + '" y="' + (yOut - 4) + '" text-anchor="middle" fill="var(--text)" font-size="8" font-family="var(--mono)" font-weight="700">' + fmtNum(total) + '</text>') : '') +
    '</g>';
  }).join("");

  var totalW = Math.max(280, 20 + data.length * stepX);
  chartBox.innerHTML = '<svg class="chart-svg" style="width:' + totalW + 'px;" viewBox="0 0 ' + totalW + ' 140">' +
    '<line x1="0" y1="' + yBase + '" x2="' + totalW + '" y2="' + yBase + '" stroke="rgba(255,255,255,.1)" stroke-width="1" />' +
    svgBars +
  '</svg>';

  if (shouldScrollChart) {
    shouldScrollChart = false;
    setTimeout(function() { chartBox.scrollLeft = chartBox.scrollWidth; }, 50);
  }

  // Summary Grid
  var sumEl = document.getElementById("alltime-grid");
  if (sumEl) {
    var a = s.allTime || {};
    sumEl.innerHTML = '<div class="stat-box"><span class="stat-lbl">TỔNG TOKEN</span><span class="stat-val">' + fmtNum(a.totalTokens || 0) + '</span></div>' +
      '<div class="stat-box"><span class="stat-lbl">TỈ LỆ CACHE</span><span class="stat-val" style="color:var(--cached);">' + Math.round((a.cacheHitRate || 0) * 100) + '%</span></div>' +
      '<div class="stat-box"><span class="stat-lbl">INPUT</span><span class="stat-val" style="color:var(--input-col);">' + fmtNum(a.inputTokens || 0) + '</span></div>' +
      '<div class="stat-box"><span class="stat-lbl">OUTPUT</span><span class="stat-val" style="color:var(--output-col);">' + fmtNum(a.outputTokens || 0) + '</span></div>';
  }

  // Requests Breakdown
  var reqs = (s.requests || []).filter(function(r) { return r && (r.timestamp || 0) >= cutoffMs; });
  var rField = sortConfig.requests.field;
  var rDir = sortConfig.requests.dir === "desc" ? -1 : 1;
  reqs.sort(function(a, b) {
    if (rField === "total") return ((a.totalTokens || 0) - (b.totalTokens || 0)) * rDir;
    if (rField === "cachePct") return (((a.cacheHitTokens || 0) / (a.inputTokens || 1)) - ((b.cacheHitTokens || 0) / (b.inputTokens || 1))) * rDir;
    return ((a.timestamp || 0) - (b.timestamp || 0)) * rDir;
  });

  var reqCountEl = document.getElementById("req-count");
  var reqBreakdownEl = document.getElementById("request-breakdown");
  if (reqCountEl) reqCountEl.textContent = reqs.length + " reqs";
  if (reqBreakdownEl) {
    reqBreakdownEl.innerHTML = reqs.length ? reqs.map(function(r) {
      if (!r) return "";
      var rTime = r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      var rRate = (r.inputTokens && r.inputTokens > 0) ? Math.round(((r.cacheHitTokens || 0) / r.inputTokens) * 100) : 0;
      return '<div class="square-card">' +
        '<div class="card-top"><span class="pill-tier pro">' + esc(r.model || "Gemini") + '</span><span class="kpi-sub">' + rTime + '</span></div>' +
        '<div class="card-title" title="' + esc(r.promptPreview || "") + '">' + esc(r.promptPreview || "Request") + '</div>' +
        '<div style="font-size:13px;font-weight:700;font-family:var(--mono);color:var(--text);margin:2px 0;">' + fmtNum(r.totalTokens || 0) + ' <span style="font-size:9.5px;color:var(--cached);">(' + rRate + '%)</span></div>' +
        '<div class="card-breakdown">' +
          '<div class="cb-item"><span class="cb-lbl">In</span><span class="cb-val" style="color:var(--input-col);">' + fmtNum(r.inputTokens || 0) + '</span></div>' +
          '<div class="cb-item"><span class="cb-lbl">Out</span><span class="cb-val" style="color:var(--output-col);">' + fmtNum(r.outputTokens || 0) + '</span></div>' +
        '</div>' +
      '</div>';
    }).join("") : '<div class="empty" style="width:100%;">Không có requests trong khoảng thời gian này.</div>';
  }

  // Models Breakdown
  var modelMap = {};
  for (var ri = 0; ri < reqs.length; ri++) {
    var item = reqs[ri];
    if (!item || !item.model) continue;
    if (!modelMap[item.model]) {
      modelMap[item.model] = { model: item.model, totalTokens: 0, inputTokens: 0, outputTokens: 0, cacheHitTokens: 0, count: 0 };
    }
    modelMap[item.model].totalTokens += item.totalTokens || 0;
    modelMap[item.model].inputTokens += item.inputTokens || 0;
    modelMap[item.model].outputTokens += item.outputTokens || 0;
    modelMap[item.model].cacheHitTokens += item.cacheHitTokens || 0;
    modelMap[item.model].count += 1;
  }
  var modelsArr = Object.values(modelMap);
  var modelCountEl = document.getElementById("model-count");
  var modelBreakdownEl = document.getElementById("model-breakdown");
  if (modelCountEl) modelCountEl.textContent = modelsArr.length + " models";
  if (modelBreakdownEl) {
    modelBreakdownEl.innerHTML = modelsArr.length ? modelsArr.map(function(m) {
      var mRate = m.inputTokens > 0 ? Math.round((m.cacheHitTokens / m.inputTokens) * 100) : 0;
      return '<div class="square-card">' +
        '<div class="card-top"><span class="pill-tier pro">' + esc(m.model) + '</span><span class="kpi-sub">' + m.count + ' reqs</span></div>' +
        '<div style="font-size:13px;font-weight:700;font-family:var(--mono);color:var(--text);margin:3px 0;">' + fmtNum(m.totalTokens) + ' <span style="font-size:9.5px;color:var(--cached);">(' + mRate + '%)</span></div>' +
        '<div class="card-breakdown">' +
          '<div class="cb-item"><span class="cb-lbl">In</span><span class="cb-val" style="color:var(--input-col);">' + fmtNum(m.inputTokens) + '</span></div>' +
          '<div class="cb-item"><span class="cb-lbl">Out</span><span class="cb-val" style="color:var(--output-col);">' + fmtNum(m.outputTokens) + '</span></div>' +
        '</div>' +
      '</div>';
    }).join("") : '<div class="empty" style="width:100%;">Không có dữ liệu model.</div>';
  }

  // Sessions Breakdown
  var convs = (s.conversations || []).filter(function(c) { return c && (c.lastActive || 0) >= cutoffMs; });
  var convCountEl = document.getElementById("conv-count");
  var convBreakdownEl = document.getElementById("conv-breakdown");
  if (convCountEl) convCountEl.textContent = convs.length + " sessions";
  if (convBreakdownEl) {
    convBreakdownEl.innerHTML = convs.length ? convs.map(function(c) {
      var cTime = c.lastActive ? new Date(c.lastActive).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      var cRate = c.inputTokens > 0 ? Math.round((c.cacheHitTokens / c.inputTokens) * 100) : 0;
      return '<div class="square-card">' +
        '<div class="card-top"><span class="pill-tier pro">' + esc(c.model || "Gemini") + '</span><span class="kpi-sub">' + cTime + '</span></div>' +
        '<div class="card-title" title="' + esc(c.title || "") + '">' + esc(c.title || "Session") + '</div>' +
        '<div style="font-size:13px;font-weight:700;font-family:var(--mono);color:var(--text);margin:2px 0;">' + fmtNum(c.totalTokens || 0) + ' <span style="font-size:9.5px;color:var(--cached);">(' + cRate + '%)</span></div>' +
        '<div class="card-breakdown">' +
          '<div class="cb-item"><span class="cb-lbl">In</span><span class="cb-val" style="color:var(--input-col);">' + fmtNum(c.inputTokens || 0) + '</span></div>' +
          '<div class="cb-item"><span class="cb-lbl">Out</span><span class="cb-val" style="color:var(--output-col);">' + fmtNum(c.outputTokens || 0) + '</span></div>' +
        '</div>' +
      '</div>';
    }).join("") : '<div class="empty" style="width:100%;">Không có sessions trong khoảng thời gian này.</div>';
  }
}

setInterval(function() {
  var tags = document.querySelectorAll(".reset-pill[data-reset]");
  for (var i = 0; i < tags.length; i++) {
    var el = tags[i];
    var iso = el.getAttribute("data-reset");
    if (iso) {
      var t = fmtTime(iso);
      if (el.textContent !== t) {
        el.textContent = t;
        if (t === "sẵn sàng") el.classList.remove("active");
        else el.classList.add("active");
      }
    }
  }
}, 1000);

var lastLogCount = 0;
var lastLogFirstTs = 0;
var lastLogHideEmail = null;

function formatLogCardHtml(l) {
  if (!l) return "";
  var lvl = (l.level || "info").toLowerCase();
  var colCls = lvl === "error" ? "error" : lvl === "warn" ? "warn" : lvl === "rotate" ? "rotate" : "";
  var cat = esc(l.category || "LOG");
  var cleanMsg = sanitizeTextForDisplay(l.message || "");
  return '<div class="log-card">' +
    '<div class="log-meta">' +
      '<span class="pill-tier pro">' + cat + '</span>' +
      '<span>' + (l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : "") + '</span>' +
    '</div>' +
    '<div class="log-msg ' + colCls + '">' + esc(cleanMsg) + '</div>' +
  '</div>';
}

function renderLogs() {
  var container = document.getElementById("log-scroll");
  var countEl = document.getElementById("log-count");
  if (!container) return;
  var logs = (state && Array.isArray(state.logs)) ? state.logs : [];
  if (countEl) countEl.textContent = logs.length + " logs";

  var currentFirstTs = logs.length > 0 && logs[0] ? logs[0].timestamp : 0;
  if (logs.length === lastLogCount && currentFirstTs === lastLogFirstTs && hideEmail === lastLogHideEmail) {
    return;
  }
  lastLogCount = logs.length;
  lastLogFirstTs = currentFirstTs;
  lastLogHideEmail = hideEmail;

  if (!logs.length) {
    container.innerHTML = '<div class="empty">Chưa có nhật ký sự kiện nào.</div>';
    return;
  }
  container.innerHTML = logs.slice(0, 50).map(formatLogCardHtml).join("");
}
</script></body></html>`;
  }
}
