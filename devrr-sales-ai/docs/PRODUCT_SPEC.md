# DevRR Sales AI — Especificação de Produto

## Uma frase

Plataforma comercial para PMEs que garante que nenhum pedido de orçamento fique sem
resposta — captura o lead, agenda o follow-up, escreve a mensagem com IA e mostra o
que precisa ser feito hoje.

## Para quem

**ICP inicial:** PME brasileira de serviço, 1 a 10 pessoas, que recebe pedido de
orçamento por WhatsApp / site / Google e perde venda por esquecimento, não por preço.
Exemplos: prestadores de serviço local, agências pequenas, oficinas, clínicas,
consultorias, lojas com venda consultiva.

**Não é para:** e-commerce de alto volume transacional, times comerciais de 20+
vendedores com CRM enterprise já implantado, operação que precisa de forecast e
territórios.

**Cliente #0:** a própria DevRR. O sistema roda em produção na operação real da
empresa antes de qualquer cliente externo. Se algo é chato pra você usar todo dia,
é chato pro cliente também.

## O problema, exato

Não é "falta de CRM". É que o dono da PME:

1. Recebe o contato no WhatsApp junto com mensagem de família e fornecedor.
2. Manda o orçamento.
3. O cliente não responde.
4. Ninguém volta a falar com esse cliente. Nunca.

A venda não é perdida na negociação. É perdida no silêncio depois da proposta.

## A tese

O valor não está em armazenar o lead. Está em **forçar a próxima ação existir**.
Toda tela do produto responde a uma pergunta operacional, não a uma pergunta de
relatório:

- Quem eu preciso responder hoje?
- Quem recebeu proposta e sumiu?
- O que eu digo pra essa pessoa agora?

## Escopo por fase

### Em escopo — MVP (Fases 1 a 6, "Recuperador de Leads")

- Login e conta de empresa (multiempresa desde o dia 1).
- Cadastro de contato (a pessoa) e de lead (o interesse dela).
- Pipeline de status configurável por empresa.
- Registro de atividade/histórico por lead.
- Follow-up agendado: automático por regra, manual quando quiser.
- Cancelamento automático de follow-ups futuros quando o cliente responde.
- Tela **Ações de hoje**: a única tela que o usuário abre de manhã.
- Geração de mensagem de follow-up com IA, com contexto real do lead.
- Fluxo copiar → marcar como enviada. Sem integração de WhatsApp no MVP.

### Fora de escopo do MVP, planejado depois

| Depois | O quê | Por que não agora |
|---|---|---|
| Fase 7 | Agendamento + lembretes | Só faz sentido com leads reais fluindo |
| Fase 8 | Gerador de propostas + PDF | Depende de catálogo de serviços maduro |
| Fase 9 | Kanban visual do pipeline | Lista + Ações de hoje resolvem com <50 leads |
| Fase 10 | IA comercial conversacional + WhatsApp Cloud API | Precisa de fluxo humano validado antes |
| Fase 11 | Dashboard comercial | Precisa de dados reais acumulados |
| Fase 12 | Assistente interno com documentos (RAG) | Produto adjacente, não bloqueia nada |

### Fora de escopo, ponto final (por enquanto)

Microserviços. Kubernetes. Filas. Múltiplos agentes de IA conversando entre si.
Sistema de permissões granular. Arquitetura para milhões de usuários. App mobile
nativo. Integração com ERP.

## Regras de produto inegociáveis

1. **A IA nunca decide dado comercial.** Preço, prazo, desconto, produto e política
   vêm do banco. A IA escreve o texto ao redor deles. Se ela não tem o dado, ela
   declara que não tem — não estima.
2. **Nada é enviado sozinho no MVP.** Todo output de IA passa por aprovação humana.
   O usuário lê, edita se quiser, copia, envia pelo canal dele.
3. **Cliente respondeu = todo follow-up automático futuro daquele lead é cancelado.**
   Nada é mais destruidor de confiança do que o sistema cobrar um cliente que já
   respondeu.
4. **Toda tela responde uma pergunta operacional.** Se uma tela só existe pra ser
   bonita em demo, ela não entra.
5. **Nenhum dado mockado em tela.** Se não tem dado, mostra estado vazio honesto com
   a próxima ação sugerida.

## Definição de pronto do MVP

O sistema está pronto quando, usando dados reais da DevRR, ele responde:

- Quantos leads entraram no período?
- Quem pediu orçamento e ainda não recebeu proposta?
- Quem recebeu proposta e não respondeu?
- Quem precisa de follow-up **hoje**?
- Quanto existe em negociação aberta?
- Qual serviço puxa mais interesse?

E o fluxo completo funciona ponta a ponta:

```
criar lead → mover para proposta_enviada → follow-up é agendado sozinho
→ chega o dia → aparece em Ações de hoje → IA escreve a mensagem
→ copiar → marcar como enviada → cliente responde → marcar como respondido
→ follow-ups futuros somem
```

## Modelo comercial futuro (não implementar agora)

Produto 1 vendido como **recuperação de leads**, não como CRM. A dor que o dono
reconhece é "eu esqueço de dar retorno", não "eu não tenho CRM".

Pitch: *"Seu time recebe pedido de orçamento e depois esquece de acompanhar? O
sistema identifica automaticamente quem precisa receber retorno hoje."*

Pacotes futuros (Recuperação → Atendimento → Comercial completo) estão em
`ROADMAP_ORIGINAL.md` seção 15. Nada disso afeta decisão técnica no MVP, exceto
uma: **multiempresa desde o dia 1**, porque retrofitar isso depois custa reescrever
todas as policies e todas as queries.
