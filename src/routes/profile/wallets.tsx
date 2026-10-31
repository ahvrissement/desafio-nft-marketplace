import { createFileRoute } from '@tanstack/react-router'

import { WalletsPage } from '@/features/profile/components/wallets-page'

export const Route = createFileRoute('/profile/wallets')({ component: WalletsPage })
