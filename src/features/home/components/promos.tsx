import { Link } from '@tanstack/react-router'

import arrowIcon from '@/assets/icons/arrow-right-long.svg'
import { MaskIcon } from '@/components/mask-icon'

import { PROMOS } from '../content'

// Os dois cards de "Promos" do Figma (586×250 cada, 28px entre eles).
// Cada "Explorar" abre o catálogo já filtrado: o filtro vai na URL, então o
// <Link search> do TanStack Router é tipado (aba inexistente = erro de TS).
export function Promos() {
  return (
    <section aria-labelledby="promos-titulo" className="page-container">
      <h2 id="promos-titulo" className="sr-only">
        Coleções em destaque
      </h2>
      <ul className="grid gap-6 lg:grid-cols-2 lg:gap-7">
        {PROMOS.map((promo) => (
          // Desktop: 250px fixos do Figma. Mobile (sem frame): cresce com o texto, senão o botão é cortado.
          <li key={promo.title} className="relative min-h-62.5 overflow-hidden rounded-2xl bg-card lg:h-62.5">
            <img
              src={promo.image}
              width={400}
              height={400}
              alt="" // decorativa: o título do card é o conteúdo
              loading="lazy"
              className="absolute top-0 -left-1.25 h-full w-[48%] rounded-[20px] object-cover lg:w-73"
            />

            {/* As duas linhas curvas laranjas no canto inferior esquerdo ("Ellipse 7/8") */}
            <div aria-hidden className="pointer-events-none">
              <span className="absolute top-35.5 -left-47.75 size-64 rounded-full border border-primary" />
              <span className="absolute top-33.5 -left-49.75 size-64 rounded-full border border-primary" />
            </div>

            <div className="relative ml-auto flex h-full w-[52%] flex-col items-end gap-4 py-6 pr-4 text-right lg:gap-0 lg:pt-9.25 lg:pb-11.5 lg:w-74 lg:pr-7.5">
              <h3 className="text-base leading-6 font-bold lg:text-lg lg:whitespace-pre-line">{promo.title}</h3>
              <p className="mt-2 text-xs leading-5 text-text-secondary lg:text-sm lg:leading-5.5">{promo.description}</p>
              <Link
                to="/"
                search={{ tab: promo.tab }}
                hash="mercado"
                // Sem includeHash, o Link se acharia "ativo" em qualquer visita à Home e
                // anunciaria aria-current="page" num botão de ação. Com ele, só em /#mercado.
                activeOptions={{ includeHash: true }}
                className="mt-auto flex h-10 w-35 shrink-0 items-center justify-center gap-0.5 rounded-[5px] bg-primary font-medium text-ink hover:bg-text-accent"
              >
                Explorar
                {/* Dois "Explorar" na mesma página: o leitor de tela precisa saber qual é qual */}
                {/* O sr-only é position:absolute, e o navegador põe um espaço antes dele
                    no nome acessível: por isso "Explorar – título", não "Explorar: título". */}
                <span className="sr-only">– {promo.title}</span>
                <MaskIcon src={arrowIcon} width={18} height={18} />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
