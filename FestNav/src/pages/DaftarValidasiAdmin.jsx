import { useState, useEffect } from 'react'
import NavbarAdmin from '../components/NavbarAdmin'
import { useNavigate } from 'react-router-dom'
import './DaftarValidasiAdmin.css'

const VALIDATION_STORAGE_KEY = 'festnav_validation_requests'

const INITIAL_VALIDATIONS = [
  {
    id: 1,
    eventId: 1,
    eoName: 'EO Esai',
    title: 'Dies Natalis Udayana 2026 (Denah)',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' },
      { label: 'Event Outdoor', color: '#38bdf8' },
      { label: 'Menunggu Publish', color: '#3730a3' }
    ],
    requestTime: '12 Juni 2026 19.40 WITA',
    status: 'pending', // 'pending' | 'validated' | 'rejected'
    isModifiedByEO: false,
    rejectionMessage: ''
  },
  {
    id: 2,
    eventId: 6,
    eoName: 'EO Esai',
    title: 'Pameran Seni Buleleng (Event)',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' },
      { label: 'Event Outdoor', color: '#38bdf8' },
      { label: 'Ditolak', color: '#3730a3' }
    ],
    requestTime: '12 Juni 2026 19.40 WITA',
    // Skenario 1: Ditolak & EO belum mengubah isinya -> Ubah Keputusan menyala & bisa dicancel
    status: 'rejected',
    isModifiedByEO: false,
    rejectionMessage: 'Mohon lengkapi deskripsi lokasi pameran pada poster.'
  },
  {
    id: 3,
    eventId: 3,
    eoName: 'EO Esai',
    title: 'Festival Musik Lovina (Event)',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Outdoor', color: '#38bdf8' },
      { label: 'Ditolak', color: '#3730a3' }
    ],
    requestTime: '12 Juni 2026 18.15 WITA',
    // Skenario 2: Ditolak & EO sudah mengubah isinya -> Ubah Keputusan redup & memunculkan peringatan
    status: 'rejected',
    isModifiedByEO: true,
    rejectionMessage: 'Gambar denah panggung utama masih buram.'
  }
]

const STATUS_TAG_LABELS = [
  'Sudah Dipublish',
  'Draft',
  'Belum Dipublish',
  'Menunggu Publish',
  'Menunggu Verifikasi',
  'Ditolak'
]

function updateCardStatusTag(tags = [], newBadgeLabel) {
  const hasStatusTag = tags.some((t) => STATUS_TAG_LABELS.includes(t.label))
  if (hasStatusTag) {
    return tags.map((t) =>
      STATUS_TAG_LABELS.includes(t.label)
        ? { ...t, label: newBadgeLabel, color: '#3730a3' }
        : t
    )
  }
  return [...tags, { label: newBadgeLabel, color: '#3730a3' }]
}

function normalizeValidationItem(item) {
  const rawStatus = item.adminStatus || item.status || 'pending'
  let normalizedStatus = 'pending'
  let badgeLabel = 'Menunggu Publish'

  if (rawStatus === 'validated' || rawStatus === 'Diterima') {
    normalizedStatus = 'validated'
    badgeLabel = 'Sudah Dipublish'
  } else if (rawStatus === 'rejected' || rawStatus === 'Ditolak') {
    normalizedStatus = 'rejected'
    badgeLabel = 'Ditolak'
  }

  return {
    ...item,
    status: normalizedStatus,
    tags: updateCardStatusTag(item.tags || [], badgeLabel),
    requestTime: item.requestTime || item.eventDate || 'Baru saja',
    isModifiedByEO: Boolean(item.isModifiedByEO),
    rejectionMessage: item.rejectionMessage || ''
  }
}

function mapAdminStatusToEOStatus(adminStatus) {
  if (adminStatus === 'validated') return 'Diterima'
  if (adminStatus === 'rejected') return 'Ditolak'
  return 'Menunggu Verifikasi'
}

