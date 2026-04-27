import { QUERY_CATALOG, buildQuery } from './query-catalog';
import type { QueryExample } from './query-catalog';
import { queryLive } from './live-api';
import { queryLocal } from './local-data';
import { renderTable } from './render-table';

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Element #${id} not found`);
  }
  return element as T;
}

let activeExample: QueryExample | undefined;

const examplesContainer = getElement('examples');
const searchInput = getElement<HTMLInputElement>('search-input');
const searchBtn = getElement<HTMLButtonElement>('search-btn');

const statsLive = getElement('stats-live');
const statsLocal = getElement('stats-local');
const metaLive = getElement('meta-live');
const metaLocal = getElement('meta-local');
const bodyLive = getElement('body-live');
const bodyLocal = getElement('body-local');

function renderExamples(): void {
  examplesContainer.innerHTML = '';

  for (const example of QUERY_CATALOG) {
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
}

function showPanelLoading(body: HTMLElement, stats: HTMLElement, meta: HTMLElement): void {
  stats.textContent = '';
  meta.textContent = '';
  meta.classList.remove('panel-meta--visible');
  body.innerHTML = '<p class="panel-placeholder"><span class="spinner"></span>Querying...</p>';
}

function showPanelResults(
  body: HTMLElement,
  stats: HTMLElement,
  meta: HTMLElement,
  records: ReadonlyArray<Record<string, unknown>>,
  latencyMs: number,
  metaText?: string,
): void {
  stats.textContent = `${String(records.length)} records \u00b7 ${String(Math.round(latencyMs))} ms`;

  if (metaText !== undefined) {
    meta.textContent = metaText;
    meta.classList.add('panel-meta--visible');
  } else {
    meta.textContent = '';
    meta.classList.remove('panel-meta--visible');
  }

  if (records.length === 0) {
    body.innerHTML = '<p class="panel-placeholder">No results found.</p>';
    return;
  }

  body.innerHTML = '';
  body.appendChild(renderTable(records));
}

function showPanelError(body: HTMLElement, stats: HTMLElement, error: unknown): void {
  stats.textContent = '';
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  body.innerHTML = `<div class="panel-error">${escapeHtml(message)}</div>`;
}

async function runQuery(): Promise<void> {
  const input = searchInput.value.trim();
  if (input === '' || activeExample === undefined) {
    return;
  }

  searchBtn.disabled = true;

  const built = buildQuery(activeExample, input);

  showPanelLoading(bodyLive, statsLive, metaLive);
  showPanelLoading(bodyLocal, statsLocal, metaLocal);

  const livePromise = queryLive(activeExample.liveHandler, input)
    .then((result) => {
      showPanelResults(
        bodyLive,
        statsLive,
        metaLive,
        result.records,
        result.latencyMs,
        `via ${result.endpoint}`,
      );
    })
    .catch((error: unknown) => {
      showPanelError(bodyLive, statsLive, error);
    });

  const localPromise = queryLocal(built.sql, built.params)
    .then((result) => {
      showPanelResults(
        bodyLocal,
        statsLocal,
        metaLocal,
        result.records,
        result.latencyMs,
        built.sql,
      );
    })
    .catch((error: unknown) => {
      showPanelError(bodyLocal, statsLocal, error);
    });

  await Promise.all([livePromise, localPromise]);
  searchBtn.disabled = false;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

searchBtn.addEventListener('click', () => {
  void runQuery();
});

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    void runQuery();
  }
});

renderExamples();
