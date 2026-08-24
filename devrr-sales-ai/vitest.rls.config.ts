import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Suíte separada da 2.4 (docs/DATABASE.md prevê isso: "marcar como suite
// separada se ficar lento"). Roda contra o Supabase real com dois usuários
// de teste via chave anon — network real, não entra no `npm run test`
// padrão que outras tarefas rodam a cada commit. Rodar com `npm run
// test:rls`. Ver README.md → Testes de RLS.
//
// tests/actions/*.test.ts (tarefa 3.4) entrou aqui pelo mesmo motivo: as
// funções *Core de lib/actions/ recebem um client Supabase já autenticado
// (não usam createClient()/cookies() internamente) exatamente para poderem
// ser exercitadas contra o Supabase real, com os mesmos dois usuários de
// teste — prova de isolamento entre tenants na camada de action, não só na
// de RLS pura.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls.test.ts', 'tests/actions/**/*.test.ts'],
    setupFiles: ['./tests/setup/load-env.ts'],
    // Todo arquivo desta suíte compartilha as duas mesmas contas reais
    // (rls-test-a/b) e limpa organizações no beforeAll/afterAll. Com mais de
    // um arquivo agora (tarefa 3.4 acrescentou tests/actions/), o paralelismo
    // padrão do Vitest roda os arquivos ao mesmo tempo — um arquivo apaga
    // organização que o outro ainda está usando. Achado real, não hipótese:
    // sem isto, tests/rls.test.ts (inalterado) passou a falhar de forma
    // instável só por rodar em paralelo com tests/actions/leads.test.ts.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
