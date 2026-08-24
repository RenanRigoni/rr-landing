-- Fase 2.5 — corrige a autorização de sales.organizations: a policy
-- tenant_isolation "for all" da 0002 dava a qualquer membro (inclusive
-- 'member') poder de UPDATE e DELETE sobre a própria organização. Achado A
-- do checkpoint Opus da Fase 2, provado por simulação SQL. Ver
-- docs/DECISIONS.md → D-017 e docs/DATABASE.md → sales.organizations.
--
-- Não altera 0001/0002 — substitui a policy incorreta nesta migration nova,
-- mesma tabela.

drop policy tenant_isolation on sales.organizations;

create policy tenant_isolation_select on sales.organizations
  for select to authenticated
  using (id in (select sales.current_org_ids()));

create policy owner_admin_update on sales.organizations
  for update to authenticated
  using (sales.current_org_role(id) in ('owner', 'admin'))
  with check (sales.current_org_role(id) in ('owner', 'admin'));

create policy owner_delete on sales.organizations
  for delete to authenticated
  using (sales.current_org_role(id) = 'owner');

-- Nenhuma policy de insert: a única criação legítima é a RPC
-- sales.create_organization(), security definer, que não passa por RLS.
-- Sem policy de insert, todo insert direto via PostgREST é negado.
