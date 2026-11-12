import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarEO from '../components/NavbarEO'
import './DaftarEventEO.css'

const VALIDATION_STORAGE_KEY = 'festnav_validation_requests'

const INITIAL_EO_EVENTS = [
  {
    id: 1,
    title: 'Dies Natalis Udayana 2026',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Outdoor', color: '#38bdf8' },
      { label: 'Event Indoor', color: '#f87171' },
      { label: 'Sudah Dipublish', color: '#312e81' }
    ],
    status: 'Sudah Dipublish',
    eventDate: '21 Oktober 2025 - 31 Desember 2025'
  },
  {
    id: 2,
    title: 'Pernikahan Sita 2026',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' },
      { label: 'Draft', color: '#312e81' }
    ],
    status: 'Draft',
    eventDate: '4 November 2026 - 5 November 2026'
  },
  {
    id: 3,
    title: 'Festival Musik Lovina',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Outdoor', color: '#38bdf8' },
      { label: 'Sudah Dipublish', color: '#312e81' }
    ],
    status: 'Sudah Dipublish',
    eventDate: '21 Maret 2025'
  },
  {
    id: 4,
    title: 'Bazzar Pagi Makanan',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Outdoor', color: '#38bdf8' },
      { label: 'Draft', color: '#312e81' }
    ],
    status: 'Draft',
    eventDate: '4 Januari 2025 - 5 Januari 2025'
  },
  {
    id: 5,
    title: 'Seminar Nasional Teknologi',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' },
      { label: 'Sudah Dipublish', color: '#312e81' }
    ],
    status: 'Sudah Dipublish',
    eventDate: '15 Desember 2025'
  }
]

const STATUS_LABELS = [
  'Sudah Dipublish',
  'Draft',
  'Belum Dipublish',
  'Menunggu Publish'
]

function normalizeEOEvent(evt) {
  const baseTags = Array.isArray(evt.tags) ? [...evt.tags] : []
  const existingStatusTag = baseTags.find((t) => STATUS_LABELS.includes(t.label))
  const resolvedStatus = evt.status || existingStatusTag?.label || 'Draft'

  const tagsWithStatus = existingStatusTag
    ? baseTags.map((t) =>
        STATUS_LABELS.includes(t.label)
          ? { ...t, label: resolvedStatus, color: '#312e81' }
          : t
      )
    : [...baseTags, { label: resolvedStatus, color: '#312e81' }]

  return {
    ...evt,
    tags: tagsWithStatus,
    status: resolvedStatus,
    eventDate: evt.eventDate || evt.dateRange || 'Tanggal belum diatur'
  }
}

