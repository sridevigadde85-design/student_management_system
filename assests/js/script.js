'use strict';

/**
 * Student Ledger — Student Management System
 * Frontend-only. Data persists in Local Storage.
 */
(() => {
  const STORAGE_KEY = 'sms_students';
  const THEME_KEY = 'sms_theme';
  const ROLL_KEY = 'sms_nextRoll';

  const DEPARTMENTS = {
    CSE: 'Computer Science',
    ECE: 'Electronics & Communication',
    EEE: 'Electrical & Electronics',
    MECH: 'Mechanical',
    CIVIL: 'Civil',
    IT: 'Information Technology',
  };

  const YEAR_LABELS = { 1: 'Year 1', 2: 'Year 2', 3: 'Year 3', 4: 'Year 4' };

  // ---------------------------------------------------------------------
  // Storage layer
  // ---------------------------------------------------------------------
  const Storage = {
    getStudents() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error('Could not read students from Local Storage.', err);
        return [];
      }
    },
    saveStudents(list) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (err) {
        console.error('Could not save students to Local Storage.', err);
        showToast('Could not save. Local Storage may be full.', 'error');
      }
    },
    nextRoll() {
      let n = parseInt(localStorage.getItem(ROLL_KEY), 10);
      if (Number.isNaN(n)) n = 0;
      n += 1;
      localStorage.setItem(ROLL_KEY, String(n));
      return String(n).padStart(4, '0');
    },
    getStoredTheme() {
      return localStorage.getItem(THEME_KEY);
    },
    setStoredTheme(theme) {
      localStorage.setItem(THEME_KEY, theme);
    },
  };

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  let students = Storage.getStudents();
  let editingId = null;
  let pendingDeleteId = null;
  let lastFocusedElement = null;

  // ---------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------
  const el = (id) => document.getElementById(id);

  const tabs = Array.from(document.querySelectorAll('.tab'));
  const views = Array.from(document.querySelectorAll('.view'));
  const topbarSubtitle = el('topbar-subtitle');

  const statTotal = el('stat-total');
  const statActive = el('stat-active');
  const statDepartments = el('stat-departments');
  const statAvgMarks = el('stat-avg-marks');
  const deptBreakdown = el('dept-breakdown');
  const recentList = el('recent-list');

  const form = el('student-form');
  const formModeLabel = el('form-mode-label');
  const formSubmitBtn = el('form-submit-btn');
  const formCancelBtn = el('form-cancel-btn');
  const studentIdField = el('student-id');

  const FORM_FIELDS = ['fullName', 'department', 'year', 'gender', 'email', 'phone', 'marks', 'address'];

  const searchInput = el('search-input');
  const filterDepartment = el('filter-department');
  const filterYear = el('filter-year');
  const sortBy = el('sort-by');

  const loadingIndicator = el('loading-indicator');
  const emptyState = el('empty-state');
  const registerTableWrap = document.querySelector('.register-table-wrap');
  const registerTbody = el('register-tbody');

  const detailOverlay = el('detail-overlay');
  const detailClose = el('detail-close');
  const detailName = el('detail-name');
  const detailStatus = el('detail-status');
  const detailMeta = el('detail-meta');
  const detailEmail = el('detail-email');
  const detailPhone = el('detail-phone');
  const detailGender = el('detail-gender');
  const detailAddress = el('detail-address');
  const detailAdded = el('detail-added');
  const detailUpdated = el('detail-updated');
  const detailEditBtn = el('detail-edit-btn');
  const detailDeleteBtn = el('detail-delete-btn');

  const confirmOverlay = el('confirm-overlay');
  const confirmBody = el('confirm-body');
  const confirmYesBtn = el('confirm-yes-btn');
  const confirmNoBtn = el('confirm-no-btn');

  const toastContainer = el('toast-container');
  const themeToggleBtn = el('theme-toggle');
  const themeToggleLabel = themeToggleBtn.querySelector('.theme-toggle-label');

  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------
  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const deptLabel = (code) => (DEPARTMENTS[code] ? `${DEPARTMENTS[code]} (${code})` : code);

  // ---------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------
  const validators = {
    fullName: (v) => (v.trim().length >= 2 ? '' : "Enter the student's full name."),
    department: (v) => (v ? '' : 'Select a department.'),
    year: (v) => (v ? '' : 'Select a year.'),
    gender: (v) => (v ? '' : 'Select a gender.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email address.'),
    phone: (v) => (/^\d{10}$/.test(v) ? '' : 'Enter a 10-digit phone number.'),
    marks: (v) => (v !== '' && Number(v) >= 0 && Number(v) <= 100 ? '' : 'Enter marks between 0 and 100.'),
    address: (v) => (v.trim().length >= 5 ? '' : 'Enter a complete address.'),
  };

  function validateForm() {
    let isValid = true;
    FORM_FIELDS.forEach((name) => {
      const field = el(name);
      const errorEl = el(`err-${name}`);
      const message = validators[name](field.value.trim());
      const wrapper = field.closest('.field');
      if (message) {
        isValid = false;
        wrapper.classList.add('has-error');
        errorEl.textContent = message;
      } else {
        wrapper.classList.remove('has-error');
        errorEl.textContent = '';
      }
    });
    return isValid;
  }

  function clearFormErrors() {
    FORM_FIELDS.forEach((name) => {
      const errorEl = el(`err-${name}`);
      el(name).closest('.field').classList.remove('has-error');
      errorEl.textContent = '';
    });
  }

  // ---------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------
  function getFormData() {
    return {
      fullName: el('fullName').value.trim(),
      department: el('department').value,
      year: Number(el('year').value),
      gender: el('gender').value,
      email: el('email').value.trim(),
      phone: el('phone').value.trim(),
      marks: Number(el('marks').value),
      status: el('status').value,
      address: el('address').value.trim(),
    };
  }

  function addStudent(data) {
    const now = new Date().toISOString();
    const student = { id: Storage.nextRoll(), ...data, dateAdded: now, lastUpdated: now };
    students.push(student);
    Storage.saveStudents(students);
    return student;
  }

  function updateStudent(id, data) {
    const idx = students.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    students[idx] = { ...students[idx], ...data, lastUpdated: new Date().toISOString() };
    Storage.saveStudents(students);
    return students[idx];
  }

  function deleteStudent(id) {
    students = students.filter((s) => s.id !== id);
    Storage.saveStudents(students);
  }

  // ---------------------------------------------------------------------
  // Form: reset / populate
  // ---------------------------------------------------------------------
  function resetForm() {
    form.reset();
    clearFormErrors();
    studentIdField.value = '';
    editingId = null;
    formModeLabel.textContent = 'New Entry';
    formSubmitBtn.textContent = 'Save Entry';
    el('status').value = 'Active';
  }

  function populateFormForEdit(student) {
    clearFormErrors();
    studentIdField.value = student.id;
    el('fullName').value = student.fullName;
    el('department').value = student.department;
    el('year').value = student.year;
    el('gender').value = student.gender;
    el('email').value = student.email;
    el('phone').value = student.phone;
    el('marks').value = student.marks;
    el('status').value = student.status;
    el('address').value = student.address;
    editingId = student.id;
    formModeLabel.textContent = `Editing Roll #${student.id}`;
    formSubmitBtn.textContent = 'Update Entry';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }
    const data = getFormData();
    if (editingId) {
      updateStudent(editingId, data);
      showToast('Student record updated.', 'success');
    } else {
      addStudent(data);
      showToast('Student registered.', 'success');
    }
    resetForm();
    renderAll();
    switchView('students');
  });

  formCancelBtn.addEventListener('click', () => {
    resetForm();
  });

  // ---------------------------------------------------------------------
  // Filtering / sorting
  // ---------------------------------------------------------------------
  function getFilteredSortedStudents() {
    const query = searchInput.value.trim().toLowerCase();
    const dept = filterDepartment.value;
    const year = filterYear.value;

    let list = students.filter((s) => {
      const matchesQuery =
        !query || s.fullName.toLowerCase().includes(query) || s.id.toLowerCase().includes(query);
      const matchesDept = !dept || s.department === dept;
      const matchesYear = !year || String(s.year) === year;
      return matchesQuery && matchesDept && matchesYear;
    });

    const [key, dir] = sortBy.value.split('-');
    list = list.slice().sort((a, b) => {
      if (key === 'name') {
        return dir === 'asc' ? a.fullName.localeCompare(b.fullName) : b.fullName.localeCompare(a.fullName);
      }
      if (key === 'marks') {
        return dir === 'asc' ? a.marks - b.marks : b.marks - a.marks;
      }
      return 0;
    });

    return list;
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------
  function renderDashboard() {
    const total = students.length;
    const active = students.filter((s) => s.status === 'Active').length;
    const deptCounts = {};
    students.forEach((s) => {
      deptCounts[s.department] = (deptCounts[s.department] || 0) + 1;
    });
    const deptTotal = Object.keys(deptCounts).length;
    const avgMarks = total ? (students.reduce((sum, s) => sum + s.marks, 0) / total).toFixed(1) : '0.0';

    statTotal.textContent = String(total);
    statActive.textContent = String(active);
    statDepartments.textContent = String(deptTotal);
    statAvgMarks.textContent = avgMarks;

    if (deptTotal === 0) {
      deptBreakdown.innerHTML = '<li class="empty-msg">No entries yet.</li>';
    } else {
      deptBreakdown.innerHTML = Object.entries(deptCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => `<li><span>${escapeHtml(deptLabel(code))}</span><span>${count}</span></li>`)
        .join('');
    }

    if (total === 0) {
      recentList.innerHTML = '<li class="empty-msg">No students registered yet.</li>';
    } else {
      recentList.innerHTML = students
        .slice()
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        .slice(0, 5)
        .map((s) => `<li><span>${escapeHtml(s.fullName)}</span><span>#${escapeHtml(s.id)}</span></li>`)
        .join('');
    }
  }

  function renderStudentsTable() {
    const list = getFilteredSortedStudents();

    if (list.length === 0) {
      registerTableWrap.hidden = true;
      emptyState.hidden = false;
      registerTbody.innerHTML = '';
      return;
    }

    emptyState.hidden = true;
    registerTableWrap.hidden = false;

    registerTbody.innerHTML = list
      .map(
        (s) => `
      <tr data-id="${escapeHtml(s.id)}" tabindex="0" aria-label="View record for ${escapeHtml(s.fullName)}">
        <td data-label="Roll #" class="cell-roll">${escapeHtml(s.id)}</td>
        <td data-label="Name">${escapeHtml(s.fullName)}</td>
        <td data-label="Department">${escapeHtml(s.department)}</td>
        <td data-label="Year">${YEAR_LABELS[s.year] || s.year}</td>
        <td data-label="Marks" class="cell-marks">${s.marks}</td>
        <td data-label="Status"><span class="stamp" data-status="${escapeHtml(s.status)}">${escapeHtml(s.status)}</span></td>
        <td data-label="Actions" class="row-actions">
          <button type="button" class="btn btn--small btn--ghost" data-action="view" data-id="${escapeHtml(s.id)}">View</button>
        </td>
      </tr>`
      )
      .join('');
  }

  function renderAll() {
    renderDashboard();
    renderStudentsTable();
  }

  // ---------------------------------------------------------------------
  // Loading animation (initial fetch simulation)
  // ---------------------------------------------------------------------
  function loadStudentsWithAnimation() {
    loadingIndicator.hidden = false;
    registerTableWrap.hidden = true;
    emptyState.hidden = true;
    window.setTimeout(() => {
      loadingIndicator.hidden = true;
      renderAll();
    }, 450);
  }

  // ---------------------------------------------------------------------
  // Toasts
  // ---------------------------------------------------------------------
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    toastContainer.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  // ---------------------------------------------------------------------
  // Focus trap helper for modals
  // ---------------------------------------------------------------------
  function trapFocus(container, event) {
    if (event.key !== 'Tab') return;
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // ---------------------------------------------------------------------
  // Detail (report card) modal
  // ---------------------------------------------------------------------
  function openDetail(id) {
    const student = students.find((s) => s.id === id);
    if (!student) return;
    lastFocusedElement = document.activeElement;

    detailName.textContent = student.fullName;
    detailStatus.textContent = student.status;
    detailStatus.setAttribute('data-status', student.status);
    detailMeta.textContent = `Roll #${student.id} · ${deptLabel(student.department)} · ${YEAR_LABELS[student.year] || student.year} · Marks ${student.marks}/100`;
    detailEmail.textContent = student.email;
    detailPhone.textContent = student.phone;
    detailGender.textContent = student.gender;
    detailAddress.textContent = student.address;
    detailAdded.textContent = formatDate(student.dateAdded);
    detailUpdated.textContent = formatDate(student.lastUpdated);
    detailEditBtn.dataset.id = student.id;
    detailDeleteBtn.dataset.id = student.id;

    detailOverlay.hidden = false;
    detailClose.focus();
  }

  function closeDetail() {
    detailOverlay.hidden = true;
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  detailClose.addEventListener('click', closeDetail);
  detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) closeDetail();
  });
  detailOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
    trapFocus(detailOverlay.querySelector('.report-card'), e);
  });

  detailEditBtn.addEventListener('click', () => {
    const student = students.find((s) => s.id === detailEditBtn.dataset.id);
    if (!student) return;
    closeDetail();
    populateFormForEdit(student);
    switchView('register');
    el('fullName').focus();
  });

  detailDeleteBtn.addEventListener('click', () => {
    const id = detailDeleteBtn.dataset.id;
    closeDetail();
    openConfirmDelete(id);
  });

  // ---------------------------------------------------------------------
  // Confirm dialog
  // ---------------------------------------------------------------------
  function openConfirmDelete(id) {
    const student = students.find((s) => s.id === id);
    if (!student) return;
    pendingDeleteId = id;
    lastFocusedElement = document.activeElement;
    confirmBody.textContent = `This will permanently remove ${student.fullName}'s (Roll #${student.id}) record.`;
    confirmOverlay.hidden = false;
    confirmNoBtn.focus();
  }

  function closeConfirm() {
    confirmOverlay.hidden = true;
    pendingDeleteId = null;
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  confirmYesBtn.addEventListener('click', () => {
    if (!pendingDeleteId) return;
    deleteStudent(pendingDeleteId);
    showToast('Student record deleted.', 'success');
    closeConfirm();
    renderAll();
  });
  confirmNoBtn.addEventListener('click', closeConfirm);
  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) closeConfirm();
  });
  confirmOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeConfirm();
    trapFocus(confirmOverlay.querySelector('.confirm-dialog'), e);
  });

  // ---------------------------------------------------------------------
  // Student list interactions
  // ---------------------------------------------------------------------
  registerTbody.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('[data-action="view"]');
    if (viewBtn) {
      openDetail(viewBtn.dataset.id);
      return;
    }
    const row = e.target.closest('tr[data-id]');
    if (row) openDetail(row.dataset.id);
  });

  registerTbody.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('tr[data-id]');
    if (row) {
      e.preventDefault();
      openDetail(row.dataset.id);
    }
  });

  [searchInput, filterDepartment, filterYear, sortBy].forEach((input) => {
    input.addEventListener('input', renderStudentsTable);
    input.addEventListener('change', renderStudentsTable);
  });

  // ---------------------------------------------------------------------
  // Theme (Ledger / Chalkboard)
  // ---------------------------------------------------------------------
  function getEffectiveTheme() {
    const stored = Storage.getStoredTheme();
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function updateThemeToggleUI() {
    const effective = getEffectiveTheme();
    themeToggleBtn.setAttribute('aria-pressed', String(effective === 'dark'));
    themeToggleLabel.textContent = effective === 'dark' ? 'Ledger mode' : 'Chalkboard mode';
  }

  function applyStoredThemeAttr() {
    const stored = Storage.getStoredTheme();
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    updateThemeToggleUI();
  }

  themeToggleBtn.addEventListener('click', () => {
    const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
    Storage.setStoredTheme(next);
    applyStoredThemeAttr();
  });

  // ---------------------------------------------------------------------
  // Navigation (binder tabs)
  // ---------------------------------------------------------------------
  function switchView(viewName) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.view === viewName;
      tab.setAttribute('aria-selected', String(isActive));
    });
    views.forEach((view) => {
      view.classList.toggle('is-active', view.id === `view-${viewName}`);
    });

    const subtitles = {
      dashboard: 'A running register of every student on record.',
      register: 'Add a new entry or amend an existing one.',
      students: 'Search, filter, and manage the full student register.',
    };
    topbarSubtitle.textContent = subtitles[viewName] || '';

    if (viewName === 'students') renderStudentsTable();
    if (viewName === 'dashboard') renderDashboard();
  }

  function activateTab(tab) {
    if (tab.dataset.view === 'register') resetForm();
    switchView(tab.dataset.view);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab));
  });

  // Roving keyboard navigation across tabs (ARIA tabs pattern)
  const tabNav = document.querySelector('.tab-nav');
  tabNav.addEventListener('keydown', (e) => {
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;
    let nextIndex = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') nextIndex = 0;
    if (e.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = tabs[nextIndex];
      nextTab.focus();
      activateTab(nextTab);
    }
  });

  // ---------------------------------------------------------------------
  // Global Escape handling (in case modal-specific listeners miss focus)
  // ---------------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!confirmOverlay.hidden) closeConfirm();
    else if (!detailOverlay.hidden) closeDetail();
  });

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  function init() {
    applyStoredThemeAttr();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!Storage.getStoredTheme()) updateThemeToggleUI();
    });
    resetForm();
    renderDashboard();
    loadStudentsWithAnimation();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
