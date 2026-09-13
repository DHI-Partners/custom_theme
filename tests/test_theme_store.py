"""Unit coverage for the bench-wide theme published by the master site."""

import importlib
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
ISOLATED_MODULES = ("frappe", "solvronix_desk.theme_store", "solvronix_desk.theme_engine")


class FrappeStub(types.ModuleType):
    def throw(self, message):
        raise ValueError(message)


class FakeSettings:
    """Minimal stand-in for a Theme Settings doc; unset fields fall back to defaults."""

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


def load_store():
    previous = {name: sys.modules.get(name) for name in ISOLATED_MODULES}
    sys.modules["frappe"] = FrappeStub("frappe")
    sys.modules.pop("solvronix_desk.theme_store", None)
    sys.modules.pop("solvronix_desk.theme_engine", None)
    sys.path.insert(0, str(ROOT))
    try:
        return importlib.import_module("solvronix_desk.theme_store")
    finally:
        sys.path.remove(str(ROOT))
        for name, module in previous.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module


STORE = load_store()
FRAPPE = STORE.frappe
ENGINE = STORE.theme_engine


def studio(**config):
    return json.dumps(config)


class ThemeStoreTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.sites = Path(self.tmp.name)
        for site, db_name in (("master.localhost", "_master"), ("client.localhost", "_client")):
            (self.sites / site).mkdir()
            (self.sites / site / "site_config.json").write_text(json.dumps({"db_name": db_name}))
        (self.sites / "assets").mkdir()
        FRAPPE.local = types.SimpleNamespace(site="master.localhost", sites_path=str(self.sites))
        FRAPPE.conf = {"theme_master_site": "master.localhost"}
        FRAPPE.cache = mock.Mock()
        FRAPPE.log_error = mock.Mock()
        # A local (unshared) resolve walks user preference, company and role rules.
        FRAPPE.db = mock.Mock(**{"exists.return_value": False})
        FRAPPE.defaults = mock.Mock(**{"get_user_default.return_value": None})
        FRAPPE.get_roles = mock.Mock(return_value=[])
        STORE._cache.update(key=None, data=None)
        clock = mock.patch.object(ENGINE, "now_string", return_value="2026-09-13 12:00:00")
        clock.start()
        self.addCleanup(clock.stop)

    def tearDown(self):
        self.tmp.cleanup()

    def as_site(self, site):
        FRAPPE.local.site = site

    def test_nothing_is_shared_without_master_key_or_file(self):
        self.assertIsNone(STORE.read())
        FRAPPE.conf = {}
        self.assertTrue(STORE.path().startswith(str(self.sites)))
        self.assertIsNone(STORE.read())

    def test_master_export_reaches_every_site(self):
        self.assertTrue(STORE.export(FakeSettings(
            theme_studio_config=studio(brand_color="#112233"), theme_enabled=0,
        )))
        self.assertFalse(Path(STORE.path() + ".tmp").exists())

        self.as_site("client.localhost")
        shared = STORE.read()
        self.assertEqual(shared["config"]["brand_color"], "#112233")
        self.assertFalse(shared["enabled"])
        FRAPPE.cache.delete.assert_has_calls(
            [mock.call("_client|bootinfo"), mock.call("_master|bootinfo")], any_order=True
        )
        self.assertEqual(FRAPPE.cache.delete.call_count, 2)

    def test_other_sites_cannot_publish(self):
        self.as_site("client.localhost")
        self.assertFalse(STORE.export(FakeSettings(theme_studio_config=studio(brand_color="#112233"))))
        self.assertFalse(Path(STORE.path()).exists())
        FRAPPE.cache.delete.assert_not_called()

    def test_site_default_profile_is_exported_but_user_rules_are_not(self):
        settings = FakeSettings(theme_assignments=json.dumps({
            "default": "builtin-dark",
            "users": {"jane@example.com": "builtin-high-contrast"},
        }))
        STORE.export(settings)

        expected = ENGINE.resolve_profile_config(
            ENGINE.published_config(settings),
            ENGINE.profile_by_id(settings, "builtin-dark")["config"],
        )
        shared = STORE.read()["config"]
        self.assertEqual(shared["preferred_mode"], expected["preferred_mode"])
        self.assertEqual(shared["brand_color"], expected["brand_color"])
        self.assertFalse(shared["high_contrast"])

    def test_unreadable_or_malformed_file_is_ignored(self):
        path = Path(STORE.path())
        path.write_text("not json")
        self.assertIsNone(STORE.read())
        path.write_text(json.dumps({"config": []}))
        self.assertIsNone(STORE.read())

    def test_republish_replaces_the_cached_theme(self):
        STORE.export(FakeSettings(theme_studio_config=studio(brand_color="#112233")))
        self.assertEqual(STORE.read()["config"]["brand_color"], "#112233")
        STORE.export(FakeSettings(theme_studio_config=studio(brand_color="#445566")))
        self.assertEqual(STORE.read()["config"]["brand_color"], "#445566")

    def test_read_returns_a_private_copy(self):
        STORE.export(FakeSettings(theme_studio_config=studio(brand_color="#112233")))
        STORE.read()["config"]["brand_color"] = "#000000"
        self.assertEqual(STORE.read()["config"]["brand_color"], "#112233")

    def test_runtime_prefers_the_shared_theme(self):
        FRAPPE.get_single = mock.Mock(
            return_value=FakeSettings(theme_studio_config=studio(brand_color="#AABBCC"))
        )
        _settings, config, enabled, shared = STORE.runtime("jane@example.com")
        self.assertFalse(shared)
        self.assertTrue(enabled)
        self.assertEqual(config["brand_color"], "#AABBCC")

        STORE.export(FakeSettings(theme_studio_config=studio(brand_color="#112233")))
        _settings, config, _enabled, shared = STORE.runtime("jane@example.com")
        self.assertTrue(shared)
        self.assertEqual(config["brand_color"], "#112233")

    def test_cache_failure_does_not_block_publish(self):
        FRAPPE.cache.delete.side_effect = RuntimeError("redis down")
        self.assertTrue(STORE.export(FakeSettings(theme_studio_config=studio(brand_color="#112233"))))
        self.assertEqual(STORE.read()["config"]["brand_color"], "#112233")
        self.assertTrue(FRAPPE.log_error.called)


if __name__ == "__main__":
    unittest.main()
