import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  COMPLETION_ESTIMATE_FALLBACK_ARABIC,
} from '../../completion-estimate'
import { CompletionEstimateCard } from '../completion-estimate-card'

describe('CompletionEstimateCard', () => {
  it('renders localized motivational copy and an accessible date', () => {
    render(
      <CompletionEstimateCard
        currentUnreadPage={1}
        pagesPerDay={3}
        timezone="Africa/Cairo"
        effectiveFrom="2026-07-29"
        variant="new-plan"
        now={new Date('2026-07-29T10:00:00Z')}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'موعد الختم المتوقع' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/٣ صفحات يوميًا/)).toHaveTextContent(
      'متوقع تختمي القرآن خلال ٢٠٢ يومًا بإذن الله.',
    )
    expect(screen.getByText('كل صفحة تقرّبك من الختمة 🌿')).toBeInTheDocument()
    expect(screen.getByText('١٥ فبراير ٢٠٢٧').closest('time')).toHaveAttribute(
      'datetime',
      '2027-02-15',
    )
  })

  it('renders one-day, two-day, and completed Arabic states', () => {
    const { rerender } = render(
      <CompletionEstimateCard
        currentUnreadPage={604}
        pagesPerDay={3}
        timezone="Africa/Cairo"
        variant="active-plan"
        now={new Date('2026-07-29T10:00:00Z')}
      />,
    )
    expect(screen.getByText(/متوقع تختمي اليوم بإذن الله/)).toBeInTheDocument()

    rerender(
      <CompletionEstimateCard
        currentUnreadPage={603}
        pagesPerDay={1}
        timezone="Africa/Cairo"
        variant="active-plan"
        now={new Date('2026-07-29T10:00:00Z')}
      />,
    )
    expect(
      screen.getByText(/متوقع تختمي خلال يومين بإذن الله/),
    ).toBeInTheDocument()

    rerender(
      <CompletionEstimateCard
        currentUnreadPage={604}
        pagesPerDay={1}
        timezone="Africa/Cairo"
        variant="active-plan"
        completed
      />,
    )
    expect(
      screen.getByText('أتممتِ الختمة، تقبّل الله منكِ 🌿'),
    ).toBeInTheDocument()
  })

  it('uses a stable safe fallback for invalid inputs', () => {
    render(
      <CompletionEstimateCard
        currentUnreadPage={0}
        pagesPerDay={Number.NaN}
        timezone="Invalid/Timezone"
        variant="new-plan"
        live
      />,
    )

    expect(screen.getByText(COMPLETION_ESTIMATE_FALLBACK_ARABIC)).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'موعد الختم المتوقع' }),
    ).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByRole('time')).not.toBeInTheDocument()
  })
})
