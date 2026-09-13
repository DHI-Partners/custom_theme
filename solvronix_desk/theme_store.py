"""Bench-wide published theme: one site edits it, every site on the bench wears it.

The site named by ``theme_master_site`` in common_site_config.json exports its
resolved theme to ``sites/solvronix_theme.json`` whenever Theme Settings is
saved. Every site, the master included, then renders that file instead of its
own Theme Settings. Without the key or the file, sites keep their local theme.
"""

from copy import deepcopy
import json
import os

import frappe

from solvronix_desk import theme_engine

FILENAME = "solvronix_theme.json"
MASTER_KEY = "theme_master_site"

# Parsed file, keyed by its identity so a publish is picked up without a restart.
# export() swaps in a new file, so the inode changes even within one mtime tick.
_cache = {"key": None, "data": None}


def path():
    sites_path = getattr(frappe.local, "sites_path", None) or "."
    return os.path.join(os.path.abspath(sites_path), FILENAME)


def master_site():
    return str(frappe.conf.get(MASTER_KEY) or "")


def is_master():
    site = master_site()
    return bool(site) and site == getattr(frappe.local, "site", None)


# ── 1. READ ────────────────────────────────────────────────────────────────────
def read():
    """Return the shared theme as {"enabled", "config"}, or None when none is published."""
    if not master_site():
        return None
    file_path = path()
    try:
        stat = os.stat(file_path)
    except OSError:
        return None
    key = (file_path, stat.st_ino, stat.st_mtime_ns, stat.st_size)
    if _cache["key"] != key:
        try:
            with open(file_path, encoding="utf-8") as handle:
                raw = json.load(handle)
        except (OSError, ValueError):
            return None
        if not isinstance(raw, dict) or not isinstance(raw.get("config"), dict):
            return None
        _cache["key"] = key
        _cache["data"] = {
            "enabled": theme_engine.bool_value(raw.get("enabled", 1)),
            "config": theme_engine.sanitize_config(raw["config"], validate_contrast=False),
        }
    return deepcopy(_cache["data"])


def runtime(user=None):
    """Return (settings, config, enabled, shared) for rendering the current request."""
    settings = frappe.get_single("Theme Settings")
    shared = read()
    if shared:
        return settings, shared["config"], shared["enabled"], True
    return (
        settings,
        theme_engine.resolve_config(settings, user),
        theme_engine.bool_value(getattr(settings, "theme_enabled", 1)),
        False,
    )


# ── 2. EXPORT (MASTER SITE ONLY) ───────────────────────────────────────────────
def site_theme(settings):
    """The master's published theme. Stored user, role, company, default-profile
    and schedule rules are ignored: Theme Studio no longer edits them."""
    return theme_engine.published_config(settings)


def export(settings=None):
    """Publish the master's theme to every site on the bench. No-op on other sites."""
    if not is_master():
        return False
    settings = settings or frappe.get_single("Theme Settings")
    payload = {
        "site": frappe.local.site,
        "published_at": theme_engine.now_string(),
        "enabled": int(theme_engine.bool_value(getattr(settings, "theme_enabled", 1))),
        "config": site_theme(settings),
    }
    file_path = path()
    temp_path = file_path + ".tmp"
    with open(temp_path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=1, default=str)
    # Atomic swap: readers on other sites never see a half-written file.
    os.replace(temp_path, file_path)
    clear_boot_caches()
    return True


def clear_boot_caches():
    """Drop every site's cached bootinfo so the next Desk load boots the new theme."""
    sites_path = os.path.dirname(path())
    for site in sorted(os.listdir(sites_path)):
        try:
            with open(os.path.join(sites_path, site, "site_config.json"), encoding="utf-8") as handle:
                db_name = json.load(handle).get("db_name")
        except (OSError, ValueError, AttributeError):
            continue
        if not db_name:
            continue
        try:
            # Same key RedisWrapper.make_key builds for hset("bootinfo", user).
            frappe.cache.delete(f"{db_name}|bootinfo")
        except Exception:
            frappe.log_error(f"solvronix_desk: bootinfo cache clear failed for {site}")
