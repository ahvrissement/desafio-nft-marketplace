import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

// Conecta os handlers ao service worker (public/mockServiceWorker.js).
export const worker = setupWorker(...handlers)
