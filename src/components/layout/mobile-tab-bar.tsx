import { Link } from '@tanstack/react-router'
import type { CSSProperties, ReactNode } from 'react'

import tabBarBackground from '@/assets/icons/tab-bar-bg.svg'
import centerButton from '@/assets/icons/tab-center.svg'
import heartIcon from '@/assets/icons/tab-heart.svg'
import homeIcon from '@/assets/icons/tab-home.svg'
import scanIcon from '@/assets/icons/tab-scan.svg'
import shopIcon from '@/assets/icons/tab-shop.svg'
import userIcon from '@/assets/icons/tab-user.svg'
import { MaskIcon } from '@/components/mask-icon'
import { MobileAccountButton } from '@/features/auth/components/mobile-account-button'
import { cn } from '@/lib/utils'

export type MobileTab = 'home' | 'favorites' | 'cart' | 'profile'

// Barra inferior do frame "Mobile / Início". As posições são as do Figma em
// porcentagem da largura (frame de 414px), então a barra escala de 390 a 1023px.
// Cada ícone tem 20px, mas a área de toque tem 44px (mínimo recomendado para dedo).
const ICON_SIZE = 20
const TOUCH_TARGET = 44

export function MobileTabBar({ active }: { active: MobileTab }) {
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 h-31.5 lg:hidden">
      {/* Fundo com o recorte para o botão central. O SVG inclui a sombra, por isso
          "vaza" para fora da caixa (insets negativos copiados do Figma).
          São DOIS elementos de propósito: a div define a área pelos insets e a imagem
          preenche a div. Num elemento só, o width:100% anularia o inset da direita. */}
      <div aria-hidden className="absolute inset-[24.6%_0_0.04%_0]">
        <div className="absolute inset-[-42.13%_-7.25%_-21.06%_-7.25%]">
          <img src={tabBarBackground} alt="" className="block size-full max-w-none" />
        </div>
      </div>

      <ul>
        <TabItem position={{ left: '8.7%' }} active={active === 'home'}>
          {(props) => (
            <Link to="/" activeOptions={{ exact: true, includeSearch: false }} aria-label="Início" {...props}>
              <MaskIcon src={homeIcon} width={15.83} height={16.67} />
            </Link>
          )}
        </TabItem>

        {/* Visitante: a rota /favorites é privada e pede login (e volta para lá). */}
        <TabItem position={{ left: '26.09%' }} active={active === 'favorites'}>
          {(props) => (
            <Link to="/favorites" aria-label="Favoritos" {...props}>
              <MaskIcon src={heartIcon} width={20} height={17.79} />
            </Link>
          )}
        </TabItem>

        <li className="absolute top-0 left-1/2 size-16.25 -translate-x-1/2">
          {/* Escanear NFT: fora do escopo do desafio */}
          <span
            role="img"
            aria-label="Escanear NFT (em breve)"
            aria-disabled="true"
            title="Em breve"
            className="relative grid size-full cursor-not-allowed place-items-center"
          >
            <img src={centerButton} alt="" className="absolute inset-0 size-full" />
            <img src={scanIcon} alt="" className="relative" />
          </span>
        </li>

        <TabItem position={{ right: '24.64%' }} active={active === 'cart'}>
          {(props) => (
            <Link to="/cart" aria-label="Carrinho" {...props}>
              <MaskIcon src={shopIcon} width={20} height={20} />
            </Link>
          )}
        </TabItem>

        <TabItem position={{ right: '9.66%' }} active={active === 'profile'}>
          {(props) => (
            <MobileAccountButton {...props}>
              <MaskIcon src={userIcon} width={20} height={20} />
            </MobileAccountButton>
          )}
        </TabItem>
      </ul>
    </nav>
  )
}

interface TabItemProps {
  position: { left: string } | { right: string }
  active: boolean
  // Render prop: o item decide posição e estado; quem chama decide se é <Link> ou <button>.
  children: (props: { className: string; 'aria-current'?: 'page' }) => ReactNode
}

function TabItem({ position, active, children }: TabItemProps) {
  // Centraliza a área de 44px sobre o ícone de 20px do Figma (ícone a 71px do topo).
  const offset = (TOUCH_TARGET - ICON_SIZE) / 2
  const style: CSSProperties =
    'left' in position
      ? { left: `calc(${position.left} - ${offset}px)` }
      : { right: `calc(${position.right} - ${offset}px)` }

  return (
    <li className="absolute top-14.75 size-11" style={style}>
      {children({
        className: cn('grid size-full place-items-center', active ? 'text-text-accent' : 'text-text-secondary'),
        'aria-current': active ? 'page' : undefined,
      })}
      {/* O README pede estados que não dependam só da cor: além do laranja,
          o item ativo ganha um ponto embaixo (não existe no Figma). */}
      {active && (
        <span aria-hidden className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-text-accent" />
      )}
    </li>
  )
}
