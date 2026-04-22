import { useCallback, useState } from 'react'
import { CenterClientInfo } from '../types/center'

const BLINK_API_URL =
  process.env.NEXT_PUBLIC_BLINK_API_URL ||
  'http://localhost:7080'

export function useBLinkClient() {
  const [clientList, setClientList] = useState<CenterClientInfo[]>([])

  const fetchClientList = useCallback(async (): Promise<CenterClientInfo[]> => {
    console.log('fetchClientList', BLINK_API_URL)
    const response = await fetch(`${BLINK_API_URL}/api/clients`)
    const data = await response.json()
    setClientList(data.data || [])
    return data.data || []
  }, [])

  return {
    clientList,
    fetchClientList,
  }
}

export default useBLinkClient