function DaftarValidasiAdmin() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [activePage, setActivePage] = useState(1)

  // State Overlay Modal
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showConfirmValidateModal, setShowConfirmValidateModal] = useState(false)
  const [showPublishSuccessModal, setShowPublishSuccessModal] = useState(false)
  const [showCannotChangeModal, setShowCannotChangeModal] = useState(false)

  const [selectedId, setSelectedId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // Data Request Validasi dari EO
  const [validations, setValidations] = useState(() => {
    try {
      const saved = localStorage.getItem(VALIDATION_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeValidationItem)
        }
      }
      return INITIAL_VALIDATIONS
    } catch {
      return INITIAL_VALIDATIONS
    }
  })

  // Dengarkan perubahan localStorage dari halaman EO
  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const saved = localStorage.getItem(VALIDATION_STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setValidations(parsed.map(normalizeValidationItem))
          }
        }
      } catch {
        // Abaikan error parsing
      }
    }

    window.addEventListener('storage', syncFromStorage)
    return () => window.removeEventListener('storage', syncFromStorage)
  }, [])

  // Simpan setiap perubahan status validasi agar sinkron dengan halaman EO
  useEffect(() => {
    try {
      const payloadForStorage = validations.map((item) => ({
        ...item,
        adminStatus: item.status,
        status: mapAdminStatusToEOStatus(item.status)
      }))
      localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify(payloadForStorage))
    } catch (err) {
      console.error('Gagal menyimpan daftar validasi admin:', err)
    }
  }, [validations])

  // Sinkronkan status event ke DaftarEventEO & DaftarEventAdmin
  const syncEventPublishState = (targetItem, isPublished) => {
    if (!targetItem) return
    const cleanTitle = targetItem.title
      .replace(/\s*\((Event|Denah[^)]*)\)$/i, '')
      .trim()
    const nextEventStatus = isPublished ? 'Sudah Dipublish' : 'Draft'
    const nextColor = isPublished ? '#3b82f6' : '#3730a3'

    // 1. Update status di Daftar Event EO
    try {
      const eoList = JSON.parse(localStorage.getItem('festnav_eo_events') || '[]')
      if (Array.isArray(eoList) && eoList.length > 0) {
        const updatedEo = eoList.map((evt) => {
          const isMatch =
            (targetItem.eventId && evt.id === targetItem.eventId) ||
            evt.title === cleanTitle
          if (!isMatch) return evt

          const updatedTags = Array.isArray(evt.tags)
            ? evt.tags.map((t) =>
                STATUS_TAG_LABELS.includes(t.label)
                  ? { ...t, label: nextEventStatus, color: '#312e81' }
                  : t
              )
            : evt.tags

          return {
            ...evt,
            status: nextEventStatus,
            statusColor: nextColor,
            tags: updatedTags
          }
        })
        localStorage.setItem('festnav_eo_events', JSON.stringify(updatedEo))
      }
    } catch (err) {
      console.error('Gagal menyinkronkan festnav_eo_events:', err)
    }

    // 2. Update atau Tambahkan (Upsert) Event buatan EO ke Daftar Event Admin
    try {
      const adminList = JSON.parse(localStorage.getItem('festnav_admin_events') || '[]')
      const safeAdminList = Array.isArray(adminList) ? adminList : []

      const alreadyInAdmin = safeAdminList.some(
        (evt) =>
          (targetItem.eventId && evt.id === targetItem.eventId) ||
          evt.title === cleanTitle
      )

      let updatedAdminList
      if (alreadyInAdmin) {
        updatedAdminList = safeAdminList.map((evt) => {
          const isMatch =
            (targetItem.eventId && evt.id === targetItem.eventId) ||
            evt.title === cleanTitle
          if (!isMatch) return evt
          return {
            ...evt,
            status: nextEventStatus,
            statusColor: nextColor
          }
        })
      } else if (isPublished) {
        const sourceData = targetItem.eventData || {}
        const cleanTags = (targetItem.tags || []).filter(
          (t) => !STATUS_TAG_LABELS.includes(t.label)
        )

        const newAdminEntry = {
          ...sourceData,
          id: targetItem.eventId || Date.now(),
          title: cleanTitle,
          namaEvent: cleanTitle,
          type: 'eo',
          tags:
            cleanTags.length > 0
              ? cleanTags
              : [{ label: 'Kerjasama Event Organizer', color: '#00bcd4' }],
          status: 'Sudah Dipublish',
          statusColor: '#3b82f6',
          dateRange:
            sourceData.dateRange ||
            sourceData.eventDate ||
            targetItem.eventDate ||
            'Tanggal belum diatur',
          eventOrganizer: sourceData.eventOrganizer || targetItem.eoName || 'EO Esai',
          sumber: 'Kerjasama Event Organizer'
        }

        updatedAdminList = [newAdminEntry, ...safeAdminList]
      } else {
        updatedAdminList = safeAdminList
      }

      localStorage.setItem('festnav_admin_events', JSON.stringify(updatedAdminList))
    } catch (err) {
      console.error('Gagal menyinkronkan festnav_admin_events:', err)
    }
  }

  // Buka Modal Penolakan
  const handleOpenRejectModal = (id) => {
    setSelectedId(id)
    const currentItem = validations.find((v) => v.id === id)
    setRejectReason(currentItem?.rejectionMessage || '')
    setShowRejectModal(true)
  }

  // Kirim Pesan Penolakan -> Ubah ke status 'rejected'
  const handleSendRejection = () => {
    const targetItem = validations.find((v) => v.id === selectedId)
    setValidations((prev) =>
      prev.map((item) =>
        item.id === selectedId
          ? {
              ...item,
              status: 'rejected',
              isModifiedByEO: false,
              rejectionMessage: rejectReason,
              tags: updateCardStatusTag(item.tags, 'Ditolak')
            }
          : item
      )
    )
    syncEventPublishState(targetItem, false)
    setShowRejectModal(false)
    setShowSuccessModal(true)
  }

  // Klik tombol "Validasi" (saat status pending) -> Buka Konfirmasi Publish
  const handleOpenValidateConfirm = (id) => {
    setSelectedId(id)
    setShowConfirmValidateModal(true)
  }

  // Klik tombol "Ubah Keputusan" (saat status rejected)
  const handleDecisionChangeClick = (item) => {
    // Jika EO sudah membuat perubahan baru sejak penolakan -> tidak bisa dicancel
    if (item.isModifiedByEO) {
      setSelectedId(item.id)
      setShowCannotChangeModal(true)
      return
    }

    // Jika EO belum mengubah isinya -> buka konfirmasi untuk langsung validasi & publish
    setSelectedId(item.id)
    setShowConfirmValidateModal(true)
  }

  // Konfirmasi "Yakin" -> Validasi & Publish Event, lalu kunci ketiga tombol
  const handleConfirmValidateAndPublish = () => {
    const targetItem = validations.find((v) => v.id === selectedId)
    setValidations((prev) =>
      prev.map((item) =>
        item.id === selectedId
          ? {
              ...item,
              status: 'validated',
              rejectionMessage: '',
              tags: updateCardStatusTag(item.tags, 'Sudah Dipublish')
            }
          : item
      )
    )
    syncEventPublishState(targetItem, true)
    setShowConfirmValidateModal(false)
    setShowPublishSuccessModal(true)
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
            const isValidated = item.status === 'validated'
            const isRejected = item.status === 'rejected'
            const canCancelRejection = isRejected && !item.isModifiedByEO
            const cleanEventTitle = item.title
              .replace(/\s*\((Event|Denah[^)]*)\)$/i, '')
              .trim()

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
                  {/* 1. Tombol Cek Detail: Disabled jika sudah divalidasi, menyala jika pending/ditolak */}
                  <button
                    type="button"
                    className="btn-action btn-detail"
                    disabled={isValidated}
                    style={
                      isValidated
                        ? { opacity: 0.5, cursor: 'not-allowed' }
                        : undefined
                    }
                    onClick={() =>
                      navigate('/detail-event', {
                        state: {
                          validation: item,
                          eventId: item.eventId,
                          eventTitle: cleanEventTitle,
                          eventData: item.eventData
                        }
                      })
                    }
                  >
                    Cek Detail
                  </button>

                  {/* 2. Tombol Tengah:
                      - Jika ditolak -> "Ubah Keputusan" (menyala jika EO belum edit, redup jika EO sudah edit)
                      - Jika pending -> "Validasi" (aktif)
                      - Jika sudah divalidasi -> tetap "Validasi" & disabled */}
                  {isRejected ? (
                    <button
                      type="button"
                      className="btn-action btn-ubah-keputusan"
                      style={
                        !canCancelRejection
                          ? { opacity: 0.55, cursor: 'not-allowed' }
                          : undefined
                      }
                      onClick={() => handleDecisionChangeClick(item)}
                    >
                      Ubah Keputusan
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-action btn-validasi"
                      disabled={isValidated}
                      style={
                        isValidated
                          ? { opacity: 0.5, cursor: 'not-allowed' }
                          : undefined
                      }
                      onClick={() => handleOpenValidateConfirm(item.id)}
                    >
                      Validasi
                    </button>
                  )}

                  {/* 3. Tombol Tolak: Aktif hanya saat pending; disabled saat sudah divalidasi atau sudah ditolak */}
                  <button
                    type="button"
                    className={`btn-action ${
                      isValidated || isRejected ? 'btn-tolak-processed' : 'btn-tolak'
                    }`}
                    disabled={isValidated || isRejected}
                    style={
                      isValidated
                        ? { opacity: 0.5, cursor: 'not-allowed' }
                        : isRejected
                        ? { cursor: 'not-allowed' }
                        : undefined
                    }
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
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                className={`page-num ${activePage === num ? 'active' : ''}`}
                onClick={() => setActivePage(num)}
              >
                {num}
              </button>
            ))}
            <span className="page-dots">...</span>
          </div>
        </div>
      </main>

      {/* OVERLAY 1: FORM DESKRIPSI PENOLAKAN */}
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
                type="button"
                className="btn-modal btn-batalkan"
                onClick={() => setShowRejectModal(false)}
              >
                Batalkan
              </button>
              <button
                type="button"
                className="btn-modal btn-kirim"
                onClick={handleSendRejection}
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY 2: NOTIFIKASI PESAN PENOLAKAN TERKIRIM */}
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
              type="button"
              className="btn-modal btn-kembali"
              onClick={() => setShowSuccessModal(false)}
            >
              Kembali
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY 3: PERINGATAN TIDAK BISA UBAH KEPUTUSAN */}
      {showCannotChangeModal && (
        <div className="modal-overlay">
          <div
            className="modal-card success-modal"
            style={{ maxWidth: '640px', padding: '36px 32px' }}
          >
            <h2
              style={{
                fontSize: '2.1rem',
                fontWeight: 800,
                color: '#000',
                margin: '0 0 16px'
              }}
            >
              Peringatan!
            </h2>
            <p
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.45,
                margin: '0 0 14px'
              }}
            >
              Anda tidak bisa mengubah keputusan menjadi valid
              <br />
              karena pihak Event Organizer sudah mengubah isinya
            </p>
            <p
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                color: '#000',
                margin: '0 0 28px'
              }}
            >
              Tunggu sampai pihak terkait mengirimkan permintaan ulang
            </p>
            <button
              type="button"
              className="btn-modal btn-kembali"
              onClick={() => setShowCannotChangeModal(false)}
            >
              Kembali
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY 4: KONFIRMASI VALIDASI & PUBLISH */}
      {showConfirmValidateModal && (
        <div className="modal-overlay">
          <div
            className="modal-card success-modal"
            style={{ maxWidth: '640px', padding: '36px 32px' }}
          >
            <h2
              style={{
                fontSize: '2.1rem',
                fontWeight: 800,
                color: '#000',
                margin: '0 0 16px'
              }}
            >
              Peringatan!
            </h2>
            <p
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.45,
                margin: '0 0 14px'
              }}
            >
              Memvalidasi permintaan akan langsung meng-publish
              <br />
              event atau denah terkait
            </p>
            <p
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#000',
                margin: '0 0 28px'
              }}
            >
              Apakah anda yakin?
            </p>
            <div className="modal-btn-row">
              <button
                type="button"
                className="btn-modal btn-batalkan"
                onClick={() => setShowConfirmValidateModal(false)}
              >
                Batalkan
              </button>
              <button
                type="button"
                className="btn-modal btn-kirim"
                onClick={handleConfirmValidateAndPublish}
              >
                Yakin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY 5: BERHASIL VALIDASI & PUBLISH */}
      {showPublishSuccessModal && (
        <div className="modal-overlay">
          <div
            className="modal-card success-modal"
            style={{ maxWidth: '640px', padding: '36px 32px' }}
          >
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
            <h3
              className="success-message"
              style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.3 }}
            >
              Berhasil! Event/Denah sudah di
              <br />
              publish
            </h3>
            <button
              type="button"
              className="btn-modal btn-kembali"
              onClick={() => setShowPublishSuccessModal(false)}
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