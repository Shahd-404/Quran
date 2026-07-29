import React from 'react'

type ProgressBarProps = {
  value: number
  label: string
  tone?: 'emerald' | 'gold'
}

export function ProgressBar({ value, label, tone = 'emerald' }: ProgressBarProps) {
  const safeValue = Math.min(Math.max(value, 0), 100)
  const trackColor = tone === 'gold' ? 'bg-accent-soft' : 'bg-primary-soft'
  const barColor = tone === 'gold' ? 'bg-accent' : 'bg-primary'

  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full ${trackColor}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${barColor}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  )
}
