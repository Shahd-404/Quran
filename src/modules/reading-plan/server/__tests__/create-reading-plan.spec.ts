import { describe, it, expect, vi } from 'vitest';
import { createReadingPlan } from '../create-reading-plan';
import { codeToArabic } from '../error-mapping';
import { CreatePlanInput } from '../types';

const mockClient = () => ({
  rpc: vi.fn()
});

const validSessionSet = [
  { sessionOrder: 1, scheduledTime: '08:00' },
  { sessionOrder: 2, scheduledTime: '12:00' },
  { sessionOrder: 3, scheduledTime: '18:00' },
];

function expectFailure(result: any, code: string) {
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.code).toBe(code);
  }
}

describe('createReadingPlan server', () => {
  it('valid plan creates and returns ids', async () => {
    const client = mockClient();
    const fakeRes = [{ plan_id: '11111111-1111-1111-1111-111111111111', khatma_id: '22222222-2222-2222-2222-222222222222' }];
    (client.rpc as any).mockResolvedValue({ data: fakeRes, error: null });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 3,
      sessions: validSessionSet,
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.planId).toBe(fakeRes[0].plan_id);
      expect(res.khatmaId).toBe(fakeRes[0].khatma_id);
    }
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('create_reading_plan', expect.objectContaining({
      p_sessions: input.sessions,
    }));
  });

  it('rejects page 0', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 0,
      dailyPages: 3,
      sessions: validSessionSet,
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_START_PAGE');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects page 605', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 605,
      dailyPages: 3,
      sessions: validSessionSet,
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_START_PAGE');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects zero daily pages', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 1,
      dailyPages: 0,
      sessions: validSessionSet,
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_DAILY_PAGES');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects more than six sessions', async () => {
    const client = mockClient();
    const sessions = Array.from({ length: 7 }, (_, index) => ({ sessionOrder: index + 1, scheduledTime: `0${index}:00`.slice(-5) }));
    const res = await createReadingPlan(client as any, {
      startPage: 1,
      dailyPages: 7,
      sessions,
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_SESSIONS');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects sessions greater than daily pages', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 1,
      dailyPages: 2,
      sessions: validSessionSet,
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_SESSIONS');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects duplicate session order', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 1,
      dailyPages: 3,
      sessions: [
        { sessionOrder: 1, scheduledTime: '08:00' },
        { sessionOrder: 1, scheduledTime: '12:00' },
      ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_SESSIONS');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects non-consecutive session orders', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 1,
      dailyPages: 3,
      sessions: [
        { sessionOrder: 1, scheduledTime: '08:00' },
        { sessionOrder: 3, scheduledTime: '12:00' },
      ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_SESSIONS');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects duplicate times', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 1,
      dailyPages: 3,
      sessions: [
        { sessionOrder: 1, scheduledTime: '08:00' },
        { sessionOrder: 2, scheduledTime: '08:00' },
      ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_SCHEDULE');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects invalid time format', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 1,
      dailyPages: 3,
      sessions: [
        { sessionOrder: 1, scheduledTime: '8:00' },
        { sessionOrder: 2, scheduledTime: '12:00' },
      ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_SCHEDULE');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects non-chronological times', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 1,
      dailyPages: 3,
      sessions: [
        { sessionOrder: 1, scheduledTime: '12:00' },
        { sessionOrder: 2, scheduledTime: '08:00' },
      ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_SCHEDULE');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects empty timezone', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 1,
      dailyPages: 3,
      sessions: validSessionSet,
      timezone: '   ',
      effectiveFrom: '2026-07-25'
    });
    expectFailure(res, 'INVALID_TIMEZONE');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('rejects invalid effective date', async () => {
    const client = mockClient();
    const res = await createReadingPlan(client as any, {
      startPage: 1,
      dailyPages: 3,
      sessions: validSessionSet,
      timezone: 'Africa/Cairo',
      effectiveFrom: 'not-a-date'
    });
    expectFailure(res, 'INVALID_EFFECTIVE_DATE');
    expect((client.rpc as any).mock.calls.length).toBe(0);
  });

  it('maps ACTIVE_PLAN_EXISTS error', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'ACTIVE_PLAN_EXISTS' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 3,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'ACTIVE_PLAN_EXISTS');
  });

  it('maps UNAUTHENTICATED error', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'UNAUTHENTICATED' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 1,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'UNAUTHENTICATED');
  });

  it('maps active-khatma-constraint failures to ACTIVE_PLAN_EXISTS', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'duplicate key value violates unique constraint "idx_khatmas_unique_active_per_user"' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 1,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'ACTIVE_PLAN_EXISTS');
  });

  it('maps PROFILE_NOT_FOUND error', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'PROFILE_NOT_FOUND' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 1,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'PROFILE_NOT_FOUND');
  });

  it('maps PROFILE_NOT_FOUND to the Arabic message', () => {
    expect(codeToArabic('PROFILE_NOT_FOUND')).toContain('الملف الشخصي');
  });

  it('maps INVALID_START_PAGE error', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'INVALID_START_PAGE' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 1,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'INVALID_START_PAGE');
  });

  it('maps INVALID_DAILY_PAGES error', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'INVALID_DAILY_PAGES' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 1,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'INVALID_DAILY_PAGES');
  });

  it('maps INVALID_SESSIONS error', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'INVALID_SESSIONS' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 1,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'INVALID_SESSIONS');
  });

  it('maps INVALID_SCHEDULE error', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'INVALID_SCHEDULE' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 1,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'INVALID_SCHEDULE');
  });

  it('maps INVALID_TIMEZONE error', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'INVALID_TIMEZONE' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 1,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'INVALID_TIMEZONE');
  });

  it('maps INVALID_EFFECTIVE_DATE error', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'INVALID_EFFECTIVE_DATE' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 1,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'INVALID_EFFECTIVE_DATE');
  });

  it('maps generic internal error', async () => {
    const client = mockClient();
    (client.rpc as any).mockResolvedValue({ data: null, error: { message: 'SOME_DB_FAILURE' } });

    const input: CreatePlanInput = {
      startPage: 1,
      dailyPages: 1,
      sessions: [ { sessionOrder: 1, scheduledTime: '08:00' } ],
      timezone: 'Africa/Cairo',
      effectiveFrom: '2026-07-25'
    };

    const res = await createReadingPlan(client as any, input);
    expectFailure(res, 'INTERNAL_ERROR');
  });
});
