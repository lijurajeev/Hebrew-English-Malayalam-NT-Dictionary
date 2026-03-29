/**
 * Hebrew-English-Malayalam NT Dictionary
 * Main Application Script
 *
 * Depends on: DICTIONARY_DATA (global array defined in js/data.js)
 * Requires: Font Awesome (for icons), app CSS
 *
 * Features:
 *  - Card rendering with virtual/infinite scroll
 *  - Full-text search with debounce
 *  - Book, part-of-speech, tag, and sort filters
 *  - Modal detail view with focus trap
 *  - Dark mode with localStorage persistence
 *  - Back-to-top button
 *  - Mobile nav menu
 *  - Scroll-triggered card animations
 *  - Keyboard shortcuts
 *  - Statistics bar
 *  - URL hash routing (#word/ID, #book/Matthew)
 *  - Hebrew alphabet pronunciation guide generation
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NT_BOOKS = [
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation'
];

const HEBREW_LETTERS = [
  { letter: 'א',  name: 'Aleph',  translit: "'",   pronunciation: '(silent)' },
  { letter: 'בּ', name: 'Bet',    translit: 'b',   pronunciation: 'as in "boy"' },
  { letter: 'ב',  name: 'Vet',    translit: 'v',   pronunciation: 'as in "vine"' },
  { letter: 'גּ', name: 'Gimel',  translit: 'g',   pronunciation: 'as in "go"' },
  { letter: 'דּ', name: 'Dalet',  translit: 'd',   pronunciation: 'as in "door"' },
  { letter: 'ה',  name: 'He',     translit: 'h',   pronunciation: 'as in "hat"' },
  { letter: 'ו',  name: 'Vav',    translit: 'v/w', pronunciation: 'as in "vine" / w' },
  { letter: 'ז',  name: 'Zayin',  translit: 'z',   pronunciation: 'as in "zoo"' },
  { letter: 'ח',  name: 'Chet',   translit: 'ch',  pronunciation: 'as in Scottish "loch"' },
  { letter: 'ט',  name: 'Tet',    translit: 't',   pronunciation: 'emphatic t' },
  { letter: 'י',  name: 'Yod',    translit: 'y',   pronunciation: 'as in "yes"' },
  { letter: 'כּ', name: 'Kaf',    translit: 'k',   pronunciation: 'as in "kite"' },
  { letter: 'כ',  name: 'Khaf',   translit: 'kh',  pronunciation: 'as in Scottish "loch"' },
  { letter: 'ל',  name: 'Lamed',  translit: 'l',   pronunciation: 'as in "love"' },
  { letter: 'מ',  name: 'Mem',    translit: 'm',   pronunciation: 'as in "mother"' },
  { letter: 'נ',  name: 'Nun',    translit: 'n',   pronunciation: 'as in "no"' },
  { letter: 'ס',  name: 'Samekh', translit: 's',   pronunciation: 'as in "sun"' },
  { letter: 'ע',  name: 'Ayin',   translit: "'",   pronunciation: 'guttural stop' },
  { letter: 'פּ', name: 'Pe',     translit: 'p',   pronunciation: 'as in "pray"' },
  { letter: 'פ',  name: 'Fe',     translit: 'f',   pronunciation: 'as in "faith"' },
  { letter: 'צ',  name: 'Tsade',  translit: 'ts',  pronunciation: 'as in "bits"' },
  { letter: 'ק',  name: 'Qof',    translit: 'q',   pronunciation: 'deep k' },
  { letter: 'ר',  name: 'Resh',   translit: 'r',   pronunciation: 'as in "run"' },
  { letter: 'שׁ', name: 'Shin',   translit: 'sh',  pronunciation: 'as in "shalom"' },
  { letter: 'שׂ', name: 'Sin',    translit: 's',   pronunciation: 'as in "sun"' },
  { letter: 'תּ', name: 'Tav',    translit: 't',   pronunciation: 'as in "truth"' },
];

const HEBREW_VOWELS = [
  { mark: 'ָ',  name: 'Qamats', translit: 'a', pronunciation: 'as in "father"' },
  { mark: 'ַ',  name: 'Patach', translit: 'a', pronunciation: 'as in "bat"' },
  { mark: 'ֵ',  name: 'Tsere',  translit: 'e', pronunciation: 'as in "they"' },
  { mark: 'ֶ',  name: 'Segol',  translit: 'e', pronunciation: 'as in "bed"' },
  { mark: 'ִ',  name: 'Hiriq',  translit: 'i', pronunciation: 'as in "machine"' },
  { mark: 'ֹ',  name: 'Holam',  translit: 'o', pronunciation: 'as in "go"' },
  { mark: 'ֻ',  name: 'Qubuts', translit: 'u', pronunciation: 'as in "flute"' },
  { mark: 'ְ',  name: 'Sheva',  translit: '',  pronunciation: 'quick neutral, or silent' },
];

/** Number of cards to render in the first batch and each subsequent batch. */
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Application State
// ---------------------------------------------------------------------------

