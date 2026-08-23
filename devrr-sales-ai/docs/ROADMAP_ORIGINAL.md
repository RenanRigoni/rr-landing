# Roadmap de Produtos com IA para PMEs
## Laboratório inicial: empresa própria / WhatsApp empresarial

Este documento organiza os projetos em ordem de prioridade para desenvolvimento, testes internos e futura comercialização.

A proposta é NÃO criar oito sistemas totalmente separados. O ideal é evoluir uma única base de plataforma e adicionar módulos progressivamente.

---

# 0. Estratégia geral

## Objetivo

Transformar a empresa freelancer em um laboratório real para desenvolver, testar e validar soluções de automação, IA e gestão comercial voltadas para pequenas e médias empresas.

O primeiro ambiente de testes será a própria operação da empresa:

- site / landing pages;
- WhatsApp empresarial;
- contatos recebidos;
- pedidos de orçamento;
- follow-ups;
- propostas;
- agendamentos;
- pipeline comercial;
- relatórios.

Isso permite testar os produtos usando situações reais antes de implantá-los em clientes.

## Regra principal

Não começar construindo um SaaS completo.

Construir módulo por módulo:

1. Recuperador de leads
2. Agendamento e lembretes
3. Gerador de propostas
4. Mini CRM
5. IA comercial no WhatsApp
6. Dashboard comercial
7. Assistente interno com IA
8. Sistema comercial completo

Cada módulo deve funcionar sozinho, mas compartilhar a mesma estrutura central.

---

# 1. Arquitetura-base sugerida

## Stack inicial

Sugestão:

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Auth
- API de IA
- WhatsApp Cloud API
- Vercel

Opcional posteriormente:

- Redis / filas
- cron jobs
- serviço de e-mail
- storage de arquivos
- geração de PDF
- webhooks
- observabilidade / logs

## Entidades principais

Estrutura inicial:

```text
companies
users
customers
leads
conversations
messages
tasks
followups
appointments
proposals
proposal_items
sales
products
services
files
ai_actions
activity_logs
```

## Multiempresa desde o início

Mesmo testando inicialmente apenas na empresa própria, todas as tabelas importantes devem possuir:

```text
company_id
```

Objetivo:

Evitar ter que reconstruir toda a aplicação quando surgirem clientes.

---

# 2. PROJETO 1 — Recuperador Automático de Leads

## Prioridade

1º projeto.

## Problema

Clientes entram em contato, pedem orçamento ou informações e depois deixam de responder.

O vendedor esquece de fazer acompanhamento e oportunidades são perdidas.

## Proposta

Criar um sistema que identifique leads sem resposta e programe follow-ups automaticamente.

## Teste inicial na empresa própria

Usar os próprios contatos de pessoas interessadas em:

- landing pages;
- sites;
- Google Business Profile;
- automações;
- IA;
- sistemas;
- serviços digitais.

Exemplo:

```text
Cliente pede orçamento
↓
Proposta enviada
↓
Cliente não respondeu
↓
Sistema aguarda
↓
Follow-up sugerido/automático
↓
Cliente responde
↓
Próximos follow-ups são cancelados
```

## MVP

Criar:

- cadastro de cliente;
- cadastro de lead;
- origem do lead;
- interesse;
- status;
- valor potencial;
- data do último contato;
- próxima ação;
- criação de follow-up;
- histórico de follow-ups;
- opção de marcar como respondido;
- cancelamento automático de follow-ups futuros.

## Status sugeridos

```text
novo
contatado
qualificado
proposta_enviada
aguardando_resposta
followup
negociacao
ganho
perdido
```

## Regras de follow-up

Exemplo inicial:

```text
Proposta enviada
+ 1 dia → Follow-up 1
+ 3 dias → Follow-up 2
+ 7 dias → Follow-up 3
```

Os intervalos devem ser configuráveis por empresa.

## IA

A IA pode:

- sugerir mensagens;
- analisar histórico;
- identificar contexto;
- personalizar o follow-up;
- classificar interesse;
- sugerir próxima ação.

## Primeira versão

Não integrar WhatsApp imediatamente.

Criar um simulador interno de mensagens.

Exemplo:

