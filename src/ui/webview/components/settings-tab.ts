export function renderSettingsTab(): string {
  return `
<div class="workspace" id="workspace-settings">
  <!-- Visual Strategy Selection Studio -->
  <div class="settings-lbl" style="text-transform:uppercase;letter-spacing:0.4px;color:var(--text-dim);font-size:8.5px;">Account Rotation Strategy</div>
  
  <div class="strategy-cards-grid">
    <div class="strat-card-option selected" data-strategy="auto_highest">
      <div class="strat-radio"></div>
      <div class="strat-body">
        <div class="strat-title">⚡ Auto Highest Quota</div>
        <div class="strat-desc">Always prioritize switching to the account with the highest available quota. Automatically rotates smoothly when active quota drops.</div>
      </div>
    </div>

    <div class="strat-card-option" data-strategy="cache_optimized">
      <div class="strat-radio"></div>
      <div class="strat-body">
        <div class="strat-title">🎯 GPU Cache Preserver</div>
        <div class="strat-desc">Keep current account active until quota drops below 15%. Preserves prompt cache context, maximizing response speed and saving tokens.</div>
      </div>
    </div>

    <div class="strat-card-option" data-strategy="round_robin">
      <div class="strat-radio"></div>
      <div class="strat-body">
        <div class="strat-title">🔄 Round Robin</div>
        <div class="strat-desc">Cycle sequentially through healthy accounts in the pool. Distributes quota recovery time evenly across all accounts.</div>
      </div>
    </div>
  </div>

  <!-- Privacy & Display Hub -->
  <div class="settings-lbl" style="text-transform:uppercase;letter-spacing:0.4px;color:var(--text-dim);font-size:8.5px;margin-top:4px;">Privacy & Display</div>
  <div class="settings-group">
    <div class="settings-row">
      <div>
        <div class="settings-lbl">Hide Personal Email Address</div>
        <div class="settings-sub">Mask email address in UI and notifications for safe livestreaming and screen sharing.</div>
      </div>
      <label class="switch" title="Toggle email masking">
        <input type="checkbox" id="cfg-hide-email-toggle" data-action="toggleSettingHideEmail" />
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <!-- Pool Storage & Portability -->
  <div class="settings-lbl" style="text-transform:uppercase;letter-spacing:0.4px;color:var(--text-dim);font-size:8.5px;margin-top:4px;">Pool Backup & Restore</div>
  <div class="settings-group">
    <div class="settings-row">
      <div>
        <div class="settings-lbl">Backup Accounts (Encrypted)</div>
        <div class="settings-sub">Export entire pool to a password-encrypted JSON file.</div>
      </div>
      <button class="btn btn-sec" data-action="exportPool">Export Pool</button>
    </div>
    <div style="height:1px;background:var(--glass-border);margin:2px 0;"></div>
    <div class="settings-row">
      <div>
        <div class="settings-lbl">Import Accounts from File</div>
        <div class="settings-sub">Restore account pool from a previously exported file.</div>
      </div>
      <button class="btn btn-sec" data-action="importPool">Import Pool</button>
    </div>
  </div>

  <!-- Antigravity IDE Integration Bridge -->
  <div class="settings-lbl" style="text-transform:uppercase;letter-spacing:0.4px;color:var(--text-dim);font-size:8.5px;margin-top:4px;">Antigravity IDE Bridge Status</div>
  <div class="settings-group" style="background:rgba(0,0,0,0.2);">
    <div class="settings-row">
      <span class="settings-sub">USS SQLite Sync</span>
      <span style="font-family:var(--font-mono);font-size:8.5px;color:var(--accent-emerald);">● CONNECTED</span>
    </div>
    <div class="settings-row">
      <span class="settings-sub">PreInvocation Hook</span>
      <span style="font-family:var(--font-mono);font-size:8.5px;color:var(--cyan-gemini);" id="hook-status-text">ACTIVE (Port 19283)</span>
    </div>
  </div>
</div>
`;
}
