import { useState } from 'react'
import NavbarAdmin from '../components/NavbarAdmin'
import './DaftarEventAdmin.css'

function DaftarEventAdmin() {
  // State Filter Tab ('eo' atau 'scrapping')
  const [activeTab, setActiveTab] = useState('eo')
  const [searchTerm, setSearchTerm] = useState('')

  // Mock Data Event (Gabungan EO & Scrapping dari Database MySQL)
  const [events, setEvents] = useState([
    // --- DATA KERJASAMA EVENT ORGANIZER (EO) ---
    {
      id: 1,
      title: 'Dies Natalis Udayana 2026',
      type: 'eo',
      tags: [
        { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
        { label: 'Event Outdoor', color: '#38bdf8' },
        { label: 'Event Indoor', color: '#f87171' }
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
    },

    // --- DATA HASIL SCRAPPING ---
    {
      id: 6,
      title: 'Pameran Seni Buleleng',
      type: 'scrapping',
      tags: [
        { label: 'Hasil Scrapping', color: '#00bcd4' },
        { label: 'Event Indoor', color: '#f87171' },
        { label: 'Event Outdoor', color: '#38bdf8' }
      ],
      status: 'Sudah Dipublish',
      statusColor: '#3b82f6',
      dateRange: '29 Februari 2024 – 3 Maret 2024'
    },
    {
      id: 7,
      title: 'Pagelaran Busana Tradisional',
      type: 'scrapping',
      tags: [
        { label: 'Hasil Scrapping', color: '#00bcd4' },
        { label: 'Event Indoor', color: '#f87171' }
      ],
      status: 'Draft',
      statusColor: '#3730a3',
      dateRange: '4 November 2026 – 5 November 2026'
    },
    {
      id: 8,
      title: 'Acara Ulang Tahun Novita',
      type: 'scrapping',
      tags: [
        { label: 'Hasil Scrapping', color: '#00bcd4' },
        { label: 'Event Outdoor', color: '#38bdf8' }
      ],
      status: 'Sudah Dipublish',
      statusColor: '#3b82f6',
      dateRange: '1 November 2026'
    },
    {
      id: 9,
      title: 'Lari Marathon 1 AU',
      type: 'scrapping',
      tags: [
        { label: 'Hasil Scrapping', color: '#00bcd4' },
        { label: 'Event Outdoor', color: '#38bdf8' }
      ],
      status: 'Draft',
      statusColor: '#3730a3',
      dateRange: '21 April 2025 – 31 Desember 2025'
    },
    {
      id: 10,
      title: 'Workshop Sintaks III',
      type: 'scrapping',
      tags: [
        { label: 'Hasil Scrapping', color: '#00bcd4' },
        { label: 'Event Indoor', color: '#f87171' }
      ],
      status: 'Sudah Dipublish',
      statusColor: '#3b82f6',
      dateRange: '5 Mei 2026'
    }
  ])

  // Filter event otomatis berdasarkan tab aktif & kata kunci pencarian
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

  // Handler interaksi navbar (bisa diisi navigasi router atau logika lain)
  const handleViewEvents = () => {
    alert('Navigasi ke Daftar Event')
  }

  const handleAddMap = () => {
    alert('Buka modal / halaman Tambah Peta Baru')
  }

  const handleLogout = () => {
    if (confirm('Apakah Anda ingin keluar dari akun admin?')) {
      alert('Berhasil Logout')
    }
  }

  return (
    <div className="event-container">
      {/* Menggunakan Navbar Admin Terpisah */}
      <NavbarAdmin />

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
          <button className="btn-cyan-add" onClick={handleAddMap}>+ Tambah Peta Baru</button>
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
            <div className="empty-state">Tidak ada event dalam kategori ini.</div>
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