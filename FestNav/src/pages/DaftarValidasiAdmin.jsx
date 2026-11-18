import { useState, useEffect, useCallback } from 'react'
import NavbarAdmin from '../components/NavbarAdmin'
import { useNavigate } from 'react-router-dom'
import './DaftarValidasiAdmin.css'

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000'

const PAGE_SIZE = 10

const getAuthHeaders = (withJson = false) => {
  const token =
    localStorage.getItem('access_token') || localStorage.getItem('token') || ''
  const h = {}
  if (withJson) h['Content-Type'] = 'application/json'
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function formatWitaDateTime(isoString) {
  if (!isoString) return '-'
  const dt = new Date(isoString)
  if (Number.isNaN(dt.getTime())) return isoString
  const datePart = dt.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const timePart = dt.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  return `${datePart} ${timePart.replace(':', '.')} WITA`
}

function buildEventTags(ev, badgeLabel) {
  const tags = [{ label: 'Kerjasama Event Organizer', color: '#00bcd4' }]
  const jenis = (ev?.jenis_event || '').toLowerCase()
  const tipe = (ev?.tipe_lokasi || '').toLowerCase()

  if (jenis.includes('indoor') && jenis.includes('outdoor')) {
    tags.push({ label: 'Event Indoor', color: '#f87171' })
    tags.push({ label: 'Event Outdoor', color: '#38bdf8' })
  } else if (jenis.includes('indoor') || tipe === 'indoor') {
    tags.push({ label: 'Event Indoor', color: '#f87171' })
  } else if (jenis.includes('outdoor') || tipe === 'outdoor') {
    tags.push({ label: 'Event Outdoor', color: '#38bdf8' })
  } else if (tipe === 'hybrid') {
    tags.push({ label: 'Event Indoor', color: '#f87171' })
    tags.push({ label: 'Event Outdoor', color: '#38bdf8' })
  }

  tags.push({ label: badgeLabel, color: '#3730a3' })
  return tags
}

function mapRequestToAdminCard(req, eventMap) {
  const ev = eventMap.get(req.id_event) || null
  const baseTitle = ev?.nama_event || `Event #${req.id_event}`
  const mapItems = Array.isArray(req.items)
    ? req.items.filter((it) => it.jenis_item === 'map')
    : []
  const hasEventItem = Array.isArray(req.items)
    ? req.items.some((it) => it.jenis_item === 'event')
    : true

  let suffix = '(Event)'
  if (!hasEventItem && mapItems.length > 0) {
    suffix = '(Denah)'
  } else if (hasEventItem && mapItems.length > 0) {
    suffix = `(Event & ${mapItems.length} Denah)`
  }

  let status = 'pending'
  let badgeLabel = 'Menunggu Publish'
  if (req.status_request === 'disetujui') {
    status = 'validated'
    badgeLabel = 'Sudah Dipublish'
  } else if (req.status_request === 'ditolak') {
    status = 'rejected'
    badgeLabel = 'Ditolak'
  } else if (req.status_request === 'dibatalkan') {
    status = 'cancelled'
    badgeLabel = 'Dibatalkan'
  }

  const updatedAt = ev?.diperbarui_pada || ev?.updated_at
  const isModifiedByEO =
    status === 'rejected' &&
    Boolean(req.waktu_diputuskan) &&
    Boolean(updatedAt) &&
    new Date(updatedAt).getTime() > new Date(req.waktu_diputuskan).getTime()

  return {
    id: req.id_request,
    id_request: req.id_request,
    eventId: req.id_event,
    eoName: ev?.nama_organizer || `Pengelola #${req.id_pengirim ?? '-'}`,
    cleanTitle: baseTitle,
    title: `${baseTitle} ${suffix}`,
    tags: buildEventTags(ev, badgeLabel),
    requestTime: formatWitaDateTime(req.waktu_dikirim),
    status,
    isModifiedByEO,
    rejectionMessage: req.catatan_admin || '',
    catatanPengirim: req.catatan_pengirim || '',
    eventData: ev,
    rawRequest: req
  }
}

function DaftarValidasiAdmin() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [activePage, setActivePage] = useState(1)

  const [validations, setValidations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State Overlay Modal
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showConfirmValidateModal, setShowConfirmValidateModal] = useState(false)
  const [showPublishSuccessModal, setShowPublishSuccessModal] = useState(false)
  const [showCannotChangeModal, setShowCannotChangeModal] = useState(false)

  const [selectedId, setSelectedId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadValidations = useCallback(async () => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const headers = getAuthHeaders()
      const [resReq, resEv] = await Promise.all([
        fetch(`${API_BASE}/api/request-publish`, { headers }),
        fetch(`${API_BASE}/api/events`, { headers })
      ])

      const reqData = await resReq.json().catch(() => [])
      if (!resReq.ok) {
        throw new Error(reqData.detail || 'Gagal memuat daftar validasi')
      }

      const evData = resEv.ok ? await resEv.json().catch(() => []) : []
      const eventMap = new Map(
        (Array.isArray(evData) ? evData : []).map((ev) => [ev.id_event, ev])
      )

      // Ambil detail event jika ada id_event yang belum masuk di list utama
      const missingIds = [
        ...new Set(
          (Array.isArray(reqData) ? reqData : [])
            .map((r) => r.id_event)
            .filter((idEv) => idEv && !eventMap.has(idEv))
        )
      ]

      await Promise.all(
        missingIds.map(async (idEv) => {
          const r = await fetch(`${API_BASE}/api/events/${idEv}`, { headers })
          if (r.ok) {
            const detailEv = await r.json()
            eventMap.set(idEv, detailEv)
          }
        })
      )

      const mapped = (Array.isArray(reqData) ? reqData : []).map((req) =>
        mapRequestToAdminCard(req, eventMap)
      )
      setValidations(mapped)
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar validasi dari server.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadValidations()
  }, [loadValidations])

  useEffect(() => {
    setActivePage(1)
  }, [searchTerm])

  // Buka Modal Penolakan
  const handleOpenRejectModal = (id) => {
    setSelectedId(id)
    const currentItem = validations.find((v) => v.id === id)
    setRejectReason(currentItem?.rejectionMessage || '')
    setShowRejectModal(true)
  }

  // Kirim Pesan Penolakan -> PATCH /api/request-publish/{id}/keputusan (ditolak)
  const handleSendRejection = async () => {
    if (!selectedId || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/request-publish/${selectedId}/keputusan`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            status_request: 'ditolak',
            catatan_admin: rejectReason.trim() || null
          })
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail || 'Gagal mengirim penolakan')
      }

      await loadValidations()
      setShowRejectModal(false)
      setShowSuccessModal(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Klik tombol "Validasi" (saat status pending) -> Buka Konfirmasi Publish
  const handleOpenValidateConfirm = (id) => {
    setSelectedId(id)
    setShowConfirmValidateModal(true)
  }

  // Klik tombol "Ubah Keputusan" (saat status rejected)
  const handleDecisionChangeClick = (item) => {
    if (item.isModifiedByEO) {
      setSelectedId(item.id)
      setShowCannotChangeModal(true)
      return
    }
    setSelectedId(item.id)
    setShowConfirmValidateModal(true)
  }

  // Konfirmasi "Yakin" -> PATCH /api/request-publish/{id}/keputusan (disetujui)
  const handleConfirmValidateAndPublish = async () => {
    if (!selectedId || isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/request-publish/${selectedId}/keputusan`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            status_request: 'disetujui',
            catatan_admin: null
          })
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail || 'Gagal memvalidasi permintaan publish')
      }

      await loadValidations()
      setShowConfirmValidateModal(false)
      setShowPublishSuccessModal(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredValidations = validations.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.eoName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filteredValidations.length / PAGE_SIZE))
  const currentPage = Math.min(activePage, totalPages)
  const paginatedValidations = filteredValidations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  return (
    <div className="validasi-container">
      <NavbarAdmin />

      <div className="validasi-hero">
        <h1 className="hero-title">Daftar Validasi</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      <main className="validasi-content">
        <div className="search-bar-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Cari request validasi:"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#fecaca',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '16px'
            }}
          >
            {errorMsg}
          </div>
        )}

        <div className="validasi-list">
          {isLoading ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '32px',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#475569'
              }}
            >
              Memuat daftar validasi dari database...
            </div>
          ) : paginatedValidations.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '32px',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#475569'
              }}
            >
              Belum ada permintaan publish dari Event Organizer.
            </div>
          ) : (
            paginatedValidations.map((item) => {
              const isValidated = item.status === 'validated'
              const isRejected = item.status === 'rejected'
              const isCancelled = item.status === 'cancelled'
              const isLocked = isValidated || isCancelled
              const canCancelRejection = isRejected && !item.isModifiedByEO

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
                    <p className="request-time">
                      Waktu Request: {item.requestTime}
                    </p>
                  </div>

                  <div className="validasi-actions">
                    <button
                      type="button"
                      className="btn-action btn-detail"
                      disabled={isLocked}
                      style={
                        isLocked
                          ? { opacity: 0.5, cursor: 'not-allowed' }
                          : undefined
                      }
                      onClick={() =>
                        navigate('/detail-event', {
                          state: {
                            validation: item,
                            eventId: item.eventId,
                            id_event: item.eventId,
                            eventTitle: item.cleanTitle,
                            eventData: item.eventData
                          }
                        })
                      }
                    >
                      Cek Detail
                    </button>

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
                        disabled={isLocked}
                        style={
                          isLocked
                            ? { opacity: 0.5, cursor: 'not-allowed' }
                            : undefined
                        }
                        onClick={() => handleOpenValidateConfirm(item.id)}
                      >
                        Validasi
                      </button>
                    )}

                    <button
                      type="button"
                      className={`btn-action ${
                        isLocked || isRejected
                          ? 'btn-tolak-processed'
                          : 'btn-tolak'
                      }`}
                      disabled={isLocked || isRejected}
                      style={
                        isLocked
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
            })
          )}
        </div>

        <div className="validasi-footer">
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`page-num ${currentPage === num ? 'active' : ''}`}
                onClick={() => setActivePage(num)}
              >
                {num}
              </button>
            ))}
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
                disabled={isSubmitting}
                onClick={() => setShowRejectModal(false)}
              >
                Batalkan
              </button>
              <button
                type="button"
                className="btn-modal btn-kirim"
                disabled={isSubmitting}
                onClick={handleSendRejection}
              >
                {isSubmitting ? 'Mengirim...' : 'Kirim'}
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
                disabled={isSubmitting}
                onClick={() => setShowConfirmValidateModal(false)}
              >
                Batalkan
              </button>
              <button
                type="button"
                className="btn-modal btn-kirim"
                disabled={isSubmitting}
                onClick={handleConfirmValidateAndPublish}
              >
                {isSubmitting ? 'Memproses...' : 'Yakin'}
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