# Changelog

## 1.0.0 (2026-04-28)


### ⚠ BREAKING CHANGES

* **workspace:** prepare v1.0.0 release

### Features

* **pubtator:** implement PubTator3 text mining client with BioC parsing ([1d2e62d](https://github.com/gagle/ncbijs/commit/1d2e62da3234d539ec5652ae20d3a7f37d738c6c))
* **workspace:** add @ncbijs/etl package, browser-safe pipeline, demo UI, and HTTP-to-DuckDB example ([c19d559](https://github.com/gagle/ncbijs/commit/c19d559dfcd99cc20d0bff2677963e2160f82a91))
* **workspace:** add data pipeline architecture with @ncbijs/pipeline, store refactor, and sync ([1c7b23e](https://github.com/gagle/ncbijs/commit/1c7b23e558ce7c9002e7a4c26efa9e7bc8a23e11))
* **workspace:** add rate limiting to mesh, id-converter, pubtator, clinical-tables, and pmc ([393c2a6](https://github.com/gagle/ncbijs/commit/393c2a6db298b40321198c9ef87fbb2799305e38))
* **workspace:** prepare v1.0.0 release ([554dd16](https://github.com/gagle/ncbijs/commit/554dd168dc40039565e13e5542704390b7c2a864))
* **xml:** consolidate XML readers into @ncbijs/xml package ([927073d](https://github.com/gagle/ncbijs/commit/927073d49aeb293b02d4d1946c1315b3a62d806c))


### Bug Fixes

* **pubtator:** remove dead findRelations endpoint and deprecated bioc methods ([68e5365](https://github.com/gagle/ncbijs/commit/68e536522421bace7bc5bb45baf45626a6dfafe9))
* **workspace:** align API implementations with live NCBI endpoints ([41d7c4c](https://github.com/gagle/ncbijs/commit/41d7c4c8fb0d83d1eded29882ce53e4e41b68a11))
* **workspace:** fix post-build script, package.json exports, and release config ([3ed88e2](https://github.com/gagle/ncbijs/commit/3ed88e24521a72c1134148e4eeb725ac50712bbd))
