export const MIN_PASSWORD_LENGTH = 8

export type PasswordValidationFailure = {
  field: 'password' | 'confirmPassword'
  message: string
}

const INVALID_PASSWORD_CHARACTERS = /[\u0000-\u001f\u007f]/

export function validateNewPassword(
  password: string,
  confirmPassword: string,
): PasswordValidationFailure | null {
  if (!password) {
    return {
      field: 'password',
      message: 'أدخلي كلمة المرور الجديدة.',
    }
  }

  if (
    password !== password.trim() ||
    INVALID_PASSWORD_CHARACTERS.test(password)
  ) {
    return {
      field: 'password',
      message:
        'لا تستخدمي مسافات في بداية كلمة المرور أو نهايتها، أو محارف غير صالحة.',
    }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      field: 'password',
      message: `يجب أن تكون كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`,
    }
  }

  if (!confirmPassword) {
    return {
      field: 'confirmPassword',
      message: 'أكّدي كلمة المرور الجديدة.',
    }
  }

  if (password !== confirmPassword) {
    return {
      field: 'confirmPassword',
      message: 'تأكيد كلمة المرور غير مطابق.',
    }
  }

  return null
}
