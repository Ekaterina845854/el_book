import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { darkMode, setDarkMode } = useContext(ThemeContext);   // ← добавили

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand"> Электронная библиотека</Link>

      {/* Кнопка переключения темы */}
      <button onClick={() => setDarkMode(!darkMode)} className="theme-toggle">
        {darkMode ? 'Светлая тема' : 'Тёмная тема'}
      </button>

      {user && (
        <div className="navbar-links">
          {user.role === 'ADMIN' ? (
            <Link to="/admin">Администратор</Link>
          ) : (
            <>
              <Link to="/">Каталог</Link>
              <Link to="/library">Моя библиотека</Link>
              <Link to="/subscription">Подписка</Link>
            </>
          )}
        </div>
      )}

      <div className="navbar-user">
        {user ? (
          <>
            <span className="navbar-email">{user.email}</span>
            <button className="btn btn-outline" onClick={handleLogout}>Выйти</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline">Войти</Link>
            <Link to="/register" className="btn btn-primary">Регистрация</Link>
          </>
        )}
      </div>
    </nav>
  )
}
