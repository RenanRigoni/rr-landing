# Implementar Dossiê Digital Completo no Cadastro de Leads

Quero evoluir o cadastro de leads do meu CRM `devrr-sales-ai`.

Antes de alterar qualquer código:

1. Leia `CLAUDE.md`.
2. Analise a estrutura atual do projeto.
3. Identifique:

   * schema atual de `leads`;
   * migrations existentes;
   * actions/queries relacionadas a leads;
   * schemas Zod;
   * página/formulário de criação de lead;
   * página de visualização/edição;
   * padrões de UI já utilizados;
   * testes existentes.
4. Preserve a arquitetura e os padrões atuais.
5. Não refatore partes não relacionadas.
6. Faça migrations seguras e compatíveis com leads já existentes.

O objetivo desta alteração é transformar o cadastro atual de um lead em um **Dossiê Digital Comercial**, usado antes de uma prospecção ativa.

Neste momento, NÃO estamos avaliando conversa de WhatsApp, atendimento comercial ou Cliente Oculto.

Esta fase trata SOMENTE da presença digital pública da empresa.

---

# 1. MANTER CAMPOS COMERCIAIS ATUAIS

Preservar os campos que já existem:

* Nome
* Telefone
* E-mail
* Empresa
* Título do lead
* Interesse
* Fonte
* Valor potencial
* Observações

Não remover funcionalidades existentes.

---

# 2. CRIAR SEÇÃO: ORIGEM DA PROSPECÇÃO

Adicionar campos estruturados:

### Pesquisa realizada

`search_query`

Texto.

Exemplo:

`clareamento dental`

### Cidade/região pesquisada

`search_location`

Exemplo:

`Uberlândia - MG`

### Data da pesquisa

`digital_research_date`

Data.

### Encontrado no Google?

`found_on_google`

* Sim
* Não

### Tipo de resultado

`google_result_type`

Select:

* Orgânico
* Patrocinado
* Google Maps
* Outro
* Não identificado

### Está anunciando?

`google_ads_active`

* Sim
* Não
* Não identificado

Considerar resultado marcado como "Patrocinado" como evidência de anúncio ativo naquele momento.

### Posição patrocinada

`google_ads_position`

Número opcional.

Exemplo:

1

### Posição orgânica

`google_organic_position`

Número opcional.

Não misturar posição patrocinada com posição orgânica.

### URL usada para encontrar a empresa

`google_search_result_url`

URL opcional.

---

# 3. CRIAR SEÇÃO: GOOGLE BUSINESS PROFILE / GOOGLE MAPS

Adicionar:

### Possui Perfil da Empresa no Google?

`google_business_profile`

* Sim
* Não
* Não identificado

### Nome exibido no Google

`google_business_name`

Texto.

### Categoria principal

`google_business_category`

Texto.

Exemplo:

`Clínica odontológica`

### Nota Google

`google_rating`

Decimal de 0 a 5.

Exemplo:

`4.9`

### Quantidade de avaliações

`google_reviews_count`

Inteiro.

### Possui avaliações recentes?

`google_recent_reviews`

* Sim
* Não
* Não analisado

### Empresa responde avaliações?

`google_replies_reviews`

* Frequentemente
* Algumas
* Não
* Não analisado

### Possui fotos?

`google_has_photos`

* Sim
* Não
* Não analisado

### Horário informado?

`google_has_hours`

* Sim
* Não

### Telefone disponível diretamente no Google?

`google_has_phone`

* Sim
* Não

### Website disponível diretamente no Google?

`google_has_website`

* Sim
* Não

### WhatsApp fácil de acessar pelo Google?

`google_easy_whatsapp`

* Sim
* Não

O objetivo é registrar se um potencial cliente consegue chegar facilmente ao WhatsApp a partir da presença da empresa no Google.

### Agendamento disponível?

`google_has_booking`

* Sim
* Não

### Perfil parece completo?

`google_profile_completeness`

Select:

* Excelente
* Bom
* Regular
* Ruim
* Não analisado

### Observações sobre Google

`google_notes`

Textarea.

---

# 4. CRIAR SEÇÃO: WEBSITE

### Possui site?

`website_exists`

* Sim
* Não

Quando SIM, exibir os demais campos desta seção.

### URL

`website_url`

URL.

### HTTPS funcionando?

`website_https`

* Sim
* Não
* Não analisado

### Site funciona bem no celular?

`website_mobile_friendly`

* Sim
* Parcialmente
* Não
* Não analisado

