// vitest doesn't run inside Next.js's server/client module graph, so the real
// "server-only" package's guard throws unconditionally — aliased in
// vitest.config.ts so importing server code under test doesn't blow up.
export {}
