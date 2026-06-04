import type { ReactNode } from 'react'
import { AlertCircle, LogOut, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from 'components/ui/alert'
import { Button } from 'components/ui/button'
import { useAuth } from 'helpers/services/AuthContext'
import { Login } from './Login'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { cognitoUser, currentUser, error, isAuthenticated, isLoading, reloadCurrentUser, signOut } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Loading WorkLog...
      </div>
    )
  }

  if (cognitoUser && !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>WorkLog access unavailable</AlertTitle>
            <AlertDescription>
              {error || 'Your Cognito session is valid, but your WorkLog profile could not be resolved.'}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => void reloadCurrentUser()}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button className="flex-1" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Login />

  return <>{children}</>
}