function formatCurrentWitaTime() {
  const now = new Date()
  const datePart = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${datePart} ${hours}.${minutes} WITA`
}

function DaftarEventEO() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const [activePage, setActivePage] = useState(1)
  const [publishModalEvent, setPublishModalEvent] = useState(null)

  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('festnav_eo_events')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeEOEvent)
        }
      }
      return INITIAL_EO_EVENTS
    } catch {
      return INITIAL_EO_EVENTS
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('festnav_eo_events', JSON.stringify(events))
    } catch (err) {
      console.error('Gagal menyimpan daftar event EO:', err)
    }
  }, [events])

  useEffect(() => {
    if (location.state?.newEvent) {
      const incoming = normalizeEOEvent(location.state.newEvent)
      setEvents((prev) => {
        if (prev.some((item) => item.id === incoming.id)) return prev
        return [incoming, ...prev]
      })
    }

    if (location.state?.updatedEvent) {
      const updated = normalizeEOEvent(location.state.updatedEvent)
      setEvents((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      )
    }
  }, [location.state])

  const filteredEvents = events.filter(
    (evt) =>
      evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.tags.some((tag) =>
        tag.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
  )

  // Kirim Request Publish ke Admin & Update Status EO
  const handleConfirmRequestPublish = () => {
    if (!publishModalEvent) return

    const nextStatus =
      publishModalEvent.status === 'Sudah Dipublish'
        ? 'Sudah Dipublish'
        : 'Menunggu Publish'

    const updatedEventObj = normalizeEOEvent({
      ...publishModalEvent,
      status: nextStatus
    })

    // 1. Update status di Daftar Event EO
    setEvents((prev) =>
      prev.map((item) => (item.id === publishModalEvent.id ? updatedEventObj : item))
    )

    // 2. Masukkan request ke antrean validasi Admin & EO (festnav_validation_requests)
    try {
      const existingValidations = JSON.parse(
        localStorage.getItem(VALIDATION_STORAGE_KEY) || '[]'
      )

      const newValidationRequest = {
        id: Date.now(),
        eventId: updatedEventObj.id,
        requestType: 'event',
        eoName: updatedEventObj.eventOrganizer || 'EO Esai',
        title: `${updatedEventObj.title} (Event)`,
        tags: updatedEventObj.tags,
        requestTime: formatCurrentWitaTime(),
        eventDate: updatedEventObj.eventDate,
        adminStatus: 'pending',
        status: 'Menunggu Verifikasi',
        isModifiedByEO: false,
        rejectionMessage: '',
        eventData: updatedEventObj
      }

      // Ganti jika ada request pending lama untuk event yang sama, atau tambahkan di paling atas
      const filteredOld = Array.isArray(existingValidations)
        ? existingValidations.filter(
            (req) =>
              !(
                req.eventId === updatedEventObj.id &&
                (req.adminStatus === 'pending' || req.status === 'Menunggu Verifikasi')
              )
          )
        : []

      localStorage.setItem(
        VALIDATION_STORAGE_KEY,
        JSON.stringify([newValidationRequest, ...filteredOld])
      )
    } catch (err) {
      console.error('Gagal mengirim request validasi ke admin:', err)
    }

    alert(`Permintaan publish untuk "${publishModalEvent.title}" telah dikirim ke Admin!`)
    setPublishModalEvent(null)
  }

  const handlePrintList = () => {
    window.print()
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
            onClick={() => navigate('/tambah-event', { state: { role: 'eo' } })}
          >
            + Tambah Peta Baru
          </button>
        </div>

        <h2 className="section-heading-white">Daftar Eventmu</h2>

        <div className="eo-event-list">
          {filteredEvents.map((evt) => (
            <div key={evt.id} className="eo-event-card">
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
                        eventId: evt.id,
                        eventTitle: evt.title,
                        eventDate: evt.eventDate,
                        eventStatus: evt.status,
                        eventData: evt
                      }
                    })
                  }
                >
                  Lihat Detail
                </button>
                <button
                  type="button"
                  className="btn-card-cyan"
                  onClick={() => setPublishModalEvent(evt)}
                >
                  Request Publish
                </button>
                <button
                  type="button"
                  className="btn-card-cyan"
                  onClick={() => navigate('/digitasi-eo', { state: { eventData: evt } })}
                >
                  Digitasi
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="daftar-eo-footer">
          <button
            type="button"
            className="btn-cyan-print"
            onClick={handlePrintList}
          >
            Cetak Daftar Event
          </button>

          <div className="eo-pagination">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                className={`eo-page-num ${activePage === num ? 'active' : ''}`}
                onClick={() => setActivePage(num)}
              >
                {num}
              </button>
            ))}
            <span className="eo-page-dots">...</span>
          </div>
        </div>
      </main>

      {publishModalEvent && (
        <div className="eo-modal-overlay">
          <div className="eo-modal-card">
            <h2 className="eo-modal-title">
              Ajukan request publish untuk event &ldquo;{publishModalEvent.title}&rdquo;?
            </h2>
            <div className="eo-modal-btn-row">
              <button
                type="button"
                className="btn-cyan-modal"
                onClick={() => setPublishModalEvent(null)}
              >
                Tidak
              </button>
              <button
                type="button"
                className="btn-cyan-modal"
                onClick={handleConfirmRequestPublish}
              >
                Iya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DaftarEventEO