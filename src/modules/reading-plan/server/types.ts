export type SessionInput = {
  sessionOrder: number;
  scheduledTime: string; // HH:mm
};

export type CreatePlanInput = {
  startPage: number;
  dailyPages: number;
  sessions: SessionInput[];
  timezone: string;
  effectiveFrom: string; // ISO date
};

export type CreatePlanResult =
  | { success: true; planId: string; khatmaId: string }
  | { success: false; code: string; message: string };
