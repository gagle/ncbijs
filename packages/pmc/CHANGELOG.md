# Changelog

## 1.0.0 (2026-04-28)


### ⚠ BREAKING CHANGES

* **workspace:** prepare v1.0.0 release

### Features

* **pmc:** implement PMC full-text retrieval, OA Service, and OAI-PMH ([1e32633](https://github.com/gagle/ncbijs/commit/1e32633eb46b42f9cf62506b9fcc6904028399dc))
* **pmc:** migrate OA service from deprecated oa.fcgi to PMC Cloud Service on AWS S3 ([4aedf18](https://github.com/gagle/ncbijs/commit/4aedf183afb803433d10be3f2632d7ef38785d24))
* **pmc:** reorganize to split layout and add S3 inventory parser ([739cf19](https://github.com/gagle/ncbijs/commit/739cf19a46d32355d45bbf36920c1df6e72fc931))
* **workspace:** add @ncbijs/etl package, browser-safe pipeline, demo UI, and HTTP-to-DuckDB example ([c19d559](https://github.com/gagle/ncbijs/commit/c19d559dfcd99cc20d0bff2677963e2160f82a91))
* **workspace:** add data pipeline architecture with @ncbijs/pipeline, store refactor, and sync ([1c7b23e](https://github.com/gagle/ncbijs/commit/1c7b23e558ce7c9002e7a4c26efa9e7bc8a23e11))
* **workspace:** add rate limiting to mesh, id-converter, pubtator, clinical-tables, and pmc ([393c2a6](https://github.com/gagle/ncbijs/commit/393c2a6db298b40321198c9ef87fbb2799305e38))
* **workspace:** prepare v1.0.0 release ([554dd16](https://github.com/gagle/ncbijs/commit/554dd168dc40039565e13e5542704390b7c2a864))
* **xml:** consolidate XML readers into @ncbijs/xml package ([927073d](https://github.com/gagle/ncbijs/commit/927073d49aeb293b02d4d1946c1315b3a62d806c))


### Bug Fixes

* **jats:** improve pub-date selection, add keywords and ORCID parsing ([ebef81a](https://github.com/gagle/ncbijs/commit/ebef81aa0816fb6b3b8786a99658a977de5f6878))
* **workspace:** address review findings across Phase 4 parsers ([3ef5217](https://github.com/gagle/ncbijs/commit/3ef52177c2341efcfa8ae6cec821cfe56be0f4b1))
* **workspace:** fix post-build script, package.json exports, and release config ([3ed88e2](https://github.com/gagle/ncbijs/commit/3ed88e24521a72c1134148e4eeb725ac50712bbd))