const state = {
  /** Full dataset after sorting. */
  allData: [],
  /** Currently visible (filtered) entries. */
  filtered: [],
  /** How many cards have been rendered so far (for infinite scroll). */
  rendered: 0,
  /** Active search query string. */
  searchQuery: '',
  /** Active book filters (Set of strings). */
  activeBooks: new Set(),
  /** Active part-of-speech filter. */
  activePOS: '',
  /** Active tag filter. */
  activeTag: '',
  /** Active sort mode. */
  sortMode: 'appearance',
  /** Whether a modal is open. */
  modalOpen: false,
};

// ---------------------------------------------------------------------------
// Helper Utilities
// ---------------------------------------------------------------------------

/**
 * Creates a debounced version of a function.
 * @param {Function} fn - The function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Returns unique values from an array of objects by a given key.
 * Flattens one level when the value is an array.
 * @param {Array} arr
 * @param {string} key
 * @returns {string[]}
 */
function getUniqueValues(arr, key) {
  const set = new Set();
  arr.forEach(item => {
    const val = item[key];
    if (Array.isArray(val)) {
      val.forEach(v => v && set.add(v));
    } else if (val != null && val !== '') {
      set.add(val);
    }
  });
  return Array.from(set).sort();
}

/**
 * Smoothly scrolls to the top of the page.
 * @param {Element} [element] - Scroll target element; defaults to document.
 */
function smoothScrollTo(element) {
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ---------------------------------------------------------------------------
// DOM References (populated after DOMContentLoaded)
// ---------------------------------------------------------------------------

let dom = {};

function cacheDOMRefs() {
  dom = {
    grid:           document.getElementById('dictionary-grid'),
    searchInput:    document.getElementById('search-input'),
    posFilter:      document.getElementById('pos-filter'),
    tagFilter:      document.getElementById('tag-filter'),
    sortSelect:     document.getElementById('sort-select'),
    clearBtn:       document.getElementById('clear-filters'),
    wordCount:      document.getElementById('word-count'),
    bookFilters:    document.getElementById('book-filters'),
    modalOverlay:   document.getElementById('modal-overlay'),
    modalContent:   document.getElementById('modal-content'),
    modalClose:     document.getElementById('modal-close'),
    darkToggle:     document.getElementById('dark-mode-toggle'),
    backToTop:      document.getElementById('back-to-top'),
    navToggle:      document.getElementById('nav-toggle'),
    navbar:         document.getElementById('navbar'),
    loadingMore:    document.getElementById('loading-more'),
    statTotal:      document.getElementById('stat-total'),
    statBooks:      document.getElementById('stat-books'),
    statCategories: document.getElementById('stat-categories'),
    pronounceTable: document.getElementById('pronunciation-table'),
    vowelTable:     document.getElementById('vowel-table'),
  };
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function renderStatistics() {
  if (!DICTIONARY_DATA || !DICTIONARY_DATA.length) return;

  const total      = DICTIONARY_DATA.length;
  const books      = getUniqueValues(DICTIONARY_DATA, 'firstBook').length;
  const allTags    = [];
  DICTIONARY_DATA.forEach(e => { if (Array.isArray(e.tags)) allTags.push(...e.tags); });
  const categories = new Set(allTags).size;

  if (dom.statTotal)      dom.statTotal.textContent      = total.toLocaleString();
  if (dom.statBooks)      dom.statBooks.textContent      = books.toLocaleString();
  if (dom.statCategories) dom.statCategories.textContent = categories.toLocaleString();
}

// ---------------------------------------------------------------------------
// Book Filter Pills
// ---------------------------------------------------------------------------

function renderBookPills() {
  if (!dom.bookFilters) return;

  const fragment = document.createDocumentFragment();
  NT_BOOKS.forEach(book => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'book-pill';
    pill.dataset.book = book;
    pill.textContent = book;
    pill.setAttribute('aria-pressed', 'false');
    pill.addEventListener('click', () => toggleBookFilter(book, pill));
    fragment.appendChild(pill);
  });
  dom.bookFilters.appendChild(fragment);
}

function toggleBookFilter(book, pillEl) {
  if (state.activeBooks.has(book)) {
    state.activeBooks.delete(book);
    pillEl.classList.remove('active');
    pillEl.setAttribute('aria-pressed', 'false');
  } else {
    state.activeBooks.add(book);
    pillEl.classList.add('active');
    pillEl.setAttribute('aria-pressed', 'true');
  }
  applyFilters();
  updateURLHash();
}

// ---------------------------------------------------------------------------
// Tag Filter Dropdown
// ---------------------------------------------------------------------------

function populateTagFilter() {
  if (!dom.tagFilter || !DICTIONARY_DATA) return;

  const tags = getUniqueValues(DICTIONARY_DATA, 'tags');
  const fragment = document.createDocumentFragment();

  // "All" option already in HTML; add dynamic options
  tags.forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
    fragment.appendChild(option);
  });
  dom.tagFilter.appendChild(fragment);
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

