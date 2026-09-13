"""Runtime-side contracts that the separate Theme Studio app relies on."""

from pathlib import Path
import ast
import json
import sys
import types
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "solvronix_desk" / "api.py"
THEME_API = ROOT / "solvronix_desk" / "theme_api.py"
ENGINE = ROOT / "solvronix_desk" / "theme_engine.py"
HOOKS = ROOT / "solvronix_desk" / "hooks.py"
PATCHES = ROOT / "solvronix_desk" / "patches.txt"
SETTINGS = ROOT / "solvronix_desk" / "solvronix_desk" / "doctype" / "theme_settings" / "theme_settings.json"
SETTINGS_JS = SETTINGS.with_name("theme_settings.js")
PREFERENCE = ROOT / "solvronix_desk" / "solvronix_desk" / "doctype" / "theme_preference" / "theme_preference.json"
PAGE_DIR = ROOT / "solvronix_desk" / "solvronix_desk" / "page" / "theme_studio"
PALETTE_JS = ROOT / "solvronix_desk" / "public" / "js" / "command_palette.js"
DESK_CSS = ROOT / "solvronix_desk" / "public" / "css" / "solvronix_desk.css"
DESK_JS = ROOT / "solvronix_desk" / "public" / "js" / "solvronix_desk.js"
SIDEBAR_CSS = ROOT / "solvronix_desk" / "public" / "css" / "sidebar.css"
DARK_CSS = ROOT / "solvronix_desk" / "public" / "css" / "dark_mode.css"
BOOT = ROOT / "solvronix_desk" / "boot.py"


