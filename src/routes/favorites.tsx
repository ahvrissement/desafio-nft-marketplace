import { createFileRoute } from '@tanstack/react-router'

import { requireAuth } from '@/features/auth/require-auth'
import { FavoritesPage } from '@/features/favorites/components/favorites-page'

// /favorites: PRIVADA (README: favoritos exigem autenticação). Visitante vai
// para o login e, depois de entrar, volta para cá.
export const Route = createFileRoute('/favorites')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location, fallback: '/' }),
  staticData: { mobileTab: 'favorites' },
  component: FavoritesPage,
})
