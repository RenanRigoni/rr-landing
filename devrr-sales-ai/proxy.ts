import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

// `api/cron` sai do matcher (D-012, achado B do checkpoint da Fase 1): essas
// rotas se autenticam por `Authorization: Bearer $CRON_SECRET`, não por cookie
// de sessão. Sem a exclusão, `updateSession` devolveria `307` para `/login` e
// o Vercel Cron nunca executaria — sem um único erro no log. Exclui só
// `api/cron`, não `api` inteiro: rota de API nova continua nascendo protegida
// por default.
export const config = {
  matcher: ['/((?!api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
