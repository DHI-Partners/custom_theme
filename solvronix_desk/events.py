import frappe


# ── THEME SETTINGS REALTIME PROPAGATION ────────────────────────────────────────
def theme_settings_on_update(doc, method):
    """Broadcast theme change to all connected desk users instantly.
    No room/user specified → frappe uses get_site_room() → all desk users.
    after_commit=True → fires only after the DB transaction commits.
    On the master site the bench-wide theme is republished after commit too,
    so a rolled-back save never reaches the other sites.
    """
    try:
        frappe.db.after_commit.add(lambda: export_bench_theme(doc))
    except Exception:
        frappe.log_error("solvronix_desk: bench-wide theme export scheduling failed")

    try:
        frappe.publish_realtime(
            "st_theme_changed",
            {
                "refresh": 1,
                "branding": {
                    "company_name": doc.company_name or "",
                    "logo":         doc.logo         or "",
                    "favicon":      doc.favicon       or "",
                    "tagline":      doc.tagline       or "",
                },
            },
            room=frappe.local.site,
            after_commit=True,
        )
    except Exception:
        frappe.log_error("solvronix_desk: st_theme_changed realtime broadcast failed")
        # Never break Theme Settings persistence because a websocket is unavailable.
        pass


def export_bench_theme(doc):
    """Write the master site's theme for every site on the bench (no-op elsewhere)."""
    try:
        from solvronix_desk import theme_store
        theme_store.export(doc)
    except Exception:
        frappe.log_error("solvronix_desk: bench-wide theme export failed")