### Aparência profissional?

`website_visual_quality`

* Excelente
* Boa
* Regular
* Ruim
* Não analisado

### Carregamento percebido

`website_perceived_speed`

* Rápido
* Aceitável
* Lento
* Muito lento
* Não analisado

### Serviços são fáceis de encontrar?

`website_services_clear`

* Sim
* Parcialmente
* Não

### Possui página específica do serviço pesquisado?

`website_has_target_service_page`

* Sim
* Não

Exemplo desta prospecção:

se encontrei a empresa pesquisando `clareamento dental`, registrar se existe página específica sobre clareamento dental.

### URL da página do serviço

`website_target_service_url`

URL opcional.

### CTA claro?

`website_has_clear_cta`

* Sim
* Não

Exemplos:

* Agende sua consulta
* Fale pelo WhatsApp
* Solicite avaliação
* Entre em contato

### WhatsApp visível?

`website_has_whatsapp`

* Sim
* Não

### WhatsApp clicável?

`website_whatsapp_clickable`

* Sim
* Não
* Não se aplica

### Botão flutuante de WhatsApp?

`website_whatsapp_floating`

* Sim
* Não

### Formulário de contato?

`website_has_contact_form`

* Sim
* Não

### Agendamento online?

`website_has_online_booking`

* Sim
* Não

### Telefone fácil de localizar?

`website_phone_visible`

* Sim
* Não

### Endereço fácil de localizar?

`website_address_visible`

* Sim
* Não

### Possui prova social?

`website_has_social_proof`

* Sim
* Não

Exemplos:

* avaliações;
* depoimentos;
* cases;
* resultados;
* avaliações Google incorporadas.

### Possui diferenciais claros?

`website_has_clear_differentiators`

* Sim
* Não

### Possui apresentação da equipe/profissionais?

`website_has_team`

* Sim
* Não

### Possui conteúdo atualizado?

`website_content_updated`

* Sim
* Não
* Não identificado

### Observações do site

`website_notes`

Textarea.

---

# 5. CRIAR SEÇÃO: CONVERSÃO DIGITAL

Essa seção é importante porque quero identificar empresas que possuem presença digital, mas apresentam vazamentos na transformação do visitante em lead.

Adicionar:

### Existe caminho evidente até contato?

`conversion_clear_contact_path`

* Sim
* Parcialmente
* Não

### Quantidade aproximada de cliques até WhatsApp

`conversion_clicks_to_whatsapp`

Número opcional.

Exemplo:

1

### Existe CTA acima da dobra?

`conversion_cta_above_fold`

* Sim
* Não
* Não analisado

### CTA aparece em diferentes partes do site?

`conversion_repeated_cta`

* Sim
* Não
* Não analisado

### Existe captura alternativa ao WhatsApp?

`conversion_alternative_capture`

* Sim
* Não

Exemplos:

* formulário;
* agendamento;
* chat;
* telefone;
* e-mail.

### Jornada parece gerar fricção?

`conversion_has_friction`

* Sim
* Não
* Não analisado

### Principais fricções encontradas

`conversion_friction_notes`

Textarea.

Exemplos:

* botão não funciona;
* WhatsApp escondido;
* formulário muito grande;
* site lento;
* CTA pouco claro;
* página não explica tratamento;
* contato difícil de encontrar.

---

# 6. CRIAR SEÇÃO: INSTAGRAM / REDES SOCIAIS

### Possui Instagram?

`instagram_exists`

* Sim
* Não

### Usuário

`instagram_username`

Texto.

Exemplo:

`@clinicaexemplo`

### URL

`instagram_url`

URL.

### Link na bio?

`instagram_has_bio_link`

* Sim
* Não

### Bio explica claramente o negócio?

`instagram_clear_bio`

* Sim
* Parcialmente
* Não

### Possui CTA na bio?

`instagram_has_cta`

* Sim
* Não

### WhatsApp fácil de acessar?

`instagram_easy_whatsapp`

* Sim
* Não

### Site fácil de acessar?

`instagram_easy_website`

* Sim
* Não

### Perfil está ativo?

`instagram_active`

* Sim
* Pouco ativo
* Não
* Não analisado

### Data aproximada da última publicação

`instagram_last_post_date`

Data opcional.

### Qualidade visual

`instagram_visual_quality`

* Excelente
* Boa
* Regular
* Ruim
* Não analisado

### Conteúdo demonstra serviços?

`instagram_services_content`

* Sim
* Parcialmente
* Não

