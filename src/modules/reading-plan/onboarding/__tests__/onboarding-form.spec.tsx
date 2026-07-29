import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

import OnboardingForm from '../onboarding-form'
import * as distributeModule from '../../engine/distribute-pages'

describe('OnboardingForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPush.mockClear()
    global.fetch = vi.fn()
  })

  const nextButton = () => screen.getByRole('button', { name: /التالي/ })
  const backButton = () => screen.getByRole('button', { name: /السابق/ })

  async function goToStep2(startPage = '1') {
    fireEvent.change(screen.getByLabelText(/الصفحة الابتدائية/), { target: { value: startPage } })
    fireEvent.click(nextButton())
    await screen.findByLabelText(/عدد الصفحات اليومية/)
  }

  async function goToStep3(startPage = '1', dailyPages = '1') {
    await goToStep2(startPage)
    fireEvent.change(screen.getByLabelText(/عدد الصفحات اليومية/), { target: { value: dailyPages } })
    fireEvent.click(nextButton())
    await screen.findByLabelText(/عدد الجلسات/)
  }

  async function goToStep4(startPage = '1', dailyPages = '1', sessionsCount = '1') {
    await goToStep3(startPage, dailyPages)
    fireEvent.change(screen.getByLabelText(/عدد الجلسات/), { target: { value: sessionsCount } })
    fireEvent.click(nextButton())
    await screen.findAllByLabelText(/وقت الجلسة/)
  }

  async function goToReview(startPage = '1', dailyPages = '1', sessionsCount = '1') {
    await goToStep4(startPage, dailyPages, sessionsCount)
    fireEvent.click(nextButton())
    await screen.findByRole('heading', { name: /مراجعة الخطة/ })
  }

  it('renders the first step with start page input', () => {
    render(<OnboardingForm />)
    expect(screen.getByLabelText(/الصفحة الابتدائية/)).toBeInTheDocument()
  })

  it('shows error when start page is invalid', async () => {
    render(<OnboardingForm />)
    fireEvent.change(screen.getByLabelText(/الصفحة الابتدائية/), { target: { value: '0' } })
    fireEvent.click(nextButton())
    expect(await screen.findByText(/الصفحة الابتدائية يجب أن يكون بين 1 و 604/)).toBeInTheDocument()
  })

  it('shows error when daily pages are invalid', async () => {
    render(<OnboardingForm />)
    await goToStep2('1')
    fireEvent.change(screen.getByLabelText(/عدد الصفحات اليومية/), { target: { value: '0' } })
    fireEvent.click(nextButton())
    expect(await screen.findByText(/عدد الصفحات اليومية يجب أن يكون بين 1 و 604/)).toBeInTheDocument()
  })

  it('updates the live completion estimate without creating a plan', async () => {
    render(<OnboardingForm />)
    await goToStep2('1')

    const estimate = screen.getByRole('region', {
      name: 'موعد الختم المتوقع',
    })
    expect(estimate).toHaveAttribute('aria-live', 'polite')
    expect(estimate).toHaveTextContent('خلال ٦٠٤ يومًا')

    fireEvent.change(screen.getByLabelText(/عدد الصفحات اليومية/), {
      target: { value: '3' },
    })

    expect(estimate).toHaveTextContent('خلال ٢٠٢ يومًا')
    expect(estimate.querySelector('time')).not.toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('shows error when sessions exceed daily pages', async () => {
    render(<OnboardingForm />)
    await goToStep3('1', '2')
    fireEvent.change(screen.getByLabelText(/عدد الجلسات/), { target: { value: '3' } })
    fireEvent.click(nextButton())
    expect(await screen.findByText(/عدد الجلسات لا يجب أن يتجاوز الصفحات اليومية/)).toBeInTheDocument()
  })

  it('uses the existing distribution engine for preview', async () => {
    const spy = vi.spyOn(distributeModule, 'distributePages')
    render(<OnboardingForm />)
    await goToStep3('1', '5')
    expect(spy).toHaveBeenCalled()
    expect(await screen.findByText(/5 صفحة/)).toBeInTheDocument()
  })

  it('renders correct number of time inputs for sessions', async () => {
    render(<OnboardingForm />)
    await goToStep4('1', '5', '4')
    expect(screen.getAllByLabelText(/وقت الجلسة/)).toHaveLength(4)
  })

  it('shows duplicate time error on step 4', async () => {
    render(<OnboardingForm />)
    await goToStep4('1', '4', '2')
    const timeInputs = screen.getAllByLabelText(/وقت الجلسة/)
    fireEvent.change(timeInputs[0], { target: { value: '08:00' } })
    fireEvent.change(timeInputs[1], { target: { value: '08:00' } })
    fireEvent.click(nextButton())
    expect(await screen.findByText(/يجب ألا تتكرر أوقات الجلسات/)).toBeInTheDocument()
  })

  it('shows non-chronological times error on step 4', async () => {
    render(<OnboardingForm />)
    await goToStep4('1', '4', '2')
    const timeInputs = screen.getAllByLabelText(/وقت الجلسة/)
    fireEvent.change(timeInputs[0], { target: { value: '12:00' } })
    fireEvent.change(timeInputs[1], { target: { value: '08:00' } })
    fireEvent.click(nextButton())
    expect(await screen.findByText(/يجب أن تكون أوقات الجلسات متزايدة زمنياً/)).toBeInTheDocument()
  })

  it('preserves values when moving back and forth', async () => {
    render(<OnboardingForm />)
    fireEvent.change(screen.getByLabelText(/الصفحة الابتدائية/), { target: { value: '42' } })
    fireEvent.click(nextButton())
    await screen.findByLabelText(/عدد الصفحات اليومية/)
    fireEvent.change(screen.getByLabelText(/عدد الصفحات اليومية/), { target: { value: '6' } })
    fireEvent.click(backButton())
    expect(await screen.findByLabelText(/الصفحة الابتدائية/)).toHaveValue(42)
    fireEvent.click(nextButton())
    expect(await screen.findByLabelText(/عدد الصفحات اليومية/)).toHaveValue(6)
  })

  it('shows review step with all selected values', async () => {
    render(<OnboardingForm />)
    await goToStep4('10', '7', '3')
    const timeInputs = screen.getAllByLabelText(/وقت الجلسة/)
    fireEvent.change(timeInputs[0], { target: { value: '08:00' } })
    fireEvent.change(timeInputs[1], { target: { value: '13:00' } })
    fireEvent.change(timeInputs[2], { target: { value: '18:00' } })
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الخطة|التالي/ }))
    expect(await screen.findAllByText(/مراجعة الخطة/)).toHaveLength(2)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('الجلسة 1: 08:00')).toBeInTheDocument()
    expect(screen.getByText('الجلسة 2: 13:00')).toBeInTheDocument()
    expect(screen.getByText('الجلسة 3: 18:00')).toBeInTheDocument()
  })

  it('disables submission while pending and prevents duplicate submission', async () => {
    const pendingPromise = new Promise(() => {})
    ;(global.fetch as any).mockReturnValue(pendingPromise)
    render(<OnboardingForm />)
    await goToReview('1', '1', '1')
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الخطة/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /جارٍ الإنشاء.../ })).toBeDisabled())
  })

  it('redirects to /app after successful creation', async () => {
    ;(global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    render(<OnboardingForm />)
    await goToReview('1', '1', '1')
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الخطة/ }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/app'))
  })

  it('shows safe Arabic message on server error', async () => {
    ;(global.fetch as any).mockResolvedValue({ ok: false, json: async () => ({ code: 'INVALID_START_PAGE', message: 'رقم الصفحة الابتدائية غير صالح.' }) })
    render(<OnboardingForm />)
    await goToReview('1', '1', '1')
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الخطة/ }))
    expect(await screen.findByText(/رقم الصفحة الابتدائية غير صالح/)).toBeInTheDocument()
  })

  it('stays on review and preserves values after a failed submit', async () => {
    ;(global.fetch as any).mockResolvedValue({ ok: false, json: async () => ({ code: 'INVALID_START_PAGE', message: 'رقم الصفحة الابتدائية غير صالح.' }) })
    render(<OnboardingForm />)
    await goToReview('42', '6', '3')
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الخطة/ }))

    expect(await screen.findByText(/رقم الصفحة الابتدائية غير صالح/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /مراجعة الخطة/ })).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })
})
