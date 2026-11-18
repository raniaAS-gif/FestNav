import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarEO from '../components/NavbarEO'
import './DashboardEO.css'

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000'

const getAuthHeaders = () => {
  const token =
    localStorage.getItem('access_token') || localStorage.getItem('token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatTanggalIndo(isoOrDate) {
  if (!isoOrDate) return '-'
  const dt = new Date(isoOrDate)
  if (Number.isNaN(dt.getTime())) return String(isoOrDate)
  return dt.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatDateRange(mulai, selesai) {
  if (!mulai && !selesai) return 'Tanggal belum diatur'
  if (mulai && selesai && mulai !== selesai) {
    return `${formatTanggalIndo(mulai)} - ${formatTanggalIndo(selesai)}`
  }
  return formatTanggalIndo(mulai || selesai)
}

function mapEOItem(ev) {
  let statusLabel = 'Draft'
  if (ev.status_event === 'published') statusLabel = 'Sudah Dipublish'
  else if (ev.status_event === 'menunggu_review' || ev.is_locked) {
    statusLabel = 'Menunggu Publish'
  } else if (ev.status_event === 'selesai') {
    statusLabel = 'Selesai'
  }

  return {
    id: ev.id_event,
    id_event: ev.id_event,
    title: ev.nama_event,
    lastEdited: formatTanggalIndo(ev.diperbarui_pada || ev.dibuat_pada),
    eventDate: formatDateRange(ev.tanggal_mulai, ev.tanggal_selesai),
    statusLabel,
    rawEvent: ev
  }
}

function DashboardEO() {
  const navigate = useNavigate()

  const [publishedEvents, setPublishedEvents] = useState([])
  const [unpublishedEvents, setUnpublishedEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const loadMyDashboard = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/events?mine_only=true`, {
        headers: getAuthHeaders()
      })
      const data = res.ok ? await res.json().catch(() => []) : []
      const list = Array.isArray(data) ? data : []

      const sorted = [...list].sort(
        (a, b) =>
          new Date(b.diperbarui_pada || b.dibuat_pada || 0) -
          new Date(a.diperbarui_pada || a.dibuat_pada || 0)
      )

      setPublishedEvents(
        sorted
          .filter((ev) => ev.status_event === 'published')
          .slice(0, 5)
          .map(mapEOItem)
      )

      setUnpublishedEvents(
        sorted
          .filter((ev) => ev.status_event !== 'published')
          .slice(0, 5)
          .map(mapEOItem)
      )
    } catch (err) {
      console.error('Gagal memuat dashboard EO:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMyDashboard()
  }, [loadMyDashboard])

  const openDetailEO = (evt) => {
    navigate('/detail-event-eo', {
      state: {
        eventId: evt.id_event,
        id_event: evt.id_event,
        eventTitle: evt.title,
        eventDate: evt.eventDate,
        eventStatus: evt.statusLabel,
        eventData: evt.rawEvent
      }
    })
  }

  return (
    <div className="dash-eo-container">
      {/* Reusable Navbar EO */}
      <NavbarEO />

      {/* Hero Header */}
      <div className="dash-eo-hero">
        <h1 className="hero-title">Dashboard FestNav</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      {/* Main Content Area (Max-width 950px) */}
      <main className="dash-eo-content">
        {/* Card 1: Eventmu yang sudah dipublish */}
        <section className="dash-eo-card">
          <div className="card-header-row">
            <h2 className="card-heading">Eventmu yang sudah dipublish</h2>
            <button
              className="btn-cyan-header"
              onClick={() => navigate('/daftar-event-eo')}
            >
              Lihat Daftar Event
            </button>
          </div>

          <div className="event-rows-list">
            {isLoading ? (
              <div className="dash-event-row">
                <p className="event-row-date">Memuat daftar event...</p>
              </div>
            ) : publishedEvents.length > 0 ? (
              publishedEvents.map((evt) => (
                <div key={evt.id_event} className="dash-event-row">
                  <div className="event-row-info">
                    <h3 className="event-row-title">{evt.title}</h3>
                    <p className="event-row-date">
                      Terakhir diedit: {evt.lastEdited}
                    </p>
                  </div>
                  <button
                    className="btn-cyan-detail"
                    onClick={() => openDetailEO(evt)}
                  >
                    Lihat Detail
                  </button>
                </div>
              ))
            ) : (
              <div className="dash-event-row">
                <p className="event-row-date">
                  Belum ada event yang dipublish.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Card 2: Eventmu yang belum dipublish */}
        <section className="dash-eo-card">
          <div className="card-header-row">
            <h2 className="card-heading">Eventmu yang belum dipublish</h2>
            <button
              className="btn-cyan-header"
              onClick={() => navigate('/daftar-validasi-eo')}
            >
              Lihat Daftar Validasi
            </button>
          </div>

          <div className="event-rows-list">
            {isLoading ? (
              <div className="dash-event-row">
                <p className="event-row-date">Memuat daftar event...</p>
              </div>
            ) : unpublishedEvents.length > 0 ? (
              unpublishedEvents.map((evt) => (
                <div key={evt.id_event} className="dash-event-row">
                  <div className="event-row-info">
                    <h3 className="event-row-title">{evt.title}</h3>
                    <p className="event-row-date">
                      Terakhir diedit: {evt.lastEdited}
                    </p>
                  </div>
                  <button
                    className="btn-cyan-detail"
                    onClick={() => openDetailEO(evt)}
                  >
                    Lihat Detail
                  </button>
                </div>
              ))
            ) : (
              <div className="dash-event-row">
                <p className="event-row-date">
                  Semua event Anda sudah dipublish atau belum ada draft event.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default DashboardEO