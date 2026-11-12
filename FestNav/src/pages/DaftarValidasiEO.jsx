import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarEO from '../components/NavbarEO'
import './DaftarValidasiEO.css'

const VALIDATION_STORAGE_KEY = 'festnav_validation_requests'

const INITIAL_VALIDATION_LIST = [
  {
    id: 1,
    eventId: 6,
    eoName: 'EO Esai',
    title: 'Pameran Seni Buleleng',
    status: 'Diterima',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' },
      { label: 'Event Outdoor', color: '#38bdf8' },
      { label: 'Sudah Dipublish', color: '#312e81' }
    ],
    eventDate: '29 Februari 2024– 3 Maret 2024',
    rejectionMessage: ''
  },
  {
    id: 2,
    eventId: 6,
    eoName: 'EO Esai',
    title: 'Pameran Seni Buleleng',
    status: 'Ditolak',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' },
      { label: 'Event Outdoor', color: '#38bdf8' },
      { label: 'Sudah Dipublish', color: '#312e81' }
    ],
    eventDate: '29 Februari 2024– 3 Maret 2024',
    rejectionMessage:
      'ini adalah itu, itu adalah ini, lalu dia adalah saya, saya adalh kami, kami adalah rambut, rambut adalah bok, bok adalah sayuran, sayuran adalah nama gang, dan lain sebagainya.'
  }
]

function DaftarValidasiEO() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const [activePage, setActivePage] = useState(1)

  // State untuk menyimpan pesan penolakan yang sedang dibuka di modal overlay
  const [rejectionModalData, setRejectionModalData] = useState(null)

  // Data Daftar Validasi EO (Dinamis dari localStorage)
  const [validationList, setValidationList] = useState(() => {
    try {
      const saved = localStorage.getItem(VALIDATION_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
      return INITIAL_VALIDATION_LIST
    } catch {
      return INITIAL_VALIDATION_LIST
    }
  })

  // Simpan setiap perubahan ke localStorage agar tetap sinkron dengan Admin & EO
  useEffect(() => {
    try {
      localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify(validationList))
    } catch (err) {
      console.error('Gagal menyimpan daftar validasi EO:', err)
    }
  }, [validationList])

  // Tangkap jika ada request validasi baru yang dikirim lewat navigasi
  useEffect(() => {
    if (location.state?.newValidation) {
      const incoming = location.state.newValidation
      setValidationList((prev) => {
        if (prev.some((item) => item.id === incoming.id)) return prev
        return [incoming, ...prev]
      })
    }
  }, [location.state])

  // Filter Pencarian Berdasarkan Judul Event, Nama EO, atau Status
  const filteredList = validationList.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.eoName && item.eoName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Helper pemetaan status validasi ke status halaman DetailEventEO
  const mapValidationToDetailStatus = (status) => {
    if (status === 'Diterima') return 'Sudah Dipublish'
    if (status === 'Ditolak') return 'Draft'
    return 'Menunggu Publish'
  }

  return (
    <div className="validasi-eo-container">
      {/* Reusable Navbar EO */}
      <NavbarEO />

      {/* Hero Header */}
      <div className="validasi-eo-hero">
        <h1 className="hero-title">Daftar Validasi</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      {/* Main Content Area */}
      <main className="validasi-eo-content">
        {/* Search Bar */}
        <div className="validasi-search-row">
          <input
            type="text"
            className="validasi-search-input"
            placeholder="Cari request validasi:"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List Card Validasi */}
        <div className="validasi-cards-list">
          {filteredList.map((item) => {
            const isAccepted = item.status === 'Diterima'
            const isRejected = item.status === 'Ditolak'

            return (
              <div key={item.id} className="validasi-eo-card">
                {/* Sisi Kiri: Profil EO, Nama Event, Tags, Tanggal */}
                <div className="validasi-card-left">
                  <div className="validasi-eo-header">
                    <div className="validasi-eo-avatar">👤</div>
                    <span className="validasi-eo-name">{item.eoName}</span>
                  </div>

                  <h3 className="validasi-event-title">{item.title}</h3>

                  <div className="validasi-tags-row">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="validasi-badge"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>

                  <p className="validasi-event-date">
                    Tanggal Event: {item.eventDate}
                  </p>
                </div>

                {/* Sisi Kanan: Status & Tombol Aksi */}
                <div className="validasi-card-right">
                  <span
                    className={`validasi-status-text ${
                      isAccepted
                        ? 'status-accepted'
                        : isRejected
                        ? 'status-rejected'
                        : ''
                    }`}
                  >
                    Status: {item.status}
                  </span>

                  <button
                    type="button"
                    className="btn-validasi-cyan"
                    onClick={() =>
                      navigate('/detail-event-eo', {
                        state: {
                          eventId: item.eventId || item.id,
                          eventTitle: item.title,
                          eventDate: item.eventDate,
                          eventStatus: mapValidationToDetailStatus(item.status),
                          eventData: item.eventData || {
                            id: item.eventId || item.id,
                            title: item.title,
                            namaEvent: item.title,
                            eventOrganizer: item.eoName,
                            tags: item.tags,
                            eventDate: item.eventDate,
                            status: mapValidationToDetailStatus(item.status)
                          }
                        }
                      })
                    }
                  >
                    Cek Detail
                  </button>

                  {/* Tombol Cek Pesan hanya muncul jika status Ditolak */}
                  {isRejected && (
                    <button
                      type="button"
                      className="btn-validasi-cyan"
                      onClick={() => setRejectionModalData(item)}
                    >
                      Cek Pesan
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Pagination (Kanan Bawah) */}
        <div className="validasi-eo-footer">
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

      {/* OVERLAY MODAL PESAN PENOLAKAN ADMIN */}
      {rejectionModalData && (
        <div
          className="rejection-modal-overlay"
          onClick={() => setRejectionModalData(null)}
        >
          <div
            className="rejection-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="rejection-modal-title">Pesan penolakan admin</h2>

            <div className="rejection-message-box">
              <p>
                {rejectionModalData.rejectionMessage ||
                  'Belum ada catatan penolakan dari admin.'}
              </p>
            </div>

            <div className="rejection-modal-footer">
              <button
                type="button"
                className="btn-cyan-close-modal"
                onClick={() => setRejectionModalData(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DaftarValidasiEO