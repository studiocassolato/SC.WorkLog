import { BrowserRouter } from 'react-router-dom'
import Routes from 'components/Routes'
import { ProtectedRoute } from 'components/Auth/ProtectedRoute'
import { AuthProvider } from 'helpers/services/AuthContext'

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProtectedRoute>
          <Routes />
        </ProtectedRoute>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
