# Changelog

## 1.0.0 (2026-04-28)


### ⚠ BREAKING CHANGES

* **workspace:** prepare v1.0.0 release

### Features

* **workspace:** add @ncbijs/etl package, browser-safe pipeline, demo UI, and HTTP-to-DuckDB example ([c19d559](https://github.com/gagle/ncbijs/commit/c19d559dfcd99cc20d0bff2677963e2160f82a91))
* **workspace:** add 6 new packages and extend snp, pubchem, eutils with new API methods ([8e9bcfe](https://github.com/gagle/ncbijs/commit/8e9bcfe434a8ff30467db4e1be3b1cb6e8e9a588))
* **workspace:** add data pipeline architecture with @ncbijs/pipeline, store refactor, and sync ([1c7b23e](https://github.com/gagle/ncbijs/commit/1c7b23e558ce7c9002e7a4c26efa9e7bc8a23e11))
* **workspace:** add rate limiting to mesh, id-converter, pubtator, clinical-tables, and pmc ([393c2a6](https://github.com/gagle/ncbijs/commit/393c2a6db298b40321198c9ef87fbb2799305e38))
* **workspace:** prepare v1.0.0 release ([554dd16](https://github.com/gagle/ncbijs/commit/554dd168dc40039565e13e5542704390b7c2a864))


### Bug Fixes

* **clinical-tables:** disable retries in error-handling unit tests ([a51b531](https://github.com/gagle/ncbijs/commit/a51b5313c101a2735af6d94b229be5a3b3b48482))
* **workspace:** align API implementations with live NCBI endpoints ([41d7c4c](https://github.com/gagle/ncbijs/commit/41d7c4c8fb0d83d1eded29882ce53e4e41b68a11))
* **workspace:** fix post-build script, package.json exports, and release config ([3ed88e2](https://github.com/gagle/ncbijs/commit/3ed88e24521a72c1134148e4eeb725ac50712bbd))
* **workspace:** make E2E tests resilient to upstream API unavailability ([6865c21](https://github.com/gagle/ncbijs/commit/6865c21faea55e3dbc6467570d75ba03537ab3ef))
