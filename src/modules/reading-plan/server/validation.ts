import { CreatePlanInput, SessionInput } from './types';

export class ValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

function isValidTime(text: string) {
  if (!/^[0-2][0-9]:[0-5][0-9]$/.test(text)) return false;
  try {
    const _ = (text as string);
    // let runtime validation be simple; parse hours/minutes
    const [h, m] = _.split(':').map(Number);
    if (h < 0 || h > 23) return false;
    if (m < 0 || m > 59) return false;
    return true;
  } catch (e) {
    return false;
  }
}

export function validateCreatePlanInput(input: CreatePlanInput) {
  if (!input) throw new ValidationError('INVALID_INPUT', 'Invalid input');
  const { startPage, dailyPages, sessions, timezone, effectiveFrom } = input;
  if (!Number.isInteger(startPage) || startPage < 1 || startPage > 604) {
    throw new ValidationError('INVALID_START_PAGE', 'startPage must be 1..604');
  }
  if (!Number.isInteger(dailyPages) || dailyPages < 1 || dailyPages > 604) {
    throw new ValidationError('INVALID_DAILY_PAGES', 'dailyPages must be 1..604');
  }
  if (!Array.isArray(sessions) || sessions.length < 1 || sessions.length > 6) {
    throw new ValidationError('INVALID_SESSIONS', 'sessions must be 1..6 items');
  }
  if (sessions.length > dailyPages) {
    throw new ValidationError('INVALID_SESSIONS', 'sessions cannot exceed dailyPages');
  }

  // orders must start at 1, be consecutive and unique
  for (let i = 0; i < sessions.length; i++) {
    const s: SessionInput = sessions[i];
    if (!Number.isInteger(s.sessionOrder) || s.sessionOrder !== i + 1) {
      throw new ValidationError('INVALID_SESSIONS', 'sessionOrder must start at 1 and be consecutive');
    }
    if (typeof s.scheduledTime !== 'string' || !isValidTime(s.scheduledTime)) {
      throw new ValidationError('INVALID_SCHEDULE', 'scheduledTime must be HH:mm');
    }
    if (i > 0) {
      // ensure chronological order
      const prev = sessions[i - 1].scheduledTime;
      if (s.scheduledTime <= prev) {
        throw new ValidationError('INVALID_SCHEDULE', 'scheduledTime must be strictly increasing');
      }
    }
  }

  if (typeof timezone !== 'string' || timezone.trim().length === 0) {
    throw new ValidationError('INVALID_TIMEZONE', 'timezone required');
  }

  // effectiveFrom should be a valid date string
  if (!effectiveFrom || isNaN(Date.parse(effectiveFrom))) {
    throw new ValidationError('INVALID_EFFECTIVE_DATE', 'effectiveFrom must be a valid date');
  }

  return true;
}
