# Chapter 11: UI Documentation

This document describes the design systems, UI components, states, and client interactions implemented in the React frontend of DevTrack 2.0.

---

## 11.1 Design System & Aesthetic Directives
DevTrack 2.0 uses a modern **Glassmorphic Dark UI Theme** with deep violet-blue gradients.
- **Color Palette**:
  - Primary Background: `#060814` (Deep space slate).
  - Component Container: `rgba(255, 255, 255, 0.03)` with standard CSS backdrop blur (`backdrop-blur-md`).
  - Board Border: `rgba(255, 255, 255, 0.06)`.
  - Accents: Violet (`rgb(139, 92, 246)`), Cyan (`rgb(34, 211, 238)`), Emerald (`rgb(16, 185, 129)`), Rose/Red (`rgb(244, 63, 94)`).
- **Typography**: Inter (Google Fonts) with strict letter-spacing mapping.

---

## 11.2 Core Components & Layouts

### 1. Interactive Drawer (Right Slide-out Panel)
- **Files**: Embedded directly inside dashboard pages (`developerDashboard.tsx`, `testerDashboard.tsx`, `crManagement.tsx`).
- **Features**: Smooth spring entry and exit animations powered by Framer Motion's `<AnimatePresence>`.
- **States**:
  - Empty: Displays "Select a Change Request to view detailed progress and transitions" in styled muted slate.
  - Active: Renders CR metadata, audit logs, screenshots (with download triggers), and contextual transition buttons.

### 2. Modals (Raise Bug & Bug Details)
- **RaiseBugModal**: Standard React modal overlay containing fields for Title, Severity dropdown, Reason, Steps to Reproduce, Expected Result, and Actual Result. Form inputs check for blank strings before submitting.
- **BugDetailModal**: View-only drawer details showing the complete bug lifecycle, severity indicator pill, and reporter comments.

---

## 11.3 Interactive Elements & States
- **Animations**:
  - Sidebar Hover: Muted scale increase and glow effect.
  - Cards: Soft translateY hover offset (`-4px`) and shadow transitions.
- **Loading States**: Uses pulse placeholders (Skeleton screens) and spinner SVGs.
- **Empty States**: Customized visual vector containers indicating "No tasks found" with styled descriptive subtexts.
- **Tooltips**: Dynamic native browser title attributes and customized text boxes detailing status definitions on hover.
