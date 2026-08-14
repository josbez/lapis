import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

/**
 * Zelfde opzet als spike/eslint.config.js: exhaustive-deps op error, niet op
 * warn (bevinding B19) — een waarschuwing die niemand leest is geen poort.
 */
export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'target/', 'src-tauri/', 'vault-core/', 'app-state/'] },
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
