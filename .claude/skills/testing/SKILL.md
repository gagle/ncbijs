---
name: testing
description: >
  Unit testing workflow for pure TypeScript functions and modules.
  Provides templates and patterns for writing tests. Rules and conventions
  are in .claude/rules/testing.md (always loaded).
---

# Testing Workflow

Rules and conventions are defined in `.claude/rules/testing.md` and are always enforced.

This skill provides templates for common test patterns.

## Pure Function Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { readTag } from './xml-reader';

describe('readTag', () => {
  describe('when the tag exists', () => {
    it('should extract text content', () => {
      expect(readTag('<Count>42</Count>', 'Count')).toBe('42');
    });
  });

  describe('when the tag is missing', () => {
    it('should return undefined', () => {
      expect(readTag('<Other>x</Other>', 'Count')).toBeUndefined();
    });
  });

  describe('when the content has entities', () => {
    it('should decode XML entities', () => {
      expect(readTag('<Q>a &amp; b</Q>', 'Q')).toBe('a & b');
    });
  });
});
```

## Typed Helper Pattern

When multiple tests need to narrow a return type, extract a typed helper:

```typescript
import { describe, it, expect } from 'vitest';
import { readTagWithAttributes } from './xml-reader';

describe('readTagWithAttributes', () => {
  function parseTag(xml: string, tagName: string) {
    const result = readTagWithAttributes(xml, tagName);
    expect(result).not.toBeNull();
    return result!;
  }

  describe('when the tag has attributes', () => {
    it('should extract the text and attributes', () => {
      const result = parseTag('<Id Type="doi">10.1/x</Id>', 'Id');
      expect(result.text).toBe('10.1/x');
      expect(result.attributes['Type']).toBe('doi');
    });
  });
});
```
