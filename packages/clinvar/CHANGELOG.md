# Changelog

## 1.0.0 (2026-04-28)


### ⚠ BREAKING CHANGES

* **workspace:** prepare v1.0.0 release

### Features

* **clinvar:** add VCF bulk parser ([e4b71aa](https://github.com/gagle/ncbijs/commit/e4b71aa6e9f5edf9eadbfea9706e75e390db77ac))
* **workspace:** add @ncbijs/etl package, browser-safe pipeline, demo UI, and HTTP-to-DuckDB example ([c19d559](https://github.com/gagle/ncbijs/commit/c19d559dfcd99cc20d0bff2677963e2160f82a91))
* **workspace:** add blast, snp, clinvar, datasets, pubchem, fasta packages ([2ae628e](https://github.com/gagle/ncbijs/commit/2ae628ec6cbfe171603112482c9927c0f4782a96))
* **workspace:** add data pipeline architecture with @ncbijs/pipeline, store refactor, and sync ([1c7b23e](https://github.com/gagle/ncbijs/commit/1c7b23e558ce7c9002e7a4c26efa9e7bc8a23e11))
* **workspace:** add offline parsers for 8 NCBI bulk data formats ([0e96961](https://github.com/gagle/ncbijs/commit/0e96961caa0d81e9aae9bcffe6d910c2de67f8d5))
* **workspace:** add source-agnostic fromStorage() to domain packages and redesign demo ([4d4e9ea](https://github.com/gagle/ncbijs/commit/4d4e9ea667aafb406dc2f4a95b9b70ce89971860))
* **workspace:** expand API coverage across 10 packages and add 9 MCP tools ([2377a3d](https://github.com/gagle/ncbijs/commit/2377a3d0bd7020813fe0653b9ce923b5a7989d27))
* **workspace:** expand API coverage, add examples, MCP tests, and error docs ([8352661](https://github.com/gagle/ncbijs/commit/83526615bc73a97d7006079837a58880c602e4ea))
* **workspace:** prepare v1.0.0 release ([554dd16](https://github.com/gagle/ncbijs/commit/554dd168dc40039565e13e5542704390b7c2a864))


### Bug Fixes

* **workspace:** add typecheck targets for e2e and examples ([1452dae](https://github.com/gagle/ncbijs/commit/1452daee97a51533c223691afb69b1f676e54473))
* **workspace:** align parsers and interfaces with live NCBI API responses ([195caf0](https://github.com/gagle/ncbijs/commit/195caf04c505a5d6f5d0502434509bb53341b700))
* **workspace:** correct ClinVar spdiToHgvs return type and add missing EUtils params ([b9eea0c](https://github.com/gagle/ncbijs/commit/b9eea0c6e4e6349df4c7877fecdcfb31a7fa2cb6))
* **workspace:** fix post-build script, package.json exports, and release config ([3ed88e2](https://github.com/gagle/ncbijs/commit/3ed88e24521a72c1134148e4eeb725ac50712bbd))
* **workspace:** fix strict typecheck errors in offline parser specs ([10fda58](https://github.com/gagle/ncbijs/commit/10fda58ab6a8cc61b5624b46ea231206e274b0eb))
* **workspace:** merge duplicate SpdiResult into SpdiAllele and DRY clinical-trials filters ([6f384a8](https://github.com/gagle/ncbijs/commit/6f384a86ac38b619a5e625a2875c845b9b7898a1))
