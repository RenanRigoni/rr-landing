import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Suíte separada da 2.4 (docs/DATABASE.md prevê isso: "marcar como suite
// separada se ficar lento"). Roda contra o Supabase real com dois usuários
// de teste via chave anon — network real, não entra no `npm run test`
// padrão que outras tarefas rodam a cada commit. Rodar com `npm run
// test:rls`. Ver README.md → Testes de RLS.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls.test.ts'],
    setupFiles: ['./tests/setup/load-env.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
