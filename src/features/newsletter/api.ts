import {
  newsletterSignupResponseSchema,
  type NewsletterSignup,
} from '@/contracts/newsletter'
import { request } from '@/lib/http'

export function subscribeNewsletter(input: NewsletterSignup) {
  return request(newsletterSignupResponseSchema, { method: 'POST', url: '/newsletter', data: input })
}
