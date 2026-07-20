import { describe, expect, it } from "vitest"

import { cpfDigits, formatCPFMask } from "@/lib/administracao/format"

describe("cpfDigits", () => {
  it("strips punctuation, keeping only digits", () => {
    expect(cpfDigits("123.456.789-00")).toBe("12345678900")
  })

  it("is a no-op on an already-bare digit string", () => {
    expect(cpfDigits("12345678900")).toBe("12345678900")
  })
})

describe("formatCPFMask", () => {
  it("masks a full 11-digit CPF as ###.###.###-##", () => {
    expect(formatCPFMask("12345678900")).toBe("123.456.789-00")
  })

  it("truncates extra digits beyond 11 instead of overflowing the mask", () => {
    expect(formatCPFMask("123456789001234")).toBe("123.456.789-00")
  })

  it("partially masks an in-progress (shorter) input, for live typing UX", () => {
    expect(formatCPFMask("123456")).toBe("123.456")
  })
})
