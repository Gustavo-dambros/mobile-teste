import { describe, expect, it } from "vitest"

import { assertActiveProfile, assertActiveProfiles, InactiveProfileError } from "@/lib/supabase/active-profile"
import type { createAdminClient } from "@/lib/supabase/admin"

/**
 * Fakes only the `.from("profiles").select(...).eq/is/in(...)` shape this
 * module actually issues — `activeIds` stands in for "what the real
 * status = ACTIVE + deleted_at is null filter would return from Postgres"
 * (a deleted/anonymized user's id is simply absent from this set).
 */
function fakeAdmin(activeIds: Set<string>) {
  let singleId: string | undefined
  let batchIds: string[] = []

  const builder = {
    from: () => builder,
    select: () => builder,
    eq(col: string, val: string) {
      if (col === "id") singleId = val
      return builder
    },
    is: () => builder,
    in(col: string, vals: string[]) {
      if (col === "id") batchIds = vals
      return builder
    },
    async maybeSingle() {
      return { data: singleId && activeIds.has(singleId) ? { id: singleId } : null }
    },
    then(resolve: (v: { data: { id: string }[] }) => void) {
      resolve({ data: batchIds.filter((id) => activeIds.has(id)).map((id) => ({ id })) })
    },
  }

  return builder as unknown as ReturnType<typeof createAdminClient>
}

describe("assertActiveProfile", () => {
  it("resolves without throwing when the target is active", async () => {
    const admin = fakeAdmin(new Set(["staff-1"]))
    await expect(assertActiveProfile(admin, "staff-1")).resolves.toBeUndefined()
  })

  it("throws InactiveProfileError when the target was deleted/anonymized", async () => {
    const admin = fakeAdmin(new Set(["staff-1"]))
    await expect(assertActiveProfile(admin, "deleted-user")).rejects.toBeInstanceOf(InactiveProfileError)
  })

  it("throws for an id that never existed, same as a deleted one", async () => {
    const admin = fakeAdmin(new Set())
    await expect(assertActiveProfile(admin, "ghost")).rejects.toBeInstanceOf(InactiveProfileError)
  })
})

describe("assertActiveProfiles", () => {
  it("resolves when every id in the batch is active", async () => {
    const admin = fakeAdmin(new Set(["a", "b", "c"]))
    await expect(assertActiveProfiles(admin, ["a", "b"])).resolves.toBeUndefined()
  })

  it("throws if even one id in the batch is inactive", async () => {
    const admin = fakeAdmin(new Set(["a"]))
    await expect(assertActiveProfiles(admin, ["a", "deleted-user"])).rejects.toBeInstanceOf(
      InactiveProfileError
    )
  })

  it("is a no-op for an empty batch — nothing to reject", async () => {
    const admin = fakeAdmin(new Set())
    await expect(assertActiveProfiles(admin, [])).resolves.toBeUndefined()
  })

  it("de-duplicates ids so a repeated id doesn't need to appear twice in the result", async () => {
    const admin = fakeAdmin(new Set(["a"]))
    await expect(assertActiveProfiles(admin, ["a", "a"])).resolves.toBeUndefined()
  })
})
