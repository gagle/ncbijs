# Changelog

## 1.0.0 (2026-04-28)


### ⚠ BREAKING CHANGES

* **workspace:** prepare v1.0.0 release

### Features

* **id-converter:** add @ncbijs/id-converter package ([6eb4122](https://github.com/gagle/ncbijs/commit/6eb4122196695f3c82c0934733cc691dadeee08b))
* **workspace:** add @ncbijs/etl package, browser-safe pipeline, demo UI, and HTTP-to-DuckDB example ([c19d559](https://github.com/gagle/ncbijs/commit/c19d559dfcd99cc20d0bff2677963e2160f82a91))
* **workspace:** add data pipeline architecture with @ncbijs/pipeline, store refactor, and sync ([1c7b23e](https://github.com/gagle/ncbijs/commit/1c7b23e558ce7c9002e7a4c26efa9e7bc8a23e11))
* **workspace:** add offline parsers for 8 NCBI bulk data formats ([0e96961](https://github.com/gagle/ncbijs/commit/0e96961caa0d81e9aae9bcffe6d910c2de67f8d5))
* **workspace:** add rate limiting to mesh, id-converter, pubtator, clinical-tables, and pmc ([393c2a6](https://github.com/gagle/ncbijs/commit/393c2a6db298b40321198c9ef87fbb2799305e38))
* **workspace:** add source-agnostic fromStorage() to domain packages and redesign demo ([4d4e9ea](https://github.com/gagle/ncbijs/commit/4d4e9ea667aafb406dc2f4a95b9b70ce89971860))
* **workspace:** prepare v1.0.0 release ([554dd16](https://github.com/gagle/ncbijs/commit/554dd168dc40039565e13e5542704390b7c2a864))


### Bug Fixes

* **id-converter:** fix pmid and versions.current types in schema ([e97a4bf](https://github.com/gagle/ncbijs/commit/e97a4bfcde6e37ef342b47d4b5fb044cd186dbda))
* **workspace:** add typecheck targets for e2e and examples ([1452dae](https://github.com/gagle/ncbijs/commit/1452daee97a51533c223691afb69b1f676e54473))
* **workspace:** align parsers and interfaces with live NCBI API responses ([195caf0](https://github.com/gagle/ncbijs/commit/195caf04c505a5d6f5d0502434509bb53341b700))
* **workspace:** fix E2E tests for class API changes and Vitest 4 signature ([1cfbbe5](https://github.com/gagle/ncbijs/commit/1cfbbe5bd9ee8adc1f35125442bc4423972afb57))
* **workspace:** fix post-build script, package.json exports, and release config ([3ed88e2](https://github.com/gagle/ncbijs/commit/3ed88e24521a72c1134148e4eeb725ac50712bbd))
* **workspace:** fix strict typecheck errors in offline parser specs ([10fda58](https://github.com/gagle/ncbijs/commit/10fda58ab6a8cc61b5624b46ea231206e274b0eb))
