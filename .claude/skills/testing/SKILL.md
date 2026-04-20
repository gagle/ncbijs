---
name: testing
description: >
  Unit testing conventions for pure TypeScript functions and modules.
  Covers Vitest, v8 coverage (100% thresholds), mock patterns, spec structure,
  and 18 enforced rules. Activates when writing or modifying .spec.ts files.
---

# Testing Conventions

- Framework: Vitest with `@vitest/coverage-v8`.
- Coverage: **100%** on lines, functions, branches, statements.
- Specs co-located: `xml-reader.spec.ts` next to `xml-reader.ts` in `src/`.
- `vi.fn()` and `vi.spyOn()` for mocks.
- `vi.stubGlobal('fetch', ...)` + `afterEach(() => vi.unstubAllGlobals())` for HTTP mocks.

## Rules

```
RULE-01  No redundant "should create" / "should be created" tests.
         Function/module will fail in subsequent tests if broken.
RULE-02  Nested describes group tests by state or scenario.
         Never flat -- always at least one level of nesting.
RULE-03  Each describe that changes state has its own beforeEach.
         beforeEach performs EXACTLY ONE action or state change.
RULE-04  "it" blocks contain ONLY expectations.
         No setup, no act -- those go in beforeEach or helper functions.
RULE-05  Input variations -> describe starts with "when..."
         Example: "when the tag is invalid", "when the XML is empty"
RULE-06  restoreMocks: true in vitest config -- no manual
         afterEach(vi.restoreAllMocks()) needed.
RULE-07  Prefer vi.spyOn over vi.mock. vi.mock is hoisted, global,
         and confusing. Only use for dynamic imports.
RULE-08  One logical assertion per "it". Related expects on the SAME
         subject are OK (e.g. text + attributes from same parse).
RULE-09  vi.fn() for mocks. Never third-party spy libraries.
RULE-10  Spec files use suffix *.spec.ts.
RULE-11  No comments in spec files unless logic is extremely complex.
         Use semantic function names and describe text instead.
RULE-12  Root describe contains ONLY the entity name under test.
         describe('readTag', () => { ... })
         NOT: describe('xml readTag', () => { ... })
RULE-13  Describe text uses semantic, human-readable names.
         "when the tag has attributes" NOT "when attrs !== null"
RULE-14  No conditional logic (if/switch) in spec files.
         Use hardcoded values and explicit assertions.
RULE-15  Avoid type casts (as Xxx) in specs -- type correctly upfront.
RULE-16  Each test must be independent -- no shared mutable state
         across it blocks.
RULE-17  Nested describe blocks start with "when...".
RULE-18  it blocks start with "should...".
```

---

## File Ordering Inside a Spec

```
1. Imports
2. describe('EntityName', () => {
3.   let variables
4.   Helper functions
5.   beforeEach
6.   Nested describes
7. })
```

---

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

---

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

---

## Spec Location

Test files live alongside source files in `src/` directory:

```
packages/xml/src/
  xml-reader.ts
  xml-reader.spec.ts
```
