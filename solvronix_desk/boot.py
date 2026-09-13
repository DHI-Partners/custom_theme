import frappe


def add_boot_data(bootinfo):
    """Populate all Solvronix first-paint data in Frappe's shared boot payload."""

    # ── 1. ROUTING ─────────────────────────────────────────────────────────────
    try:
        from solvronix_desk import theme_store
        shared = theme_store.read()
        smart_home = (
            shared["config"].get("enable_smart_home", 1) if shared
            else frappe.db.get_single_value("Theme Settings", "enable_smart_home")
        )
        if smart_home:
            bootinfo.home_page = "smart-home"
    except Exception:
        frappe.log_error("solvronix_desk: boot home_page check failed")
        pass

    # ── 2. RESOLVED THEME / BRANDING ───────────────────────────────────────────
    # Boot transport avoids extra API calls and visible first-paint theme shifts.
    # A bench-wide theme (theme_store) replaces this site's own Theme Settings, so
    # local fields are only consulted while nothing is published bench-wide.
    try:
        from solvronix_desk import chart_config, theme_engine, theme_store
        s, config, enabled, shared = theme_store.runtime(frappe.session.user)

        def local(field, default=None):
            return default if shared else getattr(s, field, default)

        bootinfo.st_brand  = config["brand_color"]
        bootinfo.st_accent = config["accent_color"]
        bootinfo.st_dark_mode_default = int(
            config.get("preferred_mode") == "Dark" if shared else (s.dark_mode_default or 0)
        )

        # ── 3. PERSONALIZATION DEFAULTS ─────────────────────────────────────────
        # Per-user localStorage overrides still win client-side.
        theme_mode = config.get("preferred_mode") or local("default_theme_mode") or ""
        if not theme_mode:
            # legacy fallback: old "Start in Dark Mode" checkbox
            theme_mode = "Dark" if local("dark_mode_default") else "Light"
        bootinfo.st_theme_mode_default = theme_mode.lower()          # light | dark | auto
        bootinfo.st_density_default    = (config.get("density") or local("default_density") or "Comfortable").lower()
        from solvronix_desk.api import FONT_SIZE_CSS
        bootinfo.st_font_size_default  = f'{config.get("base_font_px", 14)}px'
        bootinfo.st_branding = {
            "company_name": config.get("app_title") or local("company_name") or "",
            "logo":         config.get("company_logo") or local("logo") or "",
            "favicon":      config.get("favicon") or local("favicon") or "",
            "tagline":      config.get("tagline") or "",
        }
        bootinfo.st_theme_config = config
        bootinfo.st_chart_schema = chart_config.load_schema()
        # Profiles, per-user choice and schedules are this site's own rules. A
        # bench-wide theme is fixed, so they are switched off while one is published.
        if shared:
            bootinfo.st_theme_profiles = []
            bootinfo.st_theme_flags = {"enabled": int(enabled), "allow_user_theme": 0, "locked": 1}
            bootinfo.st_theme_schedule = {"enabled": False}
            bootinfo.st_active_theme_profile = ""
        else:
            bootinfo.st_theme_profiles = [
                {"id": p["id"], "name": p["name"], "builtin": p["builtin"]}
                for p in theme_engine.profiles(s)
            ]
            bootinfo.st_theme_flags = {
                "enabled": int(enabled),
                "allow_user_theme": int(getattr(s, "allow_user_theme", 1)),
                "locked": int(getattr(s, "theme_lock", 0)),
            }
            bootinfo.st_theme_schedule = theme_engine.schedule(s)
            active_profile = theme_engine.resolved_profile(s, frappe.session.user)
            bootinfo.st_active_theme_profile = active_profile["id"] if active_profile else ""
        # Feature flags must preserve an explicit zero; ``or 1`` would silently
        # re-enable a feature that an administrator switched off in Theme Studio.
        bootinfo.enable_command_palette = int(
            config.get("enable_command_palette", 1) if shared else getattr(s, "enable_command_palette", 1)
        )
        bootinfo.enable_smart_home = int(
            config.get("enable_smart_home", 1) if shared else getattr(s, "enable_smart_home", 1)
        )
    except Exception:
        # Fail soft: Desk must remain usable even if settings are mid-migration.
        frappe.log_error("solvronix_desk: boot data failed")
        bootinfo.st_brand  = "#1B3F7E"
        bootinfo.st_accent = "#F57C00"
        bootinfo.st_dark_mode_default = 0
        bootinfo.st_theme_mode_default = "light"
        bootinfo.st_density_default = "comfortable"
        bootinfo.st_font_size_default = "100%"
        bootinfo.st_branding = {}
        bootinfo.st_theme_config = {}
        bootinfo.st_chart_schema = {"version": 1, "groups": {}}
        bootinfo.st_theme_profiles = []
        bootinfo.st_theme_flags = {"enabled": 1, "allow_user_theme": 0, "locked": 1}
        bootinfo.st_theme_schedule = {"enabled": False}
        bootinfo.enable_command_palette = 1
        bootinfo.enable_smart_home = 1
        bootinfo.st_active_theme_profile = ""
