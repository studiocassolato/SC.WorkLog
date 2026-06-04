import { Amplify } from 'aws-amplify'

export type CognitoConfig = {
  region: string
  userPoolId: string
  userPoolClientId: string
  domain?: string
  employeeProvider?: string
}

export const authTokenType = 'idToken'

export const getCognitoConfig = (): CognitoConfig => ({
  region: import.meta.env.VITE_COGNITO_REGION ?? '',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '',
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '',
  domain: import.meta.env.VITE_COGNITO_DOMAIN ?? '',
  employeeProvider: import.meta.env.VITE_COGNITO_EMPLOYEE_PROVIDER ?? '',
})

export const isCognitoConfigured = () => {
  const config = getCognitoConfig()
  return Boolean(config.region && config.userPoolId && config.userPoolClientId)
}

export const configureAmplify = () => {
  if (!isCognitoConfigured()) return

  const config = getCognitoConfig()
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
        loginWith: {
          email: true,
          oauth: config.domain
            ? {
                domain: config.domain,
                scopes: ['openid', 'email'],
                redirectSignIn: [window.location.origin],
                redirectSignOut: [window.location.origin],
                responseType: 'code',
              }
            : undefined,
        },
      },
    },
  })
}