### Conteúdo possui CTA?

`instagram_content_cta`

* Frequentemente
* Algumas vezes
* Raramente
* Não

### Observações Instagram

`instagram_notes`

Textarea.

---

# 7. CRIAR SEÇÃO: PAGESPEED INSIGHTS

Quero registrar resultados do Google PageSpeed Insights.

Separar claramente:

## MOBILE

### Performance

`pagespeed_mobile_performance`

0–100.

### Accessibility

`pagespeed_mobile_accessibility`

0–100.

### Best Practices

`pagespeed_mobile_best_practices`

0–100.

### SEO

`pagespeed_mobile_seo`

0–100.

### Core Web Vitals aprovado?

`pagespeed_mobile_core_web_vitals`

* Aprovado
* Reprovado
* Dados insuficientes
* Não analisado

### Largest Contentful Paint - LCP

`pagespeed_mobile_lcp`

Valor em segundos ou ms, desde que seja usado um padrão consistente em toda aplicação.

Preferência: armazenar em milissegundos e apresentar formatado em segundos.

### Interaction to Next Paint - INP

`pagespeed_mobile_inp`

ms.

### Cumulative Layout Shift - CLS

`pagespeed_mobile_cls`

decimal.

### First Contentful Paint - FCP

`pagespeed_mobile_fcp`

ms.

### Total Blocking Time - TBT

`pagespeed_mobile_tbt`

ms.

### Speed Index

`pagespeed_mobile_speed_index`

ms.

---

## DESKTOP

Criar os mesmos campos:

* `pagespeed_desktop_performance`
* `pagespeed_desktop_accessibility`
* `pagespeed_desktop_best_practices`
* `pagespeed_desktop_seo`
* `pagespeed_desktop_core_web_vitals`
* `pagespeed_desktop_lcp`
* `pagespeed_desktop_inp`
* `pagespeed_desktop_cls`
* `pagespeed_desktop_fcp`
* `pagespeed_desktop_tbt`
* `pagespeed_desktop_speed_index`

---

## INFORMAÇÕES GERAIS DO PAGESPEED

### URL analisada

`pagespeed_analyzed_url`

### Data/hora da análise

`pagespeed_analyzed_at`

### Link para relatório Mobile

`pagespeed_mobile_report_url`

### Link para relatório Desktop

`pagespeed_desktop_report_url`

### Dados de campo disponíveis?

`pagespeed_field_data_available`

* Sim
* Não

É importante diferenciar quando uma métrica vem de dados reais do Chrome/CrUX e quando existem apenas dados de laboratório Lighthouse.

### Observações PageSpeed

`pagespeed_notes`

Textarea.

---

# 8. CLASSIFICAÇÃO VISUAL AUTOMÁTICA DO PAGESPEED

Na interface, apresentar classificação baseada nos valores.

Não precisa persistir a classificação se ela puder ser derivada.

Para Performance, Accessibility, Best Practices e SEO:

* 90–100 = Bom
* 50–89 = Precisa melhorar
* 0–49 = Ruim

Para Core Web Vitals, aplicar limites oficiais atuais do Google quando possível.

Não hardcodar lógica duplicada em vários componentes.

Centralizar helpers.

---

# 9. CRIAR SEÇÃO: DIAGNÓSTICO DIGITAL

Quero conseguir registrar uma conclusão inicial antes de qualquer contato com a empresa.

### Principais problemas digitais encontrados

`digital_problems`

Textarea.

### Principais pontos positivos

`digital_strengths`

Textarea.

### Oportunidades identificadas

`digital_opportunities`

Permitir múltipla seleção:

* Google Business Profile
* Gestão/reputação Google
* Website
* Landing Page
* SEO local
* Performance do site
* UX/mobile
* Conversão
* WhatsApp
* Automação
* Agendamento
* Captação de leads
* Instagram
* CRM
* Analytics/Mensuração
* Outro

### Prioridade comercial percebida

`digital_sales_priority`

* Muito alta
* Alta
* Média
* Baixa
* Ainda não avaliada

### Potencial de melhoria digital

`digital_opportunity_score`

Número de 0 a 10.

### Justificativa do potencial

`digital_opportunity_reason`

Textarea.

---

# 10. SCORE DIGITAL

Quero um score de presença digital de 0 a 100.

Neste primeiro momento, ele pode ser calculado automaticamente usando informações objetivas cadastradas.

Divisão sugerida:

