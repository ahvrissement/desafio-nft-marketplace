import emailIcon from '@/assets/icons/share-email.svg'
import linkedinIcon from '@/assets/icons/share-linkedin.svg'
import twitterIcon from '@/assets/icons/share-twitter.svg'
import { MaskIcon } from '@/components/mask-icon'
import { cn } from '@/lib/utils'

// "Compartilhar este NFT": links externos de verdade (o README pede que links
// externos tenham "comportamento coerente"). Abrem em nova aba, e o nome
// acessível avisa disso, para ninguém ser surpreendido.
export function ShareLinks({ name, path, className }: { name: string; path: string; className?: string }) {
  const url = `${window.location.origin}${path}`
  const text = `${name} na Kurio`
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: linkedinIcon,
      size: [15, 14.375],
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
      icon: emailIcon,
      size: [18, 18],
    },
    {
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: twitterIcon,
      size: [15.97, 12.19],
    },
  ] as const

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-[15px] leading-4 font-bold">Compartilhar este NFT:</span>
      <ul className="flex items-center">
        {links.map((link) => {
          const external = !link.href.startsWith('mailto:')
          return (
            <li key={link.label}>
              <a
                href={link.href}
                // noopener: a aba aberta não ganha acesso a esta (window.opener)
                {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
                aria-label={`Compartilhar por ${link.label}${external ? ' (abre em nova aba)' : ''}`}
                // Ícone de 15px, mas área de toque de 32px
                className="grid size-8 place-items-center text-foreground hover:text-text-accent"
              >
                <MaskIcon src={link.icon} width={link.size[0]} height={link.size[1]} />
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
