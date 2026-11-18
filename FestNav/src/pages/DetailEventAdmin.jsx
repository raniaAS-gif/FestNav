import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin'
import './DetailEventAdmin.css'

const DEFAULT_POSTER_URL =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'

const DEFAULT_DENAH_IMAGES = [
  'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80'
]

const DEFAULT_ADMIN_EVENT = {
  id: 1,
  namaEvent: 'Dies Natalis Udayana 2026',
  tanggalEvent: '21 Oktober 2025 – 31 Desember 2025',
  lokasiEvent: 'Rektorat Universitas Udayana',
  jenisEvent: 'Event Indoor & Outdoor',
  eventOrganizer: 'Universitas Udayana',
  sumber: 'Kerjasama Event Organizer',
  status: 'Draft',
  posterUrl: DEFAULT_POSTER_URL,
  deskripsiSingkat:
    'Informasi dan panduan denah resmi kegiatan untuk navigasi pengunjung.',
  denahList: [
    {
      id: 1,
      namaDenah: 'Day 1: Lapangan Rektorat',
      status: 'draft',
      imageUrl: DEFAULT_DENAH_IMAGES[0]
    },
    {
      id: 2,
      namaDenah: 'Day 2: Gedung Rektorat',
      status: 'draft',
      imageUrl: DEFAULT_DENAH_IMAGES[1]
    }
  ]
}

function resolveJenisFromTags(tags = []) {
  const labels = tags.map((t) => t.label)
  const hasIndoor = labels.includes('Event Indoor')
  const hasOutdoor = labels.includes('Event Outdoor')
  if (hasIndoor && hasOutdoor) return 'Event Indoor & Outdoor'
  if (hasIndoor) return 'Event Indoor'
  if (hasOutdoor) return 'Event Outdoor'
  return 'Event Indoor & Outdoor'
}