* Google / Google Business: 20 pontos
* Website: 25 pontos
* Conversão: 20 pontos
* Performance/PageSpeed: 20 pontos
* Instagram/presença social: 15 pontos

Total: 100.

Criar:

`digital_score`

0–100.

Entretanto:

* não inventar dados ausentes;
* campos "Não analisado" não podem valer automaticamente como zero;
* diferenciar ausência real de informação não coletada;
* mostrar se o score é parcial.

Adicionar também:

`digital_score_completeness`

Percentual de campos necessários já avaliados.

Exemplo:

`74% analisado`

O score deve poder ser recalculado quando o cadastro for atualizado.

Centralizar regras de score em módulo separado e testável.

---

# 11. INTERFACE

O formulário não pode virar uma página gigantesca e confusa.

Organizar em seções recolhíveis/accordions:

1. Dados do lead
2. Origem da prospecção
3. Google
4. Website
5. Conversão
6. Instagram
7. PageSpeed
8. Diagnóstico digital

Mostrar no topo um resumo com:

* Empresa
* Score digital
* Completude da análise
* Google Ads: Sim/Não
* Site: Sim/Não
* Nota Google
* Nº avaliações
* Performance Mobile
* Performance Desktop
* Potencial de melhoria 0–10

Campos condicionais devem aparecer somente quando fizer sentido.

Exemplo:

`Possui site? NÃO`

não mostrar dezenas de campos relacionados ao site.

Preservar responsividade e identidade visual atual do CRM.

---

# 12. FACILITAR PREENCHIMENTO

Quero reduzir trabalho manual.

Adicionar ações como:

### "Não analisado"

Nos campos aplicáveis.

### "Limpar seção"

Sem apagar dados de outras partes do lead.

### Salvar progresso

Não exigir que todo o dossiê esteja completo para salvar.

Preciso conseguir criar o lead hoje e continuar preenchendo depois.

---

# 13. EXPORTAÇÃO INDIVIDUAL DO DOSSIÊ

Isso é MUITO IMPORTANTE.

Na página do lead, adicionar botão:

`Exportar dossiê`

Com pelo menos:

### JSON

Arquivo `.json` contendo TODOS os dados do lead, inclusive valores nulos/não analisados quando relevante.

Organizar por objetos:

```json
{
  "lead": {},
  "prospecting": {},
  "google": {},
  "website": {},
  "conversion": {},
  "instagram": {},
  "pagespeed": {
    "mobile": {},
    "desktop": {}
  },
  "diagnostic": {}
}
```

Não gerar um JSON achatado com dezenas de propriedades misturadas.

---

# 14. BOTÃO "COPIAR DOSSIÊ"

Adicionar botão:

`Copiar dossiê`

Esse botão deve copiar para a área de transferência uma versão Markdown/texto limpa e estruturada para eu colar diretamente em uma IA.

Formato aproximado:

```text
# DOSSIÊ DIGITAL DO LEAD

## IDENTIFICAÇÃO
Empresa:
Nome:
Telefone:
Fonte:
Data da análise:

## ORIGEM
Pesquisa:
Local:
Tipo de resultado:
Google Ads:
Posição patrocinada:
Posição orgânica:

## GOOGLE
Nota:
Avaliações:
Categoria:
WhatsApp fácil:
Website:
Agendamento:
Perfil:

## WEBSITE
Possui:
URL:
Mobile:
CTA:
WhatsApp:
Formulário:
Agendamento:
Página do serviço:
Prova social:
Diferenciais:

## CONVERSÃO
Caminho para contato:
Cliques até WhatsApp:
CTA acima da dobra:
Fricções:

## INSTAGRAM
Perfil:
URL:
Bio:
CTA:
WhatsApp:
Atividade:
Qualidade:

## PAGESPEED MOBILE
Performance:
Accessibility:
Best Practices:
SEO:
Core Web Vitals:
LCP:
INP:
CLS:
FCP:
TBT:
Speed Index:

## PAGESPEED DESKTOP
Performance:
Accessibility:
Best Practices:
SEO:
Core Web Vitals:
LCP:
INP:
CLS:
FCP:
TBT:
Speed Index:

## DIAGNÓSTICO
Score digital:
Completude:
Potencial de melhoria:
Pontos positivos:
Problemas:
Oportunidades:
Observações:
```

Não incluir campos irrelevantes totalmente vazios de maneira que deixe a saída ilegível.

Quero poder clicar em **Copiar dossiê**, voltar ao ChatGPT e simplesmente colar o conteúdo.

---

# 15. EXPORTAÇÃO EM MASSA

