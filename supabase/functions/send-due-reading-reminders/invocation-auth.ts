export const REMINDER_INVOCATION_HEADER = 'x-wird-reminder-token'

export function hasValidInvocationToken(
  providedToken: string | null,
  expectedToken: string | undefined,
): boolean {
  if (!providedToken || !expectedToken) return false

  const providedBytes = new TextEncoder().encode(providedToken)
  const expectedBytes = new TextEncoder().encode(expectedToken)
  const comparisonLength = Math.max(providedBytes.length, expectedBytes.length)
  let difference = providedBytes.length ^ expectedBytes.length

  for (let index = 0; index < comparisonLength; index += 1) {
    difference |=
      (providedBytes[index] ?? 0) ^
      (expectedBytes[index] ?? 0)
  }

  return difference === 0
}
