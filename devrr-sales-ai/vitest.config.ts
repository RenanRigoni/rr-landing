import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/rls.test.ts', 'tests/actions/**/*.test.ts'],
    setupFiles: ['./tests/setup/load-env.ts'],
    // Só entra em ação com a flag `--coverage` (`npm run test:coverage`) —
    // `npm run test` continua idêntico. Escopo: `lib/domain/` (lógica pura,
    // 100% exercitável por esta suíte sem rede). O restante de `lib/` é
    // coberto pela suíte `test:rls` (actions/queries contra o Supabase real);
    // ver docs/IMPLEMENTATION_PLAN.md → 6.2 e docs/DECISIONS.md → D-033.
    coverage: {
      provider: 'v8',
      include: ['lib/domain/**/*.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        'lib/domain/**/*.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
