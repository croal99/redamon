import { useCallback, useState } from 'react'
import { CenterClientInfo, TerminalAuthMessage } from '../types/center'

const BLINK_API_URL =
  process.env.NEXT_PUBLIC_BLINK_API_URL ||
  'http://localhost:7080'

const TERMINAL_DEFAULT_AUTH_DATA: TerminalAuthMessage = {
  host_ip: '127.0.0.1',
  host_port: 5922,
  auth_type: 'key',
  username: 'root',
  privilege_key: `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEAuz2tEeuDAdkJNFUahak+HOIiVR1j64+Cuky0OzvC2yhjTcqj3ULt
TGyWVWHMr76qofwUuFcFLdvwr/1e3n3/VXMFNExV93YX7ns41x/ViEWnr+LSYJ/PBYKcRk
COXFc0MlhK8zLXji9zjwIiXvAvsWEq6MJU2XHxOo5MiLt+0TOf6FsIPxpH9O5eJGos/GDq
DNNA77r5/xVQuUZNmqp+H2S8heyhUgpEwgmPtrViWQ5KNxFx8vgMQQUuE6ua+/oenABATl
Y4JxYd31GKRokibsDVrFDmpxipjKa1/WXIFDaSWXKRgwRpVmAyxFptk4QGU+QgUi92vtkp
DGVVUotZJwAAA8CBrBNOgawTTgAAAAdzc2gtcnNhAAABAQC7Pa0R64MB2Qk0VRqFqT4c4i
JVHWPrj4K6TLQ7O8LbKGNNyqPdQu1MbJZVYcyvvqqh/BS4VwUt2/Cv/V7eff9VcwU0TFX3
dhfuezjXH9WIRaev4tJgn88FgpxGQI5cVzQyWErzMteOL3OPAiJe8C+xYSrowlTZcfE6jk
yIu37RM5/oWwg/Gkf07l4kaiz8YOoM00Dvuvn/FVC5Rk2aqn4fZLyF7KFSCkTCCY+2tWJZ
Dko3EXHy+AxBBS4Tq5r7+h6cAEBOVjgnFh3fUYpGiSJuwNWsUOanGKmMprX9ZcgUNpJZcp
GDBGlWYDLEWm2ThAZT5CBSL3a+2SkMZVVSi1knAAAAAwEAAQAAAQBl+RUEqWrT2su0gJTN
LnrxaAairDr601Gy/Is7pzRb/wb2GuJbYlOyR4EoRvcez4xGY+805c+gRiQy9J5yNdSVSO
sQrHI1L0+hReKS5nd4m9bTZ4iDrwUkTxmk+QuPJr76nDNVd98FRLp+q/7kDZMr22tvEEb9
lZx284CjBtnuPGzba0EFEtwwc5nksZAqgMGChcC0Fjl8eMIBxlq0ychktvZfgDCN8wz0Tt
PWYwf0NZMfi36aC7zPydem0D0gt6Scb/+EAIsa6hvz385uhA0kikTzrPcsTg4HRdV9euvC
UYS+uZq1AFWNFLcTiYXGW8Sx5UhNdHvpbrG+AxuNf3zhAAAAgDp09f+fG4B9UeQpe9Kn5J
/iP/zVxn6bacdC71hObjr+CtCI98UCGk4iOqLWSDQpgMNLfukB8q5+++ZXzwfH14yBQCwQ
ojqSEZmfONo3rjoDHFWsUU2YaPUnfWtSl1DXWaNdr/1DYZ3pvAzMrPYGRIilOzrmBkVvT/
Oqi4Wx3W5GAAAAgQDez/3KQc84KaCUZ+xs7pGyfYblNqQNQHkmU+jiu5RzZ6+F1+BmDqj5
77xWSeDdVwnLfSXyEg3QsI0VIbX4M5GkFtinb/wGYTQFB5WpbM89lxC9BXtNn1cFAV9DcX
w/CvwODt0zZxqQ4QK3e+ATlWsGB8Jx3Ag/GTQfluuN/9iK5QAAAIEA1yFQjt0pUDU6fdlx
dvr0HLYQSYU51ECz39dnmVOXoCyRA3NjIgAw7dA80AnUVKRkNZZwv6yCq5oPq5MVMfegTL
OoGXxC2OVC4E8zTD+zcO5ba/QGb63VXVrZ/XBz+99yaVIyuLFsZR1qE0fI+yxdCB4n+j2Z
iW2fkCcla0gPtxsAAAAIdGVzdF9rZXkBAgM=
-----END OPENSSH PRIVATE KEY-----
`,
}

export function useBLinkClient() {
  const [clientList, setClientList] = useState<CenterClientInfo[]>([])

  const TerminalDefaultAuthData = TERMINAL_DEFAULT_AUTH_DATA

  const fetchClientList = useCallback(async (): Promise<CenterClientInfo[]> => {
    console.log('fetchClientList', BLINK_API_URL)
    const response = await fetch(`${BLINK_API_URL}/api/clients`)
    const data = await response.json()
    setClientList(data.data || [])
    return data.data || []
  }, [])

  return {
    clientList,
    TerminalDefaultAuthData,
    fetchClientList,
  }
}

export default useBLinkClient
