import { authHandlers } from './auth'
import { favoritesHandlers } from './favorites'
import { newsletterHandlers } from './newsletter'
import { nftHandlers } from './nfts'

// Todos os handlers da API falsa. Cada recurso (auth, cart, orders...) ganha seu arquivo.
export const handlers = [...nftHandlers, ...newsletterHandlers, ...authHandlers, ...favoritesHandlers]
