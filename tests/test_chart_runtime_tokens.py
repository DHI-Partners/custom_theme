"""Static contract for the chart tokens the Desk runtime CSS consumes."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ChartRuntimeTokensTest(unittest.TestCase):
    def test_chart_runtime_tokens_are_scoped_and_reduced_motion_safe(self):
        desk_css = (ROOT / "solvronix_desk" / "public" / "css" / "solvronix_desk.css").read_text(encoding="utf-8")
        dark_css = (ROOT / "solvronix_desk" / "public" / "css" / "dark_mode.css").read_text(encoding="utf-8")

        for token in (
            "--st-chart-surface",
            "--st-chart-axis",
            "--st-chart-grid",
            "--st-chart-legend",
            "--st-chart-tooltip-bg",
            "--st-chart-line-width",
            "--st-chart-bar-radius",
        ):
            self.assertIn(token, desk_css)
        self.assertIn('[data-st-chart-id]', desk_css)
        self.assertIn(".dataset-7", desk_css)
        self.assertIn('[data-st-chart-type="line"] .line-graph-path', desk_css)
        self.assertIn("prefers-reduced-motion: reduce", desk_css)
        self.assertIn("--st-chart-surface", dark_css)


if __name__ == "__main__":
    unittest.main()
