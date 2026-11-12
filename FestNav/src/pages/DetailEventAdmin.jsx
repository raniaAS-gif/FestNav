import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin'
import './DetailEventAdmin.css'

const DEFAULT_FALLBACK_EVENT = {
  id: 1,
  title: 'Dies Natalis Udayana 2026',
  posterUrl: '',
  namaEvent: 'Dies Natalis Udayana 2026',
  tanggalEvent: '21 Oktober 2025 - 31 Desember 2025',
  lokasiEvent: 'Rektorat Universitas Udayana',
  jenisEvent: 'Event Indoor & Outdoor',
  eventOrganizer: 'Universitas Udayana',
  sumber: 'Kerjasama Event Organizer',
  status: 'Sudah Dipublish',
  deskripsiSingkat:
    'ini adalah itu, itu adalah ini, lalu dia adalah saya, saya adalh kami, kami adalah rambut, rambut adalah bok, bok adalah sayuran, sayuran adalah nama gang, dan lain sebagainya.',
  denahList: [
    {
      id: 'day-1',
      title: 'Day 1: Lapangan Rektorat',
      mapUrl: ''
    },
    {
      id: 'day-2',
      title: 'Day 2: Gedung Rektorat',
      mapUrl: ''
    }
  ]
}

// Helper untuk menyusun jenis event dari array tags jika belum tersedia eksplisit
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

  // State Data Event Dinamis (dari navigasi DaftarEventAdmin / localStorage)
  const [eventData, setEventData] = useState(() => {
    const navState = location.state || {}

    // Cari data lengkap event di localStorage berdasarkan id atau title
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

    const source = navState.eventData || storedEvent
    const resolvedTitle =
      navState.eventTitle || source?.title || DEFAULT_FALLBACK_EVENT.title
    const isDefaultEvent = resolvedTitle === DEFAULT_FALLBACK_EVENT.title

    if (!source && !navState.eventTitle) {
      return DEFAULT_FALLBACK_EVENT
    }

    const resolvedDate =
      navState.eventDate ||
      source?.tanggalEvent ||
      source?.dateRange ||
      DEFAULT_FALLBACK_EVENT.tanggalEvent

    const resolvedStatus =
      navState.eventStatus || source?.status || DEFAULT_FALLBACK_EVENT.status

    const resolvedSumber =
      source?.sumber ||
      source?.tags?.[0]?.label ||
      (source?.type === 'scrapping'
        ? 'Hasil Scrapping'
        : 'Kerjasama Event Organizer')

    const resolvedJenis =
      source?.jenisEvent ||
      (source?.tags ? resolveJenisFromTags(source.tags) : DEFAULT_FALLBACK_EVENT.jenisEvent)

    const resolvedDenah =
      Array.isArray(source?.denahList) && source.denahList.length > 0
        ? source.denahList.map((d, idx) => ({
            id: d.id || `denah-${idx + 1}`,
            title: d.title || d.namaDenah || `Denah ${idx + 1}`,
            mapUrl: d.mapUrl || d.imageUrl || ''
          }))
        : isDefaultEvent
        ? DEFAULT_FALLBACK_EVENT.denahList
        : [
            {
              id: 'denah-1',
              title: `Denah Utama - ${resolvedTitle}`,
              mapUrl: ''
            }
          ]

    return {
      id: source?.id || navState.eventId || Date.now(),
      title: resolvedTitle,
      posterUrl: source?.posterUrl || '',
      namaEvent: source?.namaEvent || resolvedTitle,
      tanggalEvent: resolvedDate,
      lokasiEvent:
        source?.lokasiEvent ||
        (isDefaultEvent ? DEFAULT_FALLBACK_EVENT.lokasiEvent : 'Bali, Indonesia'),
      jenisEvent: resolvedJenis,
      eventOrganizer:
        source?.eventOrganizer ||
        (isDefaultEvent ? DEFAULT_FALLBACK_EVENT.eventOrganizer : 'Panitia Penyelenggara'),
      sumber: resolvedSumber,
      status: resolvedStatus,
      deskripsiSingkat:
        source?.deskripsiSingkat ||
        (isDefaultEvent
          ? DEFAULT_FALLBACK_EVENT.deskripsiSingkat
          : `Informasi dan panduan denah resmi untuk kegiatan ${resolvedTitle}.`),
      denahList: resolvedDenah
    }
  })

  // State Overlay Modal: null, 'publish', 'unpublish', 'delete-warning', 'delete-success'
  const [activeModal, setActiveModal] = useState(null)

  const isPublished = eventData.status === 'Sudah Dipublish'

  // Sinkronkan perubahan status ke localStorage agar DaftarEventAdmin ikut terupdate
  const syncStatusToStorage = (newStatus, newColor) => {
    try {
      const savedList = JSON.parse(localStorage.getItem('festnav_admin_events') || '[]')
      if (Array.isArray(savedList) && savedList.length > 0) {
        const updatedList = savedList.map((item) =>
          item.id === eventData.id || item.title === eventData.title
            ? { ...item, status: newStatus, statusColor: newColor }
            : item
        )
        localStorage.setItem('festnav_admin_events', JSON.stringify(updatedList))
      }
    } catch (err) {
      console.error('Gagal memperbarui status event:', err)
    }
  }

  // Handler Publish & Unpublish
  const handlePublish = () => {
    setEventData((prev) => ({ ...prev, status: 'Sudah Dipublish' }))
    syncStatusToStorage('Sudah Dipublish', '#3b82f6')
    setActiveModal('publish')
  }

  const handleUnpublish = () => {
    setEventData((prev) => ({ ...prev, status: 'Belum dipublish' }))
    syncStatusToStorage('Belum Dipublish', '#3730a3')
    setActiveModal('unpublish')
  }

  // Handler Hapus Event
  const handleOpenDeleteModal = () => {
    setActiveModal('delete-warning')
  }

  const handleConfirmDelete = () => {
    try {
      const savedList = JSON.parse(localStorage.getItem('festnav_admin_events') || '[]')
      if (Array.isArray(savedList) && savedList.length > 0) {
        const updatedList = savedList.filter(
          (item) => item.id !== eventData.id && item.title !== eventData.title
        )
        localStorage.setItem('festnav_admin_events', JSON.stringify(updatedList))
      }
    } catch (err) {
      console.error('Gagal menghapus event:', err)
    }
    setActiveModal('delete-success')
  }

  const handleCloseDeleteSuccess = () => {
    setActiveModal(null)
    navigate('/daftar-event')
  }

  return (
    <div className="detail-container">
      {/* Navbar */}
      <NavbarAdmin />

      {/* Hero Header */}
      <div className="detail-hero">
        <h1 className="hero-title">Detail Event</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      {/* Main Content Area */}
      <main className="detail-content">
        {/* Title Bar with Actions */}
        <div className="detail-header-bar">
          <h2 className="event-main-title">{eventData.title}</h2>
          <div className="header-actions">
            <button className="btn-danger-sm" onClick={handleOpenDeleteModal}>
              Hapus
            </button>
            <button
              className="btn-cyan-sm"
              onClick={() => navigate('/edit-event', { state: { eventData, role: 'admin' } })}
            >
              Edit Detail
            </button>
          </div>
        </div>

        {/* Main Event Card */}
        <div className="detail-card">
          <div className="info-grid">
            <div className="poster-container">
              {eventData.posterUrl ? (
                <img src={eventData.posterUrl} alt="Event Poster" className="poster-img" />
              ) : (
                <div className="poster-placeholder">
                  <span>[ Tempat Poster Event ]</span>
                </div>
              )}
            </div>

            <div className="info-details">
              <p><strong>Nama Event:</strong> {eventData.namaEvent}</p>
              <p><strong>Tanggal Event:</strong> {eventData.tanggalEvent}</p>
              <p><strong>Lokasi Event:</strong> {eventData.lokasiEvent}</p>
              <p><strong>Jenis Event:</strong> {eventData.jenisEvent}</p>
              <p><strong>Event Organizer:</strong> {eventData.eventOrganizer}</p>
              <p><strong>Sumber:</strong> {eventData.sumber}</p>
              <p><strong>Status:</strong> {eventData.status}</p>

              <div className="description-box">
                <p><strong>Deskripsi Singkat:</strong></p>
                <p className="desc-text">{eventData.deskripsiSingkat}</p>
              </div>
            </div>
          </div>

          <hr className="divider" />

          {/* Denah Acara Section */}
          <div className="denah-section">
            <h3 className="section-title text-cyan">Denah Acara</h3>

            {eventData.denahList.map((denah) => (
              <div key={denah.id} className="map-block">
                <h4 className="map-title">{denah.title}</h4>
                <div className="map-container">
                  {denah.mapUrl ? (
                    <img src={denah.mapUrl} alt={denah.title} className="map-img" />
                  ) : (
                    <div className="map-placeholder">
                      <span>[ Tempat Gambar Denah: {denah.title} ]</span>
                    </div>
                  )}
                </div>

                <div className="map-actions">
                  {isPublished && (
                    <button className="btn-cyan-wide" onClick={handlePublish}>
                      Publish
                    </button>
                  )}
                  <button className="btn-cyan-wide">Buka Map Editor</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Global Action Buttons */}
        <div className="global-actions">
          <div className="global-btn-row">
            <button className="btn-green-lg" onClick={handlePublish}>
              Publish
            </button>
            <button className="btn-cyan-lg" onClick={() => navigate('/daftar-event')}>
              Tutup
            </button>
          </div>

          {isPublished && (
            <button className="btn-red-lg" onClick={handleUnpublish}>
              Unpublish
            </button>
          )}
        </div>
      </main>

      {/* OVERLAY MODAL 1: UNPUBLISHED */}
      {activeModal === 'unpublish' && (
        <div className="modal-overlay">
          <div className="modal-card success-modal">
            <div className="success-icon-wrapper">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" fill="#22c55e" />
                <path d="M20 32L28 40L44 24" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="success-message">Berhasil! Konten sudah di unpublish</h3>
            <button className="btn-modal btn-kembali" onClick={() => setActiveModal(null)}>
              Kembali
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL 2: PUBLISHED */}
      {activeModal === 'publish' && (
        <div className="modal-overlay">
          <div className="modal-card success-modal">
            <div className="success-icon-wrapper">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" fill="#22c55e" />
                <path d="M20 32L28 40L44 24" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="success-message">Berhasil! Konten sudah dipublish</h3>
            <button className="btn-modal btn-kembali" onClick={() => setActiveModal(null)}>
              Kembali
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL 3: PERINGATAN HAPUS EVENT */}
      {activeModal === 'delete-warning' && (
        <div className="modal-overlay">
          <div className="modal-card warning-modal">
            <h2 className="warning-title">Peringatan!</h2>
            <h3 className="warning-subtitle">Yakin menghapus event?</h3>
            <p className="warning-desc">Event yang dihapus tidak akan bisa dikembalikan lagi</p>
            <div className="modal-btn-row">
              <button className="btn-modal btn-cyan-modal" onClick={() => setActiveModal(null)}>
                Batalkan
              </button>
              <button className="btn-modal btn-cyan-modal" onClick={handleConfirmDelete}>
                Yakin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL 4: BERHASIL DIHAPUS */}
      {activeModal === 'delete-success' && (
        <div className="modal-overlay">
          <div className="modal-card success-modal">
            <div className="success-icon-wrapper">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" fill="#22c55e" />
                <path d="M20 32L28 40L44 24" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="success-message">Berhasil! Konten sudah dihapus</h3>
            <button className="btn-modal btn-kembali" onClick={handleCloseDeleteSuccess}>
              Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetailEventAdmin