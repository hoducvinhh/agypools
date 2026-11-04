import * as vscode from "vscode";
import type { LogManager } from "../core/log-manager.js";
import type { QuotaMonitor } from "../core/quota-monitor.js";
import { BRAIN_DIR } from "../core/sqlite-utils.js";
import type { StatsManager } from "../core/stats-manager.js";
import type { TokenManager } from "../core/token-manager.js";
import type { UsageTracker } from "../core/usage-tracker.js";
import { getClientScript } from "./webview/client-script.js";
import { renderAnalyticsTab } from "./webview/components/analytics-tab.js";
import { renderHeader } from "./webview/components/header.js";
import { renderOverviewTab } from "./webview/components/overview-tab.js";
import { renderSettingsTab } from "./webview/components/settings-tab.js";
import { renderTelemetryTab } from "./webview/components/telemetry-tab.js";
import { getWebviewStyles } from "./webview/styles.js";
import type { WebviewMessage, WebviewStateData } from "./webview/types.js";

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
  ) { }

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

  public forceReloadHtml(): void {
    if (this.view) {
      this.view.webview.html = this.getHtmlForWebview();
    }
  }

  private getCurrentStateData(): WebviewStateData {
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
          case "forceRotate": {
            await this.quotaMonitor.pollAllAccounts();
            const rotated = await this.tokenManager.autoSelectHighestQuota(this.quotaMonitor.getAllQuotas(), "manual_force_rotate");
            if (rotated) {
              void vscode.window.showInformationMessage(`AgyPool: Rotated to ${rotated.email}`);
            } else {
              const active = this.tokenManager.getActiveAccount();
              void vscode.window.showInformationMessage(`AgyPool: Account ${active?.email || "current"} already has the highest quota!`);
            }
            this.postState();
            break;
          }
          case "selectAccount":
            if (message.payload) {
              await this.tokenManager.selectAccount(message.payload);
              this.postState();
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
          case "exportPool":
            await vscode.commands.executeCommand("agypool.exportPool");
            break;
          case "importPool":
            await vscode.commands.executeCommand("agypool.importPool");
            break;
        }
      } catch (err: unknown) {
        this.log(`Message handler error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  private getHtmlForWebview(): string {
    const initialStateJson = JSON.stringify(this.getCurrentStateData()).replace(/</g, "\\u003c");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
${getWebviewStyles()}
  </style>
</head>
<body>
  ${renderHeader()}
  ${renderOverviewTab()}
  ${renderAnalyticsTab()}
  ${renderTelemetryTab()}
  ${renderSettingsTab()}

  <script>
    window.__INITIAL_STATE__ = ${initialStateJson};
    ${getClientScript()}
  </script>
</body>
</html>`;
  }
}
