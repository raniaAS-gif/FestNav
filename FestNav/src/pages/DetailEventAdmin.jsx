import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin'
import './DetailEventAdmin.css'

const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'

const API_BASE = isLocal
  ? 'http://127.0.0.1:8000'
  : 'https://festnav.onrender.com'

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
  if (mulai && selesai && mulai !== selesai) return `${fmt(mulai)} – ${fmt(selesai)}`
  return fmt(mulai || selesai)
}

function formatStatusLabel(statusEvent) {
  if (statusEvent === 'published') return 'Sudah Dipublish'
  if (statusEvent === 'selesai') return 'Selesai'
  return 'Draft'
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

function DetailEventAdmin() {
  const navigate = useNavigate()
  const location = useLocation()

  const [eventData, setEventData] = useState(null)
  const [denahList, setDenahList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [feedbackModal, setFeedbackModal] = useState(null)
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false)

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
          if (resEv.ok) {
            ev = await resEv.json()
          }
        }

        // Fallback: ambil event pertama dari backend jika dibuka tanpa state
        if (!ev) {
          const resList = await fetch(`${API_BASE}/api/events`, {
            headers: getAuthHeaders()
          })
          if (!resList.ok) throw new Error('Gagal memuat daftar event dari server')
          const allEvents = await resList.json()
          if (!allEvents.length) {
            throw new Error(
              'Belum ada data event di database. Silakan buat event terlebih dahulu.'
            )
          }
          ev =
            (navState.eventTitle &&
              allEvents.find((item) => item.nama_event === navState.eventTitle)) ||
            allEvents[0]
        }

        const resMaps = await fetch(`${API_BASE}/api/maps/event/${ev.id_event}`, {
          headers: getAuthHeaders()
        })
        const maps = resMaps.ok ? await resMaps.json() : []

        if (cancelled) return

        setEventData(ev)
        setDenahList(
          maps.map((m, idx) => ({
            id: m.id_map,
            id_map: m.id_map,
            namaDenah: m.nama_map,
            status: m.status_map,
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
        throw new Error(
          formatApiError(created.detail, 'Gagal membuat denah peta baru')
        )
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

  const handlePublishEvent = async () => {
    if (!eventData || isUpdatingStatus) return
    setIsUpdatingStatus(true)
    try {
      const res = await fetch(`${API_BASE}/api/events/${eventData.id_event}`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status_event: 'published' })
      })
      const updated = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(formatApiError(updated.detail, 'Gagal mempublish event'))
      }

      setEventData(updated)
      setFeedbackModal('Berhasil! Event sudah dipublish')
    } catch (err) {
      alert(err.message)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleUnpublishEvent = async () => {
    if (!eventData || isUpdatingStatus) return
    setIsUpdatingStatus(true)
    try {
      const res = await fetch(`${API_BASE}/api/events/${eventData.id_event}`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status_event: 'draft' })
      })
      const updated = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          formatApiError(updated.detail, 'Gagal melakukan unpublish event')
        )
      }

      setEventData(updated)
      setShowUnpublishConfirm(false)
      setFeedbackModal('Event berhasil di-unpublish dan dikembalikan ke Draft')
    } catch (err) {
      alert(err.message)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handlePublishDenah = async (idMap) => {
    try {
      const res = await fetch(`${API_BASE}/api/maps/${idMap}`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status_map: 'published' })
      })
      const updated = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(formatApiError(updated.detail, 'Gagal mempublish denah'))
      }

      setDenahList((prev) =>
        prev.map((item) =>
          item.id_map === idMap
            ? { ...item, status: 'published', rawMap: updated }
            : item
        )
      )
      setFeedbackModal('Berhasil! Denah sudah dipublish')
    } catch (err) {
      alert(err.message)
    }
  }

  const openMapEditor = (denah) => {
    const editorPayload = {
      role: 'admin',
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

  const isPublished = eventData?.status_event === 'published'

  return (
    <div className="detail-eo-container">
      <NavbarAdmin />

      <div className="detail-eo-hero">
        <h1 className="hero-title">Detail Event</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      <main className="detail-eo-content">
        {isLoading ? (
          <div
            className="detail-eo-card"
            style={{ textAlign: 'center', padding: '48px' }}
          >
            Memuat detail event dari database...
          </div>
        ) : errorMsg || !eventData ? (
          <div
            className="detail-eo-card"
            style={{ textAlign: 'center', padding: '48px' }}
          >
            <p style={{ color: '#b91c1c', marginBottom: 16 }}>
              {errorMsg || 'Event tidak ditemukan'}
            </p>
            <button
              type="button"
              className="btn-cyan-footer"
              onClick={() => navigate('/daftar-event')}
            >
              Kembali ke Daftar Event
            </button>
          </div>
        ) : (
          <>
            <div className="event-top-header">
              <h2 className="event-main-title">{eventData.nama_event}</h2>
              <button
                type="button"
                className="btn-cyan-edit"
                onClick={() =>
                  navigate('/edit-event', {
                    state: {
                      eventId: eventData.id_event,
                      eventData,
                      role: 'admin'
                    }
                  })
                }
              >
                Edit Detail
              </button>
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
                    {formatDateRange(
                      eventData.tanggal_mulai,
                      eventData.tanggal_selesai
                    )}
                  </p>
                  <p>
                    <strong>Lokasi Event:</strong> {eventData.lokasi || '-'}
                  </p>
                  <p>
                    <strong>Jenis Event:</strong> {eventData.jenis_event || '-'}
                  </p>
                  <p>
                    <strong>Event Organizer:</strong>{' '}
                    {eventData.nama_organizer || 'Admin FestNav'}
                  </p>
                  <p>
                    <strong>Sumber:</strong>{' '}
                    {eventData.sumber === 'scraping'
                      ? 'Hasil Scrapping'
                      : 'Kerjasama Event Organizer'}
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    {formatStatusLabel(eventData.status_event)}
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
                    <strong>+ Tambah Denah Peta</strong> di atas untuk membuat
                    peta baru.
                  </p>
                ) : (
                  denahList.map((denah) => (
                    <div key={denah.id_map} className="denah-item-wrapper">
                      <div className="denah-title-row">
                        <h3 className="denah-item-name">{denah.namaDenah}</h3>
                      </div>

                      <div className="denah-image-frame">
                        <img
                          src={denah.imageUrl}
                          alt={denah.namaDenah}
                          className="denah-map-img"
                        />
                      </div>

                      <div className="denah-btn-row">
                        <button
                          type="button"
                          className="btn-cyan-denah"
                          onClick={() => handlePublishDenah(denah.id_map)}
                        >
                          {denah.status === 'published'
                            ? 'Sudah Dipublish'
                            : 'Publish Denah'}
                        </button>
                        <button
                          type="button"
                          className="btn-cyan-denah"
                          onClick={() => openMapEditor(denah)}
                        >
                          Buka Map Editor
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="detail-eo-footer">
              <div className="footer-dual-buttons">
                {isPublished ? (
                  <button
                    type="button"
                    className="btn-cyan-footer btn-red-action"
                    style={{
                      backgroundColor: '#dc2626',
                      borderColor: '#dc2626',
                      color: '#ffffff'
                    }}
                    disabled={isUpdatingStatus}
                    onClick={() => setShowUnpublishConfirm(true)}
                  >
                    {isUpdatingStatus ? 'Memproses...' : 'Unpublish Event'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-cyan-footer"
                    disabled={isUpdatingStatus}
                    onClick={handlePublishEvent}
                  >
                    {isUpdatingStatus ? 'Memproses...' : 'Publish Event'}
                  </button>
                )}

                <button
                  type="button"
                  className="btn-cyan-footer"
                  onClick={() => navigate('/daftar-event')}
                >
                  Kembali
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal Konfirmasi Unpublish Event */}
      {showUnpublishConfirm && (
        <div
          onClick={() => !isUpdatingStatus && setShowUnpublishConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              textAlign: 'center',
              maxWidth: '400px',
              width: '90%',
              padding: '32px 24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <h3 style={{ fontSize: 20, marginBottom: 12, color: '#0f172a' }}>
              Unpublish Event?
            </h3>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 24 }}>
              Event <strong>{eventData?.nama_event}</strong> akan dikembalikan
              ke status <strong>Draft</strong> dan tidak tampil untuk pengunjung
              umum sampai dipublish kembali.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn-cyan-footer"
                style={{
                  flex: 1,
                  backgroundColor: '#e2e8f0',
                  color: '#1e293b'
                }}
                disabled={isUpdatingStatus}
                onClick={() => setShowUnpublishConfirm(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-cyan-footer"
                style={{
                  flex: 1,
                  backgroundColor: '#dc2626',
                  color: '#ffffff'
                }}
                disabled={isUpdatingStatus}
                onClick={handleUnpublishEvent}
              >
                {isUpdatingStatus ? 'Memproses...' : 'Ya, Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sukses Publish / Unpublish */}
      {feedbackModal && (
        <div
          onClick={() => setFeedbackModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              textAlign: 'center',
              maxWidth: '380px',
              width: '90%',
              padding: '32px 24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'center'
              }}
            >
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
            <h3 style={{ fontSize: 20, marginBottom: 24, color: '#0f172a' }}>
              {feedbackModal}
            </h3>
            <button
              type="button"
              className="btn-cyan-footer"
              style={{ width: '100%' }}
              onClick={() => setFeedbackModal(null)}
            >
              Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetailEventAdmin