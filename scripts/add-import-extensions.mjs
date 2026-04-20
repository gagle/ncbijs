#!/usr/bin/env node

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const IMPORT_SPECIFIER_RE =
  /((?:from|import\()\s*['"])([^'"]+?)(['"])/g;

function isRelative(specifier) {
  return specifier.startsWith('.');
}

function hasBareSubpath(specifier) {
  if (specifier.startsWith('@')) {
    const segments = specifier.split('/');
    return segments.length > 2;
  }
  return specifier.includes('/');
}

function needsExtension(specifier) {
  if (/\.\w+$/.test(specifier)) {
    return false;
  }
  return isRelative(specifier) || hasBareSubpath(specifier);
}

function addJsExtensions(source) {
  return source.replace(IMPORT_SPECIFIER_RE, (match, prefix, specifier, suffix) => {
    if (!needsExtension(specifier)) {
      return match;
    }
    return `${prefix}${specifier}.js${suffix}`;
  });
}

async function processDirectory(dirPath) {
  const entries = await readdir(dirPath);
  const tasks = entries.map(async (entry) => {
    const fullPath = join(dirPath, entry);
    const entryStat = await stat(fullPath);
    if (entryStat.isDirectory()) {
      return processDirectory(fullPath);
    }
    if (entry.endsWith('.js') || entry.endsWith('.d.ts')) {
      const content = await readFile(fullPath, 'utf8');
      const updated = addJsExtensions(content);
      if (updated !== content) {
        await writeFile(fullPath, updated, 'utf8');
      }
    }
  });
  await Promise.all(tasks);
}

const distDir = process.argv[2];
if (!distDir) {
  console.error('Usage: add-import-extensions.mjs <dist-directory>');
  process.exit(1);
}

await processDirectory(distDir);
