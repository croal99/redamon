'use client'

import type { ReactNode } from 'react'

interface DisclaimerGateProps {
  children: ReactNode
}
export function DisclaimerGate({ children }: DisclaimerGateProps) {
  return <>{children}</>
}