function sortData(arr) {
  const copy = arr.slice();
  switch (state.sortMode) {
    case 'hebrew':
      copy.sort((a, b) => (a.hebrew || '').localeCompare(b.hebrew || '', 'he'));
      break;
    case 'english':
      copy.sort((a, b) => {
        const ea = (a.meanings && a.meanings[0] && a.meanings[0].en) ? a.meanings[0].en : '';
        const eb = (b.meanings && b.meanings[0] && b.meanings[0].en) ? b.meanings[0].en : '';
        return ea.localeCompare(eb, 'en', { sensitivity: 'base' });
      });
      break;
    case 'appearance':
    default:
      copy.sort((a, b) => (a.id || 0) - (b.id || 0));
      break;
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Search & Filter Logic
// ---------------------------------------------------------------------------

function matchesSearch(entry, query) {
  if (!query) return true;
  const q = query.toLowerCase();

  if (entry.hebrew && entry.hebrew.includes(query)) return true;
  if (entry.transliteration && entry.transliteration.toLowerCase().includes(q)) return true;
  if (entry.mlMeaning && entry.mlMeaning.includes(query)) return true;

  if (Array.isArray(entry.meanings)) {
    for (const m of entry.meanings) {
      if (m.en && m.en.toLowerCase().includes(q)) return true;
      if (m.ml && m.ml.includes(query)) return true;
    }
  }

  if (Array.isArray(entry.tags)) {
    for (const t of entry.tags) {
      if (t.toLowerCase().includes(q)) return true;
    }
  }

  return false;
}

function applyFilters() {
  let result = state.allData.slice();

  // Search
  if (state.searchQuery) {
    result = result.filter(e => matchesSearch(e, state.searchQuery));
  }

  // Book filter
  if (state.activeBooks.size > 0) {
    result = result.filter(e => state.activeBooks.has(e.firstBook));
  }

  // Part of speech
  if (state.activePOS) {
    const pos = state.activePOS.toLowerCase();
    result = result.filter(e => e.partOfSpeech && e.partOfSpeech.toLowerCase() === pos);
  }

  // Tag
  if (state.activeTag) {
    result = result.filter(e => Array.isArray(e.tags) && e.tags.includes(state.activeTag));
  }

  // Sort
  result = sortData(result);

  state.filtered = result;
  state.rendered  = 0;
  renderCards();
}

// ---------------------------------------------------------------------------
// Card DOM Builder
// ---------------------------------------------------------------------------

function buildCardElement(entry, index) {
  const card = document.createElement('div');
  card.className = 'word-card';
  card.dataset.id = entry.id;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View details for ${escapeHtml(entry.transliteration || entry.hebrew)}`);
  // Staggered animation delay
  card.style.setProperty('--card-index', index % BATCH_SIZE);

  // Meanings
  const firstMeaning = (entry.meanings && entry.meanings[0]) || {};
  const enText = firstMeaning.en  || '';
  const mlText = firstMeaning.ml  || '';

  // Tags
  const tagPills = Array.isArray(entry.tags)
    ? entry.tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')
    : '';

  card.innerHTML = `
    <div class="card-header">
      <span class="card-pos">${escapeHtml(entry.partOfSpeech || '')}</span>
      <span class="card-ref"><i class="fas fa-book-open" aria-hidden="true"></i> ${escapeHtml(entry.firstRef || '')}</span>
    </div>
    <div class="card-hebrew" lang="he" dir="rtl">${escapeHtml(entry.hebrew || '')}</div>
    <div class="card-transliteration">${escapeHtml(entry.transliteration || '')}</div>
    <div class="card-pronunciation">/${escapeHtml(entry.pronunciation || '')}/</div>
    <div class="card-divider"></div>
    <div class="card-meanings">
      <div class="meaning-en"><strong>English:</strong> ${escapeHtml(enText)}</div>
      <div class="card-malayalam"><strong>മലയാളം:</strong> ${escapeHtml(mlText)}</div>
      <div class="card-ml-meaning">${escapeHtml(entry.mlMeaning || '')}</div>
    </div>
    <div class="card-tags">${tagPills}</div>
  `;

  // Event listeners
  card.addEventListener('click', () => openModal(entry));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(entry);
    }
  });

  return card;
}

// ---------------------------------------------------------------------------
// Render Cards (with infinite scroll batching)
// ---------------------------------------------------------------------------

function renderCards(append = false) {
  if (!dom.grid) return;

  if (!append) {
    dom.grid.innerHTML = '';
    state.rendered = 0;
  }

  const batch = state.filtered.slice(state.rendered, state.rendered + BATCH_SIZE);
  const fragment = document.createDocumentFragment();

  batch.forEach((entry, i) => {
    const card = buildCardElement(entry, state.rendered + i);
    fragment.appendChild(card);
  });

  dom.grid.appendChild(fragment);
  state.rendered += batch.length;

  // Re-observe new cards for scroll animations
  observeCards();

  // Update count display
  updateWordCount();

  // Show/hide loading indicator
  if (dom.loadingMore) {
    dom.loadingMore.style.display = state.rendered < state.filtered.length ? 'block' : 'none';
  }
}

function updateWordCount() {
  if (!dom.wordCount) return;
  const total = (DICTIONARY_DATA && DICTIONARY_DATA.length) || 0;
  dom.wordCount.textContent = `Showing ${state.filtered.length.toLocaleString()} of ${total.toLocaleString()} words`;
}

// ---------------------------------------------------------------------------
// Infinite Scroll
// ---------------------------------------------------------------------------

let scrollObserver = null;

function setupInfiniteScroll() {
  if (scrollObserver) scrollObserver.disconnect();

  const sentinel = document.getElementById('scroll-sentinel');
  if (!sentinel) return;

  scrollObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && state.rendered < state.filtered.length) {
        renderCards(true);
      }
    });
  }, { rootMargin: '200px' });

  scrollObserver.observe(sentinel);
}

// ---------------------------------------------------------------------------
// Scroll Animations (IntersectionObserver)
// ---------------------------------------------------------------------------

let animationObserver = null;

function setupAnimationObserver() {
  animationObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        animationObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
}

function observeCards() {
  if (!animationObserver || !dom.grid) return;
  dom.grid.querySelectorAll('.word-card:not(.animate-in)').forEach(card => {
    animationObserver.observe(card);
  });
}

// ---------------------------------------------------------------------------
// Skeleton Loading
// ---------------------------------------------------------------------------

function showSkeletons(count = 12) {
  if (!dom.grid) return;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'word-card skeleton-card';
    sk.setAttribute('aria-hidden', 'true');
    sk.innerHTML = `
      <div class="skeleton-line skeleton-line--short"></div>
      <div class="skeleton-line skeleton-line--hebrew"></div>
      <div class="skeleton-line skeleton-line--medium"></div>
      <div class="skeleton-line skeleton-line--long"></div>
      <div class="skeleton-line skeleton-line--long"></div>
    `;
    fragment.appendChild(sk);
  }
  dom.grid.innerHTML = '';
  dom.grid.appendChild(fragment);
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

/** Previously focused element — restored when modal closes. */
let modalPreviousFocus = null;

/** All focusable elements inside the modal (refreshed on open). */
function getFocusableModalElements() {
  if (!dom.modalContent) return [];
  return Array.from(
    dom.modalContent.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  );
}

function openModal(entry) {
  if (!dom.modalOverlay || !dom.modalContent) return;

  modalPreviousFocus = document.activeElement;
  state.modalOpen = true;

  // Build all meanings rows
  const meaningsHTML = Array.isArray(entry.meanings)
    ? entry.meanings.map(m => `
        <div class="modal-meaning-row">
          <div class="modal-meaning-en"><strong>English:</strong> ${escapeHtml(m.en || '')}</div>
          <div class="modal-meaning-ml"><strong>മലയാളം:</strong> ${escapeHtml(m.ml || '')}</div>
        </div>
      `).join('')
    : '';

  const tagsHTML = Array.isArray(entry.tags)
    ? entry.tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')
    : '';

  dom.modalContent.innerHTML = `
    <button id="modal-close" class="modal-close" aria-label="Close modal">
      <i class="fas fa-times" aria-hidden="true"></i>
    </button>

    <div class="modal-hebrew" lang="he" dir="rtl">${escapeHtml(entry.hebrew || '')}</div>
    <div class="modal-translit">${escapeHtml(entry.transliteration || '')}</div>
    <div class="modal-pronunciation">/${escapeHtml(entry.pronunciation || '')}/</div>
    <span class="modal-pos-badge">${escapeHtml(entry.partOfSpeech || '')}</span>

    <div class="modal-divider"></div>

    <section class="modal-section">
      <h3 class="modal-section-title">Meanings</h3>
      ${meaningsHTML}
    </section>

    ${entry.mlMeaning ? `
    <section class="modal-section">
      <h3 class="modal-section-title">Malayalam Explanation</h3>
      <p class="modal-ml-meaning">${escapeHtml(entry.mlMeaning)}</p>
    </section>` : ''}

    <section class="modal-section">
      <h3 class="modal-section-title">First Occurrence</h3>
      <p class="modal-ref">
        <i class="fas fa-book-open" aria-hidden="true"></i>
        <strong>${escapeHtml(entry.firstBook || '')}</strong> &mdash; ${escapeHtml(entry.firstRef || '')}
      </p>
    </section>

    ${tagsHTML ? `
    <section class="modal-section">
      <h3 class="modal-section-title">Thematic Tags</h3>
      <div class="modal-tags">${tagsHTML}</div>
    </section>` : ''}

    <section class="modal-section modal-pronunc-guide">
      <h3 class="modal-section-title">Pronunciation Guide</h3>
      <p class="modal-pronunc-note">
        The pronunciation is written in uppercase syllables separated by hyphens.
        The <strong>capitalised syllable</strong> receives the primary stress.
        Vowels follow English approximations: <em>AH</em> = "father",
        <em>EH</em> = "bed", <em>EE</em> = "machine",
        <em>OH</em> = "go", <em>OO</em> = "flute".
        <em>KH</em> is a guttural sound as in the Scottish word "loch".
        The apostrophe <em>'</em> marks a brief glottal stop or silent letter.
      </p>
    </section>
  `;

  // Re-cache close button (was just created)
  dom.modalClose = document.getElementById('modal-close');
  dom.modalClose.addEventListener('click', closeModal);

  dom.modalOverlay.classList.add('open');
  document.body.classList.add('modal-open');
  dom.modalOverlay.setAttribute('aria-hidden', 'false');

  // Focus the close button
  dom.modalClose.focus();

  // Update URL hash
  history.replaceState(null, '', `#word/${entry.id}`);
}

function closeModal() {
  if (!dom.modalOverlay) return;
  state.modalOpen = false;
  dom.modalOverlay.classList.remove('open');
  document.body.classList.remove('modal-open');
  dom.modalOverlay.setAttribute('aria-hidden', 'true');

  // Restore focus
  if (modalPreviousFocus) {
    modalPreviousFocus.focus();
    modalPreviousFocus = null;
  }

  // Clear word hash if present
  if (window.location.hash.startsWith('#word/')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

/** Trap keyboard focus inside the modal. */
function handleModalKeyboard(e) {
  if (!state.modalOpen) return;

  if (e.key === 'Escape') {
    closeModal();
    return;
  }

  if (e.key === 'Tab') {
    const focusable = getFocusableModalElements();
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Dark Mode
// ---------------------------------------------------------------------------

function loadDarkModePreference() {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'true') {
    document.body.classList.add('dark-mode');
    updateDarkToggleIcon(true);
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDark);
  updateDarkToggleIcon(isDark);
}

function updateDarkToggleIcon(isDark) {
  if (!dom.darkToggle) return;
  const icon = dom.darkToggle.querySelector('i');
  if (!icon) return;
  if (isDark) {
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
    dom.darkToggle.setAttribute('aria-label', 'Switch to light mode');
  } else {
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
    dom.darkToggle.setAttribute('aria-label', 'Switch to dark mode');
  }
}

// ---------------------------------------------------------------------------
// Back to Top Button
// ---------------------------------------------------------------------------

function setupBackToTop() {
  if (!dom.backToTop) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      dom.backToTop.classList.add('visible');
    } else {
      dom.backToTop.classList.remove('visible');
    }
  }, { passive: true });

  dom.backToTop.addEventListener('click', () => smoothScrollTo());
}

// ---------------------------------------------------------------------------
// Mobile Menu
// ---------------------------------------------------------------------------

function setupMobileMenu() {
  if (!dom.navToggle || !dom.navbar) return;

  dom.navToggle.addEventListener('click', e => {
    e.stopPropagation();
    dom.navbar.classList.toggle('nav-open');
    const isOpen = dom.navbar.classList.contains('nav-open');
    dom.navToggle.setAttribute('aria-expanded', isOpen);
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (dom.navbar.classList.contains('nav-open') && !dom.navbar.contains(e.target)) {
      dom.navbar.classList.remove('nav-open');
      dom.navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on nav link click
  dom.navbar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      dom.navbar.classList.remove('nav-open');
      dom.navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ---------------------------------------------------------------------------
// Pronunciation Guide Tables
// ---------------------------------------------------------------------------

function renderPronunciationGuide() {
  if (dom.pronounceTable) {
    const fragment = document.createDocumentFragment();

    HEBREW_LETTERS.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="pronunc-letter" lang="he" dir="rtl">${escapeHtml(row.letter)}</td>
        <td class="pronunc-name">${escapeHtml(row.name)}</td>
        <td class="pronunc-translit"><em>${escapeHtml(row.translit)}</em></td>
        <td class="pronunc-desc">${escapeHtml(row.pronunciation)}</td>
      `;
      fragment.appendChild(tr);
    });

    // Insert rows after any existing thead
    const tbody = dom.pronounceTable.querySelector('tbody') || dom.pronounceTable;
    tbody.appendChild(fragment);
  }

  if (dom.vowelTable) {
    const fragment = document.createDocumentFragment();

    HEBREW_VOWELS.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="pronunc-letter" lang="he" dir="rtl">${escapeHtml(row.mark)}</td>
        <td class="pronunc-name">${escapeHtml(row.name)}</td>
        <td class="pronunc-translit"><em>${escapeHtml(row.translit || '—')}</em></td>
        <td class="pronunc-desc">${escapeHtml(row.pronunciation)}</td>
      `;
      fragment.appendChild(tr);
    });

    const tbody = dom.vowelTable.querySelector('tbody') || dom.vowelTable;
    tbody.appendChild(fragment);
  }
}

// ---------------------------------------------------------------------------
// Keyboard Shortcuts
// ---------------------------------------------------------------------------

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // "/" focuses search (unless already in an input)
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (dom.searchInput) dom.searchInput.focus();
      return;
    }

    // Escape closes modal
    if (e.key === 'Escape' && state.modalOpen) {
      closeModal();
      return;
    }

    // Arrow key navigation between focused cards
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft' ||
         e.key === 'ArrowDown'  || e.key === 'ArrowUp') &&
        document.activeElement.classList.contains('word-card')) {
      e.preventDefault();
      navigateCards(e.key);
    }
  });

  // Also handle modal focus trap
  document.addEventListener('keydown', handleModalKeyboard);
}