Adicionar opção para exportar leads em:

* CSV
* JSON

Na exportação CSV, utilizar colunas achatadas, porque CSV não possui estrutura aninhada.

Exemplo:

`google_rating`

`google_reviews_count`

`website_exists`

`website_url`

`pagespeed_mobile_performance`

etc.

Isso servirá posteriormente para comparar dezenas ou centenas de empresas.

---

# 16. BANCO DE DADOS

Analise se tecnicamente faz mais sentido:

A. adicionar todos esses campos diretamente à tabela `sales.leads`;

OU

B. criar uma tabela específica como:

`sales.lead_digital_audits`

relacionada ao lead.

Minha preferência conceitual é separar o dossiê digital dos dados básicos do lead, pois futuramente um mesmo lead poderá possuir novas auditorias em datas diferentes.

Se a arquitetura atual comportar isso bem, prefira:

`lead_digital_audits`

Campos mínimos:

* id
* org_id
* lead_id
* researched_at
* created_at
* updated_at
* demais campos do diagnóstico

Manter isolamento por organização e RLS seguindo exatamente o padrão existente do projeto.

Não crie arquitetura complexa desnecessariamente.

Antes de implementar, avalie a solução mais coerente com o código atual.

---

# 17. PREPARAR PARA HISTÓRICO

Mesmo que inicialmente exista apenas uma auditoria por lead, estruturar de maneira que futuramente seja possível comparar:

`Análise 27/08/2026`

versus

`Análise 27/11/2026`

e descobrir se a presença digital melhorou.

Não é necessário desenvolver tela complexa de comparação agora.

Apenas não tomar decisões de banco que impeçam isso depois.

---

# 18. PAGESPEED AUTOMÁTICO

Verifique se podemos implementar de maneira simples uma ação:

`Consultar PageSpeed`

O usuário informa `website_url`.

O CRM consulta Google PageSpeed Insights e preenche automaticamente Mobile e Desktop.

Requisitos:

* não introduzir serviço pago;
* não colocar segredo no client;
* fazer chamada server-side;
* tratar timeout;
* tratar ausência de dados CrUX;
* tratar site indisponível;
* permitir editar os valores manualmente;
* registrar data da consulta;
* não bloquear o cadastro do lead se PageSpeed falhar.

Se isso exigir credencial/API key que ainda não existe no projeto, implemente a estrutura preparada e documente a variável necessária, sem colocar nenhuma chave hardcoded.

Não invente uma API.

Use somente integração oficial do Google.

---

# 19. VALIDAÇÃO

Atualizar schemas Zod.

Adicionar validações coerentes:

* rating Google: 0–5
* PageSpeed scores: 0–100
* digital score: 0–100
* opportunity score: 0–10
* review count: >= 0
* URLs válidas
* posições: inteiros positivos
* CLS: >= 0
* métricas de tempo: >= 0

Campos opcionais devem continuar realmente opcionais.

---

# 20. TESTES

Criar testes para:

* schemas;
* criação;
* edição;
* persistência;
* isolamento por organização;
* score digital;
* completude;
* exportação JSON;
* geração Markdown do "Copiar dossiê";
* CSV;
* helpers PageSpeed;
* tratamento de campos não analisados;
* relacionamento lead → auditoria digital.

Executar toda a suíte relevante existente, não apenas os testes novos.

---

# 21. MIGRATION E COMPATIBILIDADE

Nenhum lead existente pode ser quebrado.

Todos os novos campos devem possuir estratégia correta de nullable/default.

Não apagar ou recriar dados existentes.

Manter RLS.

Manter multi-tenant.

Não utilizar service role desnecessariamente.

---

# 22. ENTREGA

Depois de implementar:

1. Liste os arquivos criados.
2. Liste os arquivos alterados.
3. Explique migrations.
4. Explique decisões de arquitetura.
5. Mostre como ficou o fluxo:

   * criar lead;
   * iniciar diagnóstico;
   * salvar;
   * editar;
   * consultar PageSpeed;
   * copiar dossiê;
   * exportar.
6. Informe testes executados e resultados.
7. Informe qualquer limitação encontrada.
8. Não avance para funcionalidades de análise de WhatsApp ou Cliente Oculto nesta tarefa.

O objetivo final é eu conseguir cadastrar uma clínica odontológica, documentar toda a presença digital pública dela e gerar um dossiê estruturado que possa ser enviado diretamente para uma IA para análise comercial antes da abordagem de vendas.
