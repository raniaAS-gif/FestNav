import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './DetailEventAdmin.css'

function DetailEventAdmin() {
  const navigate = useNavigate()

  // State Data Event
  const [eventData, setEventData] = useState({
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
  })

  // State Overlay Modal: null, 'publish', 'unpublish', 'delete-warning', 'delete-success'
  const [activeModal, setActiveModal] = useState(null)

  const isPublished = eventData.status === 'Sudah Dipublish'

  // Handler Publish & Unpublish
  const handlePublish = () => {
    setEventData((prev) => ({ ...prev, status: 'Sudah Dipublish' }))
    setActiveModal('publish')
  }

  const handleUnpublish = () => {
    setEventData((prev) => ({ ...prev, status: 'Belum dipublish' }))
    setActiveModal('unpublish')
  }

  // Handler Hapus Event
  const handleOpenDeleteModal = () => {
    setActiveModal('delete-warning')
  }

  const handleConfirmDelete = () => {
    // Simulasi proses hapus data ke backend
    setActiveModal('delete-success')
  }

  const handleCloseDeleteSuccess = () => {
    setActiveModal(null)
    // Kembali ke halaman daftar event setelah menghapus
    navigate('/daftar-event')
  }

  return (
    <div className="detail-container">
      {/* Navbar */}
      <header className="detail-navbar">
        <div className="nav-brand">FestNav</div>
        <div className="nav-actions">
          <button className="btn-cyan" onClick={() => navigate('/daftar-event')}>Lihat Daftar Event</button>
          <button className="btn-cyan" onClick={() => navigate('/tambah-event')}>+ Tambah Peta baru</button>
          <div className="user-profile">
            <span className="user-name">Admin Esai</span>
            <div className="avatar-placeholder">👤</div>
            <button className="logout-btn" title="Logout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>

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
            <button className="btn-danger-sm" onClick={handleOpenDeleteModal}>Hapus</button>
            <button className="btn-cyan-sm" onClick={() => navigate('/edit-event')}>Edit Detail</button>
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
            <button className="btn-cyan-lg" onClick={() => navigate('/daftar-event')}>Tutup</button>
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