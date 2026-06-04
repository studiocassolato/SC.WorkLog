import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchAuthSession,
  getCurrentUser,
  signIn as amplifySignIn,
  signInWithRedirect,
  signOut as amplifySignOut,
  type AuthUser,
} from 'aws-amplify/auth'
import { isAxiosError } from 'axios'
import { apiClient, setBearerTokenFactory } from './api-client'
import { authTokenType, configureAmplify, getCognitoConfig, isCognitoConfigured } from './auth-config'

export type WorkLogCurrentUser = {
  subject: string
  email: string
  name: string
  workLogUserId: string | null
  userType: 'Employee' | 'Customer'
  role: 'Admin' | 'Employee' | 'Customer'
  employeeId: string | null
  customerId: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  isEmployee: boolean
  isCustomer: boolean
}

type AuthContextType = {
  isAuthenticated: boolean
  isCognitoAuthenticated: boolean
  isConfigured: boolean
  isLoading: boolean
  user: AuthUser | null
  cognitoUser: AuthUser | null
  currentUser: WorkLogCurrentUser | null
  email: string | null
  displayName: string | null
  isAdmin: boolean
  isEmployee: boolean
  isCustomer: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signInWithEmployeesProvider: () => Promise<void>
  signOut: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  getBearerToken: () => Promise<string | null>
  refreshSession: () => Promise<void>
  reloadCurrentUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message
  return 'Authentication failed. Please try again.'
}

const getRedirectErrorMessage = () => {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')
  const description = params.get('error_description')
  if (!error && !description && window.location.search !== '?null') return null

  if (window.location.search === '?null') {
    return 'Cognito Hosted UI returned an error without details. Check the app client callback URL, allowed OAuth scopes and identity provider name.'
  }

  if (error === 'invalid_request' && description === 'invalid_scope') {
    return 'Cognito rejected the requested login scopes. Please try again.'
  }

  return description || error || 'Cognito sign-in failed. Please try again.'
}

const clearRedirectError = () => {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('error') && !params.has('error_description') && window.location.search !== '?null') return

  params.delete('error')
  params.delete('error_description')
  params.delete('state')
  const query = params.toString()
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState({}, document.title, nextUrl)
}

const resolveDisplayName = (user: AuthUser | null) => {
  if (!user) return null
  return user.signInDetails?.loginId ?? user.username ?? null
}

const userTypes = ['Employee', 'Customer'] as const
const userRoles = ['Admin', 'Employee', 'Customer'] as const

const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string'
const isWorkLogUserType = (value: unknown): value is WorkLogCurrentUser['userType'] => userTypes.includes(value as WorkLogCurrentUser['userType'])
const isWorkLogUserRole = (value: unknown): value is WorkLogCurrentUser['role'] => userRoles.includes(value as WorkLogCurrentUser['role'])

const isWorkLogCurrentUser = (value: unknown): value is WorkLogCurrentUser => {
  if (!value || typeof value !== 'object') return false

  const response = value as Record<string, unknown>
  return (
    typeof response.subject === 'string'
    && typeof response.email === 'string'
    && typeof response.name === 'string'
    && isNullableString(response.workLogUserId)
    && isWorkLogUserType(response.userType)
    && isWorkLogUserRole(response.role)
    && isNullableString(response.employeeId)
    && isNullableString(response.customerId)
    && typeof response.isAuthenticated === 'boolean'
    && typeof response.isAdmin === 'boolean'
    && typeof response.isEmployee === 'boolean'
    && typeof response.isCustomer === 'boolean'
  )
}

