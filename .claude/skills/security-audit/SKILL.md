---
name: security-audit
description: >
  Full codebase security audit. Analyses every file systematically and produces
  a prioritised vulnerability report covering secrets, dependencies, auth,
  OWASP Top 10, and infrastructure. Invoke with: /security-audit
---

# Full Codebase Security Audit

You are a senior security engineer conducting a full audit of this codebase. Analyse every file systematically and produce a prioritised vulnerability report.

## Phase 1 -- Structural Reconnaissance

Use the knowledge graph before scanning files:

1. Run `get_architecture_overview` to understand the high-level structure.
2. Run `list_communities` to identify functional areas.
3. Run `semantic_search_nodes` for keywords: "auth", "token", "secret", "password", "credential", "session", "cookie", "cors", "csrf", "sanitize", "encrypt", "hash".
4. Use `query_graph` with `imports_of` on any security-sensitive nodes to trace data flow.

Fall back to Grep/Read only when the graph does not cover what you need.

## Phase 2 -- Systematic Audit

Check for the following, in order:

### 1. Secrets & Credentials

- Hardcoded API keys, tokens, passwords, private keys
- Credentials in `.env` files committed to git
- Secrets in logs, comments, or test files

### 2. Dependencies & Supply Chain

- Outdated packages with known CVEs
- Unmaintained or abandoned dependencies
- Suspicious or typosquatted packages
- Run `pnpm audit` to check for known vulnerabilities

### 3. Authentication & Authorisation

- Weak password handling or missing hashing
- Broken session management
- Missing auth checks on sensitive routes
- JWT misconfigurations (weak secrets, no expiry, algoNone)
- CORS and privilege escalation

### 4. OWASP Top 10

- Injection (SQL, NoSQL, command, LDAP)
- XSS (stored, reflected, DOM)
- CSRF and missing anti-CSRF tokens
- SSRF, XXE, insecure deserialisation
- Security misconfiguration
- Sensitive data exposure

### 5. Infrastructure & Headers

- Missing security headers (CSP, HSTS, X-Frame-Options)
- Verbose error messages leaking stack traces
- Insecure file upload handling

## Phase 3 -- Report

For each finding, report:

- **Severity**: Critical / High / Medium / Low
- **File and line number**
- **Exact vulnerable code**
- **Why it's exploitable**
- **Fix recommendation**

Start with critical findings. Do not skip files. Do not make assumptions -- if you need to read a file, read it.