function DetailEventAdmin() {
  const navigate = useNavigate()
  const location = useLocation()

  const [resolvedSource] = useState(() => {
    const navState = location.state || {}

    let storedEvent = null
    try {
      const savedList = JSON.parse(localStorage.getItem('festnav_admin_events') || '[]')
      if (Array.isArray(savedList)) {
        storedEvent =
          savedList.find(
            (item) =>
              (navState.eventId && item.id === navState.eventId) ||
              (navState.eventTitle && item.title === navState.eventTitle)
          ) || null
      }
    } catch {
      storedEvent = null
    }

    const source = storedEvent || navState.eventData
    if (!source && !navState.eventTitle) {
      return DEFAULT_ADMIN_EVENT
    }

    const title =
      navState.eventTitle || source?.namaEvent || source?.title || DEFAULT_ADMIN_EVENT.namaEvent
    const isDefault = title === DEFAULT_ADMIN_EVENT.namaEvent

    const resolvedStatus =
      storedEvent?.status || navState.eventStatus || source?.status || 'Draft'

    const resolvedDenah =
      Array.isArray(source?.denahList) && source.denahList.length > 0
        ? source.denahList.map((d, idx) => ({
            id: d.id || idx + 1,
            namaDenah: d.namaDenah || d.title || `Denah ${idx + 1}`,
            status: d.status || 'draft',
            imageUrl:
              d.imageUrl ||
              d.mapUrl ||
              DEFAULT_DENAH_IMAGES[idx % DEFAULT_DENAH_IMAGES.length]
          }))
        : Array.isArray(navState.denah) && navState.denah.length > 0
        ? navState.denah
        : isDefault
        ? DEFAULT_ADMIN_EVENT.denahList
        : [
            {
              id: 1,
              namaDenah: `Denah Utama - ${title}`,
              status: 'draft',
              imageUrl: DEFAULT_DENAH_IMAGES[0]
            }
          ]

    return {
      id: source?.id || navState.eventId || Date.now(),
      namaEvent: title,
      tanggalEvent:
        navState.eventDate ||
        source?.tanggalEvent ||
        source?.dateRange ||
        DEFAULT_ADMIN_EVENT.tanggalEvent,
      lokasiEvent:
        navState.location ||
        source?.lokasiEvent ||
        (isDefault ? DEFAULT_ADMIN_EVENT.lokasiEvent : 'Bali, Indonesia'),
      jenisEvent:
        source?.jenisEvent ||
        (source?.tags ? resolveJenisFromTags(source.tags) : DEFAULT_ADMIN_EVENT.jenisEvent),
      eventOrganizer:
        source?.eventOrganizer ||
        (isDefault ? DEFAULT_ADMIN_EVENT.eventOrganizer : 'EO Esai'),
      sumber:
        source?.sumber ||
        (source?.type === 'scrapping' ? 'Hasil Scrapping' : 'Kerjasama Event Organizer'),
      status: resolvedStatus,
      posterUrl: navState.posterUrl || source?.posterUrl || DEFAULT_POSTER_URL,
      deskripsiSingkat:
        navState.description ||
        source?.deskripsiSingkat ||
        (isDefault
          ? DEFAULT_ADMIN_EVENT.deskripsiSingkat
          : `Informasi dan panduan denah resmi untuk kegiatan ${title}.`),
      denahList: resolvedDenah
    }
  })

  const [eventStatus, setEventStatus] = useState(resolvedSource.status)
  const [denahList, setDenahList] = useState(resolvedSource.denahList)
  const [showPublishModal, setShowPublishModal] = useState(false)

  const eventInfo = {
    id: resolvedSource.id,
    namaEvent: resolvedSource.namaEvent,
    tanggalEvent: resolvedSource.tanggalEvent,
    lokasiEvent: resolvedSource.lokasiEvent,
    jenisEvent: resolvedSource.jenisEvent,
    eventOrganizer: resolvedSource.eventOrganizer,
    sumber: resolvedSource.sumber,
    posterUrl: resolvedSource.posterUrl,
    deskripsiSingkat: resolvedSource.deskripsiSingkat
  }

  const buildFullEventPayload = (overrideStatus = eventStatus) => ({
    ...eventInfo,
    title: eventInfo.namaEvent,
    dateRange: eventInfo.tanggalEvent,
    status: overrideStatus,
    denahList
  })

  const syncAdminStorage = (nextStatus, nextDenahList = denahList) => {
    try {
      const savedList = JSON.parse(localStorage.getItem('festnav_admin_events') || '[]')
      if (Array.isArray(savedList) && savedList.length > 0) {
        const updatedList = savedList.map((item) => {
          if (item.id !== eventInfo.id && item.title !== eventInfo.namaEvent) {
            return item
          }
          return {
            ...item,
            status: nextStatus,
            statusColor: nextStatus === 'Sudah Dipublish' ? '#3b82f6' : '#3730a3',
            denahList: nextDenahList
          }
        })
        localStorage.setItem('festnav_admin_events', JSON.stringify(updatedList))
      }
    } catch (err) {
      console.error('Gagal menyinkronkan status event admin:', err)
    }
  }

  const handlePublishEvent = () => {
    setEventStatus('Sudah Dipublish')
    syncAdminStorage('Sudah Dipublish', denahList)
    setShowPublishModal(true)
  }

  const handlePublishDenah = (denahId) => {
    const updatedDenah = denahList.map((item) =>
      item.id === denahId ? { ...item, status: 'published' } : item
    )
    setDenahList(updatedDenah)
    syncAdminStorage(eventStatus, updatedDenah)
    setShowPublishModal(true)
  }

  return (
    <div className="detail-eo-container">
      <NavbarAdmin />

      <div className="detail-eo-hero">
        <h1 className="hero-title">Detail Event</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      <main className="detail-eo-content">
        <div className="event-top-header">
          <h2 className="event-main-title">{eventInfo.namaEvent}</h2>
          <button
            type="button"
            className="btn-cyan-edit"
            onClick={() =>
              navigate('/edit-event', {
                state: { eventData: buildFullEventPayload(), role: 'admin' }
              })
            }
          >
            Edit Detail
          </button>
        </div>

        <div className="detail-eo-card">
          <div className="detail-top-grid">
            <div className="poster-box">
              <img
                src={eventInfo.posterUrl}
                alt={eventInfo.namaEvent}
                className="event-poster-img"
              />
            </div>

            <div className="metadata-list">
              <p>
                <strong>Nama Event:</strong> {eventInfo.namaEvent}
              </p>
              <p>
                <strong>Tanggal Event:</strong> {eventInfo.tanggalEvent}
              </p>
              <p>
                <strong>Lokasi Event:</strong> {eventInfo.lokasiEvent}
              </p>
              <p>
                <strong>Jenis Event:</strong> {eventInfo.jenisEvent}
              </p>
              <p>
                <strong>Event Organizer:</strong> {eventInfo.eventOrganizer}
              </p>
              <p>
                <strong>Sumber:</strong> {eventInfo.sumber}
              </p>
              <p>
                <strong>Status:</strong> {eventStatus}
              </p>

              <div className="deskripsi-block">
                <strong>Deskripsi Singkat:</strong>
                <p className="deskripsi-text">{eventInfo.deskripsiSingkat}</p>
              </div>
            </div>
          </div>

          <hr className="detail-divider" />

          <div className="denah-acara-section">
            <h2 className="denah-section-heading">Denah Acara</h2>

            {denahList.map((denah) => (
              <div key={denah.id} className="denah-item-wrapper">
                <div className="denah-title-row">
                  <h3 className="denah-item-name">{denah.namaDenah}</h3>
                </div>

                <div className="denah-image-frame">
                  <img
                    src={denah.imageUrl}
                    alt={denah.namaDenah}
                    className="denah-map-img"
                  />
                </div>

                <div className="denah-btn-row">
                  <button
                    type="button"
                    className="btn-cyan-denah"
                    onClick={() => handlePublishDenah(denah.id)}
                  >
                    {denah.status === 'published' ? 'Sudah Dipublish' : 'Publish Denah'}
                  </button>
                  <button
                    type="button"
                    className="btn-cyan-denah"
                    onClick={() =>
                      navigate('/map-editor', {
                        state: {
                          role: 'admin',
                          eventId: eventInfo.id,
                          eventTitle: eventInfo.namaEvent,
                          selectedDenah: { ...denah, title: denah.namaDenah },
                          eventData: buildFullEventPayload(),
                          denah
                        }
                      })
                    }
                  >
                    Buka Map Editor
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-eo-footer">
          <div className="footer-dual-buttons">
            <button
              type="button"
              className="btn-cyan-footer"
              onClick={handlePublishEvent}
            >
              Publish Event
            </button>
            <button
              type="button"
              className="btn-cyan-footer"
              onClick={() => navigate('/daftar-event')}
            >
              Kembali
            </button>
          </div>
        </div>
      </main>

      {/* MODAL PUBLISHED */}
      {showPublishModal && (
        <div
          onClick={() => setShowPublishModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              textAlign: 'center',
              maxWidth: '380px',
              width: '90%',
              padding: '32px 24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" fill="#22c55e" />
                <path
                  d="M20 32L28 40L44 24"
                  stroke="white"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 24, color: '#0f172a' }}>
              Berhasil! Konten sudah dipublish
            </h3>
            <button
              type="button"
              className="btn-cyan-footer"
              style={{ width: '100%' }}
              onClick={() => setShowPublishModal(false)}
            >
              Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetailEventAdmin