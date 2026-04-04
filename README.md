# Product Backlog - Receita da Vovo

## Contexto
Projeto de aplicativo de receitas com instrucoes detalhadas, planejamento de refeicoes e listas de compras.

## Escala
- Prioridade: Highest, High, Medium, Low
- Story Points: Fibonacci (1, 2, 3, 5, 8, 13)

## Epics
- EPIC-01: Autenticacao e Perfil
- EPIC-02: Receitas e Conteudo
- EPIC-03: Planejamento e Lista de Compras
- EPIC-04: Inteligencia e Recomendacoes
- EPIC-05: Experiencia de Preparo
- EPIC-06: Social, Comunidade e Compartilhamento
- EPIC-07: Offline e Sincronizacao
- EPIC-08: Arquitetura, API e Qualidade
- EPIC-09: Acessibilidade e Modos de Uso
- EPIC-10: Analytics e Crescimento

## Backlog Priorizado (visao de produto)

| ID | Epic | Story | Prioridade | Pontos |
|---|---|---|---|---|
| PB-01 | EPIC-01 | Cadastro com onboarding de preferencias e restricoes alimentares | Highest | 5 |
| PB-02 | EPIC-01 | Login social com Google e Apple | Highest | 8 |
| PB-03 | EPIC-01 | Login biometrico/facial para acesso rapido | High | 5 |
| PB-04 | EPIC-02 | Cadastro de receita com ingredientes, passos e fotos | Highest | 8 |
| PB-05 | EPIC-02 | Cadastro de receita com video curto de ate 8 segundos | High | 8 |
| PB-06 | EPIC-02 | Avaliacao de receitas com estrelas e comentario | Highest | 3 |
| PB-07 | EPIC-02 | Avaliacao de receitas com foto do resultado | High | 5 |
| PB-08 | EPIC-02 | Livro de receitas digital com colecoes personalizadas | High | 5 |
| PB-09 | EPIC-02 | Historico de receitas preparadas com notas | Highest | 3 |
| PB-10 | EPIC-02 | Conversao automatica de medidas por ingrediente | High | 8 |
| PB-11 | EPIC-02 | Calculo de custo total e custo por porcao | High | 5 |
| PB-12 | EPIC-02 | Informacao nutricional por porcao via API publica | High | 8 |
| PB-13 | EPIC-03 | Planejador semanal de refeicoes com drag and drop | Highest | 8 |
| PB-14 | EPIC-03 | Geracao automatica de lista de compras pelo planejamento | Highest | 8 |
| PB-15 | EPIC-03 | Adicionar ingredientes de uma receita para a lista | Highest | 3 |
| PB-16 | EPIC-03 | Lista de compras colaborativa em tempo real | High | 8 |
| PB-17 | EPIC-03 | Scanner de codigo de barras para adicionar ingrediente | Medium | 8 |
| PB-18 | EPIC-03 | Notificacoes de promocoes por geolocalizacao | Low | 13 |
| PB-19 | EPIC-04 | Sugestao de receitas com base em historico e clima | High | 8 |
| PB-20 | EPIC-04 | Sugestao de substituicao de ingredientes por restricao | High | 5 |
| PB-21 | EPIC-04 | Reconhecimento de ingredientes por foto com ML Kit local | High | 13 |
| PB-22 | EPIC-04 | Busca por voz com filtros de intencao | High | 5 |
| PB-23 | EPIC-05 | Timer por etapa com alerta por vibracao | Highest | 3 |
| PB-24 | EPIC-05 | Modo maos ocupadas com comandos de voz | High | 8 |
| PB-25 | EPIC-05 | Modo chef com tela ativa e prevencao de toque acidental | Medium | 5 |
| PB-26 | EPIC-05 | Modo noturno automatico por sensor de luz | Medium | 5 |
| PB-27 | EPIC-06 | Compartilhamento de receita via QR Code e deep link | High | 8 |
| PB-28 | EPIC-06 | Compartilhamento do planejamento semanal em imagem | Medium | 5 |
| PB-29 | EPIC-06 | Sistema de cozinheiros do mes com ranking | Low | 8 |
| PB-30 | EPIC-06 | Votacao de dificuldade e tempo real das receitas | Medium | 5 |
| PB-31 | EPIC-07 | Download de receitas com midia para uso offline completo | Medium | 13 |
| PB-32 | EPIC-07 | Cache inteligente de receitas vistas e favoritas | Highest | 8 |
| PB-33 | EPIC-07 | Edicao offline da lista de compras com sincronizacao | Highest | 8 |
| PB-34 | EPIC-08 | API REST Node.js + Express + MongoDB para dominio principal | Highest | 13 |
| PB-35 | EPIC-08 | API versionada em /api/v1 e documentada com Swagger | Highest | 5 |
| PB-36 | EPIC-08 | Tempo real com Firebase Realtime Database ou WebSockets | High | 8 |
| PB-37 | EPIC-08 | Arquitetura modular por features no app | Highest | 8 |
| PB-38 | EPIC-08 | Testes de interface para fluxos criticos | High | 8 |
| PB-39 | EPIC-08 | Layout responsivo para celulares e tablets | High | 5 |
| PB-40 | EPIC-09 | Modo crianca com interface simplificada | Medium | 5 |
| PB-41 | EPIC-10 | Analytics anonimo com consentimento do usuario | High | 5 |

---

## Ordem recomendada para Sprint 1
- PB-01, PB-02, PB-04, PB-13, PB-14, PB-15, PB-23, PB-32, PB-33, PB-34, PB-35, PB-37

## User Stories por Sprint (3 sprints)

### Sprint 1 - Base do produto