```text
Mensagem sugerida:

"Olá, Carlos. Conseguiu analisar a proposta que enviei sobre a landing page?
Se quiser, posso esclarecer qualquer ponto ou ajustar o projeto."
```

Botões:

```text
Copiar mensagem
Marcar como enviada
Gerar outra versão
Cliente respondeu
```

## Segunda versão

Integrar WhatsApp.

## Critérios de conclusão do MVP

O sistema deve conseguir:

1. criar um lead;
2. registrar uma proposta enviada;
3. calcular automaticamente o próximo follow-up;
4. gerar uma mensagem com IA;
5. registrar envio;
6. cancelar follow-ups quando o cliente responder;
7. exibir todos os leads que precisam de ação hoje.

---

# 3. PROJETO 2 — Agendamento + Confirmação + Lembretes

## Prioridade

2º projeto.

## Problema

Empresas perdem tempo organizando horários manualmente e sofrem com faltas e esquecimentos.

## Proposta

Criar um sistema de agendamento com confirmação e lembretes automáticos.

## Teste na própria empresa

Criar agendamentos para:

- reunião de briefing;
- reunião comercial;
- apresentação de proposta;
- suporte;
- reunião de acompanhamento.

## MVP

- cadastro de serviços;
- duração;
- agenda;
- horários disponíveis;
- bloqueio de horários;
- cadastro de cliente;
- criação de agendamento;
- confirmação;
- cancelamento;
- reagendamento;
- lembrete;
- histórico.

## Exemplo

```text
Reunião de briefing

Cliente: Empresa XPTO
Data: 28/08/2026
Horário: 14:00
Duração: 45 minutos
Status: Confirmado
```

## Lembretes

Configuração inicial:

```text
24 horas antes
2 horas antes
```

## IA

A IA pode ajudar em:

- mensagem de confirmação;
- mensagem de lembrete;
- resposta de reagendamento;
- resumo do briefing após reunião.

## Futuro

Criar página pública:

```text
seudominio.com/agendar
```

Cliente seleciona:

```text
Reunião comercial
Briefing
Suporte
```

E escolhe um horário.

## Critérios do MVP

- impedir dois agendamentos no mesmo horário;
- confirmar horário;
- cancelar;
- reagendar;
- criar lembrete;
- listar agenda diária/semanal.

---

# 4. PROJETO 3 — Gerador Inteligente de Propostas

## Prioridade

3º projeto.

## Problema

Criar propostas comerciais manualmente consome tempo e gera inconsistência.

## Proposta

Transformar dados do cliente em proposta comercial profissional.

## Teste na própria empresa

Cadastrar os serviços atuais.

Exemplo:

```text
Landing Page
Site Institucional
Google Business Profile
Automação
Sistema personalizado
IA para atendimento
Manutenção
```

## MVP

Formulário:

```text
Cliente
Empresa
Serviço
Descrição
Valor
Desconto
Prazo
Forma de pagamento
Validade
Observações
```

Botão:

```text
GERAR PROPOSTA
```

## Resultado

Criar:

- proposta visual;
- versão PDF;
- identificador;
- data;
- validade;
- total;
- itens;
- condições.

## IA

A IA pode:

- melhorar descrição;
- adaptar texto ao cliente;
- escrever escopo;
- criar resumo executivo;
- destacar benefícios;
- transformar briefing em proposta.

## Exemplo

Entrada:

```text
Cliente quer site para loja de móveis.
5 páginas.
WhatsApp.
Galeria de projetos.
Prazo 20 dias.
R$ 2.500.
```

Saída:

```text
Proposta Comercial
Desenvolvimento de Website Institucional

Objetivo:
Criar uma presença digital profissional para apresentação dos projetos...
```

## Futuro

Adicionar:

- link público;
- aceite;
- assinatura;
- status de visualização;
- proposta aceita;
- proposta recusada;
- integração com CRM.

## Critérios do MVP

1. cadastrar serviços;
2. montar proposta;
3. gerar conteúdo;
4. calcular total;
5. exportar PDF;
6. armazenar proposta no banco;
7. vincular proposta a cliente/lead.

---

# 5. PROJETO 4 — Mini CRM

## Prioridade

