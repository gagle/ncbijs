export function renderTable(records: ReadonlyArray<Record<string, unknown>>): HTMLTableElement {
  const table = document.createElement('table');
  table.className = 'results-table';

  const firstRecord = records[0];
  if (firstRecord === undefined) {
    return table;
  }

  const columns = Object.keys(firstRecord);

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const column of columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = column;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const record of records) {
    const row = document.createElement('tr');
    for (const column of columns) {
      const td = document.createElement('td');
      const value = record[column];
      td.textContent = value === null || value === undefined ? '' : String(value);
      td.title = td.textContent;
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  return table;
}
