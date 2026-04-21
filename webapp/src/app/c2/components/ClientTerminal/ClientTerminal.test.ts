import { describe, expect, test } from 'vitest'

describe('ClientTerminal WebSocket URL', () => {
  test('generates correct URL for id', () => {
    const id = 'test-client'
    const url = `/api/icenter/roomapi/client/${encodeURIComponent(id)}/terminal`
    expect(url).toBe('/api/icenter/roomapi/client/test-client/terminal')
  })

  test('encodes id correctly', () => {
    const id = 'a/b c'
    const url = `/api/icenter/roomapi/client/${encodeURIComponent(id)}/terminal`
    expect(url).toBe('/api/icenter/roomapi/client/a%2Fb%20c/terminal')
  })
})
