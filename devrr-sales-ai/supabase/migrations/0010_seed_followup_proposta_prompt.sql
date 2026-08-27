-- Fase 5.2 — semeia o prompt de IA padrão `followup_proposta` v1 em toda
-- organização nova. Ver docs/IMPLEMENTATION_PLAN.md → 5.2 e docs/DATABASE.md
-- → sales.ai_prompts / sales.seed_org_defaults.
--
-- Migration própria (não edição da 0009, já aplicada): "nova mudança de
-- banco = nova migration". A 0009 criou ai_prompts/ai_runs vazias; esta só
-- estende seed_org_defaults com o INSERT do prompt.
--
-- É o slug que as followup_rules semeadas na 0007 já referenciam
-- (prompt_slug = 'followup_proposta') — sem esta migration, toda org nova
-- tem regra de follow-up apontando para um prompt inexistente.
--
-- CREATE OR REPLACE preserva dono e grants (revogada de public/authenticated
-- na 0004, chamável só de dentro de create_organization). security definer
-- mantém-se necessário: roda antes da membership existir, a policy
-- tenant_isolation de ai_prompts bloquearia o próprio insert de seed — mesma
-- razão das tabelas de catálogo. Corpo das seções anteriores (0004 + 0007)
-- reproduzido na íntegra; a única adição é o bloco final de ai_prompts.
--
-- O contrato do prompt (system/variáveis/output) está em
-- docs/IMPLEMENTATION_PLAN.md → 5.2. renderTemplate() (lib/ai/gateway.ts, 5.1)
-- interpola apenas user_prompt_template — por isso {{empresa}} e as demais
-- variáveis ficam no template de usuário, e o system_prompt as referencia
-- como "a empresa identificada na mensagem". O schema Zod de saída vive em
-- lib/ai/schemas.ts (D-028: nasce nesta tarefa).

create or replace function sales.seed_org_defaults(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = sales, public
as $fn$
declare
  v_proposta_stage_id uuid;
begin
  insert into sales.lead_sources (org_id, name, position) values
    (p_org_id, 'Site', 0),
    (p_org_id, 'WhatsApp', 1),
    (p_org_id, 'Google', 2),
    (p_org_id, 'Instagram', 3),
    (p_org_id, 'Indicação', 4),
    (p_org_id, 'Outro', 5);

  insert into sales.pipeline_stages (org_id, key, label, position, probability, is_won, is_lost) values
    (p_org_id, 'novo', 'Novo', 0, 5, false, false),
    (p_org_id, 'contatado', 'Contatado', 1, 15, false, false),
    (p_org_id, 'qualificado', 'Qualificado', 2, 30, false, false),
    (p_org_id, 'proposta_enviada', 'Proposta enviada', 3, 50, false, false),
    (p_org_id, 'negociacao', 'Negociação', 4, 75, false, false),
    (p_org_id, 'ganho', 'Ganho', 5, 100, true, false),
    (p_org_id, 'perdido', 'Perdido', 6, 0, false, true);

  select id into v_proposta_stage_id
    from sales.pipeline_stages
   where org_id = p_org_id and key = 'proposta_enviada';

  insert into sales.followup_rules (org_id, trigger_stage_id, step_number, delay_days, channel, prompt_slug) values
    (p_org_id, v_proposta_stage_id, 1, 1, 'whatsapp', 'followup_proposta'),
    (p_org_id, v_proposta_stage_id, 2, 3, 'whatsapp', 'followup_proposta'),
    (p_org_id, v_proposta_stage_id, 3, 7, 'whatsapp', 'followup_proposta');

  -- Fase 5.2 — prompt padrão de follow-up. Um ativo por slug garantido pelo
  -- índice parcial ai_prompts_org_slug_active_idx (0009).
  insert into sales.ai_prompts
    (org_id, slug, version, system_prompt, user_prompt_template, model, temperature, is_active)
  values (
    p_org_id,
    'followup_proposta',
    1,
    $sys$Você escreve mensagens curtas de WhatsApp em português brasileiro, em nome da empresa identificada na mensagem abaixo. Tom profissional e direto, sem formalidade excessiva, sem excesso de emoji, sem abrir com "espero que esteja bem" ou equivalente. No máximo 3 frases.

Você NUNCA inventa preço, prazo, desconto, condição comercial ou qualquer dado que não tenha sido fornecido. Use exclusivamente as informações da mensagem. Se um dado não foi fornecido, não o mencione e não peça desculpas por não tê-lo — apenas escreva sem ele.

O passo do follow-up define a intenção da mensagem:
- Passo 1: lembrete leve, sem pressão.
- Passo 2: oferecer ajuda ou ajuste, abrir espaço para dúvida.
- Passo 3: pergunta de encerramento respeitosa, do tipo "faz sentido seguir agora ou prefere retomar mais pra frente?".

Responda no formato estruturado pedido: "message" é a mensagem pronta para enviar ao cliente; "tone" é "direto", "consultivo" ou "leve"; "reasoning" é uma frase explicando a escolha para o usuário do sistema e NUNCA é enviada ao cliente.$sys$,
    $usr$Empresa: {{empresa}}
Contato: {{contato_nome}}
Lead: {{lead_titulo}}
Interesse: {{interesse}}
Valor: {{valor}}
Dias desde o último contato: {{dias_desde_ultimo_contato}}
Estágio atual: {{estagio}}
Passo do follow-up: {{passo_followup}}
Histórico resumido: {{historico_resumido}}

Escreva a mensagem de follow-up para este lead, seguindo as regras do sistema e a intenção do passo {{passo_followup}}.$usr$,
    'anthropic/claude-sonnet-5',
    0.7,
    true
  );
end;
$fn$;