4º projeto.

## Observação

O CRM será uma parte importante da infraestrutura.

Não precisa ser vendido inicialmente como "CRM".

Ele dará suporte aos outros produtos.

## MVP

Criar pipeline:

```text
Novo
↓
Contato realizado
↓
Qualificado
↓
Proposta enviada
↓
Negociação
↓
Ganho / Perdido
```

## Tela principal

Kanban.

Cada card:

```text
Nome
Empresa
Interesse
Valor potencial
Último contato
Próxima ação
Temperatura
```

## Página do lead

Mostrar:

- dados;
- telefone;
- e-mail;
- origem;
- interesse;
- observações;
- histórico;
- propostas;
- mensagens;
- tarefas;
- follow-ups;
- agendamentos.

## Recursos

- busca;
- filtros;
- tags;
- vendedor responsável;
- origem do lead;
- valor potencial;
- motivos de perda.

## IA

A IA pode:

- resumir histórico;
- sugerir próxima ação;
- classificar lead;
- identificar oportunidade;
- alertar lead esquecido.

## Critérios do MVP

- criar lead;
- editar;
- mover entre etapas;
- registrar histórico;
- criar tarefa;
- mostrar oportunidades abertas;
- mostrar leads sem contato.

---

# 6. PROJETO 5 — IA Comercial no WhatsApp

## Prioridade

5º projeto.

## Problema

Empresas recebem muitas mensagens repetidas, demoram para responder e não qualificam corretamente os interessados.

## Proposta

Criar um agente comercial conectado ao WhatsApp empresarial.

## Teste inicial

Usar o próprio número empresarial.

A IA pode conhecer os serviços da empresa:

```text
Landing Pages
Sites
Google Business Profile
Automação
Sistemas
IA
Manutenção
```

## Primeira versão

Antes do WhatsApp real, criar um chat dentro do painel.

Simular o cliente.

Exemplo:

```text
Cliente:
"Quanto custa um site?"

IA:
"Depende do tipo de projeto. Você está buscando uma landing page para divulgação de um serviço ou um site com várias páginas?"
```

## Objetivo da IA

Não apenas responder perguntas.

Ela deve qualificar o lead.

Exemplo de informações:

```text
nome
empresa
tipo_de_projeto
objetivo
cidade
prazo
orcamento
possui_site
possui_dominio
urgencia
```

## Resultado

```text
LEAD QUALIFICADO

Empresa: Loja XPTO
Interesse: Site institucional
Prazo: até 30 dias
Orçamento: R$ 2.000–3.000
Possui domínio: sim
Urgência: alta

Temperatura: QUENTE
```

## Regras importantes

A IA deve:

- nunca inventar preço;
- nunca inventar prazo;
- consultar dados cadastrados;
- identificar quando não sabe;
- oferecer atendimento humano;
- registrar conversa;
- interromper automação quando necessário.

## Transferência para humano

Exemplos:

```text
cliente solicita humano
cliente faz reclamação
negociação avançada
pedido fora das regras
IA não possui informação
```

## WhatsApp Cloud API

Depois que o simulador estiver funcionando:

```text
WhatsApp
↓
Webhook
↓
Sistema
↓
IA
↓
Banco
↓
Resposta
```

## Áudios

Versão posterior:

```text
áudio
↓
transcrição
↓
IA
↓
resposta
```

## Imagens/documentos

Posteriormente:

```text
imagem / PDF
↓
análise
↓
registro
```

## Critérios do MVP

1. receber mensagem simulada;
2. manter histórico;
3. consultar catálogo de serviços;
4. qualificar lead;
5. gerar resumo;
6. criar lead automaticamente no CRM;
7. transferir para humano.

---

# 7. PROJETO 6 — Dashboard Comercial

## Prioridade

6º projeto.

## Objetivo

Transformar os dados acumulados pelos módulos anteriores em indicadores úteis.

## KPIs iniciais

```text
Leads recebidos
Leads qualificados
Propostas enviadas
Vendas
Taxa de conversão
Valor em negociação
Ticket médio
Tempo médio de resposta
Leads sem follow-up
Origem dos leads
Motivos de perda
```

## Filtros

