/* ================================================================
   Solvronix Desk — Module Card Grid
   Replaces the /app/home workspace with an clean app launcher grid.
   Workspace data fetched once and cached in memory per session.
   ================================================================ */

(function () {
  /* ── Workspace color + icon map ─────────────────────────────── */
  /* ── Monochrome inline SVG icon set — every glyph inherits the card's
     accent colour through currentColor, so the grid stays consistent in
     light and dark surfaces instead of relying on OS emoji fonts. ── */
  var ICONS = {
    education: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.5 12 4l9.5 4.5L12 13z"/><path d="M6.5 10.7V16c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-5.3"/><path d="M21.5 8.5V14"/></svg>',
    money: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9v6M18 9v6"/></svg>',
    trend: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17.5 9.5 11l4 4L21 7"/><path d="M15.5 7H21v5.5"/></svg>',
    crm: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.3"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M16.5 5.6a3.3 3.3 0 0 1 0 5.9"/><path d="M18.4 14.4A6.2 6.2 0 0 1 21.5 20"/></svg>',
    cart: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.5" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h2.6l2.4 11.1a1.7 1.7 0 0 0 1.7 1.4h8.3a1.7 1.7 0 0 0 1.7-1.3l1.6-6.7H6.2"/></svg>',
    box: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2.8 8.2 4.4v9.6L12 21.2 3.8 16.8V7.2z"/><path d="m3.8 7.2 8.2 4.4 8.2-4.4"/><path d="M12 11.6v9.6"/></svg>',
    users: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.3"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M16.5 5.6a3.3 3.3 0 0 1 0 5.9"/><path d="M18.4 14.4A6.2 6.2 0 0 1 21.5 20"/></svg>',
    payroll: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M2.5 10h19"/><path d="M6.5 14.5h3"/></svg>',
    factory: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 20.5V10l6 3.8V10l6 3.8V6.5h5.5a1.5 1.5 0 0 1 1.5 1.5v12.5z"/><path d="M2.5 20.5h19"/><path d="M7 17h1.5M12 17h1.5M17 17h1.5"/></svg>',
    clipboard: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4.5H7.5A1.5 1.5 0 0 0 6 6v13.5A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H15"/><rect x="9" y="2.5" width="6" height="4" rx="1.2"/><path d="M9.5 11.5h5M9.5 15.5h3"/></svg>',
    quality: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7 4.5 5.9v5.4c0 4.6 3.1 8.3 7.5 9.9 4.4-1.6 7.5-5.3 7.5-9.9V5.9z"/><path d="m8.8 11.9 2.3 2.3 4.1-4.4"/></svg>',
    support: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13.5v-1.6a8 8 0 0 1 16 0v1.6"/><rect x="2.6" y="13" width="4.2" height="6" rx="1.8"/><rect x="17.2" y="13" width="4.2" height="6" rx="1.8"/><path d="M20 19v.6a2.6 2.6 0 0 1-2.6 2.6H13"/></svg>',
    assets: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V6.5a1.5 1.5 0 0 1 1.5-1.5H12a1.5 1.5 0 0 1 1.5 1.5V21"/><path d="M13.5 21V11h5A1.5 1.5 0 0 1 20 12.5V21"/><path d="M2.5 21h19"/><path d="M7 9h3M7 13h3M7 17h3M16.5 15h1M16.5 18h1"/></svg>',
    bank: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 4l9 6.5"/><path d="M5 10.5V19M9.7 10.5V19M14.3 10.5V19M19 10.5V19"/><path d="M2.5 19h19"/></svg>',
    health: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5h3.5L9 9.5l2.5 6 2-3h6.5"/><path d="M20.6 9a4.6 4.6 0 0 0-8.6-2.3A4.6 4.6 0 0 0 3.4 9c0 4.9 8.6 10.4 8.6 10.4S20.6 13.9 20.6 9"/></svg>',
    globe: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14.5 14.5 0 0 1 0 18a14.5 14.5 0 0 1 0-18"/></svg>',
    settings: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.2 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.5 1.1v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-2.6-1.1l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1.1-2.5h-.2a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1.1-2.6l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 2.5-1.1v-.2a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 2.6 1.1l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1.1 2.5h.2a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9z"/></svg>',
    spark: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2.8 2.6 6.6 6.6 2.6-6.6 2.6L12 21.2l-2.6-6.6L2.8 12l6.6-2.6z"/></svg>',
    home: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 10.5 8.5-7 8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 19z"/><path d="M9.5 20.5v-6.5h5v6.5"/></svg>',
    receipt: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.8h14v18.4l-2.3-1.6-2.4 1.6-2.3-1.6-2.3 1.6-2.4-1.6L5 21.2z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></svg>',
    report: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2.8H7a2 2 0 0 0-2 2v14.4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.8z"/><path d="M14 2.8V8h5"/><path d="M8.8 17v-3.4M12 17v-5.4M15.2 17v-2"/></svg>',
    build: '<svg class="st-ws-icon-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.2 6.6a3.9 3.9 0 0 0 5.1 5.1l-7 7a2.6 2.6 0 0 1-3.7-3.7z"/><path d="m5.6 5.6 3.6 3.6"/><path d="M3.4 8.4 8.4 3.4l2.2 2.2-5 5z"/></svg>',
  };

  var WS_CONFIG = {
    /* Edvronix */
    "edvronix app":         { color: "#F97316", icon: ICONS.education, desc: "Students, fees, exams & attendance" },
    "edvronix":             { color: "#F97316", icon: ICONS.education, desc: "Students, fees, exams & attendance" },
    "education":            { color: "#F97316", icon: ICONS.education, desc: "Students, fees, exams & attendance" },
    /* Accounts / Finance */
    "accounts":             { color: "#F59E0B", icon: ICONS.money, desc: "Invoices, ledger & balance sheets" },
    "accounting":           { color: "#F59E0B", icon: ICONS.money, desc: "Invoices, ledger & balance sheets" },
    "finance":              { color: "#F59E0B", icon: ICONS.money, desc: "Invoices, ledger & balance sheets" },
    "invoicing":            { color: "#F59E0B", icon: ICONS.receipt, desc: "Sales invoices & payments" },
    "financial reports":    { color: "#3B82F6", icon: ICONS.report, desc: "Balance sheet, P&L & ledgers" },
    /* Sales / Selling */
    "selling":              { color: "#EF4444", icon: ICONS.trend, desc: "Quotations, orders & customers" },
    "sales":                { color: "#EF4444", icon: ICONS.trend, desc: "Quotations, orders & customers" },
    "crm":                  { color: "#06B6D4", icon: ICONS.crm, desc: "Leads, deals & opportunities" },
    /* Buying / Purchase */
    "buying":               { color: "#F59E0B", icon: ICONS.cart, desc: "Purchase orders & suppliers" },
    "purchase":             { color: "#F59E0B", icon: ICONS.cart, desc: "Purchase orders & suppliers" },
    /* Stock / Inventory */
    "stock":                { color: "#3B82F6", icon: ICONS.box, desc: "Warehouses, items & deliveries" },
    "inventory":            { color: "#3B82F6", icon: ICONS.box, desc: "Warehouses, items & deliveries" },
    /* HR / Payroll */
    "hr":                   { color: "#8B5CF6", icon: ICONS.users, desc: "Employees, attendance & leave" },
    "human resources":      { color: "#8B5CF6", icon: ICONS.users, desc: "Employees, attendance & leave" },
    "payroll":              { color: "#8B5CF6", icon: ICONS.payroll, desc: "Salary slips & payroll runs" },
    /* Manufacturing */
    "manufacturing":        { color: "#10B981", icon: ICONS.factory, desc: "Work orders & production planning" },
    /* Projects */
    "projects":             { color: "#3B82F6", icon: ICONS.clipboard, desc: "Tasks, timesheets & milestones" },
    /* Quality */
    "quality":              { color: "#06B6D4", icon: ICONS.quality, desc: "Quality inspections & feedback" },
    /* Support */
    "support":              { color: "#06B6D4", icon: ICONS.support, desc: "Issues, SLA & customer portal" },
    /* Assets */
    "assets":               { color: "#10B981", icon: ICONS.assets, desc: "Fixed assets & depreciation" },
    /* Loans */
    "loans":                { color: "#F59E0B", icon: ICONS.bank, desc: "Loan management & repayments" },
    /* Healthcare */
    "healthcare":           { color: "#EF4444", icon: ICONS.health, desc: "Patients, appointments & billing" },
    /* Website */
    "website":              { color: "#F97316", icon: ICONS.globe, desc: "Web pages, blog & store" },
    /* Developer / Build */
    "build":                { color: "#6366F1", icon: ICONS.build, desc: "Doctypes, scripts & customisation" },
    /* Settings */
    "settings":             { color: "#6B7280", icon: ICONS.settings, desc: "System configuration & setup" },
    /* Solvronix */
    "solvronix":            { color: "#F97316", icon: ICONS.spark, desc: "Solvronix platform settings" },
    /* Home — not shown in the grid itself */
    "home":                 { color: "#6B7280", icon: ICONS.home, desc: "Home" },
  };

  /* Fallback colors cycling for unknown workspaces */
  var FALLBACK_COLORS = ["#EF4444","#F59E0B","#10B981","#3B82F6","#8B5CF6","#06B6D4","#F97316"];

  function wsConfig(title) {
    var key = (title || "").toLowerCase();
    if (WS_CONFIG[key]) return WS_CONFIG[key];
    /* Partial match */
    var keys = Object.keys(WS_CONFIG);
    for (var i = 0; i < keys.length; i++) {
      if (key.indexOf(keys[i]) !== -1 || keys[i].indexOf(key) !== -1) {
        return WS_CONFIG[keys[i]];
      }
    }
    return null;
  }

  function wsColor(title, idx) {
    var cfg = wsConfig(title);
    return cfg ? cfg.color : FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  }

  function wsIcon(title, frappe_icon) {
    var cfg = wsConfig(title);
    if (cfg) return cfg.icon;
    /* Use first letter as fallback */
    return '<span class="st-ws-icon-letter">' + (title || "?").charAt(0).toUpperCase() + '</span>';
  }

  function wsDesc(title) {
    var cfg = wsConfig(title);
    return cfg ? cfg.desc : "";
  }

  /* ── Workspace data cache ────────────────────────────────────── */
  var _wsCache = null;
  var _routeGeneration = 0;
  var _activePoller = null;

  /* Cached reference to frappe.workspace's own .layout-main-section —
     the SAME singleton node for the whole session. Captured the moment
     we hide its real content; restore uses THIS, never a fresh lookup,
     so it can't be fooled by frappe.container.page not having swapped
     over to the new route yet (which caused a visible flash of the old
     workspace content when navigating away — e.g. clicking the Home
     icon to Today's View). */
  var _hiddenContainer = null;

  function fetchWorkspaces(cb) {
    if (_wsCache) { cb(_wsCache); return; }
    frappe.call({
      method: "solvronix_desk.api.get_workspaces",
      callback: function (r) {
        if (!r || !r.message) { cb([]); return; }
        var pages = (r.message.pages || []).concat(r.message.private_pages || []);
        /* Keep only top-level pages (no parent) and visible ones */
        var topLevel = [];
        for (var i = 0; i < pages.length; i++) {
          var p = pages[i];
          if (p.parent_page || p.is_hidden || !p.public) continue;
          /* Skip Home itself — we ARE the home page */
          if ((p.name || "").toLowerCase() === "home") continue;
          /* Skip pure module-level parents that are just navigation groupers */
          topLevel.push(p);
        }
        _wsCache = topLevel;
        cb(topLevel);
      }
    });
  }

  /* ── Build skeleton loaders ──────────────────────────────────── */
  function buildSkeletons(n) {
    var html = '<div class="st-ws-cards">';
    for (var i = 0; i < n; i++) {
      html += '<div class="st-ws-card st-skeleton">' +
              '<div class="st-ws-card-icon"></div>' +
              '<div class="st-ws-card-info">' +
              '<div class="st-ws-card-name">Loading</div>' +
              '<div class="st-ws-card-desc">Please wait</div>' +
              '</div></div>';
    }
    html += '</div>';
    return html;
  }

  /* ── Render one card ─────────────────────────────────────────── */
  function buildCard(page, idx) {
    var title = page.title || page.name || "Module";
    /* Use the Frappe workspace slug (lowercase, spaces → hyphens) for navigation */
    var slug  = (frappe.router && frappe.router.slug)
                ? frappe.router.slug(page.name || "")
                : (page.name || "").toLowerCase().replace(/ /g, "-");
    var color = wsColor(title, idx);
    var icon  = wsIcon(title, page.icon);
    var desc  = wsDesc(title);

    return '<a class="st-ws-card" href="/desk/' + encodeURIComponent(slug) + '"' +
           ' data-ws="' + slug + '"' +
           ' style="--mod-color:' + color + '"' +
           ' tabindex="0">' +
           '<div class="st-ws-card-icon">' + icon + '</div>' +
           '<div class="st-ws-card-info">' +
           '<div class="st-ws-card-name">' + frappe.utils.escape_html(title) + '</div>' +
           (desc ? '<div class="st-ws-card-desc">' + frappe.utils.escape_html(desc) + '</div>' : '') +
           '</div>' +
           '</a>';
  }

  /* ── Filter cards by search query ───────────────────────────── */
  function filterCards(query) {
    var q = (query || "").toLowerCase().trim();
    var cards = document.querySelectorAll("#st-module-grid .st-ws-card");
    var any = false;
    for (var i = 0; i < cards.length; i++) {
      var title = (cards[i].querySelector(".st-ws-card-name") || {}).textContent || "";
      var desc  = (cards[i].querySelector(".st-ws-card-desc") || {}).textContent || "";
      var match = !q || title.toLowerCase().indexOf(q) !== -1 || desc.toLowerCase().indexOf(q) !== -1;
      cards[i].style.display = match ? "" : "none";
      if (match) any = true;
    }
    var empty = document.getElementById("st-ws-empty");
    if (empty) empty.style.display = any ? "none" : "";
  }

  /* ── Hide/restore Frappe's own workspace content ──────────────
     `container` (.layout-main-section) is the SAME long-lived DOM
     node Frappe's `frappe.workspace` singleton owns for every
     workspace, including Home — it creates `.editor-js-container`
     / `#editorjs` in it once and reuses them for the whole session.
     We must never destroy those nodes (via innerHTML=) or the
     EditorJS instance loses its holder and every later workspace
     silently fails to render (GitHub #7). Hide them instead, and
     restore on the way out. ────────────────────────────────────── */
  function hideRealWorkspaceContent(container) {
    _hiddenContainer = container;
    var kids = container.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.id === "st-module-grid") continue;
      if (el.style.display !== "none") {
        el.dataset.stHiddenByGrid = "1";
        el.style.display = "none";
      }
    }
  }

  function restoreRealWorkspaceContent() {
    var container = _hiddenContainer;
    if (!container) return;
    var grid = container.querySelector("#st-module-grid");
    if (grid) grid.style.display = "none";
    var hidden = container.querySelectorAll("[data-st-hidden-by-grid]");
    for (var i = 0; i < hidden.length; i++) {
      hidden[i].style.display = "";
      delete hidden[i].dataset.stHiddenByGrid;
    }
    _hiddenContainer = null;
  }

  /* ── Render the full module grid into the page ───────────────── */
  function renderGrid(container, generation) {
    if (!container || generation !== _routeGeneration || !isHomeRoute()) return;

    hideRealWorkspaceContent(container);

    /* Reuse the grid element across visits instead of rebuilding it */
    var grid = container.querySelector("#st-module-grid");
    if (!grid) {
      grid = document.createElement("div");
      grid.id = "st-module-grid";
      container.appendChild(grid);
    }
    grid.style.display = "";

    /* Grid shell with skeleton loaders */
    grid.innerHTML =
      '<div class="st-ws-header">' +
      '<div class="st-ws-title">All Apps</div>' +
      '<div class="st-ws-subtitle">Jump to any workspace from here</div>' +
      '</div>' +
      '<div class="st-ws-search-wrap">' +
      '<input id="st-ws-search-input" class="st-ws-search" type="text" placeholder="Search apps…" autocomplete="off">' +
      '</div>' +
      buildSkeletons(8);

    /* Wire search input */
    var searchInput = document.getElementById("st-ws-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", function () { filterCards(this.value); });
    }

    /* Fetch real workspace list and replace skeletons */
    fetchWorkspaces(function (pages) {
      if (
        generation !== _routeGeneration ||
        !isHomeRoute() ||
        !container.isConnected ||
        !(frappe.container && frappe.container.page && frappe.container.page.contains(container))
      ) return;
      var grid = container.querySelector("#st-module-grid");
      if (!grid) return;

      /* Remove skeletons */
      var oldCards = grid.querySelector(".st-ws-cards");
      if (oldCards) grid.removeChild(oldCards);

      if (!pages.length) {
        grid.insertAdjacentHTML("beforeend",
          '<div class="st-ws-cards"><div class="st-ws-empty">No workspaces found.</div></div>');
        return;
      }

      var html = '<div class="st-ws-cards">';
      for (var i = 0; i < pages.length; i++) {
        html += buildCard(pages[i], i);
      }
      html += '<div id="st-ws-empty" class="st-ws-empty" style="display:none">No apps match your search.</div>';
      html += '</div>';
      grid.insertAdjacentHTML("beforeend", html);

      /* Native anchors are handled once by Frappe's delegated SPA router. */
      /* Re-apply any active search */
      if (searchInput && searchInput.value) filterCards(searchInput.value);
    });
  }

  /* ── Find the best content container to take over ───────────── */
  function getPageContent() {
    /* Only the router-owned active page is safe. */
    if (frappe.container && frappe.container.page) {
      var c = frappe.container.page.querySelector(".layout-main-section");
      if (c) return c;
    }
    return null;
  }

  /* ── Check if we're on the Home route ───────────────────────── */
  function isHomeRoute() {
    var route = frappe.get_route && frappe.get_route();
    /* Router not initialised yet — don't inject; wait for "change" event */
    if (!route) return false;
    /* Empty route: user is at /desk with no sub-path (Frappe Desktop page) */
    if (!route.length || route[0] === "") return true;
    var r0 = route[0].toLowerCase();
    /* Old-style ["home"] route */
    if (route.length === 1 && r0 === "home") return true;
    return false;
  }

  /* ── Detect Frappe's silent bare-route content substitution ───
     frappe.views.pageview.show() (Frappe core) substitutes an empty
     page name with frappe.boot.home_page — solvronix_desk sets this
     to "smart-home" when Theme Settings' "Enable Smart Home" is on.
     That substitution happens at the CONTENT level only: it changes
     what's rendered (frappe.container.change_to("smart-home")) but
     never touches frappe.router.current_route, which stays "" — a
     split-brain state where the route and the visible page disagree.
     This breaks Frappe's own sidebar resolution (set_workspace_sidebar
     reads the still-empty route, finds no match, and no-ops — leaving
     whatever workspace sidebar was showing before stuck on screen) and
     would make us inject the grid into frappe.container.page, which by
     then is smart-home's own Page instance, not a Workspace — its
     .layout-main-section lookup fails and getPageContent()'s unscoped
     fallback grabs the first matching node anywhere in the DOM, likely
     a stale hidden one from whatever workspace was active before.
     Fix at the source: turn the silent substitution into a REAL
     navigation, so route/content/sidebar all agree on smart-home. */
  function smartHomeOverrideActive() {
    return !!(frappe.boot && frappe.boot.home_page);
  }

  /* ── Main injection logic ────────────────────────────────────── */
  function maybeInjectGrid() {
    if (!isHomeRoute()) return;
    if (smartHomeOverrideActive()) {
      frappe.set_route(frappe.boot.home_page);
      return;
    }
    var generation = _routeGeneration;

    /* Wait for the page content div to appear */
    var attempts = 0;
    if (_activePoller) clearInterval(_activePoller);
    _activePoller = setInterval(function () {
      attempts++;
      if (generation !== _routeGeneration || !isHomeRoute()) {
        clearInterval(_activePoller);
        _activePoller = null;
        return;
      }
      var container = getPageContent();
      if (container) {
        clearInterval(_activePoller);
        _activePoller = null;
        var grid = container.querySelector("#st-module-grid");
        if (!grid || grid.style.display === "none") renderGrid(container, generation);
      } else if (attempts > 20) {
        clearInterval(_activePoller);
        _activePoller = null;
      }
    }, 100);
  }

  /* ── Boot & route change wiring ──────────────────────────────── */
  $(document).ready(function () {
    /* Hook route change event */
    frappe.router.on("change", function () {
      _routeGeneration++;
      if (_activePoller) {
        clearInterval(_activePoller);
        _activePoller = null;
      }
      /* Small delay — let Frappe set up the new page first */
      setTimeout(function () {
        if (isHomeRoute()) {
          maybeInjectGrid();
        } else {
          /* Leaving Home for a real workspace — restore whatever
             Frappe's own workspace singleton put in this container
             before the grid hid it, so it renders correctly. Uses the
             container reference cached at hide time (not a fresh
             getPageContent() lookup) — frappe.container.page may not
             have swapped to the new route yet when this fires, which
             previously caused a visible flash of the old workspace
             content (e.g. clicking the Home icon to Today's View). */
          restoreRealWorkspaceContent();
        }
      }, 300);
    });

    /* Also trigger on first load if already on home */
    setTimeout(function () { maybeInjectGrid(); }, 500);
  });

  /* ── Shared with other theme pages (e.g. Today's View's own apps
     section) so they render workspace cards identically instead of
     duplicating the icon/color map and card markup. ─────────────── */
  frappe.provide("solvronix_desk");
  solvronix_desk.workspaceCards = {
    fetchWorkspaces: fetchWorkspaces,
    buildCard: buildCard,
    buildSkeletons: buildSkeletons,
  };
}());
