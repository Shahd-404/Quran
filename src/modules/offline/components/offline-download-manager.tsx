'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, HardDrive, RefreshCw, Trash2, WifiOff } from 'lucide-react'
import { formatArabicNumber } from '@/modules/dashboard/formatting'
import { fetchOfflineBundle, fetchOfflineManifest } from '../client/offline-api'
import {
  cleanupExpiredOfflineContent,
  clearAllOfflineData,
  ensureOfflineAccountScope,
  getOfflineStorageSummary,
  saveOfflineBundle,
  syncOfflineOutbox,
  type OfflineStorageSummary,
} from '../client/offline-db'
import type { OfflineDownloadManifest } from '../types'

type ViewState = 'loading' | 'ready' | 'downloading' | 'failed' | 'removing'

const EMPTY_SUMMARY: OfflineStorageSummary = {
  sessions: [],
  pageCount: 0,
  estimatedBytes: 0,
  lastDownloadAt: null,
  pendingActions: 0,
  failedActions: 0,
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${formatArabicNumber(bytes)} بايت`
  if (bytes < 1024 * 1024) return `${formatArabicNumber(Math.ceil(bytes / 1024))} كيلوبايت`
  return `${formatArabicNumber(Number((bytes / (1024 * 1024)).toFixed(1)))} ميجابايت`
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

async function ensureQuota(payloadBytes: number): Promise<void> {
  if (!navigator.storage?.estimate) return
  const estimate = await navigator.storage.estimate()
  if (
    typeof estimate.quota === 'number' &&
    typeof estimate.usage === 'number' &&
    estimate.quota - estimate.usage < Math.ceil(payloadBytes * 1.15)
  ) {
    throw new Error('OFFLINE_QUOTA_EXCEEDED')
  }
}

export function OfflineDownloadManager() {
  const [includeNextDays, setIncludeNextDays] = useState(false)
  const [manifest, setManifest] = useState<OfflineDownloadManifest | null>(null)
  const [summary, setSummary] = useState<OfflineStorageSummary>(EMPTY_SUMMARY)
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [expiredRemoved, setExpiredRemoved] = useState(false)

  const refreshSummary = useCallback(async (scopeKey: string) => {
    setSummary(await getOfflineStorageSummary(scopeKey))
  }, [])

  const loadManifest = useCallback(async (nextDays: boolean) => {
    setViewState('loading')
    setMessage(null)
    try {
      const result = await fetchOfflineManifest(nextDays)
      if (!result.success) {
        setMessage(result.message)
        setViewState('failed')
        return
      }
      await ensureOfflineAccountScope(result.scopeKey)
      const removed = await cleanupExpiredOfflineContent()
      setExpiredRemoved(removed > 0)
      setManifest(result)
      await refreshSummary(result.scopeKey)
      setViewState('ready')
    } catch {
      setMessage(
        'تعذّر الوصول إلى مساحة القراءة دون اتصال. قد تكون مساحة التخزين الخاصة أو المؤقتة غير متاحة.',
      )
      setViewState('failed')
    }
  }, [refreshSummary])

  useEffect(() => {
    void loadManifest(false)
  }, [loadManifest])

  useEffect(() => {
    const refresh = () => {
      if (manifest) void refreshSummary(manifest.scopeKey)
    }
    window.addEventListener('wird:offline-outbox-change', refresh)
    return () => window.removeEventListener('wird:offline-outbox-change', refresh)
  }, [manifest, refreshSummary])

  const candidatePageCount = useMemo(() => {
    const pages = new Set<number>()
    manifest?.sessions.forEach((session) => {
      for (let page = session.startPage; page <= session.endPage; page += 1) pages.add(page)
    })
    return pages.size
  }, [manifest])

  const earliestExpiry = summary.sessions.reduce<string | null>(
    (current, session) => (!current || session.expiresAt < current ? session.expiresAt : current),
    null,
  )
  const downloadedIds = new Set(summary.sessions.map((session) => session.id))
  const updateAvailable = Boolean(
    manifest?.sessions.some((session) => !downloadedIds.has(session.id)),
  )
  const displayedBytes = summary.estimatedBytes || candidatePageCount * 12 * 1024

  async function download() {
    if (!manifest || manifest.sessions.length === 0 || viewState === 'downloading') return
    setViewState('downloading')
    setMessage(null)
    try {
      const result = await fetchOfflineBundle(manifest.sessions.map((session) => session.id))
      if (!result.success) {
        setMessage(result.message)
        setViewState('failed')
        return
      }
      if (result.scopeKey !== manifest.scopeKey) throw new Error('OFFLINE_SCOPE_CHANGED')
      const payloadBytes = new Blob([JSON.stringify(result)]).size
      await ensureQuota(payloadBytes)
      const nextSummary = await saveOfflineBundle(result)
      setSummary(nextSummary)
      let persisted = false
      try {
        persisted = (await navigator.storage?.persist?.()) ?? false
      } catch {
        persisted = false
      }
      setMessage(
        persisted
          ? 'تم تنزيل الورد كاملًا وحماية مساحة التخزين من الحذف التلقائي قدر الإمكان.'
          : 'تم تنزيل الورد كاملًا. قد يمسح المتصفح المحتوى إذا احتاج إلى مساحة تخزين.',
      )
      setViewState('ready')
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === 'OFFLINE_QUOTA_EXCEEDED'
          ? 'المساحة المتاحة لا تكفي لهذا التنزيل. حرّر مساحة أو اختر نطاقًا أصغر.'
          : 'انقطع التنزيل أو تعذّر حفظه كاملًا. لم تُعتمد أي جلسة ناقصة، ويمكنك المحاولة مجددًا.',
      )
      setViewState('failed')
    }
  }

  async function removeAll() {
    if (!manifest || summary.sessions.length === 0 && summary.pendingActions === 0 && summary.failedActions === 0) return
    const unsynced = summary.pendingActions + summary.failedActions > 0
    const accepted = window.confirm(
      unsynced
        ? 'توجد إجراءات إكمال لم تصل إلى الخادم. حذف التنزيلات الآن سيحذفها نهائيًا. هل تريد المتابعة؟'
        : 'هل تريد حذف جميع جلسات وصفحات الورد المحفوظة على هذا الجهاز؟',
    )
    if (!accepted) return
    setViewState('removing')
    try {
      await clearAllOfflineData()
      setSummary(EMPTY_SUMMARY)
      setMessage('تم حذف جميع تنزيلات الورد من هذا الجهاز.')
      setViewState('ready')
    } catch {
      setMessage('تعذّر حذف التنزيلات الآن. حاول مرة أخرى.')
      setViewState('failed')
    }
  }

  async function retrySync() {
    if (!manifest) return
    setMessage('جارٍ إعادة محاولة مزامنة إجراءات الإكمال…')
    await syncOfflineOutbox({ force: true })
    await refreshSummary(manifest.scopeKey)
    setMessage('انتهت محاولة المزامنة. سيبقى أي إجراء غير مؤكد ظاهرًا حتى يقبله الخادم.')
  }

  const busy = viewState === 'loading' || viewState === 'downloading' || viewState === 'removing'

  return (
    <section className="surface-card p-4 sm:p-5" aria-labelledby="offline-download-title">
      <div className="flex items-start gap-3">
        <span className="icon-tile" aria-hidden="true">
          <WifiOff aria-hidden="true" focusable="false" size={21} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="offline-download-title" className="text-[1.0625rem] font-semibold text-ink">
            تنزيل الورد للقراءة بدون إنترنت
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            يحفظ نص جلساتك المختارة على هذا الجهاز لمدة لا تتجاوز سبعة أيام. لا يتغير تقدّمك عند التنزيل أو الفتح.
          </p>
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-line/70 p-3 text-sm leading-6">
        <input
          type="checkbox"
          checked={includeNextDays}
          disabled={busy}
          onChange={(event) => {
            const checked = event.target.checked
            setIncludeNextDays(checked)
            void loadManifest(checked)
          }}
          className="mt-1 h-4 w-4 accent-primary"
        />
        <span>
          تضمين الجلسات المتاحة للأيام السبعة القادمة
          <span className="block text-xs text-muted">لن تُنشأ جلسات جديدة؛ تُنزّل الجلسات المملوكة لحسابك والمتاحة حاليًا فقط.</span>
        </span>
      </label>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Metric label="الجلسات المتاحة" value={formatArabicNumber(manifest?.sessions.length ?? 0)} />
        <Metric label="صفحات التنزيل" value={formatArabicNumber(candidatePageCount)} />
        <Metric label="المحفوظ حاليًا" value={`${formatArabicNumber(summary.sessions.length)} جلسة`} />
        <Metric label="الحجم التقريبي" value={formatBytes(displayedBytes)} />
      </dl>

      {summary.lastDownloadAt ? (
        <p className="mt-3 text-xs leading-6 text-muted">
          آخر تنزيل ناجح: {formatDateTime(summary.lastDownloadAt)}
          {earliestExpiry ? ` · تنتهي أقدم نسخة: ${formatDateTime(earliestExpiry)}` : ''}
        </p>
      ) : null}
      {expiredRemoved ? (
        <p className="status-warning mt-3 text-sm">انتهت صلاحية محتوى قديم وحُذف تلقائيًا. نزّل الورد مجددًا لتحديثه.</p>
      ) : null}
      {updateAvailable && summary.sessions.length > 0 ? (
        <p className="status-warning mt-3 text-sm">يتوفر تحديث للتنزيل يشمل جلسات مؤهلة جديدة.</p>
      ) : null}
      {summary.pendingActions > 0 ? (
        <div className="status-warning mt-3 text-sm leading-6">
          {formatArabicNumber(summary.pendingActions)} إجراء إكمال بانتظار المزامنة. لم يُسجّل على الخادم بعد.
        </div>
      ) : null}
      {summary.failedActions > 0 ? (
        <div className="status-danger mt-3 text-sm leading-6">
          تعذّرت مزامنة {formatArabicNumber(summary.failedActions)} من إجراءات الإكمال أو تعارضت مع حالة الخادم.
          <button type="button" onClick={() => void retrySync()} className="mt-2 block font-semibold underline">
            إعادة المحاولة
          </button>
        </div>
      ) : null}
      {message ? (
        <p role={viewState === 'failed' ? 'alert' : 'status'} className={`mt-3 text-sm leading-6 ${viewState === 'failed' ? 'status-danger' : 'status-success'}`}>
          {message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void download()}
          disabled={busy || !manifest || manifest.sessions.length === 0}
          className="btn-primary"
        >
          {viewState === 'downloading' ? (
            <RefreshCw aria-hidden="true" className="animate-spin" size={18} />
          ) : (
            <Download aria-hidden="true" size={18} />
          )}
          {viewState === 'downloading'
            ? 'جارٍ تنزيل الورد كاملًا…'
            : updateAvailable || summary.sessions.length === 0
              ? 'تنزيل الورد'
              : 'تحديث التنزيل'}
        </button>
        <button
          type="button"
          onClick={() => void removeAll()}
          disabled={busy || summary.sessions.length + summary.pendingActions + summary.failedActions === 0}
          className="btn-secondary text-danger"
        >
          <Trash2 aria-hidden="true" size={18} />
          حذف جميع التنزيلات
        </button>
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-muted">
        <HardDrive aria-hidden="true" className="mt-1 shrink-0" size={15} />
        قد يحذف النظام المحتوى عند انخفاض المساحة أو في التصفح الخاص. إذا انقطع التنزيل، أعد المحاولة بعد استعادة الاتصال.
      </p>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-elevated p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  )
}