```text
Hoje
7 dias
30 dias
Mês
Período personalizado
```

## Exemplos

```text
Leads: 54
Propostas: 21
Vendas: 7
Conversão: 12,9%
Pipeline: R$ 34.500
```

## IA

Criar campo:

```text
"Analise meu comercial"
```

IA responde:

```text
Você recebeu 18% mais leads neste mês, mas a taxa de conversão caiu de 14% para 9%.

O principal gargalo está entre proposta enviada e negociação.

Existem 11 propostas sem follow-up há mais de 4 dias.
```

## Critérios do MVP

- indicadores;
- período;
- gráficos;
- funil;
- comparação;
- alertas básicos.

---

# 8. PROJETO 7 — Assistente Interno com IA

## Prioridade

7º projeto.

## Problema

Informações da empresa ficam espalhadas em documentos, PDFs, planilhas e mensagens.

## Proposta

Criar uma IA que responda usando exclusivamente documentos e dados autorizados da empresa.

## Teste na própria empresa

Cadastrar:

- serviços;
- preços;
- políticas;
- contratos;
- processo comercial;
- briefing;
- perguntas frequentes;
- informações técnicas;
- padrões de desenvolvimento.

## Exemplos

Pergunta:

```text
Qual é o valor da landing page?
```

Resposta baseada nos dados cadastrados.

Pergunta:

```text
Qual é o processo depois que o cliente aprova o orçamento?
```

IA consulta os procedimentos internos.

## Regras

- citar fonte;
- não inventar;
- declarar quando informação não estiver disponível;
- separar documentos por empresa;
- respeitar permissões.

## Futuro

Pode virar:

- assistente de treinamento;
- suporte interno;
- onboarding;
- consulta de políticas;
- consulta de produtos.

---

# 9. PROJETO 8 — Sistema Comercial Completo

## Prioridade

Último projeto.

Não deve ser construído do zero.

Será a união dos módulos anteriores.

## Fluxo final

```text
Instagram / Site / Google / Indicação
                ↓
             WhatsApp
                ↓
          IA Comercial
                ↓
        Qualificação do Lead
                ↓
              CRM
                ↓
            Proposta
                ↓
          Follow-up
                ↓
           Negociação
                ↓
              Venda
                ↓
            Dashboard
```

## Módulos

```text
Dashboard
CRM
Clientes
Conversas
WhatsApp
Agendamentos
Propostas
Follow-ups
Produtos/Serviços
Automações
IA
Relatórios
Configurações
Usuários
```

---

# 10. Projeto-laboratório da empresa própria

Antes de buscar clientes, usar a própria empresa como Cliente #1.

## Configuração

```text
Empresa:
Sua empresa freelancer

Canal:
WhatsApp empresarial

Produtos/serviços:
Landing pages
Sites
Google Business Profile
Automação
IA
Sistemas personalizados
Manutenção
```

## Dados para testar

Criar inicialmente leads fictícios.

Exemplo:

```text
Lead 01
Interessado em Landing Page

Lead 02
Interessado em Google Business Profile

Lead 03
Interessado em automação WhatsApp

Lead 04
Interessado em site institucional
```

Depois começar a registrar contatos reais.

## Objetivo

Usar diariamente o próprio sistema.

Se algo for inconveniente para você, provavelmente também será inconveniente para o cliente.

---

# 11. Estrutura recomendada do painel

```text
/app
    /dashboard
    /leads
    /customers
    /crm
    /conversations
    /followups
    /appointments
    /proposals
    /services
    /automations
    /settings
```

Menu inicial pode ser menor:

```text
Dashboard
Leads
Follow-ups
Propostas
Configurações
```

Adicionar novos módulos somente quando forem necessários.

---

# 12. Ordem real de desenvolvimento

## Fase 1

Recuperador de Leads

Construir:

```text
auth
empresa
clientes
leads
status
followups
tarefas
```

## Fase 2

Agendamento

Adicionar:

```text
services
appointments
availability
reminders
```

## Fase 3

Propostas

Adicionar:

```text
proposals
proposal_items
pdf
```

## Fase 4

CRM

Transformar os leads em pipeline visual.

## Fase 5

IA + WhatsApp

Adicionar:

