# @unipar/api

SDK de cliente HTTP cross-platform para a API da Unipar. Funciona tanto na **Web** (Next.js) quanto no **Mobile** (Expo/React Native) com o mesmo código.

---

## Índice

1. [Instalação](#1-instalação)
2. [Configuração Inicial](#2-configuração-inicial)
   - [Mobile (Expo)](#mobile-expo)
   - [Web (Next.js)](#web-nextjs)
3. [Fluxo de Autenticação](#3-fluxo-de-autenticação)
   - [Login](#31-login)
   - [Sessão e Bearer Token Automático](#32-sessão-e-bearer-token-automático)
   - [Logout](#33-logout)
   - [Tratamento de Token Expirado](#34-tratamento-de-token-expirado)
   - [Observação sobre o Refresh Token](#35-observação-sobre-o-refresh-token)
4. [Cliente HTTP Centralizado (`apiFetch`)](#4-cliente-http-centralizado-apifetch)
5. [Tratamento de Erros](#5-tratamento-de-erros)
6. [Módulos de Domínio](#6-módulos-de-domínio)
   - [Tickets](#61-tickets)
   - [Reuniões](#62-reuniões)
   - [Kanban](#63-kanban)
   - [Chat Interno](#64-chat-interno)
   - [Atividades Setor](#65-atividades-setor)
7. [Exemplo Completo: App Mobile](#7-exemplo-completo-app-mobile)
8. [Variáveis de Ambiente](#8-variáveis-de-ambiente)

---

## 1. Instalação

O pacote já está no monorepo como `@unipar/api`. Não é necessário instalar via npm — o gerenciamento é feito pelo Turborepo.

```json
// package.json (raiz do Mobile)
{
  "dependencies": {
    "@unipar/api": "workspace:*",
    "@unipar/types": "workspace:*"
  }
}
```

---

## 2. Configuração Inicial

O `@unipar/api` precisa ser inicializado **uma única vez** no bootstrap da aplicação, antes de qualquer chamada de API.

### Mobile (Expo)

Arquivo: `mobile/lib/supabase.ts`

```typescript
import "react-native-url-polyfill/auto"
import * as SecureStore from "expo-secure-store"
import { getSupabaseClient } from "@unipar/api"

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = getSupabaseClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  baseURL: process.env.EXPO_PUBLIC_API_URL, // "http://192.168.0.10:3000"
  storage: ExpoSecureStoreAdapter,           // Persiste sessão no SecureStore
})
```

**Variáveis de ambiente (Mobile):**

```bash
# .env.local ou app.config.ts
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000   # IP da máquina rodando o servidor
```

### Web (Next.js)

```typescript
// lib/supabase/client.ts (arquivo existente na Web)
import { getSupabaseClient } from "@unipar/api"

getSupabaseClient({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  // baseURL não precisa ser informada se a API está no mesmo origin
  // O Supabase já usa cookies para sessão na Web
})
```

**Importante:** Na Web a `baseURL` pode ficar vazia porque as chamadas vão para o mesmo servidor Next.js (mesmo origin). As requisições usam cookies para autenticação. No Mobile, a `baseURL` é obrigatória e a autenticação usa `Authorization: Bearer <token>`.

---

## 3. Fluxo de Autenticação

### 3.1 Login

O login é feito diretamente pelo cliente Supabase. Após o login bem-sucedido, o Supabase gerencia a sessão automaticamente.

```typescript
import { getSupabase } from "@unipar/api"

async function handleLogin(email: string, password: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Exibir erro para o usuário
    console.error("Erro no login:", error.message)
    return
  }

  // Sucesso! A sessão já foi persistida no storage configurado.
  // O access_token será injetado automaticamente em todas as chamadas apiFetch().
  const session = data.session
  console.log("Usuário logado:", session.user.email)
  console.log("Token JWT:", session.access_token) // Guardado automaticamente
}
```

### 3.2 Sessão e Bearer Token Automático

Depois que o usuário faz login, **todas as chamadas via `apiFetch()`** dos módulos de domínio (tickets, meetings, kanban, etc.) terão o header `Authorization: Bearer <token>` injetado **automaticamente**.

```typescript
import { fetchTickets } from "@unipar/api"

// Exemplo — sem precisar se preocupar com token
const tickets = await fetchTickets()
// Internamente o apiFetch faz:
//   fetch("http://192.168.0.10:3000/api/tickets", {
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
//     }
//   })
```

**Como funciona:**

1. `getSupabaseClient()` armazena o cliente Supabase + a `baseURL` internamente
2. `apiFetch()` internamente chama `supabase.auth.getSession()` para obter o token atual
3. Injeta `Authorization: Bearer <token>` em todas as requisições
4. Se não houver sessão, a requisição segue sem token (o servidor retorna 401)
5. O token é sempre o mais recente (refresh automático pelo Supabase)

### 3.3 Logout

```typescript
import { getSupabase } from "@unipar/api"
import { router } from "expo-router"

async function handleLogout() {
  const supabase = getSupabase()
  await supabase.auth.signOut()

  // Redireciona para a tela de login
  router.replace("/login")
}
```

### 3.4 Tratamento de Token Expirado

O Supabase gerencia o refresh do token automaticamente através do cliente (`autoRefreshToken: true`). No Mobile, isso funciona graças ao `SecureStoreAdapter` que persiste a sessão.

Caso o servidor retorne **401** (token inválido/expirado), o `apiFetch()` lança um `ApiAuthError`. Você pode capturar esse erro e redirecionar para o login:

```typescript
import { ApiAuthError, fetchTickets } from "@unipar/api"
import { router } from "expo-router"

try {
  const tickets = await fetchTickets()
} catch (error) {
  if (error instanceof ApiAuthError) {
    // Token inválido ou expirado — redirecionar para login
    router.replace("/login")
    return
  }
  // Outros erros
  console.error(error)
}
```

### 3.5 Observação sobre o Refresh Token

O Supabase SDK lida com refresh token automaticamente:

- **Mobile:** O refresh token é armazenado no `SecureStore` (Expo) junto com o access token
- **Web:** O refresh token é armazenado em cookies HTTP-only (pelo `@supabase/ssr`)
- Quando o access token expira (geralmente após 1 hora), o Supabase usa o refresh token para obter um novo par de tokens **silenciosamente**
- Você não precisa implementar refresh manualmente

Para verificar o estado da sessão a qualquer momento:

```typescript
const { data: { session } } = await getSupabase().auth.getSession()
if (session) {
  console.log("Token atual:", session.access_token)
  console.log("Expira em:", new Date(session.expires_at!).toLocaleString())
}
```

---

## 4. Cliente HTTP Centralizado (`apiFetch`)

O `apiFetch` é a função utilitária que todos os módulos de domínio usam internamente. Você também pode usá-la diretamente para endpoints que ainda não têm um client dedicado.

```typescript
import { apiFetch } from "@unipar/api"

// GET
const data = await apiFetch<{ id: string }>("/api/algum-endpoint")

// POST
const created = await apiFetch<{ id: string }>("/api/algum-endpoint", {
  method: "POST",
  body: JSON.stringify({ name: "Exemplo" }),
})

// PATCH
await apiFetch(`/api/algum-endpoint/${id}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "concluído" }),
})

// DELETE (retorna void)
await apiFetch(`/api/algum-endpoint/${id}`, { method: "DELETE" })
```

**Características:**

| Característica | Comportamento |
|---------------|---------------|
| `baseURL` | Lida da config (`getSupabaseClient`) |
| `Authorization` | Injetado automaticamente da sessão |
| `Content-Type` | `application/json` (pode ser sobrescrito) |
| Erro 401 | Lança `ApiAuthError` |
| Erro 403 | Lança `ApiForbiddenError` |
| Erro 404 | Lança `ApiNotFoundError` |
| Erro 409 | Lança `ApiConflictError` |
| Erro 429 | Lança `ApiRateLimitError` |
| Erro 5xx | Lança `ApiServerError` |
| 204 No Content | Retorna `undefined` (tipado como `T`) |

---

## 5. Tratamento de Erros

Todas as classes de erro estendem `ApiError` (que estende `Error`), então você pode capturar com `instanceof`:

```typescript
import {
  ApiError,
  ApiAuthError,
  ApiForbiddenError,
  ApiNotFoundError,
  ApiConflictError,
  ApiRateLimitError,
  ApiServerError,
} from "@unipar/api"

async function fetchWithErrorHandling() {
  try {
    return await fetchTickets()
  } catch (error) {
    if (error instanceof ApiAuthError) {
      // 401 — redirecionar para login
      router.replace("/login")
      return []
    }
    if (error instanceof ApiForbiddenError) {
      // 403 — sem permissão
      Alert.alert("Acesso negado", error.message)
      return []
    }
    if (error instanceof ApiNotFoundError) {
      // 404 — recurso não encontrado
      Alert.alert("Não encontrado", error.message)
      return []
    }
    if (error instanceof ApiConflictError) {
      // 409 — conflito (ex: já avaliou este chamado)
      Alert.alert("Conflito", error.message)
      return []
    }
    if (error instanceof ApiRateLimitError) {
      // 429 — muitas requisições
      Alert.alert("Calma!", "Aguarde um momento antes de tentar novamente.")
      return []
    }
    if (error instanceof ApiServerError) {
      // 5xx — erro interno do servidor
      Alert.alert("Erro no servidor", "Tente novamente mais tarde.")
      return []
    }

    // Erro genérico (rede, parse, etc.)
    console.error("Erro inesperado:", error)
    Alert.alert("Erro", "Não foi possível completar a operação.")
    return []
  }
}
```

---

## 6. Módulos de Domínio

### 6.1 Tickets

```typescript
import {
  fetchTickets,
  fetchTicket,
  createTicket,
  updateTicket,
  closeTicket,
  reopenTicket,
  deleteTicket,
  rateTicket,
  fetchTicketMessages,
  sendTicketMessage,
  fetchCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
  fetchUnreadTickets,
  fetchStaffBySector,
} from "@unipar/api"

// Listar chamados
const tickets = await fetchTickets()

// Abrir chamado
const ticket = await createTicket({
  title: "Computador não liga",
  description: "Tela preta ao iniciar",
  sector: "TI",
  priority: "alta",
})

// Atualizar chamado (transferir setor, atribuir)
const result = await updateTicket("id-do-chamado", {
  sector: "RH",
  assigneeId: "id-do-colaborador",
})

// Encerrar chamado
const { ticket: closed, message } = await closeTicket("id-do-chamado", "Resolvido")

// Reabrir chamado
const { ticket: reopened, message: reopenMsg } = await reopenTicket("id-do-chamado", "Problema voltou")

// Avaliar chamado
await rateTicket("id-do-chamado", 5, "Ótimo atendimento!")

// Mensagens
const { messages } = await fetchTicketMessages("id-do-chamado")
const { message: sent } = await sendTicketMessage("id-do-chamado", "Olá, já resolvemos seu problema!")

// Respostas prontas
const { responses } = await fetchCannedResponses()
const { response } = await createCannedResponse({ title: "Senha", body: "Sua senha foi redefinida." })

// Colaboradores do setor
const { staff } = await fetchStaffBySector("TI")
```

### 6.2 Reuniões

```typescript
import {
  fetchMeetings,
  fetchMeeting,
  createMeeting,
  joinMeeting,
  leaveMeeting,
  endMeeting,
  getLiveKitToken,
  fetchInviteNotifications,
  respondToInvite,
  fetchRecordings,
  downloadRecording,
} from "@unipar/api"

// Listar reuniões
const meetings = await fetchMeetings()

// Criar reunião
const meeting = await createMeeting({
  title: "Daily Scrum",
  scheduledFor: "2026-08-01T09:00:00Z",
  durationMinutes: 30,
})

// Participar
await joinMeeting("id-da-reuniao")

// Sair
await leaveMeeting("id-da-reuniao", "id-do-participante")

// Encerrar (apenas anfitrião)
await endMeeting("id-da-reuniao")

// Token LiveKit para chamada de áudio/vídeo
const { token, url } = await getLiveKitToken("id-da-chamada")

// Convites
const { notifications } = await fetchInviteNotifications()
await respondToInvite("id-da-notificacao", true) // aceitar

// Gravações
const { recordings } = await fetchRecordings()
const { url: downloadUrl } = await downloadRecording("id-da-gravacao")
```

### 6.3 Kanban

```typescript
import {
  fetchBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  duplicateBoard,
  archiveBoard,
  fetchColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  duplicateColumn,
  archiveColumn,
  moveColumn,
  fetchCards,
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  duplicateCard,
  completeCard,
  archiveCard,
  fetchLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  fetchChecklists,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  fetchChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  fetchComments,
  addComment,
  updateComment,
  deleteComment,
  deleteAttachment,
} from "@unipar/api"

// Quadros
const boards = await fetchBoards()
const board = await createBoard({
  title: "Meu Quadro",
  backgroundValue: "#2563eb",
  isDefault: true,
})

// Colunas
const columns = await fetchColumns(board.id)
const column = await createColumn(board.id, { title: "A Fazer", color: "#ef4444" })

// Cartões
const cards = await fetchCards(board.id)
const card = await createCard(column.id, {
  title: "Implementar login",
  priority: "alta",
})
await moveCard(card.id, { columnId: "nova-coluna-id", position: 0 })
await completeCard(card.id)

// Labels
await createLabel({ name: "Bug", color: "#ef4444" })

// Checklists
const checklists = await fetchChecklists(card.id)
const checklist = await createChecklist(card.id, "Passos")
const items = await fetchChecklistItems(checklist.id)
await updateChecklistItem(items[0].id, { isCompleted: true })

// Comentários
const comment = await addComment(card.id, "Ótimo trabalho!")
```

### 6.4 Chat Interno

```typescript
import {
  fetchConversations,
  createConversation,
  fetchConversation,
  leaveConversation,
  addMember,
  removeMember,
  toggleAdmin,
  fetchMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  pinMessage,
  unpinMessage,
  startCall,
  answerCall,
  declineCall,
  endCall,
  missCall,
  fetchRoster,
  fetchUnreadCount,
  markConversationSeen,
} from "@unipar/api"

// Conversas
const conversations = await fetchConversations()
const dm = await createConversation({
  kind: "dm",
  memberIds: ["id-outro-usuario"],
})
const group = await createConversation({
  kind: "group",
  memberIds: ["id1", "id2"],
  name: "Equipe TI",
})

// Mensagens
const { messages } = await fetchMessages(conversation.id, 50)
const { message } = await sendMessage(conversation.id, "Olá pessoal!")
await reactToMessage(conversation.id, message.id, "👍")
await pinMessage(conversation.id, message.id)

// Chamadas
const call = await startCall(conversation.id, "video")
await answerCall(call.id)

// Mural
const { members } = await fetchRoster()
const { count } = await fetchUnreadCount()

// Marcar como lido
await markConversationSeen(conversation.id)
```

### 6.5 Atividades Setor

```typescript
import {
  fetchEvents,
  fetchEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchTasks,
  fetchTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  archiveTask,
  restoreTask,
  duplicateTask,
  fetchTaskComments,
  addTaskComment,
  fetchTaskHistory,
} from "@unipar/api"

// Eventos (atividades)
const events = await fetchEvents()
const event = await createEvent({
  title: "Reunião de Planejamento",
  date: "2026-08-15",
  startTime: "09:00",
  endTime: "10:00",
})

// Tarefas
const tasks = await fetchTasks()
const task = await createTask({
  title: "Preparar apresentação",
  assigneeId: "id-do-responsavel",
})
await updateTaskStatus(task.id, "em_andamento")
await archiveTask(task.id)

// Comentários
const { comments } = await fetchTaskComments(task.id)
await addTaskComment(task.id, "Documentação anexada.")

// Histórico
const { history } = await fetchTaskHistory(task.id)
```

---

## 7. Exemplo Completo: App Mobile

Abaixo um exemplo de tela de login + listagem de tickets usando as boas práticas:

```typescript
// mobile/app/(auth)/login.tsx
import { useState } from "react"
import { View, TextInput, Button, Alert } from "react-native"
import { router } from "expo-router"
import { getSupabase } from "@unipar/api"

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        Alert.alert("Erro", error.message)
        return
      }
      router.replace("/(app)/tickets")
    } catch (err) {
      Alert.alert("Erro", "Não foi possível conectar ao servidor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <View>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title={loading ? "Entrando..." : "Entrar"} onPress={handleLogin} disabled={loading} />
    </View>
  )
}
```

```typescript
// mobile/app/(app)/tickets.tsx
import { useEffect, useState } from "react"
import { View, Text, FlatList } from "react-native"
import { router } from "expo-router"
import {
  fetchTickets,
  closeTicket,
  ApiAuthError,
  ApiError,
  type Ticket,
} from "@unipar/api"

export default function TicketListScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadTickets() {
    try {
      setError(null)
      setLoading(true)
      const data = await fetchTickets()
      setTickets(data)
    } catch (err) {
      if (err instanceof ApiAuthError) {
        // Token expirado — redirecionar para o login
        router.replace("/login")
        return
      }
      if (err instanceof ApiError) {
        setError(err.message)
        return
      }
      setError("Erro de conexão. Verifique sua internet.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  async function handleCloseTicket(id: string) {
    try {
      await closeTicket(id, "Resolvido pelo app mobile")
      loadTickets() // recarrega a lista
    } catch (err) {
      if (err instanceof ApiAuthError) {
        router.replace("/login")
      } else if (err instanceof ApiError) {
        Alert.alert("Erro", err.message)
      }
    }
  }

  if (loading) return <Text>Carregando...</Text>
  if (error) return <Text style={{ color: "red" }}>{error}</Text>

  return (
    <FlatList
      data={tickets}
      renderItem={({ item }) => (
        <View>
          <Text>{item.title}</Text>
          <Text>{item.status}</Text>
        </View>
      )}
    />
  )
}
```

---

## 8. Variáveis de Ambiente

| Variável | Plataforma | Obrigatória | Descrição |
|----------|-----------|-------------|-----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile | ✅ | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile | ✅ | Chave anônima do Supabase |
| `EXPO_PUBLIC_API_URL` | Mobile | ✅ | URL base da API (ex: `http://192.168.0.10:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Web | ✅ | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | ✅ | Chave anônima do Supabase |
| `NEXT_PUBLIC_API_URL` | Web | ❌ | URL base (vazio = mesmo origin) |

**Mobile:** As variáveis de ambiente no Expo são prefixadas com `EXPO_PUBLIC_` e são expostas ao cliente. Configure-as no arquivo `.env` ou diretamente no `app.config.ts`.

**Web:** As variáveis de ambiente no Next.js são prefixadas com `NEXT_PUBLIC_` e são expostas ao cliente. Configure-as no arquivo `.env.local`.

---

## Notas Técnicas

- **Singleton:** O `getSupabaseClient()` retorna o mesmo cliente em todas as chamadas subsequentes
- **Thread safety:** Não use múltiplas instâncias — o singleton é compartilhado globalmente
- **SecureStore (Mobile):** A sessão persiste mesmo após fechar o app, graças ao Expo SecureStore
- **Cookies (Web):** A sessão persiste via cookies HTTP-only gerenciados pelo `@supabase/ssr`
- **Token Refresh:** O Supabase SDK gerencia refresh automático — nenhuma ação manual necessária
- **Erro 401:** O `apiFetch` NÃO tenta refresh automático. O erro é propagado para você decidir o que fazer (geralmente redirecionar para o login)