function navigateCards(key) {
  const cards = Array.from(dom.grid.querySelectorAll('.word-card'));
  const current = cards.indexOf(document.activeElement);
  if (current === -1) return;

  let next = current;
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    next = Math.min(current + 1, cards.length - 1);
  } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
    next = Math.max(current - 1, 0);
  }

  if (next !== current) cards[next].focus();
}

// ---------------------------------------------------------------------------
// URL Hash Routing
// ---------------------------------------------------------------------------

function updateURLHash() {
  const books = Array.from(state.activeBooks);
  if (books.length === 1) {
    history.replaceState(null, '', `#book/${encodeURIComponent(books[0])}`);
  } else if (!state.modalOpen) {
    // Clear book hash if multiple or none selected
    if (window.location.hash.startsWith('#book/') ||
        window.location.hash.startsWith('#word/')) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }
}

function handleInitialHash() {
  const hash = window.location.hash;
  if (!hash) return;

  if (hash.startsWith('#word/')) {
    const id = parseInt(hash.slice(6), 10);
    if (!isNaN(id)) {
      const entry = DICTIONARY_DATA.find(e => e.id === id);
      if (entry) {
        // Small delay so the grid is rendered first
        requestAnimationFrame(() => openModal(entry));
      }
    }
  } else if (hash.startsWith('#book/')) {
    const book = decodeURIComponent(hash.slice(6));
    if (NT_BOOKS.includes(book)) {
      state.activeBooks.add(book);
      // Activate the corresponding pill
      if (dom.bookFilters) {
        const pill = dom.bookFilters.querySelector(`[data-book="${CSS.escape(book)}"]`);
        if (pill) {
          pill.classList.add('active');
          pill.setAttribute('aria-pressed', 'true');
        }
      }
      applyFilters();
    }
  }
}

