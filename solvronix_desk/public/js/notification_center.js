/* =============================================================================
   Solvronix Desk — Notification Center (Feature 7)
   Bell icon in toolbar → slide panel from right.
   ============================================================================= */
(function () {
  "use strict";

  if (window._stNotifInit) return;
  window._stNotifInit = true;

  var MAX_ITEMS = 25;
  var currentTab = "notifications";
  var notifCache = null;
  var $bell, $badge, $panel, $overlay, $list, $tabs;

  /* ── Wait for our toolbar to be injected ── */
  function waitForToolbar(cb) {
    var tries = 0;
    var iv = setInterval(function () {
      if (document.getElementById("st-top-toolbar")) {
        clearInterval(iv);
        cb();
      } else if (++tries > 60) {
        clearInterval(iv);
      }
    }, 200);
  }

  /* ── Inject bell button into toolbar right section ── */
  function injectBell() {
    if (document.getElementById("st-notif-bell")) return;
    var $tbRight = $("#st-top-toolbar .st-tb-right");
    if (!$tbRight.length) return;

    $bell = $(
      '<button id="st-notif-bell" title="' + __("Notifications") + '" aria-label="' + __("Notifications") + '">' +
        '<span class="st-notif-bell-icon"><svg class="st-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5"/><path d="M13.7 20.5a2 2 0 0 1-3.4 0"/></svg></span>' +
        '<span class="st-notif-badge st-hidden">0</span>' +
      '</button>'
    );
    $badge = $bell.find(".st-notif-badge");

    $bell.on("click", function (e) {
      e.stopPropagation();
      togglePanel();
    });

    /* Insert at the very beginning of the right section */
    $tbRight.prepend('<span class="st-tb-sep st-notif-sep"></span>');
    $tbRight.prepend($bell);
  }

  /* ── Build panel once ── */
  function buildPanel() {
    if (document.getElementById("st-notif-panel")) {
      $panel  = $("#st-notif-panel");
      $overlay = $("#st-notif-overlay");
      $list   = $panel.find(".st-notif-list");
      $tabs   = $panel.find(".st-notif-tabs");
      return;
    }

    $overlay = $('<div id="st-notif-overlay"></div>');
    $overlay.on("click", closePanel);

    $panel = $('<div id="st-notif-panel" role="dialog" aria-label="' + __("Notification Center") + '"></div>');

    /* Header */
    var $head = $(
      '<div class="st-notif-head">' +
        '<span class="st-notif-title"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5"/><path d="M13.7 20.5a2 2 0 0 1-3.4 0"/></svg> ' + __("Notifications") + '</span>' +
        '<div class="st-notif-head-actions">' +
          '<button class="st-notif-action-btn" id="st-notif-mark-all"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg> ' + __("Mark all read") + '</button>' +
          '<button class="st-notif-action-btn st-notif-close-btn" id="st-notif-close" title="' + __("Close") + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '</div>' +
      '</div>'
    );
    $head.find("#st-notif-close").on("click", closePanel);
    $head.find("#st-notif-mark-all").on("click", markAllRead);

    /* Tabs */
    $tabs = $(
      '<div class="st-notif-tabs">' +
        '<button class="st-notif-tab active" data-tab="notifications">' + __("Notifications") + '</button>' +
        '<button class="st-notif-tab" data-tab="events">' + __("Events") + '</button>' +
      '</div>'
    );
    $tabs.find(".st-notif-tab").on("click", function () {
      switchTab($(this).data("tab"));
    });

    /* List */
    $list = $('<div class="st-notif-list"></div>');

    /* Footer */
    var $foot = $(
      '<div class="st-notif-foot">' +
        '<a href="#" class="st-notif-view-all">' + __("View all notifications") + ' &rarr;</a>' +
      '</div>'
    );
    $foot.find(".st-notif-view-all").on("click", function (e) {
      e.preventDefault();
      frappe.set_route("List", "Notification Log");
      closePanel();
    });

    $panel.append($head).append($tabs).append($list).append($foot);
    $("body").append($overlay).append($panel);
  }

  /* ── Open / close ── */
  function togglePanel() {
    if ($panel && $panel.hasClass("open")) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    buildPanel();
    $overlay.addClass("open");
    $panel.addClass("open");
    loadTab(currentTab);
    markAllSeen();
  }

  function closePanel() {
    if ($panel)  $panel.removeClass("open");
    if ($overlay) $overlay.removeClass("open");
  }

  /* ── Tab switching ── */
  function switchTab(tab) {
    currentTab = tab;
    $tabs.find(".st-notif-tab").removeClass("active");
    $tabs.find('[data-tab="' + tab + '"]').addClass("active");
    loadTab(tab);
  }

  function loadTab(tab) {
    if (tab === "notifications") {
      loadNotifications();
    } else {
      loadEvents();
    }
  }

  /* ── Load notifications ── */
  function loadNotifications() {
    showLoading(__("Loading notifications…"));
    frappe.call({
      method: "frappe.desk.doctype.notification_log.notification_log.get_notification_logs",
      args: { limit: MAX_ITEMS },
      type: "GET",
      callback: function (r) {
        var items = (r.message && r.message.notification_logs) || [];
        notifCache = items;
        renderNotifications(items);
        updateBadge(items);
      },
      error: function () {
        showEmpty(__("Could not load notifications"));
      },
    });
  }

  function renderNotifications(items) {
    $list.empty();
    if (!items.length) {
      $list.html(
        '<div class="st-notif-empty">' +
          '<div class="st-notif-empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5"/><path d="M13.7 20.5a2 2 0 0 1-3.4 0"/></svg></div>' +
          __("You're all caught up!") +
        '</div>'
      );
      return;
    }
    items.forEach(function (n) {
      $list.append(makeNotifItem(n));
    });
  }

  function makeNotifItem(n) {
    var readClass = n.read ? "read" : "unread";
    var timeAgo   = frappe.datetime.comment_when(n.creation);
    var avatar    = frappe.avatar ? frappe.avatar(n.from_user, "avatar-small") : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></svg>';
    var docLabel  = n.document_type ? "<span class='st-notif-doctype'>" + __(n.document_type) + "</span>" : "";

    var $item = $(
      '<div class="st-notif-item ' + readClass + '" data-name="' + (n.name || "") + '">' +
        '<div class="st-notif-avatar">' + avatar + '</div>' +
        '<div class="st-notif-body">' +
          '<div class="st-notif-subject">' + (n.subject || "") + '</div>' +
          '<div class="st-notif-meta">' +
            docLabel +
            '<span class="st-notif-time">' + timeAgo + '</span>' +
          '</div>' +
        '</div>' +
        (!n.read
          ? '<button class="st-notif-mark-read" title="' + __("Mark as read") + '">&#9679;</button>'
          : '') +
      '</div>'
    );

    $item.find(".st-notif-mark-read").on("click", function (e) {
      e.stopPropagation();
      markOneRead(n.name, $item);
    });

    $item.on("click", function () {
      if (n.document_type && n.document_name) {
        frappe.set_route("Form", n.document_type, n.document_name);
      } else if (n.link) {
        frappe.utils.handle_url_raw(n.link);
      }
      closePanel();
    });

    return $item;
  }

  /* ── Load events (upcoming week) ── */
  function loadEvents() {
    showLoading(__("Loading events…"));
    var today = frappe.datetime.nowdate();
    var next7 = frappe.datetime.add_days(today, 7);
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Event",
        fields: ["name", "subject", "starts_on", "event_type"],
        filters: [["starts_on", ">=", today], ["starts_on", "<=", next7]],
        order_by: "starts_on asc",
        limit: 15,
      },
      callback: function (r) {
        var events = r.message || [];
        renderEvents(events);
      },
      error: function () {
        showEmpty(__("Could not load events"));
      },
    });
  }

  function renderEvents(events) {
    $list.empty();
    if (!events.length) {
      $list.html(
        '<div class="st-notif-empty">' +
          '<div class="st-notif-empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10.5h18"/></svg></div>' +
          __("No upcoming events this week") +
        '</div>'
      );
      return;
    }
    events.forEach(function (ev) {
      var dateStr = ev.starts_on
        ? frappe.datetime.str_to_user(ev.starts_on)
        : "";
      var $item = $(
        '<div class="st-notif-item read">' +
          '<div class="st-notif-avatar"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10.5h18"/></svg></div>' +
          '<div class="st-notif-body">' +
            '<div class="st-notif-subject">' + (ev.subject || "") + '</div>' +
            '<div class="st-notif-meta">' +
              (ev.event_type ? "<span class='st-notif-doctype'>" + ev.event_type + "</span>" : "") +
              '<span class="st-notif-time">' + dateStr + '</span>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
      $item.on("click", function () {
        if (ev.name) frappe.set_route("Form", "Event", ev.name);
        closePanel();
      });
      $list.append($item);
    });
  }

  /* ── Mark as read ── */
  function markOneRead(name, $el) {
    frappe.call({
      method: "frappe.desk.doctype.notification_log.notification_log.mark_as_read",
      args: { docname: name },
      callback: function () {
        $el.removeClass("unread").addClass("read");
        $el.find(".st-notif-mark-read").remove();
        if (notifCache) {
          var entry = notifCache.filter(function (x) { return x.name === name; })[0];
          if (entry) entry.read = 1;
          updateBadge(notifCache);
        }
      },
    });
  }

  function markAllRead() {
    frappe.call({
      method: "frappe.desk.doctype.notification_log.notification_log.mark_all_as_read",
      callback: function () {
        $list.find(".st-notif-item").removeClass("unread").addClass("read");
        $list.find(".st-notif-mark-read").remove();
        $badge.addClass("st-hidden");
        if (notifCache) notifCache.forEach(function (n) { n.read = 1; });
      },
    });
  }

  function markAllSeen() {
    try {
      frappe.call(
        "frappe.desk.doctype.notification_settings.notification_settings.set_seen_value",
        { value: 1, user: frappe.session.user }
      );
    } catch (e) { /* non-critical */ }
  }

  /* ── Badge ── */
  function updateBadge(items) {
    if (!$badge) return;
    var unread = items.filter(function (n) { return !n.read; }).length;
    if (unread > 0) {
      $badge.text(unread > 99 ? "99+" : unread).removeClass("st-hidden");
    } else {
      $badge.addClass("st-hidden");
    }
  }

  /* ── Realtime ── */
  function setupRealtime() {
    if (!frappe.realtime) return;
    frappe.realtime.on("notification", function () {
      if ($badge) $badge.text("!").removeClass("st-hidden");
      if ($panel && $panel.hasClass("open") && currentTab === "notifications") {
        loadNotifications();
      }
    });
    frappe.realtime.on("indicator_hide", function () {
      if (notifCache) updateBadge(notifCache);
      else if ($badge) $badge.addClass("st-hidden");
    });
  }

  /* ── Helpers ── */
  function showLoading(msg) {
    if ($list) $list.html('<div class="st-notif-loading">' + msg + '</div>');
  }

  function showEmpty(msg) {
    if ($list) $list.html('<div class="st-notif-empty">' + msg + '</div>');
  }

  /* ── Fetch unread count for badge (without opening panel) ── */
  function prefetchBadge() {
    if (!frappe.session || frappe.session.user === "Guest") return;
    frappe.call({
      method: "frappe.desk.doctype.notification_log.notification_log.get_notification_logs",
      args: { limit: MAX_ITEMS },
      type: "GET",
      callback: function (r) {
        var items = (r.message && r.message.notification_logs) || [];
        notifCache = items;
        updateBadge(items);
      },
    });
  }

  /* ── Init ── */
  function init() {
    if (!frappe.session || frappe.session.user === "Guest") return;

    waitForToolbar(function () {
      injectBell();
      buildPanel();
      setupRealtime();
      prefetchBadge();
    });
  }

  $(document).ready(function () {
    init();
    $(document).on("page-change", function () {
      if (!document.getElementById("st-notif-bell") &&
          document.getElementById("st-top-toolbar")) {
        injectBell();
      }
    });
  });
})();
