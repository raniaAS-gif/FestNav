import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarEO from '../components/NavbarEO'
import './DaftarValidasiEO.css'

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env.VITE_API_BASE_URL) ||
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

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function formatDateRange(mulai, selesai) {
  if (!mulai && !selesai) return 'Tanggal belum diatur'
  const fmt = (d) =>
    new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  if (mulai && selesai && mulai !== selesai) return `${fmt(mulai)} – ${fmt(selesai)}`
  return fmt(mulai || selesai)
}

function mapRequestToEOCard(req, eventMap, storedUser) {
  const ev = eventMap.get(req.id_event) || null
  const title = ev?.nama_event || `Event #${req.id_event}`

  let status = 'Menunggu Verifikasi'
  let statusBadge = 'Menunggu Publish'
  if (req.status_request === 'disetujui') {
    status = 'Diterima'
    statusBadge = 'Sudah Dipublish'
  } else if (req.status_request === 'ditolak') {
    status = 'Ditolak'
    statusBadge = 'Ditolak'
  } else if (req.status_request === 'dibatalkan') {
    status = 'Dibatalkan'
    statusBadge = 'Dibatalkan'
  }

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

  tags.push({ label: statusBadge, color: '#312e81' })

  return {
    id: req.id_request,
    id_request: req.id_request,
    eventId: req.id_event,
    eoName:
      ev?.nama_organizer ||
      storedUser?.nama_organisasi ||
      storedUser?.nama ||
      'Event Organizer',
    title,
    status,
    tags,
    eventDate: formatDateRange(ev?.tanggal_mulai, ev?.tanggal_selesai),
    rejectionMessage: req.catatan_admin || '',
    eventData: ev,
    rawRequest: req
  }
}

function DaftarValidasiEO() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [activePage, setActivePage] = useState(1)

  const [rejectionModalData, setRejectionModalData] = useState(null)
  const [validationList, setValidationList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const loadMyValidations = useCallback(async () => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const headers = getAuthHeaders()
      const storedUser = getStoredUser()
      const [resReq, resEv] = await Promise.all([
        fetch(`${API_BASE}/api/request-publish`, { headers }),
        fetch(`${API_BASE}/api/events?mine_only=true`, { headers })
      ])

      const reqData = await resReq.json().catch(() => [])
      if (!resReq.ok) {
        throw new Error(reqData.detail || 'Gagal memuat daftar validasi')
      }

      const evData = resEv.ok ? await resEv.json().catch(() => []) : []
      const eventMap = new Map(
        (Array.isArray(evData) ? evData : []).map((ev) => [ev.id_event, ev])
      )

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
        mapRequestToEOCard(req, eventMap, storedUser)
      )
      setValidationList(mapped)
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar validasi dari server.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMyValidations()
  }, [loadMyValidations])

  useEffect(() => {
    setActivePage(1)
  }, [searchTerm])

  const filteredList = validationList.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.eoName &&
        item.eoName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE))
  const currentPage = Math.min(activePage, totalPages)
  const paginatedList = filteredList.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const mapValidationToDetailStatus = (status) => {
    if (status === 'Diterima') return 'Sudah Dipublish'
    if (status === 'Ditolak' || status === 'Dibatalkan') return 'Draft'
    return 'Menunggu Publish'
  }

  return (
    <div className="validasi-eo-container">
      <NavbarEO />

      <div className="validasi-eo-hero">
        <h1 className="hero-title">Daftar Validasi</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      <main className="validasi-eo-content">
        <div className="validasi-search-row">
          <input
            type="text"
            className="validasi-search-input"
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

        <div className="validasi-cards-list">
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
          ) : paginatedList.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '32px',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#475569'
              }}
            >
              Belum ada pengajuan validasi pada akun Anda.
            </div>
          ) : (
            paginatedList.map((item) => {
              const isAccepted = item.status === 'Diterima'
              const isRejected = item.status === 'Ditolak'

              return (
                <div key={item.id} className="validasi-eo-card">
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
                            eventId: item.eventId,
                            id_event: item.eventId,
                            eventTitle: item.title,
                            eventDate: item.eventDate,
                            eventStatus: mapValidationToDetailStatus(item.status),
                            eventData: item.eventData
                          }
                        })
                      }
                    >
                      Cek Detail
                    </button>

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
            })
          )}
        </div>

        <div className="validasi-eo-footer">
          <div className="eo-pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`eo-page-num ${currentPage === num ? 'active' : ''}`}
                onClick={() => setActivePage(num)}
              >
                {num}
              </button>
            ))}
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