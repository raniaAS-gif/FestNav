import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarEO from '../components/NavbarEO'
import './DetailEventEO.css'

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000'

const DEFAULT_POSTER_URL =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'

const DEFAULT_DENAH_IMAGES = [
  'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80'
]

const getAuthHeaders = (withJson = false) => {
  const token =
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    ''
  const h = {}
  if (withJson) h['Content-Type'] = 'application/json'
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function formatDateRange(mulai, selesai) {
  if (!mulai && !selesai) return '-'
  const fmt = (d) =>
    new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  if (mulai && selesai && mulai !== selesai) return `${fmt(mulai)} - ${fmt(selesai)}`
  return fmt(mulai || selesai)
}

function formatApiError(detail, fallback = 'Terjadi kesalahan pada server.') {
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc)
          ? item.loc[item.loc.length - 1]
          : 'field'
        return `${field}: ${item.msg}`
      })
      .join('\n')
  }
  return JSON.stringify(detail)
}

function DetailEventEO() {
  const navigate = useNavigate()
  const location = useLocation()

  const [eventData, setEventData] = useState(null)
  const [denahList, setDenahList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [activeRequestId, setActiveRequestId] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [eventStatus, setEventStatus] = useState('draft')
  const [warningDenahId, setWarningDenahId] = useState(null)

  useEffect(() => {
    let cancelled = false
    const navState = location.state || {}
    const requestedId =
      navState.eventId ||
      navState.id_event ||
      navState.id ||
      navState.eventData?.id_event ||
      navState.eventData?.id

    const loadDetail = async () => {
      setIsLoading(true)
      setErrorMsg('')
      try {
        let ev = null

        if (requestedId) {
          const resEv = await fetch(`${API_BASE}/api/events/${requestedId}`, {
            headers: getAuthHeaders()
          })
          if (resEv.ok) ev = await resEv.json()
        }

        if (!ev) {
          const resList = await fetch(`${API_BASE}/api/events?mine_only=true`, {
            headers: getAuthHeaders()
          })
          if (!resList.ok) throw new Error('Gagal memuat daftar event EO')
          const myEvents = await resList.json()
          if (!myEvents.length) {
            throw new Error('Belum ada data event milik Anda di database.')
          }
          ev =
            (navState.eventTitle &&
              myEvents.find((item) => item.nama_event === navState.eventTitle)) ||
            myEvents[0]
        }

        const [resMaps, resReqs] = await Promise.all([
          fetch(`${API_BASE}/api/maps/event/${ev.id_event}`, {
            headers: getAuthHeaders()
          }),
          fetch(`${API_BASE}/api/request-publish?status_request=menunggu`, {
            headers: getAuthHeaders()
          })
        ])

        const maps = resMaps.ok ? await resMaps.json() : []
        const pendingReqs = resReqs.ok ? await resReqs.json() : []
        const myPendingReq = Array.isArray(pendingReqs)
          ? pendingReqs.find((r) => r.id_event === ev.id_event)
          : null

        if (cancelled) return

        const pendingMapIds = new Set(
          (myPendingReq?.items || [])
            .filter((it) => it.jenis_item === 'map' && it.id_map)
            .map((it) => it.id_map)
        )

        setEventData(ev)
        setActiveRequestId(myPendingReq?.id_request || null)
        const isPending = Boolean(myPendingReq) || ev.is_locked
        setEventStatus(isPending ? 'pending' : ev.status_event || 'draft')
        setDenahList(
          maps.map((m, idx) => ({
            id: m.id_map,
            id_map: m.id_map,
            namaDenah: m.nama_map,
            status: pendingMapIds.has(m.id_map) ? 'pending' : m.status_map,
            imageUrl:
              m.gambar_layout ||
              DEFAULT_DENAH_IMAGES[idx % DEFAULT_DENAH_IMAGES.length],
            rawMap: m
          }))
        )
      } catch (err) {
        if (!cancelled) setErrorMsg(err.message || 'Gagal memuat detail event')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadDetail()
    return () => {
      cancelled = true
    }
  }, [location.state])

  const handleCreateFirstMap = async () => {
    if (!eventData) return
    try {
      const res = await fetch(`${API_BASE}/api/maps`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          id_event: eventData.id_event,
          nama_map: `Denah Utama - ${eventData.nama_event}`,
          tipe_map: eventData.tipe_lokasi === 'indoor' ? 'indoor' : 'outdoor',
          is_utama: denahList.length === 0,
          garis_lintang_pusat: eventData.garis_lintang ?? -8.6724,
          garis_bujur_pusat: eventData.garis_bujur ?? 115.2362
        })
      })
      const created = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(formatApiError(created.detail, 'Gagal membuat denah peta baru'))
      }

      setDenahList((prev) => [
        ...prev,
        {
          id: created.id_map,
          id_map: created.id_map,
          namaDenah: created.nama_map,
          status: created.status_map,
          imageUrl: created.gambar_layout || DEFAULT_DENAH_IMAGES[0],
          rawMap: created
        }
      ])
    } catch (err) {
      alert(err.message)
    }
  }

  // Kirim Request Publish Event (beserta seluruh denahnya) ke database
  const handleSendRequestPublishEvent = async () => {
    if (!eventData || isSubmittingRequest) return
    setIsSubmittingRequest(true)
    try {
      const res = await fetch(`${API_BASE}/api/request-publish`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          id_event: Number(eventData.id_event),
          catatan_pengirim: null,
          map_ids: null
        })
      })
      const created = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          formatApiError(created.detail, 'Gagal mengirim request publish event.')
        )
      }

      setActiveRequestId(created.id_request)
      setEventStatus('pending')
      setWarningDenahId(null)
      setDenahList((prev) =>
        prev.map((item) =>
          item.status === 'draft' ? { ...item, status: 'pending' } : item
        )
      )
      alert(`Permintaan publish untuk "${eventData.nama_event}" berhasil dikirim ke Admin!`)
    } catch (err) {
      alert(err.message || 'Gagal mengirim request publish event.')
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  // Batalkan Request Publish yang sedang menunggu di database
  const handleCancelRequestPublish = async () => {
    if (!eventData || isSubmittingRequest) return
    setIsSubmittingRequest(true)
    try {
      let reqId = activeRequestId
      if (!reqId) {
        const resList = await fetch(
          `${API_BASE}/api/request-publish?status_request=menunggu`,
          { headers: getAuthHeaders() }
        )
        const list = resList.ok ? await resList.json() : []
        const found = Array.isArray(list)
          ? list.find((r) => r.id_event === eventData.id_event)
          : null
        reqId = found?.id_request || null
      }

      if (!reqId) {
        throw new Error('Data pengajuan publish yang aktif tidak ditemukan.')
      }

      const res = await fetch(`${API_BASE}/api/request-publish/${reqId}/batal`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      })
      const cancelledData = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          formatApiError(cancelledData.detail, 'Gagal membatalkan request publish.')
        )
      }

      setActiveRequestId(null)
      setEventStatus(eventData.status_event === 'published' ? 'published' : 'draft')
      setDenahList((prev) =>
        prev.map((item) =>
          item.status === 'pending'
            ? { ...item, status: item.rawMap?.status_map || 'draft' }
            : item
        )
      )
      alert('Pengajuan request publish berhasil dibatalkan.')
    } catch (err) {
      alert(err.message || 'Gagal membatalkan request publish.')
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  const handleRequestPublishDenah = async (idMap) => {
    if (eventStatus === 'draft') {
      setWarningDenahId((prev) => (prev === idMap ? null : idMap))
      return
    }
    if (eventStatus === 'pending') {
      alert('Event ini sudah dalam proses verifikasi Admin bersama denahnya.')
      return
    }
    if (isSubmittingRequest) return

    setWarningDenahId(null)
    setIsSubmittingRequest(true)
    try {
      const res = await fetch(`${API_BASE}/api/request-publish`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          id_event: Number(eventData.id_event),
          catatan_pengirim: null,
          map_ids: [Number(idMap)]
        })
      })
      const created = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          formatApiError(created.detail, 'Gagal mengirim request publish denah.')
        )
      }

      setActiveRequestId(created.id_request)
      setDenahList((prev) =>
        prev.map((item) =>
          item.id_map === idMap ? { ...item, status: 'pending' } : item
        )
      )
      alert('Permintaan publish denah berhasil dikirim ke Admin!')
    } catch (err) {
      alert(err.message || 'Gagal mengirim request publish denah.')
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  const openMapEditor = (denah) => {
    const editorPayload = {
      role: 'eo',
      eventId: eventData.id_event,
      id_event: eventData.id_event,
      id_map: denah.id_map,
      eventTitle: eventData.nama_event,
      selectedDenah: { ...denah, title: denah.namaDenah },
      eventData,
      denah
    }
    try {
      sessionStorage.setItem('festnav_editor_ctx', JSON.stringify(editorPayload))
    } catch {
      // Abaikan
    }
    navigate('/map-editor', { state: editorPayload })
  }

  const getStatusLabel = () => {
    if (eventStatus === 'published') return 'Sudah Dipublish'
    if (eventStatus === 'pending') return 'Menunggu Publish'
    return 'Belum dipublish'
  }

  return (
    <div className="detail-eo-container">
      <NavbarEO />

      <div className="detail-eo-hero">
        <h1 className="hero-title">Detail Event</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      <main className="detail-eo-content">
        {isLoading ? (
          <div className="detail-eo-card" style={{ textAlign: 'center', padding: '48px' }}>
            Memuat detail event dari database...
          </div>
        ) : errorMsg || !eventData ? (
          <div className="detail-eo-card" style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#b91c1c', marginBottom: 16 }}>
              {errorMsg || 'Event tidak ditemukan'}
            </p>
            <button
              type="button"
              className="btn-cyan-footer"
              onClick={() => navigate('/daftar-event-eo')}
            >
              Kembali ke Daftar Event
            </button>
          </div>
        ) : (
          <>
            <div className="demo-simulator-bar">
              <span className="demo-label">Status Event:</span>
              <span className="demo-pill active" style={{ cursor: 'default' }}>
                {getStatusLabel()}
              </span>
            </div>

            <div className="event-top-header">
              <h2 className="event-main-title">{eventData.nama_event}</h2>
              {eventStatus === 'pending' ? (
                <button
                  type="button"
                  className="btn-red-action"
                  disabled={isSubmittingRequest}
                  onClick={handleCancelRequestPublish}
                >
                  {isSubmittingRequest ? 'Memproses...' : 'Batalkan Request Publish'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-cyan-edit"
                  onClick={() =>
                    navigate('/edit-event', {
                      state: { eventId: eventData.id_event, eventData, role: 'eo' }
                    })
                  }
                >
                  Edit Detail
                </button>
              )}
            </div>

            <div className="detail-eo-card">
              <div className="detail-top-grid">
                <div className="poster-box">
                  <img
                    src={eventData.poster_url || DEFAULT_POSTER_URL}
                    alt={eventData.nama_event}
                    className="event-poster-img"
                  />
                </div>

                <div className="metadata-list">
                  <p>
                    <strong>Nama Event:</strong> {eventData.nama_event}
                  </p>
                  <p>
                    <strong>Tanggal Event:</strong>{' '}
                    {formatDateRange(eventData.tanggal_mulai, eventData.tanggal_selesai)}
                  </p>
                  <p>
                    <strong>Lokasi Event:</strong> {eventData.lokasi || '-'}
                  </p>
                  <p>
                    <strong>Jenis Event:</strong> {eventData.jenis_event || '-'}
                  </p>
                  <p>
                    <strong>Event Organizer:</strong> {eventData.nama_organizer || '-'}
                  </p>
                  <p>
                    <strong>Sumber:</strong>{' '}
                    {eventData.sumber === 'scraping'
                      ? 'Hasil Scrapping'
                      : 'Kerjasama Event Organizer'}
                  </p>
                  <p>
                    <strong>Status:</strong> {getStatusLabel()}
                  </p>

                  <div className="deskripsi-block">
                    <strong>Deskripsi Singkat:</strong>
                    <p className="deskripsi-text">{eventData.deskripsi || '-'}</p>
                  </div>
                </div>
              </div>

              <hr className="detail-divider" />

              <div className="denah-acara-section">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16
                  }}
                >
                  <h2 className="denah-section-heading" style={{ margin: 0 }}>
                    Denah Acara
                  </h2>
                  <button
                    type="button"
                    className="btn-cyan-denah"
                    onClick={handleCreateFirstMap}
                  >
                    + Tambah Denah Peta
                  </button>
                </div>

                {denahList.length === 0 ? (
                  <p style={{ color: '#64748b' }}>
                    Event ini belum memiliki denah peta. Klik{' '}
                    <strong>+ Tambah Denah Peta</strong> di atas untuk membuat peta
                    baru.
                  </p>
                ) : (
                  denahList.map((denah) => {
                    const isDenahPending = denah.status === 'pending'
                    const showWarning = warningDenahId === denah.id_map

                    return (
                      <div key={denah.id_map} className="denah-item-wrapper">
                        <div className="denah-title-row">
                          <h3 className="denah-item-name">{denah.namaDenah}</h3>
                          {isDenahPending && (
                            <button
                              type="button"
                              className="btn-red-action"
                              disabled={isSubmittingRequest}
                              onClick={handleCancelRequestPublish}
                            >
                              {isSubmittingRequest
                                ? 'Memproses...'
                                : 'Batalkan Request Publish'}
                            </button>
                          )}
                        </div>

                        <div className="denah-image-frame">
                          <img
                            src={denah.imageUrl}
                            alt={denah.namaDenah}
                            className="denah-map-img"
                          />
                        </div>

                        {isDenahPending ? (
                          <div className="waiting-verification-bar">
                            Mohon ditunggu sampai admin memverifikasi permintaan
                          </div>
                        ) : (
                          <>
                            <div className="denah-btn-row">
                              <button
                                type="button"
                                className="btn-cyan-denah"
                                disabled={isSubmittingRequest}
                                onClick={() => handleRequestPublishDenah(denah.id_map)}
                              >
                                Kirim Request Publish
                              </button>
                              <button
                                type="button"
                                className="btn-cyan-denah"
                                onClick={() => openMapEditor(denah)}
                              >
                                Buka Map Editor
                              </button>
                            </div>

                            {showWarning && (
                              <div className="warning-dropdown-box">
                                <div className="warning-dropdown-content">
                                  <span>
                                    <strong>Peta belum dapat dipublish!</strong> Ajukan
                                    request publish pada event utama terlebih dahulu
                                    sebelum mengajukan publish peta.
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="warning-close-btn"
                                  onClick={() => setWarningDenahId(null)}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="detail-eo-footer">
              {eventStatus === 'pending' ? (
                <div className="waiting-verification-bar full-footer-bar">
                  Mohon ditunggu sampai admin memverifikasi permintaan
                </div>
              ) : (
                <div className="footer-dual-buttons">
                  {eventStatus !== 'published' && (
                    <button
                      type="button"
                      className="btn-cyan-footer"
                      disabled={isSubmittingRequest}
                      onClick={handleSendRequestPublishEvent}
                    >
                      {isSubmittingRequest
                        ? 'Mengirim...'
                        : 'Kirim Request Publish Event'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-cyan-footer"
                    onClick={() => navigate('/daftar-event-eo')}
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default DetailEventEO