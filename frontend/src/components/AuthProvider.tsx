import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AccountDraft } from '../lib/account.ts'
import {
  AuthContext,
  requestSession,
  requestSignIn,
  requestSignOut,
  requestSignUp,
  type SessionUser,
} from '../lib/auth.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancel = false
    requestSession()
      .then((next) => {
        if (!cancel) setUser(next)
      })
      .catch(() => {
        if (!cancel) setUser(null)
      })
      .finally(() => {
        if (!cancel) setReady(true)
      })
    return () => {
      cancel = true
    }
  }, [])

  const signIn = useCallback(async (username: string, password: string) => {
    const result = await requestSignIn(username, password)
    if (result.ok) setUser(result.user)
    return result
  }, [])

  const signUp = useCallback(async (draft: AccountDraft) => {
    const result = await requestSignUp(draft)
    if (result.ok) setUser(result.user)
    return result
  }, [])

  const signOut = useCallback(async () => {
    await requestSignOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, signIn, signUp, signOut }),
    [user, ready, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
