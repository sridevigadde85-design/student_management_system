# Student Ledger

A frontend-only Student Management System built with plain HTML, CSS, and JavaScript. No frameworks, no backend, no database — all student records persist in the browser's Local Storage.

The design is themed around a physical academic register: a **Ledger** (light mode) styled after ruled ledger paper and report cards, and a **Chalkboard** (dark mode) as its nighttime counterpart. Student status is shown as a rotated ink-stamp badge (Active / Probation / Graduated), echoing real transcript stamps.

## Features

- **Dashboard** — total students, active count, department count, and average marks, plus a department breakdown and recently-added list.
- **Student Registration** — add new students with full validation.
- **Student List** — a register table (card layout on mobile) of every student.
- **Student Details** — a report-card style view of a single student's full record.
- **Edit / Delete** — update or remove any record, with a confirmation dialog before deletion.
- **Search** — by name or roll number.
- **Filter** — by department and by year.
- **Sort** — by name (A–Z / Z–A) or marks (high–low / low–high).
- **Dark mode** — a persisted Chalkboard theme, toggled from the sidebar.
- **Form validation** — every field is validated with inline error messages.
- **Toast notifications** — feedback for save, update, and delete actions.
- **Empty state & loading animation** — shown when there are no records or while the register is "loading".
- **Responsive design** — desktop, tablet, and mobile layouts (table becomes stacked cards on small screens).
- **Accessibility** — semantic HTML, ARIA roles for tabs/dialogs, visible focus states, keyboard navigation (arrow keys move between tabs, Escape closes modals), reduced-motion support.

## Folder Structure

```
student_managment_system/
├── index.html                 # App shell: all views, modals, and markup
├── assests/
│   ├── css/
│   │   └── style.css          # Design tokens, themes, layout, components
│   ├── js/
│   │   └── script.js          # Storage layer, rendering, validation, events
│   └── images/                # (reserved for future image assets)
├── planning/
│   └── plan.md                # Original project brief
├── .claude/
│   └── CLAUDE.md              # Project instructions for Claude Code
├── README.MD
└── .gitignore
```

## Installation

No build step or dependencies are required.

1. Clone or download this repository.
2. Open `index.html` directly in a browser, **or** serve the folder with any static file server (recommended, so relative paths and fonts resolve identically to production):
   ```
   npx serve .
   ```

## Usage

1. Open the app — the **Dashboard** shows an overview of the student register.
2. Go to **Register** to add a new student. All fields are required and validated on submit.
3. Go to **Students** to search, filter, sort, and browse the full list.
4. Click any row's **View** button (or the row itself) to open the student's report card.
5. From the report card, use **Edit Record** or **Delete Record** (delete asks for confirmation first).
6. Toggle **Chalkboard mode** in the sidebar to switch themes; the choice is remembered on your next visit.

All data is stored under these Local Storage keys: `sms_students`, `sms_theme`, `sms_nextRoll`.

## Screenshots

_Add screenshots here after your first run, e.g.:_

- `docs/dashboard.png`
- `docs/student-list.png`
- `docs/report-card.png`
- `docs/dark-mode.png`

## Deployment (GitHub Pages)

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Select the `main` branch and the `/ (root)` folder, then save.
5. GitHub Pages will publish at `https://<your-username>.github.io/<repo-name>/`.

All asset paths in `index.html` are relative (`assests/css/style.css`, `assests/js/script.js`), so no path changes are needed for Pages to work from a repository subpath.

## Future Improvements

- Export the student register to CSV.
- Bulk import students from a CSV file.
- Pagination for large student registers.
- Per-department analytics charts on the dashboard.
- Undo option after deleting a record.
