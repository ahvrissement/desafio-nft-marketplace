import { createFileRoute } from '@tanstack/react-router'

import { requireAuth } from '@/features/auth/require-auth'
import { ProfileLayout } from '@/features/profile/components/profile-layout'

// /profile e /profile/wallets: PRIVADAS (a guarda vale para as rotas filhas).
export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location, fallback: '/' }),
  staticData: { mobileTab: 'profile' },
  component: ProfileLayout,
})
