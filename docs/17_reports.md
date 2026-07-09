# Chapter 17: Reports

This document covers the reporting subsystem, data export formats, calculation formulas, and table columns available in DevTrack 2.0.

---

## 17.1 Reporting Inventory

### 1. Developer Productivity Report
- **Purpose**: Tracks developers' efforts, sprint closures, and bug resolution rates.
- **Columns**: Developer Name, Tasks Assigned, Tasks Closed, Open Bugs, Avg Bug Resolution Time.
- **Data Source**: Joint query on `tasks`, `bugs`, and `users` tables.
- **Filters**: Sprint ID, Date Range.

### 2. Testing & Quality Metrics Report
- **Purpose**: Evaluates defect density, testing coverage, and duration.
- **Columns**: Task Jtrack ID, Title, Tester, Testing Started, Testing Completed, Duration (hours), Total Bugs Raised, Retests Count.
- **Data Source**: `tasks` table and `bugs` table.
- **Calculations**:
  $$\text{Testing Duration} = \text{testingCompletedDate} - \text{testingStartedDate}$$
  $$\text{Defect Leakage Ratio} = \frac{\text{Bugs Raised in Production}}{\text{Total Bugs Raised in UAT}}$$

### 3. Audit & Security Report
- **Purpose**: Details authentication activity and high-impact administrative actions.
- **Columns**: Timestamp, Operator, Action, Target Entity, Old Value, New Value, System IP/Browser.
- **Data Source**: `audit_logs` table.

---

## 17.2 Export Formats & Generation
Reports can be exported in two formats on the frontend client:
1. **Excel/CSV Export**: Extracts raw datasets, formats tabular grids, and outputs downloads via JavaScript file writers.
2. **PDF Report Export**: Formats the DOM table with responsive styling, prints layout onto a high-resolution canvas using `html2canvas`, and bundles it into standard multipage `.pdf` documents using `jspdf`.
