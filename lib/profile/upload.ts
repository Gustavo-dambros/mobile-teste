const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export const ACCEPTED_AVATAR_TYPES = "image/jpeg,image/png,image/webp"
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024

/** Returns an error message when the file should be rejected, or null when it's fine. */
export function validateAvatarFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return "Formato inválido. Envie uma imagem JPG, JPEG, PNG ou WEBP."
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return "A imagem excede o tamanho máximo permitido de 5 MB."
  }
  return null
}

/**
 * Real file upload, never Base64: the picked File blob is referenced
 * directly via an object URL for preview/display. This is the seam for a
 * real backend — once a storage endpoint exists, swap the body below for:
 *
 *   const formData = new FormData()
 *   formData.append("avatar", file)
 *   const res = await fetch("/api/profile/avatar", { method: "POST", body: formData })
 *   return (await res.json()).url as string
 */
export async function uploadAvatarFile(file: File): Promise<string> {
  return URL.createObjectURL(file)
}

export function revokeAvatarUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url)
  }
}
