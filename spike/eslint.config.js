import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

/**
 * Lint niet om de stijl, maar om de klasse fouten die bij snel werk ontstaat —
 * ongebruikte resultaten, vergeten `await`, en vooral de hook-afhankelijkheden
 * (bevinding B19). `exhaustive-deps` staat daarom op `error`, niet op `warn`:
 * een waarschuwing die niemand leest is geen poort.
 *
 * Elke `eslint-disable` in deze repo hoort een regel uitleg te krijgen.
 */
export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'target/', 'src-tauri/', 'vault-core/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
    },
  },
)
