import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database.types'
import { publicEnv } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database, 'sales'>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      db: { schema: 'sales' },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginRoute = request.nextUrl.pathname.startsWith('/login')
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding')

  if (!user) {
    if (!isLoginRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Usuário autenticado sem organização é levado ao onboarding antes de
  // qualquer outra rota — nenhuma tela do produto funciona sem org_id.
  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('id')
    .limit(1)
    .maybeSingle()

  // Achado B do checkpoint Opus da Fase 2: erro de banco não é "sem
  // organização". Sem isto, uma falha transitória (rede, timeout,
  // PostgREST fora do ar) mandava um usuário COM organização para
  // /onboarding, onde o único caminho oferecido é criar uma segunda
  // empresa. Na falha, não decide o gate às cegas — deixa a request
  // seguir para a rota pedida (exceto saindo de /login, sem sinal
  // confiável de para onde mandar, o destino seguro é /today: se o
  // usuário não tiver org de verdade, a própria página redireciona para
  // /onboarding). Isto é gate de UX, não de autorização — nenhuma rota
  // de dado passa a ignorar RLS por causa disto; getCurrentOrg() e
  // requireOrgId() continuam sendo quem decide org_id de verdade.
  if (membershipError) {
    if (isLoginRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/today'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const hasOrg = membership !== null

  if (isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = hasOrg ? '/today' : '/onboarding'
    return NextResponse.redirect(url)
  }

  if (!hasOrg && !isOnboardingRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  if (hasOrg && isOnboardingRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/today'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
