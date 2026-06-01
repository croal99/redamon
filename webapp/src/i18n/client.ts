'use client'

import { createIntlClient } from 'next-intl'

export function useTranslations(
  namespace: string | string[],
  options?: { locale?: string }
) {
  return createIntlClient(namespace, options)
}
