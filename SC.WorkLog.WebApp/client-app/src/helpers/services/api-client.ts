import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
})

let bearerTokenFactory: (() => Promise<string | null>) | null = null

export const setBearerTokenFactory = (factory: (() => Promise<string | null>) | null) => {
  bearerTokenFactory = factory
}

apiClient.interceptors.request.use(async (config) => {
  if (!bearerTokenFactory) return config

  try {
    const token = await bearerTokenFactory()
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {
    // Token retrieval errors are surfaced through AuthContext; requests continue without auth.
  }

  return config
})
