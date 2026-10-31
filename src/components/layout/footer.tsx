import { Link } from '@tanstack/react-router'

import facebookIcon from '@/assets/icons/social-facebook.svg'
import instagramIcon from '@/assets/icons/social-instagram.svg'
import linkedinIcon from '@/assets/icons/social-linkedin.svg'
import twitterIcon from '@/assets/icons/social-twitter.svg'
import youtubeIcon from '@/assets/icons/social-youtube.svg'
import { ComingSoon } from '@/components/coming-soon'
import type { Category } from '@/contracts/nft'
import { NewsletterForm } from '@/features/newsletter/newsletter-form'
import { touchTargetClass } from '@/lib/ui-classes'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

// Cada link leva a uma tela que existe, ou fica como "Em breve" (fora do
// escopo do README: coleção, atividade, estúdio e central de ajuda).
//   to: 'profile' | 'favorites' → rota do app
//   category                    → catálogo já filtrado (filtro na URL)
type FooterLink = { label: string; to?: '/profile' | '/favorites'; category?: Category }

const LINK_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/profile' },
      { label: 'Minha coleção' },
      { label: 'Atividade' },
      { label: 'Estúdio do criador' },
      { label: 'Lista de interesse', to: '/favorites' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map((label) => ({ label })),
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', category: 'arte-digital' },
      { label: 'Fotografia', category: 'fotografia' },
      { label: 'Música', category: 'musica' },
      { label: 'Arte 3D', category: 'arte-3d' },
      { label: 'Utilidade', category: 'utilidade' },
    ],
  },
]

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className = cn(touchTargetClass, 'hover:text-text-accent hover:underline')
  if (link.to) return <Link to={link.to} className={className}>{link.label}</Link>
  if (link.category) {
    return (
      <Link to="/" search={{ category: [link.category] }} hash="mercado" activeOptions={{ includeHash: true }} className={className}>
        {link.label}
      </Link>
    )
  }
  return <ComingSoon>{link.label}</ComingSoon>
}

const SOCIALS = [
  { name: 'Facebook', icon: facebookIcon },
  { name: 'Instagram', icon: instagramIcon },
  { name: 'Twitter', icon: twitterIcon },
  { name: 'LinkedIn', icon: linkedinIcon },
  { name: 'YouTube', icon: youtubeIcon },
]

export function Footer() {
  return (
    // No mobile o footer ocupa a largura toda (sem a margem lateral da página),
    // para as colunas de links não quebrarem palavras. Variantes como lg: também
    // funcionam em utilitários criados com @utility.
    <footer className="mt-24 pb-6 lg:page-container">
      {/* 1. Vantagens + newsletter. Nome diferente do carrossel do Hero ("Destaques
          da Kurio"): duas regiões com o mesmo nome confundem o leitor de tela. */}
      <section aria-label="Por que a Kurio" className="bg-card p-6 lg:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-0">
          {FEATURES.map((feature, index) => (
            <div key={feature.letter} className="flex lg:contents">
              {/* No Figma a 1ª coluna estica (flex-1) e as outras têm 264px */}
              <div className={cn('flex flex-col gap-3 lg:px-4', index === 0 ? 'lg:flex-1' : 'lg:w-66')}>
                <span
                  aria-hidden
                  className="grid size-18.5 place-items-center rounded-full bg-primary text-2xl font-bold text-ink"
                >
                  {feature.letter}
                </span>
                <h2 className="text-[17px] leading-4 font-bold">{feature.title}</h2>
                <p className="max-w-51 text-sm leading-5.5 text-text-secondary">{feature.text}</p>
              </div>
              {/* divisória vertical de 1px depois de cada destaque (só no desktop) */}
              <span aria-hidden className="hidden w-px bg-primary lg:block" />
            </div>
          ))}

          <div className="flex flex-col gap-3 lg:w-89.25 lg:px-4">
            <h2 className="text-lg leading-4 font-bold">Antecipe-se ao próximo lançamento</h2>
            <NewsletterForm />
            <p className="text-[13px] leading-5.5 text-text-secondary">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Faixa da marca com contato */}
      <div className="grid gap-4 bg-surface-dark p-6 text-sm leading-5.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_228px] lg:items-center lg:gap-23 lg:p-8">
        <p className="font-bold tracking-widest">KURIO</p>
        {/* nowrap: no Figma a frase ocupa exatamente 2 linhas */}
        <p className="lg:whitespace-nowrap">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        {/* Links de contato têm comportamento coerente: abrem o e-mail e o discador */}
        <a href="mailto:contato@email.com" className={cn(touchTargetClass, 'hover:text-text-accent')}>
          contato@email.com
        </a>
        <a href="tel:+551140028922" className={cn(touchTargetClass, 'hover:text-text-accent')}>
          +55 11 4002 8922
        </a>
      </div>

      {/* 3. Colunas de links, redes e carteiras */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 bg-card p-6 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-31 lg:p-8">
        {LINK_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2">
            <h2 className="text-lg leading-4 font-bold">{column.title}</h2>
            <ul className="text-sm leading-7.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="col-span-2 flex flex-col gap-8 lg:col-span-1">
          <div className="flex flex-col gap-5">
            <h2 className="text-lg leading-4 font-bold">Redes sociais</h2>
            {/* A Kurio é fictícia: não há perfis reais para linkar. */}
            <ul className="flex items-center gap-2.5">
              {SOCIALS.map((social) => (
                <li key={social.name} className="grid size-7.5 place-items-center">
                  <ComingSoon>
                    <img src={social.icon} alt={social.name} />
                  </ComingSoon>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg leading-4 font-bold">Carteiras compatíveis</h2>
            {/* Lista de verdade (o leitor de tela anuncia "3 itens", sem ler os "•").
                11px, e não os 9px do Figma: abaixo disso o texto fica ilegível.
                O "•" vem do CSS e fica junto do item seguinte: quebra limpa na coluna estreita. */}
            <ul className="flex min-h-6.5 flex-wrap items-center justify-center gap-x-1.5 rounded-md border border-border-soft bg-surface-dark px-2 py-1 text-[11px] font-bold tracking-[0.1px] text-text-accent [&>li+li]:before:mr-1.5 [&>li+li]:before:content-['•']">
              {['MetaMask', 'WalletConnect', 'Coinbase'].map((wallet) => (
                <li key={wallet} className="whitespace-nowrap uppercase">
                  {wallet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-1.5 px-6 text-center text-sm leading-7.5 lg:px-0">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