const getBackendAccessErrorMessage = (error: unknown) => {
  if (!isAxiosError(error)) return 'Unable to load your WorkLog profile. Please try again.'

  const status = error.response?.status

  if (status === 401 || status === 403) {
    return 'Your Cognito account is authenticated, but it is not enabled for WorkLog access.'
  }

  if (!error.response) {
    return 'Unable to reach the WorkLog backend. Please check your connection and try again.'
  }

  return 'Unable to load your WorkLog profile. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isConfigured] = useState(isCognitoConfigured())
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [currentUser, setCurrentUser] = useState<WorkLogCurrentUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getAccessToken = useCallback(async () => {
    if (!isConfigured) return null

    try {
      const session = await fetchAuthSession()
      if (authTokenType === 'idToken') return session.tokens?.idToken?.toString() ?? null
      return session.tokens?.accessToken?.toString() ?? null
    } catch {
      setError('Unable to retrieve the Cognito token. Please sign in again.')
      return null
    }
  }, [isConfigured])

  const loadBackendCurrentUser = useCallback(async (accessToken?: string | null) => {
    const token = accessToken ?? await getAccessToken()
    if (!token) {
      setCurrentUser(null)
      throw new Error('Unable to retrieve the Cognito token. Please sign in again.')
    }

    try {
      const response = await apiClient.get<WorkLogCurrentUser>('/Auth/Me')
      if (!isWorkLogCurrentUser(response.data)) {
        throw new Error('The WorkLog current-user response is invalid.')
      }

      setCurrentUser(response.data)
      setError(null)
    } catch (err) {
      setCurrentUser(null)
      setError(getBackendAccessErrorMessage(err))
      throw err
    }
  }, [getAccessToken])

  useEffect(() => {
    if (!isConfigured) {
      setBearerTokenFactory(null)
      return () => setBearerTokenFactory(null)
    }

    setBearerTokenFactory(getAccessToken)
    return () => setBearerTokenFactory(null)
  }, [getAccessToken, isConfigured])

  const loadCurrentUser = useCallback(async () => {
    if (!isConfigured) {
      setUser(null)
      setCurrentUser(null)
      setIsLoading(false)
      return
    }

    try {
      configureAmplify()
      const redirectError = getRedirectErrorMessage()
      if (redirectError) {
        setError(redirectError)
        clearRedirectError()
        setUser(null)
        setCurrentUser(null)
        return
      }

      const cognitoUser = await getCurrentUser()
      setUser(cognitoUser)
      const accessToken = await getAccessToken()
      try {
        await loadBackendCurrentUser(accessToken)
        setError(null)
      } catch {
        // Keep the Cognito session so ProtectedRoute can show the backend access error and logout action.
      }
    } catch {
      setUser(null)
      setCurrentUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [getAccessToken, isConfigured, loadBackendCurrentUser])

  useEffect(() => {
    void loadCurrentUser()
  }, [loadCurrentUser])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isConfigured) {
      setError('Cognito is not configured for this environment.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await amplifySignIn({ username: email, password })
      if (result.nextStep.signInStep !== 'DONE') {
        setError('Additional Cognito sign-in steps are required and are not implemented yet.')
        return
      }

      await loadCurrentUser()
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [isConfigured, loadCurrentUser])

  const signInWithEmployeesProvider = useCallback(async () => {
    if (!isConfigured) {
      setError('Cognito is not configured for this environment.')
      return
    }

    try {
      setError(null)
      const employeeProvider = getCognitoConfig().employeeProvider?.trim()
      if (employeeProvider) {
        await signInWithRedirect({ provider: { custom: employeeProvider } })
        return
      }

      await signInWithRedirect()
    } catch (err) {
      setError(getAuthErrorMessage(err))
    }
  }, [isConfigured])

  const signOut = useCallback(async () => {
    if (!isConfigured) {
      setUser(null)
      setCurrentUser(null)
      return
    }

    setIsLoading(true)
    try {
      await amplifySignOut()
      setUser(null)
      setCurrentUser(null)
      setError(null)
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [isConfigured])

  const refreshSession = useCallback(async () => {
    if (!isConfigured) return
    try {
      await fetchAuthSession({ forceRefresh: true })
      await loadCurrentUser()
      setError(null)
    } catch (err) {
      setError('Your session has expired. Please sign in again.')
      setUser(null)
      setCurrentUser(null)
    }
  }, [isConfigured, loadCurrentUser])

  const reloadCurrentUser = useCallback(async () => {
    setIsLoading(true)
    try {
      await loadBackendCurrentUser()
    } finally {
      setIsLoading(false)
    }
  }, [loadBackendCurrentUser])

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated: Boolean(user && currentUser),
    isCognitoAuthenticated: Boolean(user),
    isConfigured,
    isLoading,
    user,
    cognitoUser: user,
    currentUser,
    email: currentUser?.email ?? user?.signInDetails?.loginId ?? null,
    displayName: currentUser?.name || resolveDisplayName(user),
    isAdmin: currentUser?.isAdmin ?? false,
    isEmployee: currentUser?.isEmployee ?? false,
    isCustomer: currentUser?.isCustomer ?? false,
    error,
    signIn,
    signInWithEmployeesProvider,
    signOut,
    getAccessToken,
    getBearerToken: getAccessToken,
    refreshSession,
    reloadCurrentUser,
  }), [currentUser, error, getAccessToken, isConfigured, isLoading, refreshSession, reloadCurrentUser, signIn, signInWithEmployeesProvider, signOut, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
