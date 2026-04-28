# Changelog

## 1.0.0 (2026-04-28)


### ⚠ BREAKING CHANGES

* **workspace:** prepare v1.0.0 release

### Features

* **datasets:** add gene2pubmed, gene2go, orthologs, and history parsers ([970a045](https://github.com/gagle/ncbijs/commit/970a0450a8bba6dc87dd59dca7228348cf48c118))
* **pubchem,datasets:** add Substance, BioAssay, Virus, BioProject, and BioSample support ([c7b2ed7](https://github.com/gagle/ncbijs/commit/c7b2ed7fee74fab92c8af37c906c852421720073))
* **workspace:** add @ncbijs/etl package, browser-safe pipeline, demo UI, and HTTP-to-DuckDB example ([c19d559](https://github.com/gagle/ncbijs/commit/c19d559dfcd99cc20d0bff2677963e2160f82a91))
* **workspace:** add blast, snp, clinvar, datasets, pubchem, fasta packages ([2ae628e](https://github.com/gagle/ncbijs/commit/2ae628ec6cbfe171603112482c9927c0f4782a96))
* **workspace:** add data pipeline architecture with @ncbijs/pipeline, store refactor, and sync ([1c7b23e](https://github.com/gagle/ncbijs/commit/1c7b23e558ce7c9002e7a4c26efa9e7bc8a23e11))
* **workspace:** add offline parsers for 8 NCBI bulk data formats ([0e96961](https://github.com/gagle/ncbijs/commit/0e96961caa0d81e9aae9bcffe6d910c2de67f8d5))
* **workspace:** add source-agnostic fromStorage() to domain packages and redesign demo ([4d4e9ea](https://github.com/gagle/ncbijs/commit/4d4e9ea667aafb406dc2f4a95b9b70ce89971860))
* **workspace:** expand API coverage across 10 packages and add 9 MCP tools ([2377a3d](https://github.com/gagle/ncbijs/commit/2377a3d0bd7020813fe0653b9ce923b5a7989d27))
* **workspace:** expand API coverage, add examples, MCP tests, and error docs ([8352661](https://github.com/gagle/ncbijs/commit/83526615bc73a97d7006079837a58880c602e4ea))
* **workspace:** prepare v1.0.0 release ([554dd16](https://github.com/gagle/ncbijs/commit/554dd168dc40039565e13e5542704390b7c2a864))


### Bug Fixes

* **datasets:** migrate gene and taxonomy endpoints to non-deprecated paths ([2662bed](https://github.com/gagle/ncbijs/commit/2662bed351818c1bb608de7ccd64bee5f59ee387))
* **workspace:** add typecheck targets for e2e and examples ([1452dae](https://github.com/gagle/ncbijs/commit/1452daee97a51533c223691afb69b1f676e54473))
* **workspace:** align API implementations with live NCBI endpoints ([41d7c4c](https://github.com/gagle/ncbijs/commit/41d7c4c8fb0d83d1eded29882ce53e4e41b68a11))
* **workspace:** fix CI failures and release-please config ([bc86044](https://github.com/gagle/ncbijs/commit/bc860444c11c92d13f3c60b1eef246158f6479e7))
* **workspace:** fix post-build script, package.json exports, and release config ([3ed88e2](https://github.com/gagle/ncbijs/commit/3ed88e24521a72c1134148e4eeb725ac50712bbd))
* **workspace:** fix remaining E2E failures for upstream API changes ([bfb3e50](https://github.com/gagle/ncbijs/commit/bfb3e50df149471e8c1abb3ef15560cd267840d5))
* **workspace:** fix strict typecheck errors in offline parser specs ([10fda58](https://github.com/gagle/ncbijs/commit/10fda58ab6a8cc61b5624b46ea231206e274b0eb))