// ---------------------------------------------------------------------------
// Clear Filters
// ---------------------------------------------------------------------------

function clearAllFilters() {
  state.searchQuery = '';
  state.activeBooks.clear();
  state.activePOS   = '';
  state.activeTag   = '';
  state.sortMode    = 'appearance';

  if (dom.searchInput) dom.searchInput.value = '';
  if (dom.posFilter)   dom.posFilter.value   = '';
  if (dom.tagFilter)   dom.tagFilter.value   = '';
  if (dom.sortSelect)  dom.sortSelect.value  = 'appearance';

  // Deactivate all book pills
  if (dom.bookFilters) {
    dom.bookFilters.querySelectorAll('.book-pill').forEach(p => {
      p.classList.remove('active');
      p.setAttribute('aria-pressed', 'false');
    });
  }

  history.replaceState(null, '', window.location.pathname);
  applyFilters();
}

// ---------------------------------------------------------------------------
// Event Listeners Setup
// ---------------------------------------------------------------------------

function setupEventListeners() {
  // Search with debounce
  if (dom.searchInput) {
    dom.searchInput.addEventListener('input', debounce(e => {
      state.searchQuery = e.target.value.trim();
      applyFilters();
    }, 300));
  }

  // Part-of-speech filter
  if (dom.posFilter) {
    dom.posFilter.addEventListener('change', e => {
      state.activePOS = e.target.value;
      applyFilters();
    });
  }

  // Tag filter
  if (dom.tagFilter) {
    dom.tagFilter.addEventListener('change', e => {
      state.activeTag = e.target.value;
      applyFilters();
    });
  }

  // Sort
  if (dom.sortSelect) {
    dom.sortSelect.addEventListener('change', e => {
      state.sortMode = e.target.value;
      applyFilters();
    });
  }

  // Clear filters
  if (dom.clearBtn) {
    dom.clearBtn.addEventListener('click', clearAllFilters);
  }

  // Modal overlay background click to close
  if (dom.modalOverlay) {
    dom.modalOverlay.addEventListener('click', e => {
      if (e.target === dom.modalOverlay) closeModal();
    });
    dom.modalOverlay.setAttribute('aria-hidden', 'true');
  }

  // Dark mode toggle
  if (dom.darkToggle) {
    dom.darkToggle.addEventListener('click', toggleDarkMode);
  }
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Validate data availability
  if (typeof DICTIONARY_DATA === 'undefined' || !Array.isArray(DICTIONARY_DATA)) {
    console.error('[app.js] DICTIONARY_DATA is not defined. Make sure js/data.js is loaded before app.js.');
    return;
  }

  // Cache DOM refs
  cacheDOMRefs();

  // Load dark mode preference first (before any rendering) to avoid flash
  loadDarkModePreference();

  // Show skeleton placeholders while we set up
  showSkeletons(12);

  // Build initial sorted dataset
  state.allData = sortData(DICTIONARY_DATA.slice());
  state.filtered = state.allData.slice();

  // Setup UI components
  renderBookPills();
  populateTagFilter();
  renderStatistics();
  renderPronunciationGuide();

  // Setup observers
  setupAnimationObserver();

  // Setup event listeners
  setupEventListeners();
  setupBackToTop();
  setupMobileMenu();
  setupKeyboardShortcuts();

  // Render cards (replaces skeletons)
  // Use a short rAF delay to let the skeleton paint first for a visible effect
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderCards();
      setupInfiniteScroll();

      // Handle initial URL hash after grid is ready
      handleInitialHash();
    });
  });
});
