# Unipar Intranet

Plataforma intranet da Unipar com **Web PWA (Next.js)** e **app Mobile (Expo/React Native)** compartilhando tipos, utilitários e cliente de API via workspaces (`packages/*`).

## Stack

| Camada      | Tecnologia                                  |
| ----------- | ------------------------------------------- |
| Web         | Next.js 16 (App Router), Supabase, shadcn/ui |
| Mobile      | Expo SDK 57, React Native, Expo Router      |
| API client  | `@unipar/api` (fetch com Bearer JWT + refresh automático em 401) |
| Tipos/Utils | `@unipar/types`, `@unipar/utils`, `@unipar/constants`, `@unipar/validation` |

## Pré-requisitos

- Node.js 20+ e npm
- Conta no [Expo](https://expo.dev) para builds EAS na nuvem
- Acesso aos projetos Supabase (URL + anon key) e ao backend em execução

## 1. Build de produção da Web (PWA)

```bash
npm install          # instala os workspaces
npm run build        # gera .next/ (Next.js 16, com typecheck)
npm run start        # serve a produção em http://localhost:3000
```

O build produz:

- `public/sw.js` — service worker (instalável como PWA)
- `/manifest.webmanifest` — gerado por `app/manifest.ts`
- Ativos estáticos em `.next/`

> Para testar localmente o service worker use `npm run start` (produção), não `npm run dev`.

### Deploy

Sirva a pasta `.next/` + `public/` em qualquer host Node (Vercel, Railway, etc.). O `sw.js` em `public/` deve ficar acessível na raiz do domínio para o scope do service worker funcionar.

## 2. App Mobile — configuração de ambiente

Crie o arquivo `mobile/.env` a partir do exemplo:

```bash
cp mobile/.env.example mobile/.env
```

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
EXPO_PUBLIC_API_URL=http://SEU-IP-LAN:3000   # backend Unipar
```

> **IMPORTANTE:** para testar em aparelho físico, `EXPO_PUBLIC_API_URL` deve ser o IP da máquina na rede local (nunca `localhost`). Para emulador Android, `localhost` funciona.

Para builds **EAS na nuvem**, as mesmas variáveis estão mapeadas por perfil em `mobile/eas.json` (bloco `env`).

## 3. Gerar APK Android para testes internos (EAS preview)

Pré-requisito: `eas-cli` (já é devDependency do workspace mobile) e login:

```bash
cd mobile
npx eas login        # autentica com conta Expo
npx eas build:configure   # vincula o projeto ao EAS (cria .eas/project.json)
```

Gerar o APK instalável:

```bash
npx eas build -p android --profile preview
```

- O perfil `preview` (`mobile/eas.json`) gera um **APK** (`buildType: apk`) com distribuição interna — instale direto no Android.
- Ao final o EAS exibe um link para baixar o APK; ou use `npx eas build:list`.
- Variáveis `EXPO_PUBLIC_*` do perfil são injetadas no build.

> Para builds locais (sem nuvem): `npx eas build -p android --profile preview --local` (requer JDK/Android SDK instalados).

### Perfil production (loja)

```bash
npx eas build -p android --profile production
```

- Gera **AAB** (`app-bundle`) para publicar na Google Play.
- `autoIncrement` incrementa o `android.versionCode` a cada build.

## Scripts úteis (raiz)

| Script            | Descrição                                |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Web em dev (localhost:3000)              |
| `npm run build`   | Build de produção da Web                 |
| `npm run lint`    | ESLint (raiz + workspaces)               |
| `npm run test`    | Vitest (pacotes)                         |
| `npm run dev:mobile` | Expo dev server (mobile)              |
| `npm run build:mobile` | Export estático do Expo (web)        |

## Estrutura

```
packages/
  api/          # cliente HTTP + erros tipados (Bearer + refresh 401)
  shared/       # types, utils, constants, validation
mobile/         # app Expo (tickets, kanban, auth)
app/            # Web Next.js (PWA, dashboards)
components/     # UI compartilhada da Web
```
