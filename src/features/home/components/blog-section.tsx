import { ComingSoon } from '@/components/coming-soon'

import { BLOG_POSTS, type BlogPost } from '../content'

// "12 de setembro". timeZone UTC: '2026-09-12' é meia-noite UTC; sem isso,
// no Brasil (UTC-3) a data viraria "11 de setembro".
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' })

// Seção "Blog" do Figma ("Diário da Cunhagem").
// Páginas editoriais estão fora do escopo do desafio, então "Ler mais" fica
// como "Em breve" em vez de um link que não leva a lugar nenhum.
export function BlogSection() {
  return (
    <section aria-labelledby="blog-titulo" className="page-container">
      <header className="text-center">
        <h2 id="blog-titulo" className="text-2xl leading-9.25 font-bold lg:text-3xl">
          Diário da Cunhagem
        </h2>
        <p className="mt-3 text-sm leading-4.5 text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {BLOG_POSTS.map((post) => (
          <li key={post.title}>
            <BlogCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg bg-card">
      <img
        src={post.image}
        width={400}
        height={400}
        alt=""
        loading="lazy"
        className="h-48.75 w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
        <p className="text-xs leading-4 text-text-secondary">
          <time dateTime={post.publishedAt}>{dateFormat.format(new Date(post.publishedAt))}</time>
          <span aria-hidden className="px-3">
            |
          </span>
          <span className="sr-only">, </span>
          Leitura de {post.readingMinutes} min
        </p>
        <h3 className="text-base leading-5.25 font-bold">{post.title}</h3>
        <p className="text-xs leading-4 text-text-secondary">{post.excerpt}</p>
        <ComingSoon className="mt-auto text-xs leading-4 font-bold text-text-accent">
          Ler mais <span aria-hidden>→</span>
        </ComingSoon>
      </div>
    </article>
  )
}
