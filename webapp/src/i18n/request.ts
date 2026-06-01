import { getRequestConfig } from 'next-intl/server'
import { defineRouting } from 'next-intl/middleware'

export const routing = defineRouting({
  locales: ['zh-CN'],
  defaultLocale: 'zh-CN',
  pathnames: {},
})

export type Locale = (typeof routing.locales)[number]

export function getTranslations(
  namespace: string | string[],
  options?: { locale?: Locale }
) {
  return getRequestConfig(routing, options?.locale)
}
