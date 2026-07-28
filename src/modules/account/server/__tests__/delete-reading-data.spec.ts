import { describe, expect, it, vi } from 'vitest'
import { deleteReadingData } from '../delete-reading-data'

function client(user: unknown, error?: unknown) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user } })) },
    rpc: vi.fn(async () => ({ error })),
  }
}

describe('deleteReadingData', () => {
  it('requires the exact confirmation before authentication or deletion', async () => {
    const mockClient = client({ id: 'user-a' })
    const result = await deleteReadingData(mockClient, 'حذف بيانات')

    expect(result).toMatchObject({ success: false, code: 'INVALID_CONFIRMATION' })
    expect(mockClient.auth.getUser).not.toHaveBeenCalled()
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('rejects an unauthenticated user', async () => {
    const mockClient = client(null)
    const result = await deleteReadingData(mockClient, 'حذف بياناتي')

    expect(result).toMatchObject({ success: false, code: 'UNAUTHENTICATED' })
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('calls only the trusted RPC without a browser-supplied user id', async () => {
    const mockClient = client({ id: 'user-a' })
    const result = await deleteReadingData(mockClient, 'حذف بياناتي')

    expect(result).toEqual({ success: true })
    expect(mockClient.rpc).toHaveBeenCalledWith('delete_my_reading_data', {
      p_confirmation: 'حذف بياناتي',
    })
  })

  it('redacts unknown database failures', async () => {
    const mockClient = client(
      { id: 'user-a' },
      { message: 'relation private_table leaked raw SQL details', details: 'secret detail' },
    )
    const result = await deleteReadingData(mockClient, 'حذف بياناتي')

    expect(result).toMatchObject({ success: false, code: 'INTERNAL_ERROR' })
    expect(result).not.toEqual(expect.objectContaining({ message: expect.stringContaining('private_table') }))
    expect(result).not.toEqual(expect.objectContaining({ message: expect.stringContaining('secret detail') }))
  })

  it('maps an atomic database deletion failure to a stable safe error', async () => {
    const mockClient = client({ id: 'user-a' }, { message: 'DELETE_FAILED' })
    const result = await deleteReadingData(mockClient, 'حذف بياناتي')

    expect(result).toMatchObject({ success: false, code: 'DELETE_FAILED' })
  })
})
