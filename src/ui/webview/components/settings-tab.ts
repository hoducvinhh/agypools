export function renderSettingsTab(): string {
  return `
<div class="workspace" id="workspace-settings">
  <!-- Visual Strategy Selection Studio -->
  <div class="settings-lbl" style="text-transform:uppercase;letter-spacing:0.4px;color:var(--text-dim);font-size:8.5px;">Chiến Lược Luân Chuyển Tài Khoản</div>
  
  <div class="strategy-cards-grid">
    <div class="strat-card-option selected" data-strategy="auto_highest">
      <div class="strat-radio"></div>
      <div class="strat-body">
        <div class="strat-title">⚡ Tối Đa Quota (Auto Highest)</div>
        <div class="strat-desc">Luôn ưu tiên chuyển ngay sang tài khoản có quota cao nhất khi gọi lệnh. Thích hợp cho nhu cầu cày code cường độ cao liên tục.</div>
      </div>
    </div>

    <div class="strat-card-option" data-strategy="cache_optimized">
      <div class="strat-radio"></div>
      <div class="strat-body">
        <div class="strat-title">🎯 Tối Ưu Cache GPU (Cache Preserver)</div>
        <div class="strat-desc">Giữ nguyên tài khoản hiện tại cho tới khi quota rơi xuống dưới 15%. Bảo toàn prompt cache context, phản hồi siêu tốc và tiết kiệm token.</div>
      </div>
    </div>

    <div class="strat-card-option" data-strategy="round_robin">
      <div class="strat-radio"></div>
      <div class="strat-body">
        <div class="strat-title">🔄 Luân Chuyển Đều (Round Robin)</div>
        <div class="strat-desc">Xoay vòng lần lượt qua từng tài khoản lành lặn trong pool. Giúp cân bằng thời gian hồi phục 5h đều đặn cho tất cả tài khoản.</div>
      </div>
    </div>
  </div>

  <!-- Privacy & Display Hub -->
  <div class="settings-lbl" style="text-transform:uppercase;letter-spacing:0.4px;color:var(--text-dim);font-size:8.5px;margin-top:4px;">Bảo Mật & Hiển Thị</div>
  <div class="settings-group">
    <div class="settings-row">
      <div>
        <div class="settings-lbl">Ẩn địa chỉ Email cá nhân</div>
        <div class="settings-sub">Che giấu email trong UI và thông báo để livestream hoặc chia sẻ màn hình an toàn.</div>
      </div>
      <label class="switch" title="Bật/Tắt che giấu email">
        <input type="checkbox" id="cfg-hide-email-toggle" data-action="toggleSettingHideEmail" />
        <span class="slider"></span>
      </label>
    </div>
  </div>

  <!-- Pool Storage & Portability -->
  <div class="settings-lbl" style="text-transform:uppercase;letter-spacing:0.4px;color:var(--text-dim);font-size:8.5px;margin-top:4px;">Sao Lưu & Khôi Phục Pool</div>
  <div class="settings-group">
    <div class="settings-row">
      <div>
        <div class="settings-lbl">Sao lưu tài khoản (Mã hóa)</div>
        <div class="settings-sub">Xuất toàn bộ pool ra file JSON mã hóa an toàn bằng mật khẩu.</div>
      </div>
      <button class="btn btn-sec" data-action="exportPool">Xuất Pool</button>
    </div>
    <div style="height:1px;background:var(--glass-border);margin:2px 0;"></div>
    <div class="settings-row">
      <div>
        <div class="settings-lbl">Nhập tài khoản từ file</div>
        <div class="settings-sub">Nạp lại pool tài khoản từ file đã xuất trước đó.</div>
      </div>
      <button class="btn btn-sec" data-action="importPool">Nhập Pool</button>
    </div>
  </div>

  <!-- Antigravity IDE Integration Bridge -->
  <div class="settings-lbl" style="text-transform:uppercase;letter-spacing:0.4px;color:var(--text-dim);font-size:8.5px;margin-top:4px;">Trạng Thái Cầu Nối Antigravity IDE</div>
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
