export function getClientScript(): string {
  return `
(function() {
  var vscode = acquireVsCodeApi();
  var state = window.__INITIAL_STATE__ || {};
  var currentTab = "overview";
  var expandedAccounts = new Set();
  var searchFilter = "";
  var healthFilter = "all";
  var statsRange = "today";
  var logCategory = "ALL";
  var logSearch = "";
  var hideEmail = false;

  function esc(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtNum(n) {
    if (typeof n !== "number" || isNaN(n)) return "0";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return String(n);
  }

  function maskEmail(email) {
    if (!email) return "Account";
    var parts = email.split("@");
    if (parts.length < 2) return email;
    var name = parts[0];
    var domain = parts[1];
    var maskedName = name.length <= 2 ? name[0] + "***" : name.slice(0, 2) + "***" + name.slice(-1);
    return maskedName + "@" + domain;
  }

  function fmtTime(iso) {
    if (!iso) return "sẵn sàng";
    var d = new Date(iso).getTime() - Date.now();
    if (d <= 0 || isNaN(d)) return "sẵn sàng";
    var days = Math.floor(d / 864e5);
    var hrs = Math.floor((d % 864e5) / 36e5);
    var mins = Math.floor((d % 36e5) / 6e4);
    var secs = Math.floor((d % 6e4) / 1000);
    if (days > 0) return "resets " + days + "d " + hrs + "h";
    if (hrs > 0) return "resets " + hrs + "h " + mins + "m";
    if (mins > 0) return "resets " + mins + "m " + secs + "s";
    return "resets " + secs + "s";
  }

  function post(action, payload) {
    vscode.postMessage({ action: action, payload: payload });
  }

  // ==================== TAB SWITCHING ====================
  function switchTab(tabId) {
    currentTab = tabId;
    var dockBtns = document.querySelectorAll(".dock-btn");
    dockBtns.forEach(function(btn) {
      if (btn.getAttribute("data-tab") === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    var workspaces = document.querySelectorAll(".workspace");
    workspaces.forEach(function(ws) {
      if (ws.id === "workspace-" + tabId) {
        ws.classList.add("active");
      } else {
        ws.classList.remove("active");
      }
    });

    if (tabId === "analytics") renderAnalytics();
    if (tabId === "telemetry") renderTelemetry();
    if (tabId === "settings") renderSettings();
  }

  // ==================== RENDER SPOTLIGHT ====================
  function renderSpotlight() {
    var accounts = (state && Array.isArray(state.accounts)) ? state.accounts : [];
    var activeEmail = (state && state.activeEmail) || "";
    var quotas = (state && state.quotas) || {};
    var config = (state && state.config) || {};
    hideEmail = !!config.hideEmail;

    var activeAcc = accounts.find(function(a) {
      return a && a.email && a.email.toLowerCase() === activeEmail.toLowerCase();
    }) || null;

    var powerToggle = document.getElementById("master-power-toggle");
    if (powerToggle) powerToggle.checked = config.enabled !== false;

    var statusText = document.getElementById("pool-status-text");
    if (statusText) {
      statusText.textContent = (config.enabled !== false) ? "ONLINE" : "OFFLINE";
      statusText.style.color = (config.enabled !== false) ? "var(--accent-emerald)" : "var(--text-muted)";
    }

    var avatarEl = document.getElementById("spotlight-avatar");
    var emailEl = document.getElementById("spotlight-email");
    var tierTagEl = document.getElementById("spotlight-tier-tag");
    var roleTagEl = document.getElementById("spotlight-role-tag");
    var healthTagEl = document.getElementById("spotlight-health-tag");
    var gemPctEl = document.getElementById("spotlight-gemini-pct");
    var gemBarEl = document.getElementById("spotlight-gemini-bar");
    var gemResetEl = document.getElementById("spotlight-gemini-reset");
    var claudePctEl = document.getElementById("spotlight-claude-pct");
    var claudeBarEl = document.getElementById("spotlight-claude-bar");
    var claudeResetEl = document.getElementById("spotlight-claude-reset");
    var privBtn = document.getElementById("btn-privacy-toggle");

    if (privBtn) privBtn.textContent = hideEmail ? "Hiện Email" : "Ẩn Email";

    if (!activeAcc) {
      if (emailEl) emailEl.textContent = "Chưa có tài khoản nào được kích hoạt";
      if (tierTagEl) tierTagEl.textContent = "STANDBY";
      if (roleTagEl) roleTagEl.textContent = "WAITING";
      if (healthTagEl) healthTagEl.innerHTML = "";
      if (gemPctEl) gemPctEl.textContent = "---";
      if (gemBarEl) gemBarEl.style.width = "0%";
      if (gemResetEl) gemResetEl.textContent = "No data";
      if (claudePctEl) claudePctEl.textContent = "---";
      if (claudeBarEl) claudeBarEl.style.width = "0%";
      if (claudeResetEl) claudeResetEl.textContent = "No data";
      return;
    }

    var dispEmail = hideEmail ? maskEmail(activeAcc.email) : (activeAcc.alias ? (activeAcc.alias + " (" + activeAcc.email + ")") : activeAcc.email);
    if (emailEl) emailEl.textContent = dispEmail;

    var initial = (activeAcc.alias ? activeAcc.alias[0] : activeAcc.email[0]).toUpperCase();
    if (avatarEl) avatarEl.textContent = initial;

    if (tierTagEl) tierTagEl.textContent = (activeAcc.tier || "pro").toUpperCase();
    if (roleTagEl) roleTagEl.textContent = (activeAcc.role || "primary").toUpperCase();

    if (healthTagEl) {
      if (activeAcc.health && activeAcc.health !== "healthy") {
        healthTagEl.innerHTML = '<span class="tag-badge" style="background:rgba(244,63,94,0.2);color:var(--rose-danger);border:1px solid rgba(244,63,94,0.4);">' + esc(activeAcc.health.toUpperCase()) + '</span>';
      } else {
        healthTagEl.innerHTML = '';
      }
    }

    var q = quotas[activeAcc.email.toLowerCase()] || {};
    var fams = Array.isArray(q.families) ? q.families : [];
    var gemFam = fams.find(function(f) { return f.key === "gemini"; });
    var claudeFam = fams.find(function(f) { return f.key === "claude"; });

    var gemPct = gemFam ? (gemFam.limit5h ? gemFam.limit5h.percent : (gemFam.percent || 100)) : 100;
    var claudePct = claudeFam ? (claudeFam.limit5h ? claudeFam.limit5h.percent : (claudeFam.percent || 100)) : 100;

    if (gemPctEl) gemPctEl.textContent = gemPct + "%";
    if (gemBarEl) gemBarEl.style.width = Math.min(100, Math.max(0, gemPct)) + "%";
    if (gemResetEl) {
      var gResetIso = gemFam ? (gemFam.limit5h ? gemFam.limit5h.resetTime : gemFam.resetTime) : null;
      gemResetEl.textContent = fmtTime(gResetIso);
      gemResetEl.setAttribute("data-reset", gResetIso || "");
    }

    if (claudePctEl) claudePctEl.textContent = claudePct + "%";
    if (claudeBarEl) claudeBarEl.style.width = Math.min(100, Math.max(0, claudePct)) + "%";
    if (claudeResetEl) {
      var cResetIso = claudeFam ? (claudeFam.limit5h ? claudeFam.limit5h.resetTime : claudeFam.resetTime) : null;
      claudeResetEl.textContent = fmtTime(cResetIso);
      claudeResetEl.setAttribute("data-reset", cResetIso || "");
    }
  }

  // ==================== RENDER ACCOUNT DECK ====================
  function renderAccountDeck() {
    var container = document.getElementById("account-deck-list");
    if (!container) return;

    var accounts = (state && Array.isArray(state.accounts)) ? state.accounts : [];
    var activeEmail = ((state && state.activeEmail) || "").toLowerCase();
    var quotas = (state && state.quotas) || {};

    if (!accounts.length) {
      container.innerHTML = '<div class="empty-deck">Chưa có tài khoản nào trong pool.<br><br><button class="btn btn-primary" data-action="addAccount">+ Thêm Tài Khoản Đầu Tiên</button></div>';
      return;
    }

    // Filter accounts
    var qSearch = searchFilter.trim().toLowerCase();
    var filtered = accounts.filter(function(a) {
      if (!a) return false;
      var email = (a.email || "").toLowerCase();
      var alias = (a.alias || "").toLowerCase();
      if (qSearch && !email.includes(qSearch) && !alias.includes(qSearch)) return false;
      if (healthFilter === "healthy" && a.health && a.health !== "healthy") return false;
      if (healthFilter === "issue" && (!a.health || a.health === "healthy")) return false;
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = '<div class="empty-deck">Không tìm thấy tài khoản phù hợp bộ lọc.</div>';
      return;
    }

    // Sort: active account first
    filtered.sort(function(a, b) {
      var aAct = (a.email || "").toLowerCase() === activeEmail ? 1 : 0;
      var bAct = (b.email || "").toLowerCase() === activeEmail ? 1 : 0;
      return bAct - aAct;
    });

    var cardsHtml = filtered.map(function(acc) {
      var email = acc.email || "";
      var emailLower = email.toLowerCase();
      var isAct = emailLower === activeEmail;
      var isDis = acc.status === "disabled";
      var isExp = expandedAccounts.has(emailLower);
      var q = quotas[emailLower] || {};
      var fams = Array.isArray(q.families) ? q.families : [];
      var gemFam = fams.find(function(f) { return f.key === "gemini"; });
      var claudeFam = fams.find(function(f) { return f.key === "claude"; });
      var gemPct = gemFam ? (gemFam.limit5h ? gemFam.limit5h.percent : (gemFam.percent || 100)) : 100;
      var claudePct = claudeFam ? (claudeFam.limit5h ? claudeFam.limit5h.percent : (claudeFam.percent || 100)) : 100;

      var dispName = hideEmail ? maskEmail(email) : (acc.alias || email);
      var initial = (acc.alias ? acc.alias[0] : email[0] || "G").toUpperCase();

      var gemBarColor = gemPct < 20 ? "var(--rose-danger)" : gemPct < 40 ? "var(--amber-thinking)" : "var(--cyan-gemini)";
      var claudeBarColor = claudePct < 20 ? "var(--rose-danger)" : claudePct < 40 ? "var(--amber-thinking)" : "var(--purple-claude)";

      var switchBtn = (!isAct && !isDis)
        ? '<button class="btn-switch-sm" data-action="selectAccount" data-email="' + esc(email) + '" title="Chuyển ngay sang tài khoản này">⚡ Switch</button>'
        : '';

      var reauthBtn = (acc.health && acc.health !== "healthy")
        ? '<button class="chip-interactive err" data-action="reauthAccount" data-email="' + esc(email) + '" title="Đăng nhập lại để cập nhật token">⚠️ Re-Auth</button>'
        : '';

      // Detailed Models Chips
      var modelsHtml = "";
      if (Array.isArray(q.models) && q.models.length > 0) {
        modelsHtml = '<div class="model-chips-grid">' + q.models.map(function(m) {
          var mp = typeof m.percent === "number" ? m.percent : 100;
          var mCls = mp < 20 ? "chip-model err" : mp < 40 ? "chip-model warn" : "chip-model";
          var mReset = m.resetTime ? ' (' + fmtTime(m.resetTime) + ')' : '';
          return '<span class="' + mCls + '">' + esc(m.name) + ': ' + mp + '%' + mReset + '</span>';
        }).join("") + '</div>';
      }

      var cardCls = "acc-card-nexus" + (isAct ? " is-active" : "") + (isDis ? " is-disabled" : "") + (isExp ? " expanded" : "");

      return '<div class="' + cardCls + '" data-account="' + esc(emailLower) + '">' +
        '<!-- Tier 1: Summary Row -->' +
        '<div class="acc-row-summary" data-action="toggleExpand" data-email="' + esc(emailLower) + '">' +
          '<div class="summary-left">' +
            '<div class="acc-avatar-sm">' + esc(initial) + '</div>' +
            '<div class="acc-headline">' +
              '<div class="acc-name-txt" title="' + esc(email) + '">' + esc(dispName) + '</div>' +
              '<div class="acc-mini-bars">' +
                '<span class="mini-bar-unit"><span style="color:var(--cyan-gemini);">G:</span><span class="mini-bar-track"><span class="mini-bar-fill" style="width:' + gemPct + '%;background:' + gemBarColor + ';"></span></span>' + gemPct + '%</span>' +
                '<span class="mini-bar-unit"><span style="color:var(--purple-claude);">C:</span><span class="mini-bar-track"><span class="mini-bar-fill" style="width:' + claudePct + '%;background:' + claudeBarColor + ';"></span></span>' + claudePct + '%</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="summary-right" onclick="event.stopPropagation();">' +
            switchBtn +
            '<span class="drawer-toggle-icon" data-action="toggleExpand" data-email="' + esc(emailLower) + '">&#x25bc;</span>' +
          '</div>' +
        '</div>' +

        '<!-- Tier 2: Expandable Drawer -->' +
        '<div class="acc-row-drawer">' +
          '<div class="drawer-meta-chips">' +
            '<span class="chip-interactive" data-action="toggleAffinity" data-email="' + esc(email) + '" data-affinity="' + esc(acc.affinity || "all") + '" title="Chuyển model affinity (Gemini, Claude, Tất cả)">Affinity: ' + esc((acc.affinity || "all").toUpperCase()) + '</span>' +
            '<span class="chip-interactive" data-action="toggleRole" data-email="' + esc(email) + '" data-role="' + esc(acc.role || "primary") + '" title="Chuyển vai trò pool (Primary, Backup, Standby)">Role: ' + esc((acc.role || "primary").toUpperCase()) + '</span>' +
            '<span class="chip-interactive" data-action="editAlias" data-email="' + esc(email) + '" data-alias="' + esc(acc.alias || "") + '" title="Đặt bí danh hiển thị">Bí danh: ' + esc(acc.alias || "Đặt tên...") + '</span>' +
            reauthBtn +
          '</div>' +
          modelsHtml +
          '<div class="drawer-actions-row">' +
            '<div style="display:flex;align-items:center;gap:4px;">' +
              '<label class="switch" title="' + (isDis ? "Bật lại trong pool" : "Tạm ngưng trong pool") + '">' +
                '<input type="checkbox" ' + (isDis ? "" : "checked") + ' data-action="toggleAccount" data-email="' + esc(email) + '" />' +
                '<span class="slider"></span>' +
              '</label>' +
              '<span style="font-size:8px;color:var(--text-muted);">' + (isDis ? "Đang tắt" : "Đang bật") + '</span>' +
            '</div>' +
            '<div style="display:flex;gap:3px;">' +
              '<button class="btn btn-sec btn-icon" data-action="refreshAccount" data-email="' + esc(email) + '" title="Làm mới quota riêng tài khoản này">&#x21bb;</button>' +
              '<button class="btn btn-sec btn-icon" data-action="removeAccount" data-email="' + esc(email) + '" title="Xóa tài khoản khỏi pool" style="color:var(--rose-danger);">&times;</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join("");

    container.innerHTML = cardsHtml;
  }

  // ==================== RENDER ANALYTICS ====================
  function renderAnalytics() {
    var stats = (state && state.stats) || {};
    var allTime = stats.allTime || {};
    var burn = stats.burnRate || { tokensPerMin: 0, recentTurns: 0 };

    var bentoTotal = document.getElementById("bento-total-tokens");
    var bentoCache = document.getElementById("bento-cache-rate");
    var bentoBurn = document.getElementById("bento-burn-rate");
    var bentoTurns = document.getElementById("bento-turns");

    if (bentoTotal) bentoTotal.textContent = fmtNum(allTime.totalTokens || 0);
    if (bentoCache) bentoCache.textContent = Math.round((allTime.cacheHitRate || 0) * 100) + "%";
    if (bentoBurn) bentoBurn.textContent = fmtNum(burn.tokensPerMin) + " tok/m";
    if (bentoTurns) bentoTurns.textContent = (allTime.totalTurns || 0) + " turns";

    // Chart SVG
    var chartBox = document.getElementById("chart-viewport");
    if (!chartBox) return;

    var rawData = [];
    if (statsRange === "monthly") rawData = stats.monthly || [];
    else if (statsRange === "weekly") rawData = stats.weekly || [];
    else if (statsRange === "daily") rawData = stats.daily || [];
    else rawData = stats.hourly || [];

    var data = rawData.filter(Boolean);
    if (!data.length) {
      chartBox.innerHTML = '<div class="empty-deck">Chưa có dữ liệu tiêu thụ trong khoảng thời gian này.</div>';
      return;
    }

    var maxVal = Math.max.apply(Math, data.map(function(d) { return (d && d.totalTokens) || 0; }).concat([100]));
    var barWidth = statsRange === "monthly" ? 22 : statsRange === "today" ? 20 : statsRange === "weekly" ? 32 : 24;
    var stepX = statsRange === "monthly" ? 38 : statsRange === "today" ? 34 : statsRange === "weekly" ? 56 : 42;
    var yBase = 110;
    var maxBarH = 70;

    var svgBars = data.map(function(d, i) {
      var total = (d && d.totalTokens) || 0;
      var h = total > 0 ? Math.min(maxBarH, Math.max(3, Math.round((total / maxVal) * maxBarH))) : 0;
      var hCac = Math.round((((d && d.cacheHitTokens) || 0) / (total || 1)) * h);
      var hInp = Math.round((((d && d.cacheMissTokens) || Math.max(0, ((d && d.inputTokens) || 0) - ((d && d.cacheHitTokens) || 0))) / (total || 1)) * h);
      var hThk = Math.round((((d && d.thinkingTokens) || 0) / (total || 1)) * h);
      var hOut = Math.max(0, h - hCac - hInp - hThk);

      var x = 8 + i * stepX;
      var lbl = d && (d.hourLabel || d.dayLabel || d.weekLabel || d.monthLabel || "");
      var yCac = yBase - hCac;
      var yInp = yCac - hInp;
      var yThk = yInp - hThk;
      var yOut = yThk - hOut;

      var rects = '';
      if (hCac > 0) rects += '<rect x="' + x + '" y="' + yCac + '" width="' + barWidth + '" height="' + hCac + '" fill="var(--cache-violet)" rx="1" />';
      if (hInp > 0) rects += '<rect x="' + x + '" y="' + yInp + '" width="' + barWidth + '" height="' + hInp + '" fill="var(--cyan-gemini)" rx="1" />';
      if (hThk > 0) rects += '<rect x="' + x + '" y="' + yThk + '" width="' + barWidth + '" height="' + hThk + '" fill="var(--amber-thinking)" rx="1" />';
      if (hOut > 0) rects += '<rect x="' + x + '" y="' + yOut + '" width="' + barWidth + '" height="' + hOut + '" fill="var(--accent-emerald)" rx="1" />';
      if (h === 0) rects += '<rect x="' + x + '" y="' + (yBase - 2) + '" width="' + barWidth + '" height="2" fill="rgba(255,255,255,.08)" rx="1" />';

      return '<g class="chart-col-group">' +
        rects +
        '<text x="' + (x + barWidth / 2) + '" y="' + (yBase + 12) + '" text-anchor="middle" fill="var(--text-muted)" font-size="8" font-family="var(--font-mono)">' + esc(lbl) + '</text>' +
        (total > 0 ? ('<text x="' + (x + barWidth / 2) + '" y="' + (yOut - 3) + '" text-anchor="middle" fill="var(--text-main)" font-size="7.5" font-family="var(--font-mono)" font-weight="700">' + fmtNum(total) + '</text>') : '') +
      '</g>';
    }).join("");

    var totalW = Math.max(260, 20 + data.length * stepX);
    chartBox.innerHTML = '<svg class="chart-svg" style="width:' + totalW + 'px;" viewBox="0 0 ' + totalW + ' 135">' +
      '<line x1="0" y1="' + yBase + '" x2="' + totalW + '" y2="' + yBase + '" stroke="rgba(255,255,255,.08)" stroke-width="1" />' +
      svgBars +
    '</svg>';

    // Requests drill-down
    var reqs = stats.requests || [];
    var reqCountEl = document.getElementById("drill-req-count");
    var reqBox = document.getElementById("drill-requests-container");
    if (reqCountEl) reqCountEl.textContent = reqs.length + " reqs";
    if (reqBox) {
      reqBox.innerHTML = reqs.length ? reqs.slice(0, 20).map(function(r) {
        if (!r) return "";
        var timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
        var rate = (r.inputTokens && r.inputTokens > 0) ? Math.round(((r.cacheHitTokens || 0) / r.inputTokens) * 100) : 0;
        return '<div class="drill-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;"><span class="tag-badge tag-tier">' + esc(r.model || "Gemini") + '</span><span style="font-size:7.5px;color:var(--text-muted);">' + timeStr + '</span></div>' +
          '<div style="font-size:10px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + esc(r.promptPreview || "") + '">' + esc(r.promptPreview || "Request") + '</div>' +
          '<div style="font-size:11px;font-weight:800;font-family:var(--font-mono);">' + fmtNum(r.totalTokens || 0) + ' <span style="font-size:8.5px;color:var(--cache-violet);">(' + rate + '%)</span></div>' +
        '</div>';
      }).join("") : '<div class="empty-deck" style="width:100%;">Không có requests nào.</div>';
    }

    // Models drill-down
    var modelsBox = document.getElementById("drill-models-container");
    var modelMap = {};
    reqs.forEach(function(r) {
      if (!r || !r.model) return;
      if (!modelMap[r.model]) modelMap[r.model] = { model: r.model, total: 0, count: 0 };
      modelMap[r.model].total += (r.totalTokens || 0);
      modelMap[r.model].count += 1;
    });
    var mArr = Object.values(modelMap);
    var modelCountEl = document.getElementById("drill-model-count");
    if (modelCountEl) modelCountEl.textContent = mArr.length + " models";
    if (modelsBox) {
      modelsBox.innerHTML = mArr.length ? mArr.map(function(m) {
        return '<div class="drill-card">' +
          '<div class="tag-badge tag-tier">' + esc(m.model) + '</div>' +
          '<div style="font-size:12px;font-weight:800;font-family:var(--font-mono);margin-top:2px;">' + fmtNum(m.total) + '</div>' +
          '<div style="font-size:8px;color:var(--text-muted);">' + m.count + ' lượt gọi</div>' +
        '</div>';
      }).join("") : '<div class="empty-deck" style="width:100%;">Không có dữ liệu model.</div>';
    }

    // Sessions drill-down
    var convs = stats.conversations || [];
    var convCountEl = document.getElementById("drill-session-count");
    var convBox = document.getElementById("drill-sessions-container");
    if (convCountEl) convCountEl.textContent = convs.length + " sessions";
    if (convBox) {
      convBox.innerHTML = convs.length ? convs.slice(0, 15).map(function(c) {
        if (!c) return "";
        return '<div class="drill-card">' +
          '<div style="font-size:9.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + esc(c.title || "") + '">' + esc(c.title || "Session") + '</div>' +
          '<div style="font-size:11px;font-weight:800;font-family:var(--font-mono);">' + fmtNum(c.totalTokens || 0) + ' tokens</div>' +
          '<div style="font-size:8px;color:var(--text-muted);">' + (c.turns || 0) + ' turns</div>' +
        '</div>';
      }).join("") : '<div class="empty-deck" style="width:100%;">Không có session nào.</div>';
    }
  }

  // ==================== RENDER TELEMETRY ====================
  function renderTelemetry() {
    var container = document.getElementById("console-log-stream");
    if (!container) return;

    var logs = (state && Array.isArray(state.logs)) ? state.logs : [];
    var qSearch = logSearch.trim().toLowerCase();

    var filtered = logs.filter(function(l) {
      if (!l) return false;
      var cat = (l.category || "SYSTEM").toUpperCase();
      var lvl = (l.level || "info").toLowerCase();
      if (logCategory === "ERROR") {
        if (lvl !== "error" && lvl !== "warn") return false;
      } else if (logCategory !== "ALL") {
        if (cat !== logCategory) return false;
      }
      if (qSearch) {
        var msg = (l.message || "").toLowerCase();
        if (!msg.includes(qSearch) && !cat.toLowerCase().includes(qSearch)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = '<div class="empty-deck">Không có nhật ký phù hợp bộ lọc.</div>';
      return;
    }

    container.innerHTML = filtered.slice(0, 60).map(function(l) {
      var cat = (l.category || "LOG").toUpperCase();
      var lvl = (l.level || "info").toLowerCase();
      var timeStr = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : "";
      var rowCls = "log-row" + (lvl === "error" ? " error" : cat === "ROTATION" ? " rotate" : cat === "QUOTA" ? " quota" : cat === "USS" ? " uss" : cat === "AUTH" ? " auth" : "");

      return '<div class="' + rowCls + '">' +
        '<div class="log-head">' +
          '<span class="log-cat">' + esc(cat) + '</span>' +
          '<span>' + timeStr + '</span>' +
        '</div>' +
        '<div class="log-text">' + esc(l.message || "") + '</div>' +
      '</div>';
    }).join("");
  }

  // ==================== RENDER SETTINGS ====================
  function renderSettings() {
    var config = (state && state.config) || {};
    var currentStrat = config.rotationStrategy || "auto_highest";

    var stratCards = document.querySelectorAll(".strat-card-option");
    stratCards.forEach(function(card) {
      var s = card.getAttribute("data-strategy");
      if (s === currentStrat) card.classList.add("selected");
      else card.classList.remove("selected");
    });

    var hideToggle = document.getElementById("cfg-hide-email-toggle");
    if (hideToggle) hideToggle.checked = !!config.hideEmail;
  }

  // ==================== GLOBAL RENDER ====================
  function renderAll() {
    renderSpotlight();
    renderAccountDeck();
    if (currentTab === "analytics") renderAnalytics();
    if (currentTab === "telemetry") renderTelemetry();
    if (currentTab === "settings") renderSettings();
  }

  // ==================== EVENT DELEGATION ====================
  document.addEventListener("click", function(e) {
    var target = e.target;

    // Tab buttons
    var dockBtn = target.closest(".dock-btn");
    if (dockBtn) {
      var tabId = dockBtn.getAttribute("data-tab");
      if (tabId) switchTab(tabId);
      return;
    }

    // Filter chips
    var fChip = target.closest(".deck-filter-bar .filter-chip");
    if (fChip) {
      document.querySelectorAll(".deck-filter-bar .filter-chip").forEach(function(c) { c.classList.remove("active"); });
      fChip.classList.add("active");
      healthFilter = fChip.getAttribute("data-filter") || "all";
      renderAccountDeck();
      return;
    }

    // Log category chips
    var logChip = target.closest(".console-chips .filter-chip");
    if (logChip) {
      document.querySelectorAll(".console-chips .filter-chip").forEach(function(c) { c.classList.remove("active"); });
      logChip.classList.add("active");
      logCategory = logChip.getAttribute("data-cat") || "ALL";
      renderTelemetry();
      return;
    }

    // Analytics Period buttons
    var pBtn = target.closest(".period-btn");
    if (pBtn) {
      document.querySelectorAll(".period-btn").forEach(function(b) { b.classList.remove("active"); });
      pBtn.classList.add("active");
      statsRange = pBtn.getAttribute("data-range") || "today";
      renderAnalytics();
      return;
    }

    // Strategy Cards
    var stratCard = target.closest(".strat-card-option");
    if (stratCard) {
      var stratVal = stratCard.getAttribute("data-strategy");
      if (stratVal) {
        post("updateConfig", { rotationStrategy: stratVal });
      }
      return;
    }

    // Actions
    var actionEl = target.closest("[data-action]");
    if (!actionEl) return;
    var act = actionEl.getAttribute("data-action");

    if (act === "toggleExpand") {
      var emailExp = actionEl.getAttribute("data-email");
      if (emailExp) {
        if (expandedAccounts.has(emailExp)) expandedAccounts.delete(emailExp);
        else expandedAccounts.add(emailExp);
        renderAccountDeck();
      }
    } else if (act === "addAccount") {
      post("addAccount");
    } else if (act === "refreshAll") {
      post("refreshQuotas");
    } else if (act === "forceRotate") {
      post("refreshQuotas");
    } else if (act === "togglePrivacy") {
      hideEmail = !hideEmail;
      post("updateConfig", { hideEmail: hideEmail });
    } else if (act === "selectAccount") {
      var emailSel = actionEl.getAttribute("data-email");
      if (emailSel) post("selectAccount", emailSel);
    } else if (act === "refreshAccount") {
      var emailRef = actionEl.getAttribute("data-email");
      if (emailRef) post("refreshAccount", emailRef);
    } else if (act === "removeAccount") {
      var emailRem = actionEl.getAttribute("data-email");
      if (emailRem) post("removeAccount", emailRem);
    } else if (act === "reauthAccount") {
      var emailRe = actionEl.getAttribute("data-email");
      if (emailRe) post("reauthAccount", emailRe);
    } else if (act === "toggleAffinity") {
      var emailAff = actionEl.getAttribute("data-email");
      var curAff = actionEl.getAttribute("data-affinity") || "all";
      var nextAff = curAff === "all" ? "gemini" : curAff === "gemini" ? "claude" : "all";
      if (emailAff) post("updateAccountMeta", { email: emailAff, affinity: nextAff });
    } else if (act === "toggleRole") {
      var emailRole = actionEl.getAttribute("data-email");
      var curRole = actionEl.getAttribute("data-role") || "primary";
      var nextRole = curRole === "primary" ? "backup" : curRole === "backup" ? "standby" : "primary";
      if (emailRole) post("updateAccountMeta", { email: emailRole, role: nextRole });
    } else if (act === "editAlias") {
      var emailAlias = actionEl.getAttribute("data-email");
      var curAlias = actionEl.getAttribute("data-alias") || "";
      var newAlias = prompt("Nhập bí danh mới cho " + emailAlias + ":", curAlias);
      if (newAlias !== null && emailAlias) {
        post("updateAccountMeta", { email: emailAlias, alias: newAlias.trim() });
      }
    } else if (act === "clearLogs") {
      post("clearLogs");
    } else if (act === "copyLogs") {
      var logsToCopy = (state && state.logs) || [];
      navigator.clipboard.writeText(JSON.stringify(logsToCopy, null, 2)).then(function() {
        actionEl.textContent = "Copied!";
        setTimeout(function() { actionEl.textContent = "Copy"; }, 1500);
      });
    } else if (act === "recalculateStats") {
      post("recalculateStats");
    } else if (act === "exportPool") {
      post("exportPool");
    } else if (act === "importPool") {
      post("importPool");
    }
  });

  // Inputs
  var searchAccInput = document.getElementById("search-accounts");
  if (searchAccInput) {
    searchAccInput.addEventListener("input", function() {
      searchFilter = searchAccInput.value;
      renderAccountDeck();
    });
  }

  var searchLogInput = document.getElementById("search-logs");
  if (searchLogInput) {
    searchLogInput.addEventListener("input", function() {
      logSearch = searchLogInput.value;
      renderTelemetry();
    });
  }

  var masterPowerToggle = document.getElementById("master-power-toggle");
  if (masterPowerToggle) {
    masterPowerToggle.addEventListener("change", function() {
      post("updateConfig", { enabled: masterPowerToggle.checked });
    });
  }

  var settingHideToggle = document.getElementById("cfg-hide-email-toggle");
  if (settingHideToggle) {
    settingHideToggle.addEventListener("change", function() {
      post("updateConfig", { hideEmail: settingHideToggle.checked });
    });
  }

  // Account toggle checkbox
  document.addEventListener("change", function(e) {
    var target = e.target;
    if (target.matches('input[data-action="toggleAccount"]')) {
      var email = target.getAttribute("data-email");
      if (email) {
        post("toggleAccount", { email: email, enabled: target.checked });
      }
    }
  });

  // Live Timer ticker for countdowns
  setInterval(function() {
    var resetEls = document.querySelectorAll("[data-reset]");
    resetEls.forEach(function(el) {
      var iso = el.getAttribute("data-reset");
      if (iso) el.textContent = fmtTime(iso);
    });
  }, 1000);

  // Message receiver from VS Code Extension
  window.addEventListener("message", function(event) {
    var msg = event.data;
    if (msg && msg.type === "state" && msg.data) {
      state = msg.data;
      renderAll();
    }
  });

  // Signal ready to host
  post("ready");
  renderAll();
})();
`;
}
