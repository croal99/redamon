import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function GraphLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('bluenet_token')?.value
  if (!token) redirect('/login?next=/graph')
  return children
}

