import { cn } from '@/lib/utils'

// Ícone SVG do Figma que muda de cor por CSS.
//
// Um <img src="icone.svg"> mostra a cor que está dentro do arquivo, e não dá para
// trocar. Com mask-image, o SVG vira só a FORMA (uma máscara) e quem pinta é o
// background-color, aqui `bg-current`, ou seja, a cor do texto do elemento pai.
// Resultado: <MaskIcon className="text-text-accent" /> deixa o ícone laranja.
//
// width/height são os tamanhos originais do SVG no Figma; não os altere.
interface MaskIconProps {
  src: string
  width: number
  height: number
  className?: string
}

export function MaskIcon({ src, width, height, className }: MaskIconProps) {
  return (
    <span
      aria-hidden // decorativo: quem descreve a ação é o aria-label do botão/link
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{
        width,
        height,
        maskImage: `url("${src}")`,
        maskSize: '100% 100%',
        maskRepeat: 'no-repeat',
      }}
    />
  )
}
