"""Whitelisted runtime API: the resolved theme and per-user profile choice.

The editor endpoints live in the separate Theme Studio app (theme_studio.api).
"""

import frappe

from solvronix_desk import chart_config, theme_engine, theme_store


# ── 1. PER-USER PROFILE PREFERENCE ─────────────────────────────────────────────
# User choice is allowed only when site policy is unlocked and opt-in is enabled.
@frappe.whitelist()
def set_user_theme_profile(profile_id):
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw("Not permitted")
    if theme_store.read():
        frappe.throw("Theme selection is locked by an administrator")
    settings = frappe.get_single("Theme Settings")
    if getattr(settings, "theme_lock", 0) or not getattr(settings, "allow_user_theme", 1):
        frappe.throw("Theme selection is locked by an administrator")
    name = frappe.db.get_value("Theme Preference", {"user": user}, "name")
    if not profile_id:
        if name:
            frappe.delete_doc("Theme Preference", name, ignore_permissions=True)
    elif not theme_engine.profile_by_id(settings, profile_id):
        frappe.throw("Theme profile not found")
    elif name:
        frappe.db.set_value("Theme Preference", name, "theme_profile", profile_id)
    else:
        doc = frappe.get_doc(
            {"doctype": "Theme Preference", "user": user, "theme_profile": profile_id}
        )
        doc.flags.ignore_permissions = True
        doc.insert()
    frappe.clear_cache(user=user)
    selected = theme_engine.resolve_config(settings, user)
    return {
        "ok": True,
        "css": theme_engine.render_css(
            selected, bool(getattr(settings, "theme_enabled", 1))
        ),
        "config": selected,
        "preferred_mode": selected["preferred_mode"],
        "active_profile": theme_engine.resolve_profile_id(settings, user),
        "schedule": theme_engine.schedule(settings),
        "chart_schema": chart_config.load_schema(),
    }


# ── 2. RESOLVED RUNTIME ────────────────────────────────────────────────────────
@frappe.whitelist()
def get_resolved_theme_runtime():
    """Return the currently resolved profile for live schedule/user updates."""
    user = getattr(frappe.session, "user", None)
    settings, config, enabled, shared = theme_store.runtime(user)
    if shared:
        # A bench-wide theme is fixed: no profiles to pick and nothing scheduled.
        return {
            "css": theme_engine.render_css(config, enabled),
            "config": config,
            "preferred_mode": config["preferred_mode"],
            "active_profile": "",
            "schedule": {"enabled": False},
            "chart_schema": chart_config.load_schema(),
            "profiles": [],
            "flags": {"enabled": int(enabled), "allow_user_theme": 0, "locked": 1},
        }
    profile_list = [
        {"id": profile["id"], "name": profile["name"], "builtin": profile["builtin"]}
        for profile in theme_engine.profiles(settings)
    ]
    return {
        "css": theme_engine.render_css(
            config, bool(getattr(settings, "theme_enabled", 1))
        ),
        "config": config,
        "preferred_mode": config["preferred_mode"],
        "active_profile": theme_engine.resolve_profile_id(settings, user),
        "schedule": theme_engine.schedule(settings),
        "chart_schema": chart_config.load_schema(),
        "profiles": profile_list,
        "flags": {
            "enabled": int(getattr(settings, "theme_enabled", 1)),
            "allow_user_theme": int(getattr(settings, "allow_user_theme", 1)),
            "locked": int(getattr(settings, "theme_lock", 0)),
        },
    }
