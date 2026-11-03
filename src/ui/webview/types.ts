import type {
  Account,
  AccountQuota,
  AgyPoolConfig,
  BurnRateInfo,
  ConversationStats,
  DayTokenStats,
  HourlyTokenStats,
  LogEntry,
  ModelAffinity,
  MonthTokenStats,
  PoolRole,
  QuotaMode,
  RequestStats,
  TokenBucket,
  WeekTokenStats,
} from "../../types.js";

export type TabId = "overview" | "analytics" | "telemetry" | "settings";

export type WebviewMessage =
  | { action: "ready"; payload?: undefined }
  | { action: "addAccount"; payload?: undefined }
  | { action: "refreshQuotas"; payload?: undefined }
  | { action: "selectAccount"; payload: string }
  | { action: "toggleAccount"; payload: { email: string; enabled: boolean } }
  | { action: "updateAccountMeta"; payload: { email: string; alias?: string; affinity?: ModelAffinity; role?: PoolRole } }
  | { action: "reauthAccount"; payload: string }
  | { action: "refreshAccount"; payload: string }
  | { action: "removeAccount"; payload: string }
  | { action: "clearLogs"; payload?: undefined }
  | { action: "forceRotate"; payload?: undefined }
  | { action: "updateConfig"; payload: Partial<AgyPoolConfig> }
  | { action: "setQuotaMode"; payload: QuotaMode }
  | { action: "recalculateStats"; payload?: undefined }
  | { action: "exportPool"; payload?: undefined }
  | { action: "importPool"; payload?: undefined };

export interface WebviewStateData {
  accounts: Account[];
  activeEmail: string;
  quotas: Record<string, AccountQuota | undefined>;
  config: AgyPoolConfig;
  logs: LogEntry[];
  stats: {
    today: DayTokenStats;
    hourly: HourlyTokenStats[];
    daily: DayTokenStats[];
    weekly: WeekTokenStats[];
    monthly: MonthTokenStats[];
    conversations: ConversationStats[];
    requests: RequestStats[];
    allTime: TokenBucket & { totalTurns: number; cacheHitRate: number };
    burnRate: BurnRateInfo;
  };
}