```text
conversations
messages
ai_agent
whatsapp_webhook
human_handoff
```

## Fase 6

Dashboard

Criar métricas em cima dos dados reais.

## Fase 7

Assistente Interno

Documentos + recuperação de contexto.

## Fase 8

Produto final

Padronização multiempresa e comercialização.

---

# 13. Princípios de desenvolvimento

## Não criar complexidade antecipadamente

Evitar no início:

- microserviços;
- Kubernetes;
- infraestrutura excessiva;
- dezenas de permissões;
- arquitetura para milhões de usuários;
- múltiplos agentes IA;
- integrações desnecessárias.

## Sempre construir primeiro

```text
problema
↓
fluxo mínimo
↓
teste real
↓
melhoria
↓
automação
```

## Sempre registrar logs

Principalmente:

```text
webhooks
mensagens
IA
follow-ups
erros
ações automáticas
```

## IA nunca deve ser autoridade absoluta

Dados críticos como:

```text
preço
desconto
prazo
produto
estoque
política
```

devem vir do banco ou de regras configuradas.

A IA interpreta e conversa.

Ela não deve inventar regras comerciais.

---

# 14. Modelo de evolução comercial

## Produto 1

Recuperação automática de leads.

Venda:

```text
"Seu time recebe pedidos de orçamento e depois esquece de acompanhar?
O sistema identifica automaticamente quem precisa receber retorno."
```

## Produto 2

Agendamento inteligente.

## Produto 3

Propostas automáticas.

## Produto 4

Atendimento comercial com IA.

## Produto 5

Sistema comercial completo.

---

# 15. Ideia de pacotes futuros

## Recuperação

```text
CRM básico
Follow-ups
Alertas
Histórico
```

## Atendimento

```text
WhatsApp
IA
Qualificação
CRM
```

## Comercial

```text
WhatsApp
IA
CRM
Follow-up
Propostas
Agendamento
Dashboard
```

---

# 16. Regra para o Codex

Ao trabalhar em cada projeto, não pedir ao Codex para construir toda a plataforma de uma vez.

Usar tarefas pequenas.

Exemplo ruim:

```text
Crie um CRM completo com IA e WhatsApp.
```

Exemplo melhor:

```text
Implemente o cadastro de leads.

Requisitos:
- Next.js + TypeScript
- Supabase
- cada lead pertence a uma company
- campos...
- validação...
- página...
- RLS...
- testes...
```

Depois:

```text
Agora implemente a criação automática de follow-up quando o lead mudar para proposta_enviada.
```

---

# 17. Checklist inicial

Começar pelo Projeto 1.

## Primeiro marco

- [ ] Criar repositório
- [ ] Criar projeto Next.js
- [ ] Criar Supabase
- [ ] Configurar autenticação
- [ ] Criar company
- [ ] Criar usuário
- [ ] Criar customers
- [ ] Criar leads
- [ ] Criar pipeline/status
- [ ] Criar followups
- [ ] Criar tela "Ações de hoje"
- [ ] Criar histórico
- [ ] Criar gerador de mensagem por IA
- [ ] Testar com leads fictícios
- [ ] Começar a registrar leads reais da empresa

---

# 18. Meta do laboratório

Antes de oferecer a um cliente externo, conseguir utilizar a plataforma na própria empresa para responder:

```text
Quantos leads entraram?
Quem pediu orçamento?
Quem recebeu proposta?
Quem ainda não respondeu?
Quem precisa de follow-up hoje?
Quanto existe em negociação?
Quais serviços têm mais interesse?
Quais leads estão mais próximos de fechar?
```

Quando o sistema conseguir responder essas perguntas de forma confiável, já existe uma base comercial utilizável.

---

# 19. Próximo passo recomendado

Começar somente pelo:

```text
PROJETO 1 — RECUPERADOR AUTOMÁTICO DE LEADS
```

Primeiro objetivo técnico:

```text
Login
↓
Empresa
↓
Clientes
↓
Leads
↓
Status
↓
Follow-up
↓
Ações de hoje
```

Somente depois adicionar IA.

A IA deve melhorar um fluxo que já funciona.

Ela não deve ser usada para esconder um fluxo mal definido.
