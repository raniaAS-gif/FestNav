import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DashboardAdmin from './pages/DashboardAdmin'
import DaftarEventAdmin from './pages/DaftarEventAdmin'
import DetailEventAdmin from './pages/DetailEventAdmin'
import TambahEventAdmin from './pages/TambahEventAdmin'
import EditEventAdmin from './pages/EditEventAdmin'
import DaftarValidasiAdmin from './pages/DaftarValidasiAdmin'
import ProfileAdmin from './pages/ProfileAdmin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardAdmin />} />
        <Route path="/daftar-event" element={<DaftarEventAdmin />} />
        <Route path="/detail-event" element={<DetailEventAdmin />} />
        <Route path="/tambah-event" element={<TambahEventAdmin />} />
        <Route path="/edit-event" element={<EditEventAdmin />} />
        <Route path="/daftar-validasi" element={<DaftarValidasiAdmin />} />
        <Route path="/profile-admin" element={<ProfileAdmin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App