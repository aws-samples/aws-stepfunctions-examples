module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-sass-guidelines'
  ],
  rules: {
    'indentation': 2,
    'import-notation': 'string' || 'url',
    'max-nesting-depth': 4,
    'selector-no-qualifying-type': null,
    'selector-max-compound-selectors': null,
    'selector-class-pattern': /.+/,
    'no-descending-specificity': null,
    'no-duplicate-selectors': null,
    'selector-max-id': null,
    'selector-id-pattern': null,
    'max-line-length': null,
    'selector-pseudo-element-no-unknown': [true, { ignorePseudoElements: ['input-placeholder'] }],
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['input-placeholder'] }],
    'scss/at-extend-no-missing-placeholder': null,
    'keyframes-name-pattern': null,
    'max-empty-lines': 1,
    'block-opening-brace-space-before': 'always',
    'block-opening-brace-newline-after': 'always',
    'block-closing-brace-newline-before': 'always',
    'block-closing-brace-empty-line-before': 'never',
    'block-closing-brace-newline-after': 'always',
    'declaration-colon-space-after': 'always',
    'selector-attribute-brackets-space-inside': 'never',
    'no-eol-whitespace': true,
  },
  overrides: [
    {
      files: [
        'src/**/*.css',
        'src/**/*.scss'
      ]
    }
  ]
};
