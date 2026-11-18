import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarEO from '../components/NavbarEO'
import './DaftarEventEO.css'

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
  if (mulai && selesai && mulai !== selesai) return `${fmt(mulai)} - ${fmt(selesai)}`
  return fmt(mulai || selesai)
}

function mapEOEventToCard(ev) {
  const tags = [{ label: 'Kerjasama Event Organizer', color: '#00bcd4' }]

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
  if (ev.status_event === 'published') {
    status = 'Sudah Dipublish'
  } else if (ev.status_event === 'selesai') {
    status = 'Selesai'
  } else if (ev.status_event === 'menunggu_review' || ev.is_locked) {
    status = 'Menunggu Publish'
  }

  tags.push({ label: status, color: '#312e81' })

  return {
    id: ev.id_event,
    id_event: ev.id_event,
    title: ev.nama_event,
    tags,
    status,
    eventDate: formatDateRange(ev.tanggal_mulai, ev.tanggal_selesai),
    eventOrganizer: ev.nama_organizer || '',
    rawEvent: ev
  }
}

function DaftarEventEO() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [activePage, setActivePage] = useState(1)
  const [publishModalEvent, setPublishModalEvent] = useState(null)
  const [isSubmittingPublish, setIsSubmittingPublish] = useState(false)

  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const loadMyEvents = useCallback(async () => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch(`${API_BASE}/api/events?mine_only=true`, {
        headers: getAuthHeaders()
      })
      const data = await res.json().catch(() => [])
      if (!res.ok) {
        throw new Error(data.detail || 'Gagal memuat daftar event milik Anda')
      }
      setEvents(Array.isArray(data) ? data.map(mapEOEventToCard) : [])
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar event.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMyEvents()
  }, [loadMyEvents])

  useEffect(() => {
    setActivePage(1)
  }, [searchTerm])

  const filteredEvents = events.filter(
    (evt) =>
      evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.tags.some((tag) =>
        tag.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
  )

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE))
  const currentPage = Math.min(activePage, totalPages)
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // Kirim Request Publish ke Backend & Update Status EO
  const handleConfirmRequestPublish = async () => {
      if (!publishModalEvent || isSubmittingPublish) return
      setIsSubmittingPublish(true)
      try {
        const res = await fetch(`${API_BASE}/api/request-publish`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            id_event: publishModalEvent.id_event,
            catatan_pengirim: null,
            map_ids: null
          })
        })
        const created = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(created.detail || 'Gagal mengirim request publish')
        }

        await loadMyEvents()
        alert(
          `Permintaan publish untuk "${publishModalEvent.title}" telah dikirim ke Admin!`
        )
        setPublishModalEvent(null)
      } catch (err) {
        alert(err.message)
      } finally {
        setIsSubmittingPublish(false)
      }
    }

  return (
    <div className="daftar-eo-container">
      <NavbarEO />

      <div className="daftar-eo-hero">
        <h1 className="hero-title">Daftar Denah Event</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      <main className="daftar-eo-content">
        <div className="top-action-row">
          <input
            type="text"
            className="search-event-input"
            placeholder="Cari peta event:"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            type="button"
            className="btn-cyan-add"
            onClick={() => navigate('/tambah-event-eo', { state: { role: 'eo' } })}
          >
            + Tambah Peta Baru
          </button>
        </div>

        <h2 className="section-heading-white">Daftar Eventmu</h2>

        {errorMsg && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#fecaca',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '16px'
            }}
          >
            {errorMsg}
          </div>
        )}

        <div className="eo-event-list">
          {isLoading ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '32px',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#475569'
              }}
            >
              Memuat daftar event dari database...
            </div>
          ) : paginatedEvents.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '32px',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#475569'
              }}
            >
              Belum ada event yang terdaftar pada akun Anda.
            </div>
          ) : (
            paginatedEvents.map((evt) => (
              <div key={evt.id_event} className="eo-event-card">
                <div className="eo-event-info">
                  <h3 className="eo-event-title">{evt.title}</h3>

                  <div className="eo-tags-row">
                    {evt.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="eo-event-badge"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>

                  <p className="eo-event-date">Tanggal Event: {evt.eventDate}</p>
                </div>

                <div className="eo-event-actions">
                  <button
                    type="button"
                    className="btn-card-cyan"
                    onClick={() =>
                      navigate('/detail-event-eo', {
                        state: {
                          eventId: evt.id_event,
                          id_event: evt.id_event,
                          eventTitle: evt.title,
                          eventDate: evt.eventDate,
                          eventStatus: evt.status,
                          eventData: evt.rawEvent
                        }
                      })
                    }
                  >
                    Lihat Detail
                  </button>
                  <button
                    type="button"
                    className="btn-card-cyan"
                    disabled={evt.status === 'Sudah Dipublish' || evt.status === 'Menunggu Publish'}
                    onClick={() => setPublishModalEvent(evt)}
                  >
                    {evt.status === 'Sudah Dipublish'
                      ? 'Sudah Dipublish'
                      : evt.status === 'Menunggu Publish'
                      ? 'Menunggu Verifikasi'
                      : 'Request Publish'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="daftar-eo-footer">
          <button
            type="button"
            className="btn-cyan-print"
            onClick={() => window.print()}
          >
            Cetak Daftar Event
          </button>

          <div className="eo-pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`eo-page-num ${currentPage === num ? 'active' : ''}`}
                onClick={() => setActivePage(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </main>

      {publishModalEvent && (
        <div className="eo-modal-overlay">
          <div className="eo-modal-card">
            <h2 className="eo-modal-title">
              Ajukan request publish untuk event &ldquo;{publishModalEvent.title}
              &rdquo;?
            </h2>
            <div className="eo-modal-btn-row">
              <button
                type="button"
                className="btn-cyan-modal"
                disabled={isSubmittingPublish}
                onClick={() => setPublishModalEvent(null)}
              >
                Tidak
              </button>
              <button
                type="button"
                className="btn-cyan-modal"
                disabled={isSubmittingPublish}
                onClick={handleConfirmRequestPublish}
              >
                {isSubmittingPublish ? 'Mengirim...' : 'Iya'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DaftarEventEO