class ThemeRuntimeContractTest(unittest.TestCase):
    def test_chart_runtime_is_bootstrapped_after_theme_runtime(self):
        hooks = HOOKS.read_text(encoding="utf-8")
        theme_index = hooks.index("/assets/solvronix_desk/js/theme_runtime.js")
        chart_index = hooks.index("/assets/solvronix_desk/js/chart_runtime.js")

        self.assertGreater(chart_index, theme_index)
        self.assertRegex(hooks, r"chart_runtime\.js\?v=\d+")
        self.assertIn("bootinfo.st_chart_schema = chart_config.load_schema()", BOOT.read_text(encoding="utf-8"))

    def test_atomic_theme_runtime_refresh_includes_chart_schema(self):
        api = THEME_API.read_text(encoding="utf-8")
        runtime = (ROOT / "solvronix_desk" / "public" / "js" / "theme_runtime.js").read_text(encoding="utf-8")

        self.assertIn('"chart_schema": chart_config.load_schema()', api)
        self.assertIn("solvronixChartRuntime.setConfig(config, chartSchema)", runtime)
        self.assertIn("runtime.chart_schema", runtime)

    def test_studio_lives_in_its_own_app(self):
        hooks = HOOKS.read_text(encoding="utf-8")
        api = THEME_API.read_text(encoding="utf-8")

        self.assertFalse(PAGE_DIR.exists())
        self.assertNotIn("theme_studio.css", hooks)
        for endpoint in ("publish_theme_config", "save_theme_draft", "manage_theme_profile", "clear_theme_cache"):
            self.assertNotIn(f"def {endpoint}", api)
        self.assertNotIn("save_theme_config", API.read_text(encoding="utf-8"))
        self.assertIn("solvronix_desk.patches.remove_theme_studio_page", PATCHES.read_text(encoding="utf-8"))

    def test_studio_entry_points_require_the_studio_app(self):
        palette = PALETTE_JS.read_text(encoding="utf-8")
        settings_js = SETTINGS_JS.read_text(encoding="utf-8")

        self.assertIn("frappe.boot.versions.theme_studio", palette)
        self.assertIn("frappe.boot.versions.theme_studio", settings_js)
        self.assertIn("st_allow_raw_theme_settings", settings_js)
        self.assertIn('frappe.set_route("theme-studio")', settings_js)

    def test_workspace_api_failures_expose_non_sensitive_unavailable_flag(self):
        source = API.read_text(encoding="utf-8")
        tree = ast.parse(source)
        function = next(
            node for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name == "get_workspaces"
        )
        function.decorator_list = []
        namespace = {}
        fake_frappe = types.ModuleType("frappe")
        fake_frappe.log_error = lambda *args, **kwargs: None
        fake_desk = types.ModuleType("frappe.desk")
        fake_desktop = types.ModuleType("frappe.desk.desktop")
        fake_desk.desktop = fake_desktop
        namespace["frappe"] = fake_frappe
        modules = {
            "frappe": fake_frappe,
            "frappe.desk": fake_desk,
            "frappe.desk.desktop": fake_desktop,
        }
        with mock.patch.dict(sys.modules, modules):
            exec(
                compile(ast.Module(body=[function], type_ignores=[]), str(API), "exec"),
                namespace,
            )
            expected = {"pages": [], "private_pages": [], "unavailable": True}
            self.assertEqual(namespace["get_workspaces"](), expected)
            fake_desktop.get_workspaces = lambda: (_ for _ in ()).throw(
                RuntimeError("private detail")
            )
            self.assertEqual(namespace["get_workspaces"](), expected)

    def test_theme_settings_contain_visual_tokens(self):
        settings = json.loads(SETTINGS.read_text(encoding="utf-8"))
        fields = {field["fieldname"] for field in settings["fields"]}
        self.assertTrue(
            {
                "sidebar_background", "navbar_background", "page_background",
                "card_background", "text_color", "corner_radius", "shadow_style",
                "sidebar_width", "studio_layout",
            }.issubset(fields)
        )
        self.assertTrue(
            {
                "theme_enabled", "allow_user_theme", "theme_lock",
                "theme_studio_config", "theme_studio_draft", "theme_profiles",
                "theme_versions", "theme_assignments", "theme_schedule",
            }.issubset(fields)
        )
        preference = json.loads(PREFERENCE.read_text(encoding="utf-8"))
        self.assertEqual(preference["autoname"], "field:user")
        self.assertEqual(
            {field["fieldname"] for field in preference["fields"]},
            {"user", "theme_profile"},
        )

    def test_login_runtime_matches_public_login_structure(self):
        login_runtime = (
            ROOT / "solvronix_desk" / "public" / "js" / "login_theme.js"
        ).read_text(encoding="utf-8")
        self.assertIn("image.addEventListener('error'", login_runtime)
        self.assertIn("applyPreferredMode(branding.preferred_mode)", login_runtime)
        self.assertIn("normalizeCardGeometry()", login_runtime)
        self.assertIn("installCompanyLogo(head, branding)", login_runtime)
        self.assertIn("st-hide-powered", login_runtime)
        self.assertIn('"preferred_mode": config.get("preferred_mode")', API.read_text(encoding="utf-8"))
        self.assertIn('html[data-theme="dark"] .for-login .page-card', ENGINE.read_text(encoding="utf-8"))
        login_css = (ROOT / "solvronix_desk" / "public" / "css" / "login.css").read_text(encoding="utf-8")
        self.assertIn("box-sizing: border-box !important;", login_css)
        self.assertIn("width: 100% !important;", login_css)
        self.assertIn("overflow: hidden !important;", login_css)
        self.assertIn(".st-login-company-fallback", login_css)
        self.assertNotIn("Powered by Solvronix", login_css)

    def test_published_navigation_tokens_reach_actual_desk_selectors(self):
        engine = ENGINE.read_text(encoding="utf-8")
        desk_css = DESK_CSS.read_text(encoding="utf-8")
        sidebar_css = SIDEBAR_CSS.read_text(encoding="utf-8")
        dark_css = DARK_CSS.read_text(encoding="utf-8")
        self.assertIn('"--st-toolbar-bg": config["navbar_background"]', engine)
        self.assertIn('"--sidebar-width":', engine)
        self.assertIn("background: var(--st-toolbar-bg", desk_css)
        self.assertIn("var(--st-sidebar-width, var(--sidebar-width))", sidebar_css)
        self.assertIn("var(--st-sidebar-hover-text", sidebar_css)
        self.assertIn("var(--st-sidebar-icon", sidebar_css)
        self.assertIn(".btn.icon-btn .es-icon", desk_css)
        self.assertIn(".editor-js-container .ce-header .h4", desk_css)
        self.assertIn("var(--st-sidebar-bg, var(--fg-color, #fff))", dark_css)

    def test_assets_are_versioned(self):
        hooks = HOOKS.read_text(encoding="utf-8")
        self.assertIn("/assets/solvronix_desk/js/command_palette.js?v=10", hooks)
        self.assertIn("/assets/solvronix_desk/js/dark_mode.js?v=12", hooks)
        self.assertIn("/assets/solvronix_desk/js/solvronix_desk.js?v=64", hooks)
        self.assertIn("/assets/solvronix_desk/js/theme_runtime.js?v=8", hooks)
        self.assertIn("/assets/solvronix_desk/js/chart_runtime.js?v=4", hooks)
        self.assertIn("/assets/solvronix_desk/css/login.css?v=12", hooks)
        self.assertIn("/assets/solvronix_desk/js/login_theme.js?v=8", hooks)
        self.assertIn('"on_update": "solvronix_desk.events.theme_settings_on_update"', hooks)

    def test_runtime_surfaces_used_by_studio_exist(self):
        api = THEME_API.read_text(encoding="utf-8")
        engine = ENGINE.read_text(encoding="utf-8")
        self.assertIn("def get_resolved_theme_runtime", api)
        self.assertIn("HEX_COLOR.fullmatch", engine)
        self.assertIn("builtin-high-contrast", engine)
        self.assertIn("wcag_failures", engine)
        self.assertIn("custom_js", engine)
        self.assertIn("scoped_rules", engine)
        self.assertIn("def resolve_profile_id(", engine)
        for key in ("tagline", "enable_command_palette", "enable_smart_home"):
            self.assertIn(f'"{key}"', engine)
        desk_js = DESK_JS.read_text(encoding="utf-8")
        self.assertIn("change.st_theme_mode_bridge", desk_js)
        runtime = (ROOT / "solvronix_desk" / "public" / "js" / "theme_runtime.js").read_text(encoding="utf-8")
        self.assertIn("st-theme-runtime-refresh", runtime)
        self.assertIn("window.stApplyThemeCss", desk_js)
        self.assertIn("duplicate.remove()", desk_js)
        self.assertIn("if (config && Object.keys(config).length)", runtime)
        self.assertIn("runtime.preview", runtime)
        self.assertIn("if (!Array.isArray(route)) route = [];", runtime)


if __name__ == "__main__":
    unittest.main()
