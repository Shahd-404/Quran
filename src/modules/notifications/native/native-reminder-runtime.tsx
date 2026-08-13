'use client'
import { useEffect, useSyncExternalStore } from 'react'
import { DashboardSession } from '@/modules/dashboard/types'
import { initializeNativeReminderBridge,snapshot,subscribe,syncNativeReminders } from './local-reminder-bridge'
export function NativeReminderBridgeRuntime(){useEffect(()=>initializeNativeReminderBridge(),[]);return null}
export function NativeReminderScheduleSync({sessions}:{sessions:DashboardSession[]}){const native=useSyncExternalStore(subscribe,snapshot,snapshot);useEffect(()=>{if(!native.connected||native.status!=='scheduled')return;void syncNativeReminders(sessions.filter(x=>x.persistedStatus!=='completed').map(x=>({readingSessionId:x.id,scheduledAtEpochMs:Date.parse(x.scheduledFor),startPage:x.startPage,endPage:x.endPage,path:`/app/read/${x.id}`})))},[native.connected,native.status,sessions]);return null}
