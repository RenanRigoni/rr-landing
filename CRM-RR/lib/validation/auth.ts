import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export type SignInInput = z.infer<typeof signInSchema>
