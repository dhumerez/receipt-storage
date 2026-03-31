# Phase 4: Product Catalog - Discussion Log

**Date:** 2026-03-31
**For human reference only — not consumed by downstream agents**

---

## Area: Quick-edit inline price

**Q: How should editing the price of a product work?**
Options: Click price cell → inline edit | Edit icon → mini popover | Full modal only
**Selected:** Click price cell → inline edit (cell becomes input, save on Enter/blur)

**Q: When editing price inline, how does the full edit modal get triggered?**
Options: Edit icon/button per row | Row click → full modal | Action menu per row
**Selected:** Edit icon/button per row (pencil icon opens full modal for all other fields)

---

## Area: Table columns & description

**Q: What columns should appear in the product list table?**
Options: Name, Price, Unit, Status | Name, Description, Price, Unit, Status
**Selected:** Name, Unit Price, Unit, Status + Edit icon. Description omitted from table (modal only).

---

## Area: Unit of measure input

**Q: How should the unit of measure field work in the create/edit form?**
Options: Free-text input | Dropdown with freeform fallback
**Selected:** Free-text input
**User note:** "since it is going to be just batteries, the unit will be just the number" — primary use case is simple count.
