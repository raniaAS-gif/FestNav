import { useState, useEffect, useCallback } from 'react'
import NavbarAdmin from '../components/NavbarAdmin'
import { useNavigate, useLocation } from 'react-router-dom'
import './DaftarEventAdmin.css'

const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'

const API_BASE = isLocal
  ? 'http://127.0.0.1:8000'
  : 'https://festnav.onrender.com'

const PAGE_SIZE = 10

const getAuthHeaders = (withJson = false) => {
  const token =
    localStorage.getItem('access_token') || localStorage.getItem('token') || ''
  const h = {}
  if (withJson) h['Content-Type'] = 'application/json'
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function formatDateRange(mulai, selesai) {
  if (!mulai && !selesai) return 'Tanggal belum diatur'
  const fmt = (d) =>
    new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  if (mulai && selesai && mulai !== selesai) return `${fmt(mulai)} – ${fmt(selesai)}`
  return fmt(mulai || selesai)
}

function mapEventToCard(ev) {
  const isScrapping = ['scraping', 'scrapping'].includes(
    String(ev.sumber || '').trim().toLowerCase()
  )
  const tags = [
    {
      label: isScrapping ? 'Hasil Scrapping' : 'Kerjasama Event Organizer',
      color: '#00bcd4'
    }
  ]

  const jenis = (ev.jenis_event || '').toLowerCase()
  const tipe = (ev.tipe_lokasi || '').toLowerCase()

  if (jenis.includes('indoor') && jenis.includes('outdoor')) {
    tags.push({ label: 'Event Outdoor', color: '#38bdf8' })
    tags.push({ label: 'Event Indoor', color: '#f87171' })
  } else if (jenis.includes('outdoor') || tipe === 'outdoor') {
    tags.push({ label: 'Event Outdoor', color: '#38bdf8' })
  } else if (jenis.includes('indoor') || tipe === 'indoor') {
    tags.push({ label: 'Event Indoor', color: '#f87171' })
  } else if (tipe === 'hybrid') {
    tags.push({ label: 'Event Outdoor', color: '#38bdf8' })
    tags.push({ label: 'Event Indoor', color: '#f87171' })
  }

  let status = 'Draft'
  let statusColor = '#3730a3'
  if (ev.status_event === 'published') {
    status = 'Sudah Dipublish'
    statusColor = '#3b82f6'
  } else if (ev.status_event === 'selesai') {
    status = 'Selesai'
    statusColor = '#64748b'
  } else if (ev.is_locked) {
    status = 'Menunggu Publish'
    statusColor = '#f59e0b'
  }

  return {
    id: ev.id_event,
    id_event: ev.id_event,
    title: ev.nama_event,
    type: isScrapping ? 'scrapping' : 'eo',
    tags,
    status,
    statusColor,
    dateRange: formatDateRange(ev.tanggal_mulai, ev.tanggal_selesai),
    description: ev.deskripsi || '-',
    location: ev.lokasi || '-',
    posterUrl: ev.poster_url || '',
    rawEvent: ev
  }
}

function DaftarEventAdmin() {
  const navigate = useNavigate()
  const location = useLocation()

  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'eo')
  const [searchTerm, setSearchTerm] = useState('')
  const [activePage, setActivePage] = useState(1)

  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // State 2 Overlay Hapus Event
  const [eventToDelete, setEventToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false)

  const loadEvents = useCallback(async () => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/events`, {
        headers: getAuthHeaders()
      })
      const data = await res.json().catch(() => [])
      if (!res.ok) {
        throw new Error(data.detail || 'Gagal memuat daftar event dari server')
      }
      setEvents(Array.isArray(data) ? data.map(mapEventToCard) : [])
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar event.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state])

  useEffect(() => {
    setActivePage(1)
  }, [activeTab, searchTerm])

  // Filter event otomatis berdasarkan tab aktif & kata kunci pencarian
  const filteredEvents = events.filter((evt) => {
    const matchTab = evt.type === activeTab
    const q = searchTerm.toLowerCase()
    const matchSearch =
      evt.title.toLowerCase().includes(q) ||
      (evt.location || '').toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE))
  const currentPage = Math.min(activePage, totalPages)
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const handleConfirmDelete = async () => {
    if (!eventToDelete || isDeleting) return
    setIsDeleting(true)
    try {
      const res = await fetch(`${API_BASE}/api/events/${eventToDelete.id_event}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (!res.ok && res.status !== 404) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Gagal menghapus event')
      }
      setEvents((prev) =>
        prev.filter((item) => item.id_event !== eventToDelete.id_event)
      )
      setEventToDelete(null)
      setShowDeleteSuccess(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="event-container">
      <NavbarAdmin />

      <div className="event-hero">
        <h1 className="hero-title">Daftar Denah Event</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      <main className="event-content">
        <div className="search-bar-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Cari peta event:"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="btn-cyan-add"
            onClick={() => navigate('/tambah-event', { state: { role: 'admin' } })}
          >
            + Tambah Peta Baru
          </button>
        </div>

        <div className="tabs-wrapper">
          <button
            className={`tab-btn ${activeTab === 'eo' ? 'active' : ''}`}
            onClick={() => setActiveTab('eo')}
          >
            Kerjasama Event Organizer
          </button>
          <button
            className={`tab-btn ${activeTab === 'scrapping' ? 'active' : ''}`}
            onClick={() => setActiveTab('scrapping')}
          >
            Hasil Scrapping
          </button>
        </div>

        {errorMsg && (
          <div className="empty-state" style={{ color: '#fecaca' }}>
            {errorMsg}
          </div>
        )}

        <div className="event-list">
          {isLoading ? (
            <div className="empty-state">Memuat daftar event dari database...</div>
          ) : paginatedEvents.length > 0 ? (
            paginatedEvents.map((evt) => (
              <div key={evt.id_event} className="event-card">
                <div className="event-info">
                  <h2 className="event-title">{evt.title}</h2>
                  <div className="tags-row">
                    {evt.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="event-tag"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.label}
                      </span>
                    ))}
                    <span
                      className="status-tag"
                      style={{ backgroundColor: evt.statusColor }}
                    >
                      {evt.status}
                    </span>
                  </div>
                  <p className="event-date">Tanggal Event: {evt.dateRange}</p>
                </div>

                <div className="event-actions">
                  <button
                    className="btn-action btn-detail"
                    onClick={() =>
                      navigate('/detail-event', {
                        state: {
                          role: 'admin',
                          eventId: evt.id_event,
                          id_event: evt.id_event,
                          eventTitle: evt.title,
                          eventDate: evt.dateRange,
                          eventStatus: evt.status,
                          description: evt.description,
                          location: evt.location,
                          posterUrl: evt.posterUrl,
                          eventData: evt.rawEvent
                        }
                      })
                    }
                  >
                    Lihat Detail
                  </button>
                  <button
                    className="btn-action btn-delete"
                    onClick={() => setEventToDelete(evt)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">Tidak ada event dalam kategori ini.</div>
          )}
        </div>

        <div className="event-footer">
          <button
            type="button"
            className="btn-cyan-print"
            onClick={() => window.print()}
          >
            Cetak Daftar Event
          </button>
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`page-num ${currentPage === num ? 'active' : ''}`}
                onClick={() => setActivePage(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* OVERLAY 1: KONFIRMASI HAPUS EVENT */}
      {eventToDelete && (
        <div className="admin-delete-overlay">
          <div className="admin-delete-modal">
            <h2 className="delete-modal-heading">Peringatan!</h2>
            <h3 className="delete-modal-subheading">
              Yakin menghapus event &ldquo;{eventToDelete.title}&rdquo;?
            </h3>
            <p className="delete-modal-desc">
              Event yang dihapus tidak akan bisa dikembalikan lagi
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-cyan-delete-modal"
                disabled={isDeleting}
                onClick={() => setEventToDelete(null)}
              >
                Batalkan
              </button>
              <button
                type="button"
                className="btn-cyan-delete-modal"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? 'Menghapus...' : 'Yakin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY 2: NOTIFIKASI BERHASIL DIHAPUS */}
      {showDeleteSuccess && (
        <div className="admin-delete-overlay">
          <div className="admin-delete-modal">
            <div className="success-check-wrapper">
              <svg width="74" height="74" viewBox="0 0 74 74" fill="none">
                <circle
                  cx="37"
                  cy="37"
                  r="33"
                  stroke="#16a34a"
                  strokeWidth="4.5"
                  fill="#f0fdf4"
                />
                <path
                  d="M23 38.5L32.5 48L51.5 27.5"
                  stroke="#16a34a"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="delete-success-title">
              Berhasil! Konten sudah dihapus
            </h2>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-cyan-delete-modal btn-success-back"
                onClick={() => setShowDeleteSuccess(false)}
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DaftarEventAdmin