export function buildCorsOptions() {
  const defaultOrigins = [
    'https://frontend-seven-rosy-75.vercel.app',
    'http://localhost:5173',
  ]

  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const allowedOrigins = new Set([...defaultOrigins, ...envOrigins])

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origen no permitido por CORS'))
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
    maxAge: 86400,
  }
}
