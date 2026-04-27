function summarizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.map(summarizeValue);
    return items.length <= 3
      ? items.join('; ')
      : `${items.slice(0, 3).join('; ')} (+${items.length - 3})`;
  }
  const obj = value as Record<string, unknown>;
  if ('text' in obj && typeof obj['text'] === 'string') {
    return obj['text'];
  }
  if ('title' in obj && typeof obj['title'] === 'string') {
    return obj['title'];
  }
  if ('name' in obj && typeof obj['name'] === 'string') {
    return obj['name'];
  }
  if ('lastName' in obj) {
    const parts = [obj['foreName'], obj['lastName']].filter(Boolean);
    return parts.join(' ') || String(obj['collectiveName'] ?? '');
  }
  if ('year' in obj) {
    const parts = [obj['year'], obj['month'], obj['day']].filter(Boolean);
    return parts.join('-');
  }
  const keys = Object.keys(obj);
  const preview = keys
    .slice(0, 3)
    .map((key) => `${key}: ${summarizeValue(obj[key])}`)
    .join(', ');
  return keys.length > 3 ? `${preview} ...` : preview;
}

export function flattenRecord(record: unknown): Record<string, unknown> {
  if (typeof record !== 'object' || record === null) {
    return { value: record };
  }
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    flat[key] = summarizeValue(value);
  }
  return flat;
}
