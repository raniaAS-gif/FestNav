import { useState } from 'react'
import './DetailEventAdmin.css'

function DetailEventAdmin() {
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
    status: 'Sudah Dipublish', // nilai bisa: 'Sudah Dipublish' atau 'Belum dipublish'
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

  // Cek apakah status event saat ini sudah dipublish
  const isPublished = eventData.status === 'Sudah Dipublish'

  // Handler untuk mengubah status menjadi Published
  const handlePublish = () => {
    setEventData((prev) => ({
      ...prev,
      status: 'Sudah Dipublish'
    }))
  }

  // Handler untuk mengubah status menjadi Unpublished
  const handleUnpublish = () => {
    setEventData((prev) => ({
      ...prev,
      status: 'Belum dipublish'
    }))
  }

  return (
    <div className="detail-container">
      {/* Navbar */}
      <header className="detail-navbar">
        <div className="nav-brand">FestNav</div>
        <div className="nav-actions">
          <button className="btn-cyan">Lihat Daftar Event</button>
          <button className="btn-cyan">+ Tambah Peta baru</button>
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
            <button className="btn-danger-sm">Hapus</button>
            <button className="btn-cyan-sm">Edit Detail</button>
          </div>
        </div>

        {/* Main Event Card */}
        <div className="detail-card">
          <div className="info-grid">
            {/* Poster Box */}
            <div className="poster-container">
              {eventData.posterUrl ? (
                <img src={eventData.posterUrl} alt="Event Poster" className="poster-img" />
              ) : (
                <div className="poster-placeholder">
                  <span>[ Tempat Poster Event ]</span>
                </div>
              )}
            </div>

            {/* Event Meta Details */}
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
                  {/* Tombol Publish kecil di tiap denah HANYA muncul jika status isPublished = true */}
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
            <button className="btn-cyan-lg">Tutup</button>
          </div>
          
          {/* Tombol Unpublish HANYA muncul jika event sedang dipublish */}
          {isPublished && (
            <button className="btn-red-lg" onClick={handleUnpublish}>
              Unpublish
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

export default DetailEventAdmin