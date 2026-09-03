import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import PrivateRoute from './components/PrivateRoute'
import ThemeSwitcher from './components/ThemeSwitcher'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path='/home' element={<Home />} />
        <Route path='/settings' element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path='/admin' element={<PrivateRoute><Admin /></PrivateRoute>} />
      </Routes>
      <ThemeSwitcher />
    </>
  )
}
