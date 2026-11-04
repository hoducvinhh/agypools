export function renderOverviewTab(): string {
  return `
<div class="workspace active" id="workspace-overview">
  <!-- Active Engine Spotlight Card -->
  <div class="spotlight-card" id="spotlight-card">
    <div class="spotlight-top">
      <div class="spotlight-title-row">
        <div class="spotlight-avatar" id="spotlight-avatar">G</div>
        <div class="spotlight-info">
          <div class="spotlight-email" id="spotlight-email">No account selected</div>
          <div class="spotlight-tags">
            <span class="tag-badge tag-active" id="spotlight-role-tag">ACTIVE ENGINE</span>
            <span class="tag-badge tag-tier" id="spotlight-tier-tag">PRO</span>
            <span id="spotlight-health-tag"></span>
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:3px;">
        <button class="btn btn-sec btn-icon" data-action="refreshAll" title="Refresh all quotas">&#x21bb;</button>
      </div>
    </div>

    <!-- 4-Gauge Micro-Grid (Gemini 5h, Gemini 7d, Claude 5h, Claude 7d) -->
    <div class="spotlight-gauges">
      <div class="gauge-item">
        <div class="gauge-header">
          <span class="gauge-lbl">Gemini (5h)</span>
          <span class="gauge-val gemini" id="spotlight-gemini-pct">100%</span>
        </div>
        <div class="gauge-bar-track">
          <div class="gauge-bar-fill gemini" id="spotlight-gemini-bar" style="width: 100%;"></div>
        </div>
        <div class="gauge-reset" id="spotlight-gemini-reset">Ready</div>
      </div>

      <div class="gauge-item">
        <div class="gauge-header">
          <span class="gauge-lbl">Gemini (7d)</span>
          <span class="gauge-val gemini" id="spotlight-gemini-weekly-pct">100%</span>
        </div>
        <div class="gauge-bar-track">
          <div class="gauge-bar-fill gemini" id="spotlight-gemini-weekly-bar" style="width: 100%;"></div>
        </div>
        <div class="gauge-reset" id="spotlight-gemini-weekly-reset">Ready</div>
      </div>

      <div class="gauge-item">
        <div class="gauge-header">
          <span class="gauge-lbl">Claude (5h)</span>
          <span class="gauge-val claude" id="spotlight-claude-pct">100%</span>
        </div>
        <div class="gauge-bar-track">
          <div class="gauge-bar-fill claude" id="spotlight-claude-bar" style="width: 100%;"></div>
        </div>
        <div class="gauge-reset" id="spotlight-claude-reset">Ready</div>
      </div>

      <div class="gauge-item">
        <div class="gauge-header">
          <span class="gauge-lbl">Claude (7d)</span>
          <span class="gauge-val claude" id="spotlight-claude-weekly-pct">100%</span>
        </div>
        <div class="gauge-bar-track">
          <div class="gauge-bar-fill claude" id="spotlight-claude-weekly-bar" style="width: 100%;"></div>
        </div>
        <div class="gauge-reset" id="spotlight-claude-weekly-reset">Ready</div>
      </div>
    </div>

    <!-- Spotlight Action Toolbar -->
    <div class="spotlight-actions">
      <div style="display:flex;gap:4px;">
        <button class="btn btn-primary" data-action="addAccount" title="Add Google account">+ Add Account</button>
        <button class="btn btn-sec" data-action="forceRotate" id="btn-force-rotate" title="Switch immediately to account with highest quota">⚡ Rotate</button>
      </div>
      <button class="btn btn-sec" data-action="togglePrivacy" id="btn-privacy-toggle" title="Toggle email visibility">Hide Email</button>
    </div>
  </div>

  <!-- Search & Health Filters -->
  <div class="deck-filter-bar">
    <div class="search-input-box">
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" id="search-accounts" placeholder="Search account, alias..." />
    </div>
    <div style="display:flex;gap:2px;">
      <button class="filter-chip active" data-filter="all">All</button>
      <button class="filter-chip" data-filter="healthy">Healthy</button>
      <button class="filter-chip" data-filter="issue">Issue</button>
    </div>
  </div>

  <!-- Account Deck (Two-Tier Collapsible Cards) -->
  <div class="account-deck-list" id="account-deck-list"></div>
</div>
`;
}
