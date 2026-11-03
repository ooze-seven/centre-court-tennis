import { useEffect, useState, type FormEvent } from 'react'
import { emptyAccount, type AccountDraft, type AccountErrors } from '../lib/account.ts'
import { Arrow } from './icons.tsx'

const fields = ['firstName', 'lastName', 'username', 'phone', 'email', 'password', 'confirmPassword'] as const

export function AccountForm({
  idPrefix,
  staff = false,
  submitLabel,
  busyLabel,
  busy,
  errors,
  formError,
  notice,
  labelledBy = 'gate-title',
  onSave,
}: {
  idPrefix: string
  staff?: boolean
  submitLabel: string
  busyLabel: string
  busy: boolean
  errors: AccountErrors
  formError: string
  notice?: string
  labelledBy?: string
  onSave: (draft: AccountDraft) => void
}) {
  const [draft, setDraft] = useState<AccountDraft>(emptyAccount)

  useEffect(() => {
    const key = fields.find((field) => errors[field])
    if (!key) return
    document.getElementById(`${idPrefix}-${key}`)?.focus()
  }, [errors, idPrefix])

  function set(key: keyof AccountDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    onSave(draft)
  }

  return (
    <form className="form" autoComplete={staff ? 'off' : 'on'} noValidate aria-labelledby={labelledBy} onSubmit={onSubmit}>
      <div className="field-row">
        <Field
          id={`${idPrefix}-firstName`}
          label="First name"
          name="firstName"
          autoComplete="given-name"
          autoCapitalize="words"
          maxLength={40}
          value={draft.firstName}
          error={errors.firstName}
          onChange={(value) => set('firstName', value)}
        />
        <Field
          id={`${idPrefix}-lastName`}
          label="Last name"
          name="lastName"
          autoComplete="family-name"
          autoCapitalize="words"
          maxLength={40}
          value={draft.lastName}
          error={errors.lastName}
          onChange={(value) => set('lastName', value)}
        />
      </div>
      <Field
        id={`${idPrefix}-username`}
        label="Player name"
        name="username"
        autoComplete={staff ? 'off' : 'username'}
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        hint="Unique. This is the name you type at the gate."
        value={draft.username}
        error={errors.username}
        onChange={(value) => set('username', value)}
      />
      <div className="field-row">
        <Field
          id={`${idPrefix}-phone`}
          label="Phone number"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={24}
          value={draft.phone}
          error={errors.phone}
          onChange={(value) => set('phone', value)}
        />
        <Field
          id={`${idPrefix}-email`}
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={120}
          value={draft.email}
          error={errors.email}
          onChange={(value) => set('email', value)}
        />
      </div>
      <Field
        id={`${idPrefix}-password`}
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        maxLength={128}
        hint="At least 8 characters."
        value={draft.password}
        error={errors.password}
        onChange={(value) => set('password', value)}
      />
      <Field
        id={`${idPrefix}-confirmPassword`}
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        enterKeyHint="go"
        maxLength={128}
        value={draft.confirmPassword}
        error={errors.confirmPassword}
        onChange={(value) => set('confirmPassword', value)}
      />
      {formError ? (
        <p className="form__alert" role="alert">
          {formError}
        </p>
      ) : null}
      {notice ? (
        <p className="notice" role="status">
          {notice}
        </p>
      ) : null}
      <button className="btn btn--lime" type="submit" disabled={busy}>
        {busy ? busyLabel : submitLabel}
        <Arrow />
      </button>
    </form>
  )
}

function Field({
  id,
  label,
  name,
  type = 'text',
  value,
  error,
  hint,
  autoComplete,
  autoCapitalize,
  spellCheck,
  inputMode,
  enterKeyHint,
  maxLength,
  onChange,
}: {
  id: string
  label: string
  name: string
  type?: 'text' | 'tel' | 'email' | 'password'
  value: string
  error?: string
  hint?: string
  autoComplete?: string
  autoCapitalize?: 'none' | 'words'
  spellCheck?: boolean
  inputMode?: 'tel' | 'email'
  enterKeyHint?: 'go'
  maxLength?: number
  onChange: (value: string) => void
}) {
  const showHint = Boolean(hint) && !error
  const described = [showHint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ')
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        inputMode={inputMode}
        enterKeyHint={enterKeyHint}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={described || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {showHint ? (
        <small className="gate__hint" id={`${id}-hint`}>
          {hint}
        </small>
      ) : null}
      {error ? (
        <small className="err" id={`${id}-err`}>
          {error}
        </small>
      ) : null}
    </label>
  )
}
