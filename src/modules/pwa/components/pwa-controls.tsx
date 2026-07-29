'use client'

import { useEffect, useRef, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const updateRequested = useRef(false)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onControllerChange = () => { if (updateRequested.current) window.location.reload() }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
      if (registration.waiting) setWaitingWorker(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaitingWorker(worker)
        })
      })
    }).catch(() => undefined)
    const beforeInstall = (event: Event) => {
      event.preventDefault()
      if (!isStandalone()) setInstallPrompt(event as InstallPromptEvent)
    }
    const installed = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', installed)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }
  function update() {
    if (!waitingWorker) return
    updateRequested.current = true
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    setWaitingWorker(null)
  }
  if (!installPrompt && !waitingWorker) return null
  return (
    <section aria-label="إعدادات التطبيق" className="mx-auto mt-4 flex w-full max-w-5xl flex-wrap gap-2 px-4 sm:px-6">
      {installPrompt && <button type="button" onClick={install} className="btn-secondary min-h-[2.75rem] rounded-xl px-4 py-2">تثبيت تطبيق ورد</button>}
      {waitingWorker && (
        <div role="status" className="status-warning flex items-center gap-3 rounded-xl px-4 py-2 text-sm">
          <span>يتوفر تحديث جديد</span>
          <button type="button" onClick={update} className="font-bold underline underline-offset-4">تحديث التطبيق</button>
        </div>
      )}
    </section>
  )
}
