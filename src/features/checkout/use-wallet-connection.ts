import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import type { ConnectedWallet } from '@/contracts/checkout'

import { connectWallet } from './api'

// A conexão com a extensão da carteira (simulada): conectar, recusar, desconectar.
// Uma só por página: a seção de carteiras e a revisão do pedido usam a mesma.
export function useWalletConnection() {
  const [connection, setConnection] = useState<ConnectedWallet | null>(null)
  const connect = useMutation({ mutationFn: connectWallet, onSuccess: setConnection })

  return {
    connection,
    connect,
    // Trocar carteira/provedor ou clicar em "Desconectar"
    disconnect: () => {
      setConnection(null)
      connect.reset()
    },
  }
}

export type WalletConnection = ReturnType<typeof useWalletConnection>
