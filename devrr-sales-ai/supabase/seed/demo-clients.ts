/**
 * Clientes reais da DevRR no seed de demonstração — os únicos leads em
 * `ganho`. Escopos reais (Social Ternos, Maria Amélia, Alicerce, Madri);
 * valores, datas e conversas são estimativas para a demonstração. Mais dois
 * leads abertos de expansão sobre a carteira (recompra).
 */

import { CLIENT_COMPANIES, type ClientKey } from './demo-companies'
import {
  diagnosisMeeting,
  done,
  followup,
  NO_REPLY,
  pendingTask,
  proposalSent,
  type Clock,
  type DemoPerson,
  type LeadDraft,
} from './demo-timeline'

export const CLIENT_KEYS: readonly ClientKey[] = ['madri', 'socialTernos', 'mariaAmelia', 'alicerce']

type Base = Pick<LeadDraft, 'company' | 'person' | 'withAudit' | 'lostReason'>

function wonLead(base: Base, fields: Omit<LeadDraft, keyof Base | 'stageKey' | 'temperature'>): LeadDraft {
  return { ...base, ...fields, stageKey: 'ganho', temperature: null }
}

export function buildClientDrafts(clock: Clock, personFor: (key: ClientKey) => DemoPerson): LeadDraft[] {
  const { past, laterToday, future } = clock
  const base = (key: ClientKey): Base => ({ company: CLIENT_COMPANIES[key], person: personFor(key), withAudit: false, lostReason: null })

  const madri = base('madri')
  const madriLanding = wonLead(madri, {
    title: 'Landing page de lançamento',
    interest: 'Landing page',
    valueReais: 1500,
    source: 'WhatsApp',
    createdAt: past(172, 10),
    respondedAt: past(162, 15),
    closedAt: past(161, 11),
    notes: null,
    acts: [
      done('note', 'Lead cadastrado', 'Chamou no WhatsApp comercial: quer lançar a marca de perfumes com uma página própria.', past(172, 10)),
      done('call', 'Ligação de descoberta', 'Público, faixa de preço dos perfumes e referências de marca.', past(171, 16)),
      done('meeting', 'Reunião de escopo', 'Landing com famílias olfativas, depoimentos e botão de WhatsApp.', past(168, 14)),
      proposalSent('Landing page de lançamento', 1500, past(165, 9)),
      followup(1, 'done', past(164, 10), past(165, 9), NO_REPLY),
      done('whatsapp', 'Cliente aprovou a proposta', 'Aprovou e pagou a entrada por Pix.', past(162, 15)),
      done('task', 'Kickoff do projeto', 'Recebidos logo, fotos dos frascos e textos.', past(160, 10)),
      done('note', 'Landing page publicada', 'madriperfumaria.com.br no ar.', past(140, 18)),
    ],
  })

  const madriStore = wonLead(madri, {
    title: 'E-commerce completo',
    interest: 'E-commerce',
    valueReais: 4800,
    source: 'WhatsApp',
    createdAt: past(118, 9),
    respondedAt: past(107, 17),
    closedAt: past(100, 16),
    notes: 'Cliente recorrente — segundo projeto depois do resultado da landing.',
    acts: [
      done('note', 'Nova oportunidade na carteira', 'Vendas pelo WhatsApp não escalam; quer loja virtual própria.', past(118, 9)),
      done('meeting', 'Reunião de escopo', 'Catálogo por família olfativa e ocasião, carrinho, frete e embalagem premium.', past(115, 14)),
      proposalSent('E-commerce completo', 4800, past(110, 11)),
      followup(1, 'done', past(109, 10), past(110, 11), NO_REPLY),
      followup(2, 'cancelled', past(107, 10), past(110, 11)),
      followup(3, 'cancelled', past(103, 10), past(110, 11)),
      done('whatsapp', 'Cliente respondeu', 'Pediu Mercado Pago, Pix e frete grátis acima de R$ 300.', past(107, 17)),
      done('meeting', 'Negociação de escopo e prazo', 'Fechado em 3 parcelas, entrega em 6 semanas.', past(104, 15)),
      done('task', 'Contrato assinado', 'Entrada paga.', past(100, 16)),
      done('note', 'Loja publicada', 'Mercado Pago, Pix, mensagem personalizada e frete grátis acima de R$ 300.', past(62, 19)),
    ],
  })

  const social = base('socialTernos')
  const socialSite = wonLead(social, {
    title: 'Site com catálogo de venda e aluguel',
    interest: 'Website',
    valueReais: 2200,
    source: 'Indicação',
    createdAt: past(146, 11),
    respondedAt: past(134, 10),
    closedAt: past(133, 17),
    notes: null,
    acts: [
      done('note', 'Lead cadastrado', 'Indicação de cliente da carteira da DevRR.', past(146, 11)),
      done('call', 'Primeiro contato', 'Loja de ternos com venda e aluguel; clientes pedem fotos toda hora no WhatsApp.', past(145, 15)),
      done('meeting', 'Levantamento do catálogo', 'Separar venda e aluguel, ocasiões (casamento, formatura) e canais de contato.', past(141, 10)),
      proposalSent('Site com catálogo de venda e aluguel', 2200, past(137, 9)),
      followup(1, 'done', past(136, 10), past(137, 9), NO_REPLY),
      followup(2, 'cancelled', past(134, 10), past(137, 9)),
      followup(3, 'cancelled', past(130, 10), past(137, 9)),
      done('whatsapp', 'Cliente aprovou a proposta', 'Aprovou; pediu para publicar antes da temporada de formaturas.', past(134, 10)),
      done('task', 'Contrato assinado', 'Entrada paga.', past(133, 17)),
      done('note', 'Site publicado', 'socialternos.com.br no ar com catálogo e WhatsApp.', past(110, 18)),
    ],
  })

  const socialBooking: LeadDraft = {
    ...social,
    stageKey: 'qualificado',
    title: 'Agenda de provas e devoluções de aluguel',
    interest: 'Sistema de agendamento',
    valueReais: 3500,
    source: 'Indicação',
    temperature: 'hot',
    createdAt: past(24, 10),
    respondedAt: null,
    closedAt: null,
    notes: 'Expansão da carteira.',
    acts: [
      done('note', 'Nova oportunidade na carteira', 'Conflitos de horário de prova e atraso na devolução de ternos alugados.', past(24, 10)),
      diagnosisMeeting(social.company, social.person, { min: 3000, max: 4000 }, past(18, 15)),
      pendingTask('Montar e enviar proposta', 'Agenda de provas + lembrete automático de devolução no WhatsApp.', past(2, 10), past(18, 16)),
    ],
  }

  const maria = base('mariaAmelia')
  const mariaLanding = wonLead(maria, {
    title: 'Landing page de procedimentos',
    interest: 'Landing page',
    valueReais: 1400,
    source: 'Instagram',
    createdAt: past(104, 13),
    respondedAt: past(92, 11),
    closedAt: past(91, 16),
    notes: null,
    acts: [
      done('note', 'Lead cadastrado', 'Mandou direct no Instagram da DevRR perguntando sobre landing page.', past(104, 13)),
      done('whatsapp', 'Primeiro retorno', 'Quer divulgar os programas Skin Club e Botox Premium fora do Instagram.', past(103, 9)),
      done('meeting', 'Reunião de diagnóstico', 'Tratamentos faciais e corporais, HIFU, bioestimuladores; agendamento pelo WhatsApp.', past(99, 14)),
      proposalSent('Landing page de procedimentos', 1400, past(96, 10)),
      followup(1, 'done', past(95, 10), past(96, 10), NO_REPLY),
      followup(2, 'done', past(93, 10), past(96, 10), NO_REPLY),
      followup(3, 'cancelled', past(89, 10), past(96, 10)),
      done('whatsapp', 'Cliente aprovou a proposta', 'Aprovou e pediu FAQ e depoimentos na página.', past(92, 11)),
      done('task', 'Contrato assinado', 'Entrada paga.', past(91, 16)),
      done('note', 'Landing page publicada', 'mariaameliaestetica.com.br no ar com agendamento via WhatsApp.', past(70, 18)),
    ],
  })

  const mariaProposal = past(3, 11)
  const mariaSeo: LeadDraft = {
    ...maria,
    stageKey: 'proposta_enviada',
    title: 'Google Meu Negócio + SEO local',
    interest: 'SEO local',
    valueReais: 1000,
    source: 'Instagram',
    temperature: 'hot',
    createdAt: past(16, 9),
    respondedAt: null,
    closedAt: null,
    notes: 'Expansão da carteira.',
    acts: [
      done('note', 'Nova oportunidade na carteira', 'Landing converte; agora quer aparecer no Maps de Patrocínio.', past(16, 9)),
      done('meeting', 'Revisão de resultados da landing', 'Mais agendamentos pelo WhatsApp; falta presença no Google.', past(10, 15)),
      proposalSent('Google Meu Negócio + SEO local', 1000, mariaProposal),
      followup(1, 'done', past(2, 10), mariaProposal, NO_REPLY),
      followup(2, 'pending', laterToday(2), mariaProposal),
      followup(3, 'pending', future(4, 10), mariaProposal),
    ],
  }

  const alicerce = base('alicerce')
  const alicerceSystem = wonLead(alicerce, {
    title: 'Sistema restrito de agendamentos',
    interest: 'Sistema de agendamento',
    valueReais: 4200,
    source: 'Indicação',
    createdAt: past(78, 10),
    respondedAt: past(63, 16),
    closedAt: past(57, 15),
    notes: 'Acesso restrito à equipe. Nenhum dado de paciente passa pelo CRM.',
    acts: [
      done('note', 'Lead cadastrado', 'Indicação de cliente da carteira da DevRR.', past(78, 10)),
      done('call', 'Primeiro contato', 'Agenda de terapeutas e salas feita em planilha compartilhada.', past(77, 14)),
      done('meeting', 'Levantamento de requisitos', 'Agenda por terapeuta e sala, perfis de acesso e uso só pela equipe.', past(74, 9)),
      done('meeting', 'Validação do fluxo com a coordenação', 'Fluxo de marcação, remarcação e bloqueio de horários aprovado.', past(70, 15)),
      proposalSent('Sistema restrito de agendamentos', 4500, past(66, 10)),
      followup(1, 'done', past(65, 10), past(66, 10), NO_REPLY),
      followup(2, 'cancelled', past(63, 10), past(66, 10)),
      followup(3, 'cancelled', past(59, 10), past(66, 10)),
      done('whatsapp', 'Cliente respondeu', 'Pediu ajuste de escopo: perfis separados por terapeuta.', past(63, 16)),
      proposalSent('Sistema restrito de agendamentos (revisada)', 4200, past(61, 11)),
      done('task', 'Contrato assinado', 'Entrada paga; implantação em 5 semanas.', past(57, 15)),
      done('note', 'Sistema entregue', 'Equipe treinada; agenda em produção.', past(20, 17)),
    ],
  })

  return [madriLanding, madriStore, socialSite, socialBooking, mariaLanding, mariaSeo, alicerceSystem]
}
