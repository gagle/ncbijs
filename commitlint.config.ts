export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'eutils',
        'pubmed-xml',
        'pubmed',
        'jats',
        'pmc',
        'id-converter',
        'pubtator',
        'mesh',
        'cite',
        'rate-limiter',
        'workspace',
      ],
    ],
  },
};
