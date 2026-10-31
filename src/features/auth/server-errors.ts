import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import type { ApiError } from '@/lib/http'

// Leva os erros da API para dentro do formulário:
//   fieldErrors { email: [...] } → mensagem embaixo do campo e foco nele;
//   o resto (senha errada, rede caiu) → mensagem geral do formulário ("root").
export function applyServerErrors<T extends FieldValues>(error: ApiError, setError: UseFormSetError<T>, fields: Path<T>[]) {
  let first = true
  for (const field of fields) {
    const message = error.fieldErrors[field]?.[0]
    if (message) {
      setError(field, { type: 'server', message }, { shouldFocus: first })
      first = false
    }
  }
  if (first) setError('root.server' as Path<T>, { type: 'server', message: error.message })
}
