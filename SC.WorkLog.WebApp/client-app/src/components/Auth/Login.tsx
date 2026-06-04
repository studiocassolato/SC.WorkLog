import { useState } from 'react'
import { AlertCircle, LogIn } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from 'components/ui/alert'
import { Button } from 'components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card'
import { Input } from 'components/ui/input'
import { Label } from 'components/ui/label'
import { useAuth } from 'helpers/services/AuthContext'

export function Login() {
  const { error, isConfigured, isLoading, signIn, signInWithEmployeesProvider } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await signIn(email, password)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            SC
          </div>
          <CardTitle>Sign in to WorkLog</CardTitle>
          <CardDescription>Use Cognito authentication to access the WorkLog prototype shell.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConfigured && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cognito is not configured</AlertTitle>
              <AlertDescription>
                Set the VITE_COGNITO_* environment variables for this environment before signing in.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            className="w-full"
            variant="outline"
            disabled={!isConfigured || isLoading}
            onClick={() => void signInWithEmployeesProvider()}
          >
            <LogIn className="h-4 w-4" />
            Employees login
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <p className="text-xs text-muted-foreground">
              Customer login is prepared for Cognito, but the WorkLog customer portal is not enabled yet.
            </p>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={!isConfigured || isLoading}>
              Customer login (coming later)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
