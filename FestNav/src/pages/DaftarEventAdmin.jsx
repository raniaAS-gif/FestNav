import { useState, useEffect } from 'react'
import NavbarAdmin from '../components/NavbarAdmin'
import { useNavigate, useLocation } from 'react-router-dom'
import './DaftarEventAdmin.css'

const INITIAL_EVENTS = [
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
]

function DaftarEventAdmin() {
  const navigate = useNavigate()
  const location = useLocation()

  // Otomatis pilih tab sesuai sumber event yang baru ditambahkan
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'eo')
  const [searchTerm, setSearchTerm] = useState('')

  // State 2 Overlay Hapus Event
  const [eventToDelete, setEventToDelete] = useState(null)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false)

  // Ambil daftar event terbaru dari localStorage
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('festnav_admin_events')
      return saved ? JSON.parse(saved) : INITIAL_EVENTS
    } catch {
      return INITIAL_EVENTS
    }
  })

  // Simpan setiap perubahan ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem('festnav_admin_events', JSON.stringify(events))
    } catch (err) {
      console.error('Gagal menyimpan daftar event:', err)
    }
  }, [events])

  // Tangkap jika ada state event baru yang dikirim lewat navigasi
  useEffect(() => {
    if (location.state?.newEvent) {
      const incoming = location.state.newEvent
      setEvents((prev) => {
        if (prev.some((item) => item.id === incoming.id)) return prev
        return [incoming, ...prev]
      })
      if (incoming.type) {
        setActiveTab(incoming.type)
      }
    }
  }, [location.state])

  // Filter event otomatis berdasarkan tab aktif & kata kunci pencarian
  const filteredEvents = events.filter((evt) => {
    const matchTab = evt.type === activeTab
    const matchSearch = evt.title.toLowerCase().includes(searchTerm.toLowerCase())
    return matchTab && matchSearch
  })

  const handleConfirmDelete = () => {
    if (!eventToDelete) return
    setEvents((prev) => prev.filter((item) => item.id !== eventToDelete.id))
    setEventToDelete(null)
    setShowDeleteSuccess(true)
  }

  return (
    <div className="event-container">
      {/* Navbar Admin */}
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
          <button
            className="btn-cyan-add"
            onClick={() => navigate('/tambah-event', { state: { role: 'admin' } })}
          >
            + Tambah Peta Baru
          </button>
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
                  <button
                    className="btn-action btn-detail"
                    onClick={() =>
                      navigate('/detail-event', {
                        state: {
                          eventTitle: evt.title,
                          eventDate: evt.dateRange,
                          eventStatus: evt.status
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

      {/* OVERLAY 1: KONFIRMASI HAPUS EVENT */}
      {eventToDelete && (
        <div className="admin-delete-overlay">
          <div className="admin-delete-modal">
            <h2 className="delete-modal-heading">Peringatan!</h2>
            <h3 className="delete-modal-subheading">Yakin menghapus event?</h3>
            <p className="delete-modal-desc">
              Event yang dihapus tidak akan bisa dikembalikan lagi
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-cyan-delete-modal"
                onClick={() => setEventToDelete(null)}
              >
                Batalkan
              </button>
              <button
                type="button"
                className="btn-cyan-delete-modal"
                onClick={handleConfirmDelete}
              >
                Yakin
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
                <circle cx="37" cy="37" r="33" stroke="#16a34a" strokeWidth="4.5" fill="#f0fdf4" />
                <path d="M23 38.5L32.5 48L51.5 27.5" stroke="#16a34a" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="delete-success-title">Berhasil! Konten sudah dihapus</h2>
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