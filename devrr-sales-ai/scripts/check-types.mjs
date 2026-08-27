// Guarda de drift de `lib/types/database.types.ts` (D-042).
//
// Regenera os tipos do schema `sales` (mesma fonte de `npm run gen:types`) e
// compara com o arquivo commitado. Divergiu → imprime o primeiro trecho
// diferente e sai != 0. É isto que transforma "lembrar de regerar" em
// verificação: DDL aplicado sem regerar, ou edição à mão do arquivo, o comando
// acusa.
//
// Opt-in quanto à credencial, no mesmo espírito de `test:rls`/`test:coverage`:
// sem `SUPABASE_ACCESS_TOKEN` no ambiente (CI sem o segredo, por exemplo), pula
// com aviso e sai 0 — não pode dar falso vermelho. Com o segredo presente,
// divergência é erro.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { generateSalesTypes, readCredentials, TYPES_FILE } from './gen-types.mjs'

function reportFirstDiff(expected, actual) {
  const a = expected.split('\n')
  const b = actual.split('\n')
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) {
      const from = Math.max(0, i - 2)
      console.error(`\nPrimeira divergência na linha ${i + 1}:`)
      for (let j = from; j <= i; j++) {
        if (a[j] !== undefined) console.error(`  commitado  | ${a[j]}`)
      }
      console.error(`  gerado     | ${b[i] ?? '<fim do arquivo>'}`)
      break
    }
  }
  console.error(`\nLinhas: commitado ${a.length}, gerado ${b.length}.`)
}

async function main() {
  const { token } = readCredentials()
  if (!token) {
    console.error(
      '[types:check] SUPABASE_ACCESS_TOKEN ausente — pulando a checagem de drift ' +
        '(opt-in, igual a test:rls). Rode `npm run gen:types` localmente antes de commitar mudança de schema.',
    )
    process.exit(0)
  }

  let generated
  try {
    generated = await generateSalesTypes()
  } catch (error) {
    console.error(`[types:check] ${error.message}`)
    process.exit(1)
  }

  let committed
  try {
    committed = await readFile(TYPES_FILE, 'utf8')
  } catch (error) {
    console.error(`[types:check] não consegui ler ${TYPES_FILE}: ${error.message}`)
    process.exit(1)
  }

  if (committed !== generated) {
    console.error(
      `[types:check] ${path.basename(TYPES_FILE)} está fora de sincronia com o schema sales.\n` +
        'Rode `npm run gen:types` e commite o resultado (D-042).',
    )
    reportFirstDiff(committed, generated)
    process.exit(1)
  }

  console.error('[types:check] database.types.ts em sincronia com o schema sales.')
}

await main()
