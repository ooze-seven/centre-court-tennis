export type AccountErrors = Partial<
  Record<'firstName' | 'lastName' | 'username' | 'phone' | 'email' | 'password' | 'confirmPassword', string>
>

export type AccountDraft = {
  firstName: string
  lastName: string
  username: string
  phone: string
  email: string
  password: string
  confirmPassword: string
}

export const emptyAccount: AccountDraft = {
  firstName: '',
  lastName: '',
  username: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export function validateAccount(draft: AccountDraft) {
  const errors: AccountErrors = {}
  const firstName = draft.firstName.trim().replace(/\s+/g, ' ')
  const lastName = draft.lastName.trim().replace(/\s+/g, ' ')
  const username = draft.username.trim()
  const phone = draft.phone.trim()
  const email = draft.email.trim()
  const digits = phone.replace(/\D/g, '')
  if (!validName(firstName)) errors.firstName = 'Add your first name.'
  if (!validName(lastName)) errors.lastName = 'Add your last name.'
  if (!/^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/i.test(username)) {
    errors.username = 'Use 3 to 20 letters or numbers. A player name has to stay unique.'
  }
  if (phone.length > 24 || digits.length < 10 || digits.length > 13) errors.phone = 'Check the phone number.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) errors.email = 'Check the email.'
  if (draft.password.length < 8 || draft.password.length > 128) errors.password = 'Use at least 8 characters.'
  if (!draft.confirmPassword) errors.confirmPassword = 'Type the password again.'
  else if (draft.password !== draft.confirmPassword) errors.confirmPassword = 'Those passwords do not match.'
  return errors
}

function validName(value: string) {
  return value.length >= 2 && value.length <= 40 && /^[\p{L}][\p{L}\s'.-]*$/u.test(value)
}
