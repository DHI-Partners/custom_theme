import frappe


def execute():
    """Theme Studio moved to its own app; drop the page record this app used to own.

    Sites with the theme_studio app keep their page: it belongs to that app's module.
    """
    if frappe.db.get_value("Page", "theme-studio", "module") == "Solvronix Desk":
        frappe.delete_doc("Page", "theme-studio", force=True, ignore_permissions=True)
