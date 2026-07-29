# Fase 1 — Sanitização de Tipos, Utilitários e Validações

## Contexto

O projeto é um monorepo TypeScript com Next.js (Web), Expo (Mobile) e um pacote `packages/api` compartilhado. Na Fase 1, o objetivo é sanitizar duplicações de tipos e utilitários, criar o pacote `@unipar/validation`, e extrair schemas Zod dos Route Handlers — tudo sem breaking changes na Web.

---

## Tarefa 1: Unificar `SessionUser` em `@unipar/types`

### Problema

`SessionUser`, `SessionRole` e `isAdmin()` estão duplicados em dois lugares:

- `lib/session.ts` (Web — usado por 19 arquivos Web)
- `packages/shared/types/src/session.ts` (compartilhado — usado pelo Mobile)

O conteúdo é idêntico. A definição canônica deve ficar apenas em `@unipar/types`.

### Plano

1. **Confirmar que `packages/shared/types/src/session.ts` é a versão canônica** — já é a mesma definição usada pelo Mobile. Nenhuma mudança necessária aqui.

2. **Substituir `lib/session.ts` por re-exports** para manter retrocompatibilidade durante a transição:
   - `lib/session.ts` passa a ser:
     ```ts
     export type { SessionRole, SessionUser } from "@unipar/types"
     export { isAdmin } from "@unipar/types"
     ```
   - Isso garante que nenhum import `@/lib/session` quebra imediatamente.

3. **Atualizar todos os imports Web de `@/lib/session` para `@unipar/types`**:
   - Arquivos a atualizar (13 server files + 5 UI files + 1 test file = 19 arquivos):
     - `lib/kanban/server.ts`
     - `components/profile/types.ts`
     - `lib/session.test.ts`
     - `lib/chat-interno/server.ts`
     - `lib/session-server.ts`
     - `lib/tickets/server.test.ts`
     - `lib/tickets/server.ts`
     - `lib/atividades-setor/server.ts`
     - `lib/atividades-setor/permissions.ts`
     - `lib/announcements/server.ts`
     - `lib/reunioes/server.ts`
     - `lib/dashboard/server.ts`
     - `app/api/atividades-setor/tasks/[id]/checklist/[itemId]/route.ts`
     - `lib/current-user/context.tsx`
     - `lib/administracao/store.tsx`
     - `components/reports/ReportsPage.tsx`
     - `components/app-sidebar.tsx`
     - `components/administracao/AdministracaoPage.tsx`

4. **Atualizar `tsconfig.json` paths** se necessário para garantir que `@unipar/types` resolva corretamente no Web (já está configurado).

5. **Verificar se o Mobile precisa de mudanças** — o Mobile já importa de `@unipar/types`, então nenhuma mudança necessária.

### Arquivos modificados
- `lib/session.ts` (substituir por re-exports)
- 19 arquivos Web (atualizar imports)

### Arquivos não modificados
- `packages/shared/types/src/session.ts` (canonical source, sem mudanças)
- Todos os arquivos do Mobile

---

## Tarefa 2: Unificar `cn()` e `hashColor()` em `@unipar/utils`

### Problema

`cn()` e `hashColor()` estão duplicados em:

- `lib/utils.ts` (Web — importado por 86 componentes UI)
- `packages/shared/utils/src/cn.ts` (compartilhado — usado pelo Mobile)

O conteúdo é idêntico. A definição canônica deve ficar apenas em `@unipar/utils`.

### Plano

1. **Confirmar que `packages/shared/utils/src/cn.ts` é a versão canônica** — já é a mesma definição usada pelo Mobile. Nenhuma mudança necessária aqui.

2. **Substituir `lib/utils.ts` por re-exports** para manter retrocompatibilidade:
   - `lib/utils.ts` passa a ser:
     ```ts
     export { cn, hashColor } from "@unipar/utils"
     ```
   - Isso garante que nenhum dos 86 imports `@/lib/utils` quebra imediatamente.

3. **Atualizar todos os imports Web de `@/lib/utils` para `@unipar/utils`**:
   - 86 arquivos de componentes UI e páginas Web
   - Usar replaceAll para substituir `from "@/lib/utils"` por `from "@unipar/utils"` em todos os arquivos dentro de `components/` e `app/`

4. **Verificar se `packages/shared/utils/package.json` já exporta `cn` e `hashColor`** — sim, o barrel `index.ts` já exporta ambos.

5. **Verificar se o Mobile precisa de mudanças** — o Mobile já importa de `@unipar/utils`, então nenhuma mudança necessária.

### Arquivos modificados
- `lib/utils.ts` (substituir por re-exports)
- 86 arquivos Web (atualizar imports)

### Arquivos não modificados
- `packages/shared/utils/src/cn.ts` (canonical source, sem mudanças)
- Todos os arquivos do Mobile

---

## Tarefa 3: Criar a estrutura inicial do `@unipar/validation`

### Problema

`packages/shared/validation/` existe mas está vazio. Não há `package.json`, `tsconfig`, nem `src/index.ts`.

### Plano

