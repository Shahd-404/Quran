(() => {
  'use strict'

  const DB_NAME = 'wird-offline-v1'
  const DB_VERSION = 1
  const STORES = {
    sessions: 'downloaded_sessions',
    pages: 'downloaded_quran_pages',
    outbox: 'offline_progress_outbox',
    metadata: 'offline_metadata',
  }
  const SESSION_PATH = /^\/app\/read\/([0-9a-f]{8}-[0-9a-f-]{27})$/i
  const sessionMatch = location.pathname.match(SESSION_PATH)
  document.getElementById('offline-retry')?.addEventListener('click', () => location.reload())

  const fallback = document.getElementById('offline-fallback')
  const reader = document.getElementById('offline-reader')
  const message = document.getElementById('offline-reader-message')

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.addEventListener('upgradeneeded', () => {
        const database = request.result
        if (!database.objectStoreNames.contains(STORES.sessions)) {
          const sessions = database.createObjectStore(STORES.sessions, { keyPath: 'key' })
          sessions.createIndex('by_scope', 'scopeKey', { unique: false })
          sessions.createIndex('by_expiry', 'expiresAt', { unique: false })
        }
        if (!database.objectStoreNames.contains(STORES.pages)) {
          const pages = database.createObjectStore(STORES.pages, { keyPath: 'key' })
          pages.createIndex('by_scope', 'scopeKey', { unique: false })
          pages.createIndex('by_expiry', 'expiresAt', { unique: false })
        }
        if (!database.objectStoreNames.contains(STORES.outbox)) {
          const outbox = database.createObjectStore(STORES.outbox, { keyPath: 'actionId' })
          outbox.createIndex('by_scope', 'scopeKey', { unique: false })
          outbox.createIndex('by_next_attempt', 'nextAttemptAt', { unique: false })
        }
        if (!database.objectStoreNames.contains(STORES.metadata)) {
          database.createObjectStore(STORES.metadata, { keyPath: 'key' })
        }
      })
      request.addEventListener('success', () => resolve(request.result), { once: true })
      request.addEventListener('error', () => reject(request.error), { once: true })
      request.addEventListener('blocked', () => reject(new Error('IDB_BLOCKED')), { once: true })
    })
  }

  function result(request) {
    return new Promise((resolve, reject) => {
      request.addEventListener('success', () => resolve(request.result), { once: true })
      request.addEventListener('error', () => reject(request.error), { once: true })
    })
  }

  function done(transaction) {
    return new Promise((resolve, reject) => {
      transaction.addEventListener('complete', resolve, { once: true })
      transaction.addEventListener('abort', () => reject(transaction.error), { once: true })
      transaction.addEventListener('error', () => reject(transaction.error), { once: true })
    })
  }

  function element(tag, className, text) {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = text
    return node
  }

  function arabicNumber(value) {
    return new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(value)
  }

  async function readSession(sessionId) {
    const database = await openDatabase()
    try {
      const transaction = database.transaction(
        [STORES.metadata, STORES.sessions, STORES.pages, STORES.outbox],
        'readonly',
      )
      const metadata = await result(transaction.objectStore(STORES.metadata).get('active_scope'))
      const scopeKey = metadata && metadata.value
      if (!scopeKey) return { state: 'missing' }
      const session = await result(
        transaction.objectStore(STORES.sessions).get(`${scopeKey}:${sessionId}`),
      )
      if (!session) return { state: 'missing' }
      if (Date.parse(session.expiresAt) <= Date.now()) return { state: 'expired' }
      const pages = []
      for (let pageNumber = session.startPage; pageNumber <= session.endPage; pageNumber += 1) {
        const page = await result(
          transaction.objectStore(STORES.pages).get(`${scopeKey}:${pageNumber}`),
        )
        if (!page || Date.parse(page.expiresAt) <= Date.now() || page.page.pageNumber !== pageNumber) {
          return { state: 'incomplete' }
        }
        pages.push(page.page)
      }
      const actions = await result(
        transaction.objectStore(STORES.outbox).index('by_scope').getAll(IDBKeyRange.only(scopeKey)),
      )
      return {
        state: 'ready',
        scopeKey,
        session,
        pages,
        queued: actions.some((action) => action.sessionId === sessionId),
      }
    } finally {
      database.close()
    }
  }

  function showFailure(text) {
    fallback.hidden = true
    reader.hidden = false
    reader.replaceChildren()
    const card = element('main', 'offline-card')
    card.append(element('div', 'mark', 'و'))
    card.append(element('h1', '', text))
    card.append(
      element(
        'p',
        '',
        'لا يمكن عرض جزء من الجلسة. استعد الاتصال ثم نزّل الورد كاملًا من لوحة الورد.',
      ),
    )
    const retry = element('button', '', 'إعادة المحاولة')
    retry.type = 'button'
    retry.addEventListener('click', () => location.reload())
    card.append(retry)
    reader.append(card)
  }

  function groupVerses(verses) {
    const groups = []
    verses.forEach((verse) => {
      const current = groups[groups.length - 1]
      if (current && current.chapterId === verse.chapterId) current.verses.push(verse)
      else groups.push({
        chapterId: verse.chapterId,
        chapterNameArabic: verse.chapterNameArabic,
        verses: [verse],
      })
    })
    return groups
  }

  function renderPage(page) {
    const article = element('article', 'quran-page')
    article.id = `quran-page-${page.pageNumber}`
    article.dataset.quranPage = String(page.pageNumber)
    article.append(element('h2', '', `صفحة ${arabicNumber(page.pageNumber)}`))
    groupVerses(page.verses).forEach((group) => {
      const section = element('section', 'verse-group')
      section.setAttribute('translate', 'no')
      section.append(
        element(
          'h3',
          '',
          `سورة ${group.chapterNameArabic || arabicNumber(group.chapterId)}`,
        ),
      )
      const text = element('p', 'quran-text')
      group.verses.forEach((verse) => {
        text.append(document.createTextNode(`${verse.uthmaniText} `))
        const number = element('span', 'verse-number', `﴿${arabicNumber(verse.verseNumber)}﴾ `)
        text.append(number)
      })
      section.append(text)
      article.append(section)
    })
    return article
  }

  async function queueCompletion(scopeKey, sessionId) {
    const database = await openDatabase()
    const transaction = database.transaction(STORES.outbox, 'readwrite')
    const completion = done(transaction)
    const store = transaction.objectStore(STORES.outbox)
    const existing = await result(store.index('by_scope').getAll(IDBKeyRange.only(scopeKey)))
    if (!existing.some((action) => action.sessionId === sessionId)) {
      const occurredAt = new Date().toISOString()
      store.add({
        actionId: crypto.randomUUID(),
        scopeKey,
        sessionId,
        occurredAt,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: occurredAt,
        lastErrorCode: null,
      })
    }
    await completion.finally(() => database.close())
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      try {
        if (registration.sync) await registration.sync.register('wird-offline-progress')
      } catch {}
      registration.active?.postMessage({ type: 'SYNC_OFFLINE_PROGRESS' })
    }
  }

  function renderReady(data) {
    fallback.hidden = true
    reader.hidden = false
    reader.replaceChildren()

    const shell = element('main', 'reader-shell')
    const header = element('header', 'reader-header')
    const back = element('a', 'secondary-action', 'العودة إلى لوحة الورد')
    back.href = '/app'
    header.append(back)
    header.append(
      element(
        'h1',
        '',
        `جلسة الورد ${arabicNumber(data.session.sessionOrder)} · الصفحات ${arabicNumber(data.session.startPage)}–${arabicNumber(data.session.endPage)}`,
      ),
    )
    header.append(element('p', 'offline-badge', 'نسخة محفوظة للقراءة دون اتصال'))
    shell.append(header)

    const pages = element('div', 'pages')
    data.pages.forEach((page) => pages.append(renderPage(page)))
    shell.append(pages)

    const navigation = element('nav', 'reader-navigation')
    const previous = element('button', 'secondary-action', 'الصفحة السابقة')
    const next = element('button', '', 'الصفحة التالية')
    let current = Math.min(
      data.session.endPage,
      Math.max(data.session.startPage, Number(new URLSearchParams(location.search).get('page')) || data.session.startPage),
    )
    function updateNavigation() {
      previous.disabled = current <= data.session.startPage
      next.disabled = current >= data.session.endPage
      history.replaceState(null, '', `${location.pathname}?page=${current}#quran-page-${current}`)
      document.getElementById(`quran-page-${current}`)?.scrollIntoView({ block: 'start' })
    }
    previous.addEventListener('click', () => { current -= 1; updateNavigation() })
    next.addEventListener('click', () => { current += 1; updateNavigation() })
    navigation.append(previous, next)
    shell.append(navigation)

    const completion = element('section', 'completion-card')
    completion.append(element('h2', '', 'هل أنهيت صفحات الجلسة؟'))
    completion.append(
      element(
        'p',
        '',
        'لن يظهر الإكمال في تقدّمك حتى يستعيد الجهاز الاتصال ويقبله الخادم.',
      ),
    )
    const completionStatus = element('p', 'queued-status')
    const complete = element('button', '', 'أتممت قراءة الجلسة')
    if (data.session.completionSyncedAt) {
      complete.disabled = true
      completionStatus.textContent = 'أكّد الخادم إكمال هذه الجلسة.'
    } else if (data.queued) {
      complete.disabled = true
      completionStatus.textContent = 'الإكمال محفوظ على هذا الجهاز وبانتظار المزامنة. لم يُسجّل على الخادم بعد.'
    }
    complete.addEventListener('click', async () => {
      if (!confirm('هل أتممت قراءة جميع صفحات هذه الجلسة؟')) return
      complete.disabled = true
      try {
        await queueCompletion(data.scopeKey, data.session.id)
        completionStatus.textContent = 'تم حفظ الإكمال على هذا الجهاز وبانتظار المزامنة. لم يُسجّل على الخادم بعد.'
      } catch {
        complete.disabled = false
        completionStatus.textContent = 'تعذّر حفظ الإكمال على هذا الجهاز. لم يتغير تقدّمك.'
      }
    })
    completion.append(complete, completionStatus)
    shell.append(completion)
    reader.append(shell)
    requestAnimationFrame(() => updateNavigation())
  }

  async function renderDownloadedIndex() {
    const database = await openDatabase()
    try {
      const transaction = database.transaction([STORES.metadata, STORES.sessions], 'readonly')
      const metadata = await result(transaction.objectStore(STORES.metadata).get('active_scope'))
      if (!metadata?.value) return
      const sessions = await result(
        transaction.objectStore(STORES.sessions).index('by_scope').getAll(IDBKeyRange.only(metadata.value)),
      )
      const available = sessions
        .filter((session) => Date.parse(session.expiresAt) > Date.now())
        .sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor))
      if (available.length === 0) return
      const heading = element('h2', '', 'الجلسات المحفوظة على هذا الجهاز')
      const list = element('div', 'downloaded-list')
      available.forEach((session) => {
        const link = element(
          'a',
          'secondary-action',
          `الجلسة ${arabicNumber(session.sessionOrder)} · الصفحات ${arabicNumber(session.startPage)}–${arabicNumber(session.endPage)}`,
        )
        link.href = `/app/read/${session.id}`
        list.append(link)
      })
      fallback.append(heading, list)
    } finally {
      database.close()
    }
  }

  if (sessionMatch) {
    readSession(sessionMatch[1])
      .then((data) => {
        if (data.state === 'ready') renderReady(data)
        else if (data.state === 'expired') showFailure('انتهت صلاحية تنزيل هذه الجلسة')
        else if (data.state === 'incomplete') showFailure('تنزيل هذه الجلسة غير مكتمل')
        else showFailure('هذه الجلسة غير محفوظة على هذا الجهاز')
      })
      .catch(() => showFailure('تعذّر فتح مساحة القراءة المحفوظة'))
  } else if (location.pathname === '/app' || location.pathname === '/app/') {
    renderDownloadedIndex().catch(() => undefined)
  }
})()
