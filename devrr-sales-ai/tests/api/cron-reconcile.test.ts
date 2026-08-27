import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Rota `app/api/cron/reconcile` (D-034). Roda sem rede: `server-only` e as
 * dependências privilegiadas são mockadas, e a rota é importada só depois dos
 * mocks. A asserção central é de segurança: request não autenticada nunca
 * chega a construir o client de service_role.
 */

const { SECRET, createAdminClientMock, reconcileAllOrgsMock, adminClientSentinel } = vi.hoisted(() => ({
  SECRET: 'cron-secret-de-teste-com-mais-de-32-caracteres',
  createAdminClientMock: vi.fn(),
  reconcileAllOrgsMock: vi.fn(),
  adminClientSentinel: { __brand: 'admin-client' },
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/env.server', () => ({ serverEnv: { CRON_SECRET: SECRET } }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: createAdminClientMock }))
vi.mock('@/lib/actions/reconcile-core', () => ({ reconcileAllOrgs: reconcileAllOrgsMock }))

async function getRoute() {
  return import('@/app/api/cron/reconcile/route')
}

function request(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/cron/reconcile', { headers })
}

const CLEAN_RUN = { orgs: 3, leadsChecked: 42, leadsFixed: 2, errors: [] as string[] }

beforeEach(() => {
  vi.clearAllMocks()
  createAdminClientMock.mockReturnValue(adminClientSentinel)
  reconcileAllOrgsMock.mockResolvedValue(CLEAN_RUN)
})

describe('GET /api/cron/reconcile', () => {
  it('sem header Authorization → 401 e NÃO constrói o admin client', async () => {
    const { GET } = await getRoute()
    const res = await GET(request())

    expect(res.status).toBe(401)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(reconcileAllOrgsMock).not.toHaveBeenCalled()
    await expect(res.json()).resolves.toEqual({ error: 'unauthorized' })
  })

  it('segredo errado → 401 e NÃO constrói o admin client', async () => {
    const { GET } = await getRoute()
    const res = await GET(request({ authorization: 'Bearer errado-errado-errado-errado-errado' }))

    expect(res.status).toBe(401)
    expect(createAdminClientMock).not.toHaveBeenCalled()
    expect(reconcileAllOrgsMock).not.toHaveBeenCalled()
  })

  it('segredo certo → 200, constrói o admin client e chama reconcileAllOrgs com ele', async () => {
    const { GET } = await getRoute()
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }))

    expect(res.status).toBe(200)
    expect(createAdminClientMock).toHaveBeenCalledTimes(1)
    expect(reconcileAllOrgsMock).toHaveBeenCalledWith(adminClientSentinel)
  })

  it('resposta só com contadores — nenhum org_id / id de lead, `errors` é número', async () => {
    const { GET } = await getRoute()
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }))
    const body = await res.json()

    expect(Object.keys(body).sort()).toEqual(['durationMs', 'errors', 'leadsChecked', 'leadsFixed', 'orgs'])
    expect(body).toMatchObject({ orgs: 3, leadsChecked: 42, leadsFixed: 2, errors: 0 })
    expect(typeof body.errors).toBe('number')
    expect(JSON.stringify(body)).not.toContain('org_id')
  })

  it('reconcileAllOrgs devolve errors não vazio → 500 com os mesmos contadores', async () => {
    reconcileAllOrgsMock.mockResolvedValue({
      orgs: 3,
      leadsChecked: 10,
      leadsFixed: 0,
      errors: ['falha ao reconciliar uma organização: x'],
    })
    const { GET } = await getRoute()
    const res = await GET(request({ authorization: `Bearer ${SECRET}` }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.errors).toBe(1)
    expect(body.orgs).toBe(3)
  })
})
