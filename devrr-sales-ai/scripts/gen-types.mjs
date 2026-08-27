// Gera `lib/types/database.types.ts` a partir do schema `sales` do banco remoto,
// pelo endpoint oficial da Management API do Supabase (o mesmo que o
// `supabase gen types` chama por baixo):
//
//   GET https://api.supabase.com/v1/projects/{ref}/types/typescript?included_schemas=sales
//
// Motivo de existir (D-042): `npm run typecheck` valida o código contra o
// ARQUIVO de tipos, nunca contra o banco. Enquanto o arquivo foi escrito à mão
// (2.1 → 6.x) uma coluna esquecida, um nullable errado ou um valor de enum a
// mais passavam verdes e só quebravam em runtime. A partir daqui o arquivo é
// gerado e `npm run types:check` acusa qualquer divergência.
//
// Credencial: `SUPABASE_ACCESS_TOKEN` (personal access token `sbp_...`),
// **dev-only**, lida de `.env.local`. Não é env de aplicação: não vai para a
// Vercel, não entra em `lib/env.server.ts`, nenhum código de runtime a lê, não
// é `service_role` (D-034 intacto).

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

export const TYPES_FILE = path.join(ROOT, 'lib', 'types', 'database.types.ts')

const HEADER = `// AUTOGERADO por \`npm run gen:types\` — NÃO editar à mão.
// Fonte: Supabase Management API
//   GET /v1/projects/{ref}/types/typescript?included_schemas=sales
// Verificado por \`npm run types:check\` (regenera para um temporário e falha se
// divergir deste arquivo). Depois de qualquer migration: \`npm run gen:types\` +
// commit no mesmo passo. Ver docs/DECISIONS.md → D-042 e docs/DATABASE.md →
// "Checklist obrigatório por migration".
`

/**
 * Lê `SUPABASE_ACCESS_TOKEN` e o ref do projeto de `process.env` +
 * `.env.local` (o script roda fora do Next, então carrega o env sozinho, como
 * `tests/setup/load-env.ts` já faz).
 *
 * @returns {{ token: string | undefined, ref: string | undefined }}
 */
export function readCredentials() {
  const fileEnv = loadEnv('development', ROOT, '')
  const get = (key) => process.env[key] ?? fileEnv[key]

  const token = get('SUPABASE_ACCESS_TOKEN')

  let ref = get('SUPABASE_PROJECT_REF')
  if (!ref) {
    const url = get('NEXT_PUBLIC_SUPABASE_URL')
    const match = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)
    ref = match?.[1]
  }

  return { token, ref }
}

/**
 * Busca os tipos do schema `sales` no endpoint oficial. Lança com mensagem
 * clara (nunca silenciosa) se o token faltar, se o ref não for resolvível, ou
 * se o HTTP não for 200.
 *
 * @returns {Promise<string>} conteúdo final do arquivo (header + tipos)
 */
export async function generateSalesTypes() {
  const { token, ref } = readCredentials()

  if (!token) {
    throw new Error(
      'SUPABASE_ACCESS_TOKEN ausente. É um personal access token (sbp_...) do ' +
        'Supabase, dev-only. Gere em https://supabase.com/dashboard/account/tokens ' +
        'e adicione a `.env.local` (nunca commitado, nunca vai para a Vercel).',
    )
  }
  if (!ref) {
    throw new Error(
      'Ref do projeto Supabase não resolvido. Defina SUPABASE_PROJECT_REF em ' +
        '`.env.local` ou garanta que NEXT_PUBLIC_SUPABASE_URL seja ' +
        'https://<ref>.supabase.co.',
    )
  }

  const endpoint = `https://api.supabase.com/v1/projects/${ref}/types/typescript?included_schemas=sales`

  let res
  try {
    res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
  } catch (cause) {
    throw new Error(`Falha de rede ao chamar a Management API: ${cause.message}`)
  }

  const bodyText = await res.text()
  if (!res.ok) {
    throw new Error(
      `Management API respondeu HTTP ${res.status}.\n` +
        `Endpoint: ${endpoint}\n` +
        `Corpo: ${bodyText.slice(0, 2000)}`,
    )
  }

  let types
  try {
    types = JSON.parse(bodyText).types
  } catch {
    throw new Error(`Resposta não é JSON válido:\n${bodyText.slice(0, 2000)}`)
  }
  if (typeof types !== 'string' || types.trim() === '') {
    throw new Error(`Campo "types" ausente ou vazio na resposta:\n${bodyText.slice(0, 2000)}`)
  }

  return `${HEADER}\n${types.trim()}\n`
}

async function main() {
  let content
  try {
    content = await generateSalesTypes()
  } catch (error) {
    console.error(`[gen:types] ${error.message}`)
    process.exit(1)
  }

  // Só escreve depois de ter o conteúdo inteiro em memória — nunca um arquivo
  // parcial se algo falhar no meio.
  await writeFile(TYPES_FILE, content, 'utf8')
  console.error(`[gen:types] ${path.relative(ROOT, TYPES_FILE)} regenerado a partir do schema sales.`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
