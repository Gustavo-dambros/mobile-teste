// Tickets
export {
  ticketSectorSchema,
  ticketPrioritySchema,
  attachmentKindSchema,
  attachmentSchema,
  createTicketSchema,
  updateTicketSchema,
  createTicketMessageSchema,
  closeTicketSchema,
  reopenTicketSchema,
  satisfactionSchema,
} from "./tickets"

export type {
  AttachmentInput,
  CreateTicketInput,
  UpdateTicketInput,
  CreateTicketMessageInput,
  CloseTicketInput,
  ReopenTicketInput,
  SatisfactionInput,
} from "./tickets"

// Auth
export { loginSchema } from "./auth"
export type { LoginInput } from "./auth"

// Admin
export {
  userRoleSchema,
  userStatusSchema,
  accessRequestStatusSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  adminUserSchema,
  accessRequestSchema,
} from "./admin"

export type {
  UserRole,
  UserStatus,
  AccessRequestStatus,
  CreateAdminUserInput,
  UpdateAdminUserInput,
  AdminUser,
  AccessRequest,
} from "./admin"

// Access Request
export {
  sendAccessRequestOtpSchema,
  confirmAccessRequestOtpSchema,
} from "./access-request"

export type {
  SendAccessRequestOtpInput,
  ConfirmAccessRequestOtpInput,
} from "./access-request"

// Account Recovery
export {
  sendRecoveryOtpSchema,
  confirmRecoveryOtpSchema,
} from "./recovery"

export type {
  SendRecoveryOtpInput,
  ConfirmRecoveryOtpInput,
} from "./recovery"
