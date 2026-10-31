import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import arrowIcon from '@/assets/icons/arrow-right-long.svg'
import { MaskIcon } from '@/components/mask-icon'
import { useSwipe } from '@/hooks/use-swipe'
import { cn } from '@/lib/utils'

import { HERO_SLIDES, type HeroSlide } from '../content'

// Banner "Hero" da Home: carrossel SEM troca automática.
// Com autoplay, a WCAG 2.2.2 exigiria um botão de pausar; sem ele, o usuário
// decide quando trocar, pelos pontos ou arrastando no celular.
//
// Padrão "Carousel" do WAI-ARIA APG:
//   - a região se anuncia como "carrossel" (aria-roledescription);
//   - cada slide é um grupo "slide" com rótulo "1 de 3";
//   - os slides fora da tela ficam `inert`: sem Tab e fora do leitor de tela;
//   - aria-live="polite" lê o novo slide quando o usuário troca.
export function Hero() {
  const [active, setActive] = useState(0)
  const total = HERO_SLIDES.length

  const goTo = (index: number) => setActive((index + total) % total)
  const swipe = useSwipe({ onNext: () => goTo(active + 1), onPrevious: () => goTo(active - 1) })

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques da Kurio" className="page-container">
      <div
        className="relative h-47.5 overflow-hidden rounded-3xl bg-surface-raised lg:h-112.5 lg:rounded-none lg:bg-background"
        {...swipe}
      >
        {/* Os dois círculos claros do fundo do banner mobile ("Ellipse 49/50" no Figma) */}
        <div aria-hidden className="lg:hidden">
          <span className="absolute -top-7.75 -left-20 size-62 rounded-full bg-linear-to-b from-primary/45 to-primary/15" />
          <span className="absolute -top-2.5 left-18.25 size-62 rounded-full bg-linear-to-b from-primary/30 to-primary/5" />
        </div>

        {/* Todos os slides ocupam a MESMA célula do grid (um em cima do outro) e
            trocam por opacidade. Assim a altura não muda e não há CLS. */}
        <div aria-live="polite" className="grid h-full">
          {HERO_SLIDES.map((slide, index) => (
            <Slide key={slide.kicker} slide={slide} index={index} total={total} active={index === active} />
          ))}
        </div>

        <div
          role="group"
          aria-label="Escolher slide"
          className="absolute bottom-0 left-1/2 z-10 flex -translate-x-1/2 lg:top-97.75 lg:bottom-auto lg:left-146 lg:translate-x-0"
        >
          {HERO_SLIDES.map((slide, index) => (
            <button
              key={slide.kicker}
              type="button"
              aria-label={`Slide ${index + 1} de ${total}`}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => goTo(index)}
              // Alvo de 24px (WCAG 2.5.8); o ponto visível continua com o tamanho do Figma.
              className="group grid size-6 place-items-center"
            >
              <span
                className={cn(
                  'size-1.75 rounded-full bg-primary transition-opacity lg:size-2',
                  // O Figma pinta os 3 iguais; o atual precisa se destacar.
                  index === active ? 'opacity-100' : 'opacity-40 group-hover:opacity-70',
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

interface SlideProps {
  slide: HeroSlide
  index: number
  total: number
  active: boolean
}

function Slide({ slide, index, total, active }: SlideProps) {
  // Só a imagem do 1º slide é o LCP: baixa na frente. As outras esperam.
  const isFirst = index === 0

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} de ${total}`}
      inert={!active}
      className={cn(
        'relative col-start-1 row-start-1 transition-[opacity,visibility] duration-500',
        active ? 'visible opacity-100' : 'invisible opacity-0',
      )}
    >
      {/* Coluna de texto. No mobile, reserva à direita o espaço das imagens (16 + 138 + 8px). */}
      <div className="relative z-10 flex w-[calc(100%-162px)] flex-col pt-1.5 pl-4 lg:w-150 lg:pt-10.75 lg:pl-10">
        <p className="text-xs leading-4 font-medium lg:text-base">{slide.kicker}</p>
        <h2 className="mt-1.5 text-lg leading-7.25 font-bold uppercase lg:mt-2 lg:text-[43px] lg:leading-17.5">
          <span className="lg:hidden">{slide.title.mobile}</span>
          <span className="hidden lg:inline">{slide.title.desktop}</span>
        </h2>
        <p className="mt-1.5 text-xs leading-4.5 text-text-secondary lg:mt-1 lg:text-sm lg:leading-6">
          <span className="lg:hidden">{slide.description.mobile}</span>
          <span className="hidden lg:inline">{slide.description.desktop}</span>
        </p>
        <Link
          to="/"
          search={{ tab: slide.tab }}
          hash="mercado"
          // Sem includeHash, o Link se acharia "ativo" em qualquer visita à Home e
          // anunciaria aria-current="page" num botão de ação. Com ele, só em /#mercado.
          activeOptions={{ includeHash: true }}
          className={cn(
            // Mobile: link de texto laranja com seta. Desktop: botão do Figma (140×40).
            'mt-0.5 flex w-fit items-center gap-2 text-xs leading-4 font-bold text-text-accent uppercase',
            'lg:mt-8 lg:h-10 lg:w-35 lg:justify-center lg:rounded-[5px] lg:bg-primary lg:text-base lg:font-semibold lg:text-ink lg:hover:bg-text-accent',
          )}
        >
          Explorar
          <MaskIcon src={arrowIcon} width={16} height={16} className="lg:hidden" />
        </Link>
      </div>

      <img
        src={slide.images.main.small}
        srcSet={`${slide.images.main.small} 400w, ${slide.images.main.large} 800w`}
        sizes="(min-width: 1024px) 450px, 138px"
        width={800}
        height={800}
        // Decorativa: o texto do slide já diz tudo; descrever o macaco só atrapalharia.
        alt=""
        loading={isFirst ? 'eager' : 'lazy'}
        fetchPriority={isFirst ? 'high' : 'auto'}
        className="absolute top-2.5 right-4 size-34.5 rounded-2xl object-cover lg:top-0 lg:right-0 lg:size-112.5 lg:rounded-[20px]"
      />
      <img
        src={slide.images.accent.small}
        width={400}
        height={400}
        alt=""
        loading="lazy"
        className="absolute top-24.5 right-20.5 size-14.5 rounded-xl object-cover lg:hidden"
      />
    </div>
  )
}
