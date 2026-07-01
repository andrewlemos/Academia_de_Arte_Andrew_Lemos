# Documentação de Arquitetura e Infraestrutura - Fase 0

Esta documentação detalha a infraestrutura base e as decisões de design arquitetural tomadas para a reconstrução completa da plataforma **Academia de Arte**.

---

## 📂 Estrutura de Pastas de Referência

A nova estrutura foi planejada seguindo princípios de **Clean Architecture**, **SOLID** e **Separation of Concerns (SoC)**, mantendo uma clara divisão entre responsabilidades de backend (Node/Express) e frontend (Vite/React).

```
/
├── server/                   # 🚀 Novo Core do Backend (Node.js/Express)
│   ├── config/               # Configurações centralizadas (Firebase, Env, etc.)
│   │   ├── env.ts            # Validação forte de variáveis de ambiente com Zod
│   │   └── firebase.ts       # Inicialização do Firebase Admin SDK
│   ├── middlewares/          # Middlewares globais do Express
│   │   ├── auth.middleware.ts# Verificação de tokens e controle de acesso (Fase 1)
│   │   ├── error.middleware.ts# Manipulador global de erros e tratamento de exceções
│   │   ├── logging.middleware.ts# Logging e monitoramento de performance por requisição
│   │   └── validation.middleware.ts# Validação genérica de payloads e parâmetros com Zod
│   ├── utils/                # Utilitários globais do backend
│   │   ├── logger.ts         # Logger estruturado de alta performance para Cloud Run
│   │   └── errors.ts         # Definição e mapeamento de erros HTTP operacionais
│   ├── routes/               # Gerenciador de rotas de API versionadas (/api/v1)
│   │   └── v1/
│   │       └── index.ts      # Registro centralizado de rotas
│   ├── tests/                # Testes automatizados de backend
│   │   └── infra.test.ts     # Suíte de validação de infraestrutura
│   ├── docs/                 # Documentação técnica e arquitetural de referência
│   │   └── FASE0_INFRAESTRUTURA.md
│   └── app.ts                # Inicialização e bootstrap do Express
│
├── src/                      # 🎨 Core do Frontend (Vite/React)
│   ├── api/                  # Clientes de API e wrappers de comunicação HTTP
│   ├── components/           # Componentes atômicos e reutilizáveis da UI
│   ├── pages/                # Páginas e views completas da aplicação
│   ├── hooks/                # Custom React Hooks (compartilhamento de estado e efeito)
│   ├── contexts/             # Provedores de contexto globais (ex: AuthContext)
│   ├── services/             # Lógica de integração e regras de negócio do client
│   ├── types/                # Definição de tipos TypeScript compartilhados
│   ├── utils/                # Utilitários puros do frontend (datas, moedas, etc.)
│   ├── App.tsx               # Roteador e layout central do cliente
│   ├── main.tsx              # Ponto de entrada do React
│   └── index.css             # Importação do Tailwind CSS v4 e fontes
```

---

## 🔌 Fluxograma de Tratamento de Requisições

```
Cliente (App React)
       │
       ▼ (Requisição HTTP)
┌─────────────────────────────────────────────────────────┐
│ Express Server (app.ts)                                 │
│                                                         │
│  1. Request Logger Middleware (Mede tempo de resposta)  │
│  2. JSON Parser (req.body)                              │
│                                                         │
│  3. Router (/api/v1/...)                                │
│       │                                                 │
│       ├─► [Validador Zod Middleware]                    │
│       │        Se falhar ──► Lança ZodError             │
│       │                                                 │
│       ├─► [Autenticador JWT Middleware]                 │
│       │        Se falhar ──► Lança UnauthorizedError    │
│       │                                                 │
│       └─► [Controller / Business Logic]                 │
│                Se falhar ──► Lança AppError específico  │
│                                                         │
│  4. Global Error Handler Middleware                     │
│       │                                                 │
│       ├─► Formata resposta padronizada JSON             │
│       └─► Registra log estruturado correspondente       │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Dependências da Fase 0

As seguintes ferramentas e bibliotecas fundamentais foram estabelecidas:
* **`express`**: Framework web robusto e maduro.
* **`firebase-admin`**: SDK oficial para manipulação autenticada e segura do Firestore e autenticação em nível de servidor (backend).
* **`zod`**: Biblioteca de validação de esquemas e inferência de tipos em tempo de execução, garantindo tipagem forte e à prova de falhas.
* **`tsx`**: Executor TypeScript para desenvolvimento ágil e execução de scripts de teste rápidos.

---

## 🛠️ Detalhamento das Decisões Técnicas

### 1. Descarte do `db.json` e Fallbacks Locais
* **Decisão**: Toda dependência de escrita ou leitura local de arquivos JSON para fins de persistência de banco de dados foi eliminada.
* **Motivo**: O Firestore é a única e soberana fonte de verdade. Arquivos locais em ambientes serverless como o Google Cloud Run são voláteis e causam perda de dados em múltiplos contêineres e inicializações a frio (cold starts).

### 2. Validação Centralizada de Ambiente com Zod
* **Decisão**: Validação estrita das variáveis de ambiente no startup em `config/env.ts`.
* **Motivo**: Permite o conceito de *fail-fast*. O contêiner não inicia se variáveis essenciais estiverem ausentes ou forem inválidas, evitando falhas silenciosas e difíceis de rastrear em produção.

### 3. Divisão de SDKs do Firebase (Web vs Admin)
* **Decisão**: Isolamento absoluto. O frontend consome apenas o Firebase Web SDK para autenticação do lado do cliente. O backend consome exclusivamente o `firebase-admin` com autenticação delegada de nível de servidor.
* **Motivo**: Evitar vazamento de chaves privadas administrativas e garantir total aderência ao princípio do privilégio mínimo.

### 4. Logger Estruturado sob Medida
* **Decisão**: Desenvolvimento de classe de log customizada com timestamps UTC e níveis semânticos (`INFO`, `WARN`, `ERROR`, `DEBUG`).
* **Motivo**: O Google Cloud Run consome nativamente saídas de console standard (`stdout`/`stderr`). Este logger garante o formato correto sem a sobrecarga de frameworks complexos de logging, mantendo o bundle leve e rápido.

### 5. Tratador de Erros Operacional vs. Não-Operacional
* **Decisão**: Criação da base `AppError` para gerenciar erros conhecidos da regra de negócio (operações normais de fluxo).
* **Motivo**: Se um erro é instanciado via `AppError`, sabemos que ele é seguro para exibição ao usuário final. Erros não operacionais (ex: conexões de banco perdidas) retornam erros genéricos (500) e salvaguardam detalhes internos de segurança.
