import { getExamplesForMode, buildQuery } from './query-catalog';
import type { QueryExample } from './query-catalog';
import { queryLive } from './live-api';
import { queryLocal } from './local-data';
import { renderTable } from './render-table';

type Mode = 'live' | 'local';

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Element #${id} not found`);
  }
  return element as T;
}

let currentMode: Mode = 'live';
let activeExample: QueryExample | undefined;

const modeTabs = document.querySelectorAll<HTMLButtonElement>('.mode-tab');
const examplesContainer = getElement('examples');
const searchInput = getElement<HTMLInputElement>('search-input');
const searchBtn = getElement<HTMLButtonElement>('search-btn');
const sqlPreview = getElement('sql-preview');
const resultsHeader = getElement('results-header');
const resultsBadge = getElement('results-badge');
const resultsStats = getElement('results-stats');
const resultsWrap = getElement('results-table-wrap');

function renderExamples(): void {
  examplesContainer.innerHTML = '';
  const examples = getExamplesForMode(currentMode);

  for (const example of examples) {
    const chip = document.createElement('button');
    chip.className = 'example-chip';
    chip.textContent = example.label;
    chip.addEventListener('click', () => selectExample(example, chip));
    examplesContainer.appendChild(chip);
  }
}

function selectExample(example: QueryExample, chip: HTMLButtonElement): void {
  for (const otherChip of examplesContainer.querySelectorAll<HTMLButtonElement>('.example-chip')) {
    otherChip.classList.remove('example-chip--active');
  }
  chip.classList.add('example-chip--active');

  activeExample = example;
  searchInput.placeholder = example.placeholder;
  searchInput.value = example.defaultInput;
  updateSqlPreview();
}

function updateSqlPreview(): void {
  if (currentMode === 'local' && activeExample !== undefined) {
    const built = buildQuery(activeExample, searchInput.value);
    if (built !== undefined) {
      sqlPreview.textContent = built.sql;
      sqlPreview.hidden = false;
      return;
    }
  }
  sqlPreview.hidden = true;
}

function showLoading(): void {
  resultsHeader.hidden = true;
  resultsWrap.innerHTML =
    '<p class="results-placeholder"><span class="spinner"></span>Querying...</p>';
}

function showError(error: unknown): void {
  console.error('Query error:', error);
  resultsHeader.hidden = true;
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  resultsWrap.innerHTML = `<div class="results-error">${escapeHtml(message)}</div>`;
}

function showResults(
  records: ReadonlyArray<Record<string, unknown>>,
  mode: Mode,
  latencyMs: number,
  extra?: string,
): void {
  resultsHeader.hidden = false;

  resultsBadge.className = `results-badge results-badge--${mode}`;
  resultsBadge.textContent = mode === 'live' ? 'From NCBI API' : 'From Local DuckDB';

  const parts = [`${records.length} records`, `${Math.round(latencyMs)} ms`];
  if (extra !== undefined) {
    parts.push(extra);
  }
  resultsStats.textContent = parts.join(' \u00b7 ');

  if (records.length === 0) {
    resultsWrap.innerHTML = '<p class="results-placeholder">No results found.</p>';
    return;
  }

  resultsWrap.innerHTML = '';
  resultsWrap.appendChild(renderTable(records));
}

async function runQuery(): Promise<void> {
  const input = searchInput.value.trim();
  if (input === '') {
    return;
  }

  searchBtn.disabled = true;
  showLoading();

  try {
    if (currentMode === 'live') {
      if (activeExample?.liveHandler === undefined) {
        throw new Error('Select a query type from the examples above');
      }
      const result = await queryLive(activeExample.liveHandler, input);
      showResults(result.records, 'live', result.latencyMs, result.endpoint);
    } else {
      const built = activeExample !== undefined ? buildQuery(activeExample, input) : undefined;
      if (built === undefined) {
        throw new Error('This query type is not available in local mode');
      }
      const result = await queryLocal(built.sql, built.params);
      showResults(result.records, 'local', result.latencyMs);
    }
  } catch (error) {
    showError(error);
  } finally {
    searchBtn.disabled = false;
  }
}

function switchMode(mode: Mode): void {
  currentMode = mode;
  activeExample = undefined;

  for (const tab of modeTabs) {
    tab.classList.toggle('mode-tab--active', tab.dataset['mode'] === mode);
  }

  searchInput.value = '';
  searchInput.placeholder =
    mode === 'live' ? 'Search PubMed for BRCA1...' : 'Enter a SQL query or select an example...';
  sqlPreview.hidden = true;
  resultsHeader.hidden = true;
  resultsWrap.innerHTML =
    '<p class="results-placeholder">Select an example or type a query to get started.</p>';

  renderExamples();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

for (const tab of modeTabs) {
  tab.addEventListener('click', () => {
    const mode = tab.dataset['mode'] as Mode;
    if (mode !== currentMode) {
      switchMode(mode);
    }
  });
}

searchBtn.addEventListener('click', () => {
  void runQuery();
});

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    void runQuery();
  }
});

searchInput.addEventListener('input', () => {
  updateSqlPreview();
});

renderExamples();