1. **Criar `packages/shared/validation/package.json`**:
   ```json
   {
     "name": "@unipar/validation",
     "version": "0.1.0",
     "private": true,
     "main": "src/index.ts",
     "types": "src/index.ts",
     "exports": {
       ".": "./src/index.ts"
     },
     "dependencies": {
       "zod": "^4.43.0"
     }
   }
   ```

2. **Criar `packages/shared/validation/tsconfig.json`**:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "strict": true,
       "noEmit": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "resolveJsonModule": true,
       "paths": {
         "@unipar/types": ["../types/src"],
         "@unipar/types/*": ["../types/src/*"]
       }
     },
     "include": ["src"]
   }
   ```

3. **Criar `packages/shared/validation/src/index.ts`** (vazio por enquanto):
   ```ts
   // Schemas will be added in Task 4
   ```

4. **Adicionar `@unipar/validation` ao workspace**:
   - Atualizar `package.json` raiz para inclecer `"@unipar/validation": "workspace:*"` em dependencies (se necessário para resolução)
   - Atualizar `tsconfig.base.json` para incluir o path mapping:
     ```json
     "@unipar/validation": ["./packages/shared/validation/src"],
     "@unipar/validation/*": ["./packages/shared/validation/src/*"]
     ```

5. **Atualizar `turbo.json`** se necessário para incluir o novo pacote no pipeline de build.

### Arquivos criados
- `packages/shared/validation/package.json`
- `packages/shared/validation/tsconfig.json`
- `packages/shared/validation/src/index.ts`

### Arquivos modificados
- `tsconfig.base.json` (adicionar path mapping)
- `package.json` (adicionar workspace dependency se necessário)

---

## Tarefa 4: Extrair schemas Zod dos Route Handlers para `@unipar/validation`

### Problema

Vários Route Handlers em `app/api/` definem schemas Zod inline. Esses schemas devem ser extraídos para `@unipar/validation` para reutilização pelo Mobile e pelo backend standalone futuro.

### Schemas a extrair (por ordem de prioridade)

#### 4.1 Tickets (`app/api/tickets/route.ts`)

Schema atual (inline):
```ts
const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  kind: z.enum(["image", "video", "document"]),
  mimeType: z.string(),
  url: z.string(),
})

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  priority: z.enum(["Alta", "Média", "Baixa"]),
  sector: z.enum(["SP-Suporte Técnico", "RH-Recursos Humanos", "ADM-Administração", "SEP-Serviços Escola Psicologia"]),
  attachments: z.array(attachmentSchema).default([]),
})
```

Mover para `@unipar/validation` como `ticketSchemas.ts`:
```ts
// packages/shared/validation/src/ticketSchemas.ts
import { z } from "zod"

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  kind: z.enum(["image", "video", "document"]),
  mimeType: z.string(),
  url: z.string(),
})

export const ticketBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  priority: z.enum(["Alta", "Média", "Baixa"]),
  sector: z.enum(["SP-Suporte Técnico", "RH-Recursos Humanos", "ADM-Administração", "SEP-Serviços Escola Psicologia"]),
  attachments: z.array(attachmentSchema).default([]),
})

export type TicketBody = z.infer<typeof ticketBodySchema>
export type Attachment = z.infer<typeof attachmentSchema>
```

#### 4.2 Auth Login (`app/api/auth/login/route.ts`)

Schema atual (inline, sem Zod — usa validação manual):
```ts
if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
  return NextResponse.json({ ok: false, error: "Informe e-mail e senha" }, { status: 400 })
}
```

Mover para `@unipar/validation` como `authSchemas.ts`:
```ts
// packages/shared/validation/src/authSchemas.ts
import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type LoginInput = z.infer<typeof loginSchema>
```

Atualizar `app/api/auth/login/route.ts` para usar o schema.

#### 4.3 Admin Users (`app/api/administracao/users/route.ts`)

Schema atual (inline):
```ts
const bodySchema = z.object({
  requestId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  sector: z.string().min(1),
  cpf: z.string().min(1),
  role: userRoleSchema,
  isSectorLeader: z.boolean(),
})
```

Mover para `@unipar/validation` como `adminSchemas.ts`:
```ts
// packages/shared/validation/src/adminSchemas.ts
import { z } from "zod"

export const userRoleSchema = z.enum(["ADMIN", "USER"])

