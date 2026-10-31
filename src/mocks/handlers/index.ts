import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { checkoutHandlers } from './checkout'
import { devHandlers } from './dev'
import { favoritesHandlers } from './favorites'
import { newsletterHandlers } from './newsletter'
import { networkHandlers } from './network'
import { nftHandlers } from './nfts'
import { profileHandlers } from './profile'
import { realtimeHandlers } from '../realtime'

// Todos os handlers da API falsa. Cada recurso (auth, cart, orders...) ganha seu arquivo.
// networkHandlers PRIMEIRO: aplica latência/falha do cenário e passa adiante.
export const handlers = [...networkHandlers, ...nftHandlers, ...newsletterHandlers, ...authHandlers, ...favoritesHandlers, ...cartHandlers, ...checkoutHandlers, ...profileHandlers, ...devHandlers, ...realtimeHandlers]
