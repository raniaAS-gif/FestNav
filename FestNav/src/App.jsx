import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DashboardAdmin from './pages/DashboardAdmin'
import DaftarEventAdmin from './pages/DaftarEventAdmin'
import DetailEventAdmin from './pages/DetailEventAdmin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardAdmin />} />
        <Route path="/daftar-event" element={<DaftarEventAdmin />} />
        <Route path="/detail-event" element={<DetailEventAdmin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App