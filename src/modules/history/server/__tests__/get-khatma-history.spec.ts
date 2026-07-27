import { describe, expect, it } from 'vitest'
import { getKhatmaHistory } from '../get-khatma-history'
import {
  createHistoryClient,
  historyEvent,
  KHATMA_ID,
  khatmaRow,
  OTHER_KHATMA_ID,
} from './test-client'

describe('getKhatmaHistory', () => {
  it('returns not found for a malformed khatma id', async () => {
    const { client, rpc, from } = createHistoryClient()

    await expect(
      getKhatmaHistory(client, 'not-a-uuid', '1'),
    ).resolves.toEqual({ status: 'not_found' })
    expect(rpc).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('does not reveal a foreign khatma', async () => {
    const { client, from } = createHistoryClient({
      details: { data: [], error: null },
    })

    await expect(
      getKhatmaHistory(client, OTHER_KHATMA_ID, '1'),
    ).resolves.toEqual({ status: 'not_found' })
    expect(from).not.toHaveBeenCalled()
  })

  it('returns only events scoped to the owned khatma in chronological order', async () => {
    const { client, builder } = createHistoryClient({
      details: { data: [khatmaRow()], error: null },
      events: {
        data: [historyEvent({ khatmaId: KHATMA_ID })],
        error: null,
        count: 21,
      },
    })

    const result = await getKhatmaHistory(client, KHATMA_ID, '2')

    expect(result.status).toBe('success')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(builder.eq).toHaveBeenCalledWith('khatma_id', KHATMA_ID)
    expect(builder.order).toHaveBeenNthCalledWith(1, 'completed_at', {
      ascending: true,
    })
    expect(builder.order).toHaveBeenNthCalledWith(2, 'id', {
      ascending: true,
    })
    expect(builder.range).toHaveBeenCalledWith(20, 39)
    if (result.status === 'success') {
      expect(result.data.dayGroups[0].events[0].khatmaId).toBe(KHATMA_ID)
      expect(result.data.pagination).toMatchObject({
        page: 2,
        hasPrevious: true,
        hasNext: false,
      })
    }
  })

  it('rejects malformed or cross-khatma event data safely', async () => {
    const { client } = createHistoryClient({
      details: { data: [khatmaRow()], error: null },
      events: {
        data: [historyEvent({ khatmaId: OTHER_KHATMA_ID })],
        error: null,
        count: 1,
      },
    })

    const result = await getKhatmaHistory(client, KHATMA_ID, '1')

    expect(result.status).toBe('error')
    expect(JSON.stringify(result)).not.toContain(OTHER_KHATMA_ID)
  })
})
