// Classes de botões que se repetem em vários componentes. Ficam num .ts (e não
// num arquivo de componente) porque o Fast Refresh só funciona em arquivos que
// exportam apenas componentes.

// Área de toque maior sem mudar o desenho: um ::after invisível 4px acima e
// abaixo. Links de texto pequenos (rodapé, "Explorar") chegam aos 24px
// mínimos da WCAG 2.5.8 no celular.
export const touchTargetClass = 'relative after:absolute after:-inset-y-1 after:inset-x-0'

// Botão redondo de 35px dos frames mobile (voltar, favoritar), com área de toque maior.
export const circleButtonClass =
  'relative grid size-8.75 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-foreground after:absolute after:-inset-1 disabled:cursor-not-allowed'
