# Changelog

## 1.0.0 (2026-04-28)


### ⚠ BREAKING CHANGES

* **workspace:** prepare v1.0.0 release

### Features

* **cite:** add @ncbijs/cite package ([1bbf033](https://github.com/gagle/ncbijs/commit/1bbf033778a17b5f272c43c738ced0053aadb8aa))
* **workspace:** add @ncbijs/etl package, browser-safe pipeline, demo UI, and HTTP-to-DuckDB example ([c19d559](https://github.com/gagle/ncbijs/commit/c19d559dfcd99cc20d0bff2677963e2160f82a91))
* **workspace:** add data pipeline architecture with @ncbijs/pipeline, store refactor, and sync ([1c7b23e](https://github.com/gagle/ncbijs/commit/1c7b23e558ce7c9002e7a4c26efa9e7bc8a23e11))
* **workspace:** add offline parsers for 8 NCBI bulk data formats ([0e96961](https://github.com/gagle/ncbijs/commit/0e96961caa0d81e9aae9bcffe6d910c2de67f8d5))
* **workspace:** add rate limiting to litvar, bioc, and cite packages ([ab74045](https://github.com/gagle/ncbijs/commit/ab74045b9c67bc489b4b8df530f61ff938ae3b61))
* **workspace:** prepare v1.0.0 release ([554dd16](https://github.com/gagle/ncbijs/commit/554dd168dc40039565e13e5542704390b7c2a864))


### Bug Fixes

* **cite:** narrow CitationFormat to 4 working formats, add citation type ([251314d](https://github.com/gagle/ncbijs/commit/251314d62c6f8c07d9c5855daf049ac1d4f5557f))
* **workspace:** add typecheck targets for e2e and examples ([1452dae](https://github.com/gagle/ncbijs/commit/1452daee97a51533c223691afb69b1f676e54473))
* **workspace:** align API implementations with live NCBI endpoints ([41d7c4c](https://github.com/gagle/ncbijs/commit/41d7c4c8fb0d83d1eded29882ce53e4e41b68a11))
* **workspace:** fix post-build script, package.json exports, and release config ([3ed88e2](https://github.com/gagle/ncbijs/commit/3ed88e24521a72c1134148e4eeb725ac50712bbd))
* **workspace:** fix strict typecheck errors in offline parser specs ([10fda58](https://github.com/gagle/ncbijs/commit/10fda58ab6a8cc61b5624b46ea231206e274b0eb))