| ID | User Story | Prioridade | Pontos |
|---|---|---|---|
| PB-37 | Como time de desenvolvimento, quero modularizar o app por features para facilitar manutencao e evolucao. | Highest | 8 |
| PB-34 | Como time de produto, quero uma API REST com Node.js, Express e MongoDB para persistir usuarios, receitas e listas. | Highest | 13 |
| PB-35 | Como desenvolvedor, quero API versionada em /api/v1 e documentada com Swagger para garantir integracao estavel. | Highest | 5 |
| PB-01 | Como usuario novo, quero informar preferencias e restricoes no cadastro para receber experiencia personalizada. | Highest | 5 |
| PB-02 | Como usuario, quero fazer login com Google e Apple para acessar rapido e com menos friccao. | Highest | 8 |
| PB-04 | Como usuario, quero cadastrar receitas com ingredientes, passos e fotos para compartilhar meus pratos. | Highest | 8 |
| PB-13 | Como usuario, quero planejar refeicoes da semana com drag-and-drop para organizar minha rotina. | Highest | 8 |
| PB-14 | Como usuario, quero gerar lista de compras automaticamente do planejamento para economizar tempo. | Highest | 8 |
| PB-15 | Como usuario, quero adicionar ingredientes de uma receita para a lista com um toque para agilizar compras. | Highest | 3 |
| PB-23 | Como usuario em preparo, quero timer por etapa com vibracao para nao perder o ponto da receita. | Highest | 3 |
| PB-32 | Como usuario, quero acessar receitas vistas e favoritas em cache para consultar mesmo sem internet. | Highest | 8 |
| PB-33 | Como usuario, quero editar lista de compras offline e sincronizar depois para nao perder alteracoes. | Highest | 8 |
| PB-39 | Como usuario, quero telas responsivas em celular e tablet para usar o app com boa experiencia em qualquer dispositivo. | High | 5 |
| PB-38 | Como time de QA, quero testes de interface nos fluxos criticos para reduzir regressao em releases. | High | 8 |

### Sprint 2 - Consolidacao e engajamento

| ID | User Story | Prioridade | Pontos |
|---|---|---|---|
| PB-03 | Como usuario, quero login biometrico/facial para entrar de forma rapida e segura. | High | 5 |
| PB-06 | Como usuario, quero avaliar receitas com estrelas e comentario para ajudar outras pessoas. | Highest | 3 |
| PB-08 | Como usuario, quero organizar receitas favoritas em colecoes para encontrar facilmente depois. | High | 5 |
| PB-09 | Como usuario, quero historico de receitas preparadas com notas para acompanhar meu progresso. | Highest | 3 |
| PB-11 | Como usuario, quero calcular custo total e por porcao para planejar melhor gastos. | High | 5 |
| PB-12 | Como usuario, quero ver informacao nutricional por porcao para tomar decisoes alimentares melhores. | High | 8 |
| PB-16 | Como usuario, quero lista de compras colaborativa em tempo real para dividir tarefas com outra pessoa. | High | 8 |
| PB-19 | Como usuario, quero sugestoes de receitas por historico e clima para receber recomendacoes contextuais. | High | 8 |
| PB-20 | Como usuario com restricao, quero sugestoes de substituicao de ingredientes para adaptar receitas. | High | 5 |
| PB-22 | Como usuario, quero buscar por voz com filtros para encontrar receitas sem digitar. | High | 5 |
| PB-24 | Como usuario, quero usar comandos de voz no preparo para navegar sem tocar na tela. | High | 8 |
| PB-26 | Como usuario, quero modo noturno automatico por sensor de luz para conforto visual. | Medium | 5 |
| PB-27 | Como usuario, quero compartilhar receita por QR Code e deep link para facilitar troca com amigos. | High | 8 |
| PB-30 | Como usuario, quero votar dificuldade e tempo real da receita para orientar outros cozinheiros. | Medium | 5 |
| PB-36 | Como time tecnico, quero infraestrutura de tempo real para suportar colaboracao com baixa latencia. | High | 8 |
| PB-41 | Como time de produto, quero analytics com consentimento e anonimizado para entender uso do app. | High | 5 |

### Sprint 3 - Diferenciais avancados

| ID | User Story | Prioridade | Pontos |
|---|---|---|---|
| PB-05 | Como usuario, quero cadastrar receita com video curto para mostrar tecnica e resultado. | High | 8 |
| PB-07 | Como usuario, quero anexar foto do resultado na avaliacao para enriquecer feedback da comunidade. | High | 5 |
| PB-10 | Como usuario, quero conversao automatica de medidas por ingrediente para cozinhar com precisao. | High | 8 |
| PB-17 | Como usuario, quero escanear codigo de barras para adicionar itens na lista de compras rapidamente. | Medium | 8 |
| PB-18 | Como usuario, quero receber promocoes de mercados proximos por geolocalizacao para economizar. | Low | 13 |
| PB-21 | Como usuario, quero reconhecimento de ingredientes por foto para receber sugestoes de receitas relacionadas. | High | 13 |
| PB-25 | Como usuario em modo preparo, quero manter tela ativa e evitar toques acidentais para cozinhar sem interrupcoes. | Medium | 5 |
| PB-28 | Como usuario, quero compartilhar meu planejamento semanal em imagem para publicar em redes sociais. | Medium | 5 |
| PB-29 | Como usuario, quero ver ranking de cozinheiros do mes para gamificar contribuicoes. | Low | 8 |
| PB-31 | Como usuario, quero baixar receitas com midia para acesso offline completo. | Medium | 13 |
| PB-40 | Como responsavel, quero modo crianca com interface simplificada para uso supervisionado. | Medium | 5 |