export const createUserSchema = z.object({
  requestId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  sector: z.string().min(1),
  cpf: z.string().min(1),
  role: userRoleSchema,
  isSectorLeader: z.boolean(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
```

#### 4.4 Profile Update (`app/api/profile/route.ts`)

Schema atual (imports de `@/components/profile/types`):
```ts
const bodySchema = z.object({
  presenceStatus: presenceStatusSchema,
  workActivityStatus: workActivityStatusSchema,
  statusMessage: statusMessageSchema,
})
```

Mover para `@unipar/validation` como `profileSchemas.ts`:
```ts
// packages/shared/validation/src/profileSchemas.ts
import { z } from "zod"

export const presenceStatusSchema = z.enum(["ONLINE", "BUSY", "AWAY", "OFFLINE"])
export type PresenceStatus = z.infer<typeof presenceStatusSchema>

export const workActivityStatusSchema = z.enum([
  "ONSITE", "HOME_OFFICE", "IN_MEETING", "IN_SERVICE",
  "ON_BREAK", "IN_TRAINING", "ON_VACATION", "ON_LEAVE", "UNAVAILABLE",
])
export type WorkActivityStatus = z.infer<typeof workActivityStatusSchema>

export const statusMessageSchema = z.string().trim().max(200, "O recado pode ter no máximo 200 caracteres")

export const profileUpdateSchema = z.object({
  presenceStatus: presenceStatusSchema,
  workActivityStatus: workActivityStatusSchema,
  statusMessage: statusMessageSchema,
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
```

#### 4.5 Access Request OTP (`app/api/access-request/send-otp/route.ts`)

Schema atual (inline):
```ts
const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().trim().toLowerCase().email().refine((v) => v.endsWith("@unipar.br")),
  phone: z.string().min(8),
  sector: z.string().min(1),
  cpf: z.string().min(11),
})
```

Mover para `@unipar/validation` como `accessRequestSchemas.ts`.

#### 4.6 Reuniões (`app/api/reunioes/route.ts`)

Schema atual (inline, grande). Extrair para `meetingSchemas.ts`.

### Plano de execução

1. Criar os arquivos de schema em `packages/shared/validation/src/`
2. Atualizar cada Route Handler para importar do novo pacote
3. Garantir que todos os testes continuam passando

### Arquivos criados em `packages/shared/validation/src/`
- `index.ts` — barrel export de todos os schemas
- `ticketSchemas.ts`
- `authSchemas.ts`
- `adminSchemas.ts`
- `profileSchemas.ts`
- `accessRequestSchemas.ts`
- `meetingSchemas.ts`

### Arquivos modificados
- Cada Route Handler que usava schemas inline agora importa de `@unipar/validation`
- `tsconfig.base.json` (path mapping para `@unipar/validation`)

---

## Estratégia de Retrocompatibilidade

### Princípio

Nenhuma mudança deve quebrar a Web em produção. A abordagem é em duas fases:

1. **Fase de transição**: Manter os arquivos antigos (`lib/session.ts`, `lib/utils.ts`) como re-exports finos para o novo local canônico. Atualizar todos os imports Web para apontar diretamente para `@unipar/types` e `@unipar/utils`.

2. **Fase de limpeza** (não nesta fase): Após toda a Web estar importando do novo local, remover os re-exports e os arquivos antigos.

### Re-exports de transição

`lib/session.ts` (novo conteúdo):
```ts
export type { SessionRole, SessionUser } from "@unipar/types"
export { isAdmin } from "@unipar/types"
```

`lib/utils.ts` (novo conteúdo):
```ts
export { cn, hashColor } from "@unipar/utils"
```

Isso garante que:
- Nenhum import `@/lib/session` ou `@/lib/utils` quebra
- O Mobile continua funcionando sem mudanças
- Os testes continuam passando

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| 86 imports de `@/lib/utils` quebram se `lib/utils.ts` for removido antes da atualização | Manter `lib/utils.ts` como re-export durante a transição. Atualizar imports primeiro, depois remover o re-export. |
| 19 imports de `@/lib/session` quebram se `lib/session.ts` for removido antes da atualização | Mesma abordagem: re-export primeiro, depois remover. |
| `@unipar/validation` não é resolvido pelo TypeScript | Configurar `tsconfig.base.json` paths antes de qualquer import. |
| Schemas extraídos divergem dos inline originals | Manter a mesma lógica Zod exata. Apenas mover, sem alterar regras de validação. |
| Testes falham após mudança de imports | Rodar `npm test` após cada tarefa para detectar regressões imediatamente. |

---

## Ordem de Execução

1. **Tarefa 1** — Unificar `SessionUser` (19 arquivos Web + 1 re-export)
2. **Tarefa 2** — Unificar `cn()`/`hashColor()` (86 arquivos Web + 1 re-export)
3. **Tarefa 3** — Criar estrutura `@unipar/validation` (3 arquivos novos + config)
4. **Tarefa 4** — Extrair schemas Zod (6 schemas + atualização de Route Handlers)

Cada tarefa deve ser seguida por `npm test` para garantir que nada quebrou.

---

## Validação

- [ ] `npm test` passa após Tarefa 1
- [ ] `npm test` passa após Tarefa 2
- [ ] `npm test` passa após Tarefa 3
- [ ] `npm test` passa após Tarefa 4
- [ ] Web app compila sem erros TypeScript (`npm run build`)
- [ ] Mobile app compila sem erros TypeScript (`cd mobile && npm run build`)
- [ ] Nenhum import `@/lib/session` resta na Web (após Tarefa 1)
- [ ] Nenhum import `@/lib/utils` resta na Web (após Tarefa 2)
- [ ] `@unipar/validation` resolve corretamente no TypeScript
- [ ] Todos os schemas extraídos produzem os mesmos resultados de validação que os originais
