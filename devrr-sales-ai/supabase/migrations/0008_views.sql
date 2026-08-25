-- Fase 4.3 — views de leitura da tela "Ações de hoje" (4.4) e da lista de
-- leads esquecidos. Ver docs/DATABASE.md → Views.
--
-- Nenhuma tabela nova, nenhuma policy nova: as duas views leem através de
-- `sales.activities`/`sales.leads`/`sales.contacts`/`sales.pipeline_stages`,
-- todas já com RLS `tenant_isolation`. `security_invoker = true` é o que
-- torna isso seguro — sem ele a view rodaria com o privilégio de quem a
-- criou (dono do schema), ignorando RLS por completo, e vazaria linhas de
-- todas as organizações para qualquer usuário autenticado.

create view sales.v_today_actions as
select a.id, a.org_id, a.lead_id, a.type, a.title, a.body, a.due_at,
       a.is_auto, a.step_number,
       l.title as lead_title, l.value_cents, l.stage_id,
       c.full_name as contact_name, c.phone as contact_phone,
       s.label as stage_label
  from sales.activities a
  join sales.leads l on l.id = a.lead_id
  join sales.contacts c on c.id = l.contact_id
  join sales.pipeline_stages s on s.id = l.stage_id
 where a.status = 'pending'
   and a.due_at is not null
   and l.status = 'open';

alter view sales.v_today_actions set (security_invoker = true);

create view sales.v_leads_without_action as
select l.id, l.org_id, l.title, l.value_cents, l.stage_id, l.last_contact_at,
       c.full_name as contact_name, c.phone as contact_phone,
       s.label as stage_label, s.position as stage_position
  from sales.leads l
  join sales.contacts c on c.id = l.contact_id
  join sales.pipeline_stages s on s.id = l.stage_id
 where l.status = 'open'
   and l.next_action_at is null;

alter view sales.v_leads_without_action set (security_invoker = true);
