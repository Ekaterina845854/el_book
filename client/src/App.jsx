import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import PrivateRoute from './components/PrivateRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CatalogPage from './pages/CatalogPage'
import BookPage from './pages/BookPage'
import LibraryPage from './pages/LibraryPage'
import ReadPage from './pages/ReadPage'
import SubscriptionPage from './pages/SubscriptionPage'
import AdminPage from './pages/AdminPage'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Загрузка...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
  return <CatalogPage />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<RootRedirect />} />
            <Route path="/books/:id" element={<PrivateRoute><BookPage /></PrivateRoute>} />
            <Route path="/library" element={<PrivateRoute><LibraryPage /></PrivateRoute>} />
            <Route path="/read/:id" element={<PrivateRoute><ReadPage /></PrivateRoute>} />
            <Route path="/subscription" element={<PrivateRoute><SubscriptionPage /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute adminOnly><AdminPage /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}
