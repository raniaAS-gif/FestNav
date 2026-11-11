import { useState } from 'react'
import './DaftarEventAdmin.css'

function DaftarEventAdmin() {
  // State Filter Tab (Kerjasama Event Organizer / Hasil Scrapping)
  const [activeTab, setActiveTab] = useState('eo') // 'eo' atau 'scrapping'
  const [searchTerm, setSearchTerm] = useState('')

  // Mock Data Event (Simulasi data dari database MySQL)
  const [events, setEvents] = useState([
    {
      id: 1,
      title: 'Dies Natalis Udayana 2026',
      type: 'eo', // 'eo' atau 'scrapping'
      tags: [
        { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
        { label: 'Event Outdoor', color: '#38bdf8' },
        { label: 'Event Indoor', color: '#f87171' },
      ],
      status: 'Sudah Dipublish',
      statusColor: '#3b82f6',
      dateRange: '21 Oktober 2025 – 31 Desember 2025'
    },
    {
      id: 2,
      title: 'Pernikahan Sita 2026',
      type: 'eo',
      tags: [
        { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
        { label: 'Event Indoor', color: '#f87171' }
      ],
      status: 'Draft',
      statusColor: '#3730a3',
      dateRange: '4 November 2026 – 5 November 2026'
    },
    {
      id: 3,
      title: 'Festival Musik Lovina',
      type: 'eo',
      tags: [
        { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
        { label: 'Event Outdoor', color: '#38bdf8' }
      ],
      status: 'Sudah Dipublish',
      statusColor: '#3b82f6',
      dateRange: '21 Maret 2025'
    },
    {
      id: 4,
      title: 'Bazzar Pagi Makanan',
      type: 'eo',
      tags: [
        { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
        { label: 'Event Outdoor', color: '#38bdf8' }
      ],
      status: 'Draft',
      statusColor: '#3730a3',
      dateRange: '4 Januari 2025 – 5 Januari 2025'
    },
    {
      id: 5,
      title: 'Seminar Nasional Teknologi',
      type: 'eo',
      tags: [
        { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
        { label: 'Event Indoor', color: '#f87171' }
      ],
      status: 'Sudah Dipublish',
      statusColor: '#3b82f6',
      dateRange: '15 Desember 2025'
    }
  ])

  // Filter event berdasarkan tab aktif dan pencarian
  const filteredEvents = events.filter((evt) => {
    const matchTab = evt.type === activeTab
    const matchSearch = evt.title.toLowerCase().includes(searchTerm.toLowerCase())
    return matchTab && matchSearch
  })

  const handleDelete = (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus event ini?')) {
      setEvents(events.filter((item) => item.id !== id))
    }
  }

  return (
    <div className="event-container">
      {/* Navbar */}
      <header className="event-navbar">
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
      <div className="event-hero">
        <h1 className="hero-title">Daftar Denah Event</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      {/* Content Area */}
      <main className="event-content">
        {/* Search & Add Bar */}
        <div className="search-bar-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Cari peta event:"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn-cyan-add">+ Tambah Peta Baru</button>
        </div>

        {/* Tab Selection */}
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

        {/* Event List */}
        <div className="event-list">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((evt) => (
              <div key={evt.id} className="event-card">
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
                  {/* Rincian asli tanggal event dari database */}
                  <p className="event-date">Tanggal Event: {evt.dateRange}</p>
                </div>

                <div className="event-actions">
                  <button className="btn-action btn-detail">Lihat Detail</button>
                  <button className="btn-action btn-delete" onClick={() => handleDelete(evt.id)}>
                    Hapus
                  </button>
                  <button className="btn-action btn-digitasi">Digitasi</button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">Tidak ada event yang ditemukan.</div>
          )}
        </div>

        {/* Footer Actions / Pagination */}
        <div className="event-footer">
          <button className="btn-cyan-print">Cetak Daftar Event</button>
          <div className="pagination">
            <button className="page-num active">1</button>
            <button className="page-num">2</button>
            <button className="page-num">3</button>
            <button className="page-num">4</button>
            <button className="page-num">5</button>
            <span className="page-dots">...</span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DaftarEventAdmin