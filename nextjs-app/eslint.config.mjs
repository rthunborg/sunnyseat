import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// eslint-plugin-jsx-a11y is registered by eslint-config-next itself. We reuse
// that same instance (rather than re-registering our own) because ESLint rejects
// duplicate plugin registrations with different module identities. If the
// extraction ever returns undefined — e.g. a future eslint-config-next rewrites
// its internal config shape — fail loudly instead of silently producing
// "rule not found" errors on every file under our elevated rule set.
// The plugin is ALSO installed as a direct devDependency so npm protects us
// from transitive version drift.
const nextA11yConfig = nextVitals.find(
  (c) => c.plugins && 'jsx-a11y' in c.plugins
);
const jsxA11yPlugin = nextA11yConfig?.plugins?.['jsx-a11y'];
if (!jsxA11yPlugin) {
  throw new Error(
    'eslint.config.mjs: expected eslint-config-next/core-web-vitals to register the ' +
      "jsx-a11y plugin, but none was found. Check eslint-config-next's version — its " +
      'internal config shape may have changed. Update the extraction above to match.'
  );
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: 'sunnyseat/a11y-extended',
    plugins: { 'jsx-a11y': jsxA11yPlugin },
    rules: {
      // Elevate base rules to error + add recommended rules
      'jsx-a11y/alt-text': ['error', { elements: ['img'], img: ['Image'] }],
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
    },
  },
  {
    name: 'sunnyseat/rules',
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Vendored Claude Design prototypes — hand-coded reference HTML/JSX
    // loaded via `<script type="text/babel">` tags with `@babel/standalone`,
    // refreshed by `scripts/fetch-claude-design.sh`. They use globals (no
    // module system) so `react/jsx-no-undef` cannot resolve cross-file
    // symbols, and they prefer `<div onClick>` patterns that trip
    // `jsx-a11y/no-static-element-interactions`. Any fix is overwritten on
    // the next bundle refresh, so they are treated as binary assets for the
    // visual gate. See `CLAUDE.md` §"Critical rules" for the policy and
    // `docs/design/references/claude-design/ESLINT-AUDIT.md` for the
    // categorisation that justifies this ignore (Story 1.6 Task 8 / AC6).
    'docs/design/references/claude-design/**',
  ]),
]);

export default eslintConfig;
