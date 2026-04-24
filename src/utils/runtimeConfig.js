const isFlagEnabled = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback
  return String(value).trim().toLowerCase() === 'true'
}

export const isPublicRegisterEnabled = isFlagEnabled(import.meta.env.VITE_ALLOW_PUBLIC_REGISTER, false)
