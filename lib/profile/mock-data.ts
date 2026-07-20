import type { UserProfile } from "@/components/profile/types"

function now() {
  return new Date().toISOString()
}

// Placeholder identity fields — overlaid with the real logged-in user
// (id/name/email/role) by ProfileProvider on init. See lib/session.ts.
export const INITIAL_PROFILE: UserProfile = {
  id: "",
  name: "",
  email: "",
  sector: "",
  phone: "(45) 99050-1050",
  cpf: "123.456.789-00",
  role: "USER",
  avatarUrl: null,
  presenceStatus: "ONLINE",
  workActivityStatus: "ONSITE",
  statusMessage: "",
  lastSeenAt: now(),
  profileUpdatedAt: now(),
}
