import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Configuration native (flat) de Next 16 : plus besoin de @eslint/eslintrc.
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Îlots client : lire le navigateur (stockage, wilaya, session) après l’hydratation est voulu ; signalé sans bloquer.
      'react-hooks/set-state-in-effect': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    ignores: ['.next/', 'src/payload-types.ts', 'src/payload-generated-schema.ts', 'legacy/', '.agents/', 'src/app/(payload)/admin/importMap.js', 'playwright-report/', 'test-results/'],
  },
]

export default eslintConfig
