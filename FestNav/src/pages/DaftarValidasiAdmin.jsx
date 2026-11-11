import { useState } from 'react'
import NavbarAdmin from '../components/NavbarAdmin'
import './DaftarValidasiAdmin.css'

function DaftarValidasiAdmin() {
  const [searchTerm, setSearchTerm] = useState('')

  // State untuk mengontrol Overlay Modal
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // Mock Data Request Validasi dari EO
  const [validations, setValidations] = useState([
    {
      id: 1,
      eoName: 'EO Esai',
      title: 'Dies Natalis Udayana 2026 (Denah)',
      tags: [
        { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
        { label: 'Event Indoor', color: '#f87171' },
        { label: 'Event Outdoor', color: '#38bdf8' },
        { label: 'Sudah Dipublish', color: '#3730a3' }
      ],
      requestTime: '12 Juni 2026 19.40 WITA',
      status: 'pending', // 'pending', 'validated', atau 'rejected'
      rejectionMessage: ''
    },
    {
      id: 2,
      eoName: 'EO Esai',
      title: 'Pameran Seni Buleleng (Event)',
      tags: [
        { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
        { label: 'Event Indoor', color: '#f87171' },
        { label: 'Event Outdoor', color: '#38bdf8' },
        { label: 'Sudah Dipublish', color: '#3730a3' }
      ],
      requestTime: '12 Juni 2026 19.40 WITA',
      status: 'pending',
      rejectionMessage: ''
    }
  ])

  // Buka Modal Penolakan (Gambar 3)
  const handleOpenRejectModal = (id) => {
    setSelectedId(id)
    const currentItem = validations.find((v) => v.id === id)
    setRejectReason(
      currentItem?.rejectionMessage ||
        'ini adalah itu, itu adalah ini, lalu dia adalah saya, saya adalh kami, kami adalah rambut, rambut adalah bok, bok adalah sayuran, sayuran adalah nama gang, dan lain sebagainya.'
    )
    setShowRejectModal(true)
  }

  // Kirim Pesan Penolakan (Simpan & Buka Modal Sukses Gambar 4)
  const handleSendRejection = () => {
    setValidations((prev) =>
      prev.map((item) =>
        item.id === selectedId
          ? { ...item, status: 'rejected', rejectionMessage: rejectReason }
          : item
      )
    )
    setShowRejectModal(false)
    setShowSuccessModal(true)
  }

  // Handler Tombol Validasi / Ubah Keputusan
  const handleValidate = (id) => {
    setValidations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'validated' } : item
      )
    )
  }

  const filteredValidations = validations.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.eoName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="validasi-container">
      <NavbarAdmin />

      {/* Hero Header */}
      <div className="validasi-hero">
        <h1 className="hero-title">Daftar Validasi</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      {/* Main Content Area */}
      <main className="validasi-content">
        {/* Search Bar */}
        <div className="search-bar-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Cari request validasi:"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Validation List Cards */}
        <div className="validasi-list">
          {filteredValidations.map((item) => {
            const isProcessed = item.status !== 'pending'
            return (
              <div key={item.id} className="validasi-card">
                <div className="validasi-info">
                  <div className="eo-author-row">
                    <div className="avatar-small">👤</div>
                    <span className="eo-name">{item.eoName}</span>
                  </div>
                  <h2 className="validasi-item-title">{item.title}</h2>
                  <div className="tags-row">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="validasi-tag"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <p className="request-time">Waktu Request: {item.requestTime}</p>
                </div>

                {/* Right Action Buttons */}
                <div className="validasi-actions">
                  <button className="btn-action btn-detail">Cek Detail</button>

                  {/* Tombol Tengah (Validasi -> Ubah Keputusan saat sudah diproses) */}
                  {isProcessed ? (
                    <button
                      className="btn-action btn-ubah-keputusan"
                      onClick={() => handleValidate(item.id)}
                    >
                      Ubah Keputusan
                    </button>
                  ) : (
                    <button
                      className="btn-action btn-validasi"
                      onClick={() => handleValidate(item.id)}
                    >
                      Validasi
                    </button>
                  )}

                  {/* Tombol Tolak (Menjadi Muted Red saat sudah diproses) */}
                  <button
                    className={`btn-action ${isProcessed ? 'btn-tolak-processed' : 'btn-tolak'}`}
                    onClick={() => handleOpenRejectModal(item.id)}
                  >
                    Tolak
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        <div className="validasi-footer">
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

      {/* OVERLAY 1: FORM DESKRIPSI PENOLAKAN (Gambar 3) */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-card reject-modal">
            <h3 className="modal-title">Tuliskan deskripsi penolakan</h3>
            <textarea
              className="modal-textarea"
              rows="6"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Tuliskan deskripsi penolakan..."
            ></textarea>
            <div className="modal-btn-row">
              <button
                className="btn-modal btn-batalkan"
                onClick={() => setShowRejectModal(false)}
              >
                Batalkan
              </button>
              <button
                className="btn-modal btn-kirim"
                onClick={handleSendRejection}
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY 2: NOTIFIKASI BERHASIL (Gambar 4) */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-card success-modal">
            <div className="success-icon-wrapper">
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
            <h3 className="success-message">Berhasil! Pesan sudah terkirim!</h3>
            <button
              className="btn-modal btn-kembali"
              onClick={() => setShowSuccessModal(false)}
            >
              Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DaftarValidasiAdmin