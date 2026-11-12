import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarEO from '../components/NavbarEO'
import './DetailEventEO.css'

const VALIDATION_STORAGE_KEY = 'festnav_validation_requests'

const DEFAULT_POSTER_URL =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'

const DEFAULT_DENAH_IMAGES = [
  'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80'
]

const DEFAULT_EO_EVENT = {
  id: 1,
  namaEvent: 'Dies Natalis Udayana 2026',
  tanggalEvent: '21 Oktober 2025 - 31 Desember 2025',
  lokasiEvent: 'Rektorat Universitas Udayana',
  jenisEvent: 'Event Indoor & Outdoor',
  eventOrganizer: 'Universitas Udayana',
  sumber: 'Kerjasama Event Organizer',
  status: 'Draft',
  posterUrl: DEFAULT_POSTER_URL,
  deskripsiSingkat:
    'ini adalah itu, itu adalah ini, lalu dia adalah saya, saya adalh kami, kami adalah rambut, rambut adalah bok, bok adalah sayuran, sayuran adalah nama gang, dan lain sebagainya.',
  denahList: [
    {
      id: 1,
      namaDenah: 'Day 1: Lapangan Rektorat',
      status: 'draft',
      imageUrl: DEFAULT_DENAH_IMAGES[0]
    },
    {
      id: 2,
      namaDenah: 'Day 2: Gedung Rektorat',
      status: 'draft',
      imageUrl: DEFAULT_DENAH_IMAGES[1]
    }
  ]
}

const STATUS_BADGE_LABELS = [
  'Sudah Dipublish',
  'Draft',
  'Belum Dipublish',
  'Menunggu Publish'
]

function resolveJenisFromTags(tags = []) {
  const labels = tags.map((t) => t.label)
  const hasIndoor = labels.includes('Event Indoor')
  const hasOutdoor = labels.includes('Event Outdoor')
  if (hasIndoor && hasOutdoor) return 'Event Indoor & Outdoor'
  if (hasIndoor) return 'Event Indoor'
  if (hasOutdoor) return 'Event Outdoor'
  return 'Event Indoor & Outdoor'
}

function mapStatusToInternal(statusStr) {
  if (statusStr === 'Sudah Dipublish') return 'published'
  if (statusStr === 'Menunggu Publish') return 'pending'
  return 'draft'
}

function mapInternalToBadgeStatus(internalStatus) {
  if (internalStatus === 'published') return 'Sudah Dipublish'
  if (internalStatus === 'pending') return 'Menunggu Publish'
  return 'Draft'
}

function formatCurrentWitaTime() {
  const now = new Date()
  const datePart = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${datePart} ${hours}.${minutes} WITA`
}

function DetailEventEO() {
  const navigate = useNavigate()
  const location = useLocation()

  const [resolvedSource] = useState(() => {
    const navState = location.state || {}

    let storedEvent = null
    try {
      const savedList = JSON.parse(localStorage.getItem('festnav_eo_events') || '[]')
      if (Array.isArray(savedList)) {
        storedEvent =
          savedList.find(
            (item) =>
              (navState.eventId && item.id === navState.eventId) ||
              (navState.eventTitle && item.title === navState.eventTitle)
          ) || null
      }
    } catch {
      storedEvent = null
    }

    const source = storedEvent || navState.eventData
    if (!source && !navState.eventTitle) {
      return DEFAULT_EO_EVENT
    }

    const title =
      navState.eventTitle || source?.namaEvent || source?.title || DEFAULT_EO_EVENT.namaEvent
    const isDefault = title === DEFAULT_EO_EVENT.namaEvent

    const statusFromTags = source?.tags?.find((t) =>
      STATUS_BADGE_LABELS.includes(t.label)
    )?.label

    const resolvedStatus =
      storedEvent?.status || navState.eventStatus || source?.status || statusFromTags || 'Draft'

    const resolvedDenah =
      Array.isArray(source?.denahList) && source.denahList.length > 0
        ? source.denahList.map((d, idx) => ({
            id: d.id || idx + 1,
            namaDenah: d.namaDenah || d.title || `Denah ${idx + 1}`,
            status: d.status || 'draft',
            imageUrl:
              d.imageUrl ||
              d.mapUrl ||
              DEFAULT_DENAH_IMAGES[idx % DEFAULT_DENAH_IMAGES.length]
          }))
        : isDefault
        ? DEFAULT_EO_EVENT.denahList
        : [
            {
              id: 1,
              namaDenah: `Denah Utama - ${title}`,
              status: 'draft',
              imageUrl: DEFAULT_DENAH_IMAGES[0]
            }
          ]

    return {
      id: source?.id || navState.eventId || Date.now(),
      namaEvent: title,
      tanggalEvent:
        navState.eventDate ||
        source?.tanggalEvent ||
        source?.eventDate ||
        source?.dateRange ||
        DEFAULT_EO_EVENT.tanggalEvent,
      lokasiEvent:
        source?.lokasiEvent && source.lokasiEvent !== '-'
          ? source.lokasiEvent
          : isDefault
          ? DEFAULT_EO_EVENT.lokasiEvent
          : 'Bali, Indonesia',
      jenisEvent:
        source?.jenisEvent ||
        (source?.tags ? resolveJenisFromTags(source.tags) : DEFAULT_EO_EVENT.jenisEvent),
      eventOrganizer:
        source?.eventOrganizer && source.eventOrganizer !== '-'
          ? source.eventOrganizer
          : isDefault
          ? DEFAULT_EO_EVENT.eventOrganizer
          : 'EO Esai',
      sumber: source?.sumber || 'Kerjasama Event Organizer',
      status: resolvedStatus,
      posterUrl: source?.posterUrl || DEFAULT_POSTER_URL,
      deskripsiSingkat:
        source?.deskripsiSingkat && source.deskripsiSingkat !== '-'
          ? source.deskripsiSingkat
          : isDefault
          ? DEFAULT_EO_EVENT.deskripsiSingkat
          : `Informasi dan panduan denah resmi untuk kegiatan ${title}.`,
      denahList: resolvedDenah
    }
  })

  const [eventStatus, setEventStatus] = useState(() =>
    mapStatusToInternal(resolvedSource.status)
  )
  const [warningDenahId, setWarningDenahId] = useState(null)

  const eventInfo = {
    id: resolvedSource.id,
    namaEvent: resolvedSource.namaEvent,
    tanggalEvent: resolvedSource.tanggalEvent,
    lokasiEvent: resolvedSource.lokasiEvent,
    jenisEvent: resolvedSource.jenisEvent,
    eventOrganizer: resolvedSource.eventOrganizer,
    sumber: resolvedSource.sumber,
    posterUrl: resolvedSource.posterUrl,
    deskripsiSingkat: resolvedSource.deskripsiSingkat
  }

  const [denahList, setDenahList] = useState(resolvedSource.denahList)

  const buildTagsForBadge = (badgeStatus) => {
    const tags = [{ label: 'Kerjasama Event Organizer', color: '#00bcd4' }]
    if (eventInfo.jenisEvent === 'Event Indoor') {
      tags.push({ label: 'Event Indoor', color: '#f87171' })
    } else if (eventInfo.jenisEvent === 'Event Outdoor') {
      tags.push({ label: 'Event Outdoor', color: '#38bdf8' })
    } else {
      tags.push({ label: 'Event Outdoor', color: '#38bdf8' })
      tags.push({ label: 'Event Indoor', color: '#f87171' })
    }
    tags.push({ label: badgeStatus, color: '#312e81' })
    return tags
  }

  const buildFullEventPayload = (overrideBadgeStatus) => {
    const badgeStatus = overrideBadgeStatus || mapInternalToBadgeStatus(eventStatus)
    return {
      ...eventInfo,
      title: eventInfo.namaEvent,
      dateRange: eventInfo.tanggalEvent,
      eventDate: eventInfo.tanggalEvent,
      status: badgeStatus,
      tags: buildTagsForBadge(badgeStatus),
      denahList
    }
  }

  const syncEOStorage = (nextInternalStatus, nextDenahList = denahList) => {
    const nextBadgeStatus = mapInternalToBadgeStatus(nextInternalStatus)
    try {
      const savedList = JSON.parse(localStorage.getItem('festnav_eo_events') || '[]')
      if (Array.isArray(savedList) && savedList.length > 0) {
        const updatedList = savedList.map((item) => {
          if (item.id !== eventInfo.id && item.title !== eventInfo.namaEvent) {
            return item
          }

          const existingTags = Array.isArray(item.tags) ? item.tags : []
          const hasStatusTag = existingTags.some((t) =>
            STATUS_BADGE_LABELS.includes(t.label)
          )
          const updatedTags = hasStatusTag
            ? existingTags.map((t) =>
                STATUS_BADGE_LABELS.includes(t.label)
                  ? { ...t, label: nextBadgeStatus, color: '#312e81' }
                  : t
              )
            : [...existingTags, { label: nextBadgeStatus, color: '#312e81' }]

          return {
            ...item,
            status: nextBadgeStatus,
            tags: updatedTags,
            denahList: nextDenahList
          }
        })
        localStorage.setItem('festnav_eo_events', JSON.stringify(updatedList))
      }
    } catch (err) {
      console.error('Gagal menyinkronkan status event EO:', err)
    }
  }

  // Kirim entry request validasi ke Admin (festnav_validation_requests)
  const pushValidationToAdmin = (requestTitle, requestType = 'event', denahObj = null) => {
    try {
      const existingValidations = JSON.parse(
        localStorage.getItem(VALIDATION_STORAGE_KEY) || '[]'
      )

      const newRequest = {
        id: Date.now(),
        eventId: eventInfo.id,
        denahId: denahObj?.id || null,
        requestType,
        eoName: eventInfo.eventOrganizer || 'EO Esai',
        title: requestTitle,
        tags: buildTagsForBadge('Menunggu Publish'),
        requestTime: formatCurrentWitaTime(),
        eventDate: eventInfo.tanggalEvent,
        adminStatus: 'pending',
        status: 'Menunggu Verifikasi',
        isModifiedByEO: false,
        rejectionMessage: '',
        eventData: buildFullEventPayload('Menunggu Publish')
      }

      const filteredOld = Array.isArray(existingValidations)
        ? existingValidations.filter(
            (req) =>
              !(
                req.title === requestTitle &&
                (req.adminStatus === 'pending' || req.status === 'Menunggu Verifikasi')
              )
          )
        : []

      localStorage.setItem(
        VALIDATION_STORAGE_KEY,
        JSON.stringify([newRequest, ...filteredOld])
      )
    } catch (err) {
      console.error('Gagal mengirim request validasi ke admin:', err)
    }
  }

  // --- HANDLER PUBLISH EVENT UTAMA ---
  const handleRequestPublishEvent = () => {
    setEventStatus('pending')
    setWarningDenahId(null)
    syncEOStorage('pending', denahList)
    pushValidationToAdmin(`${eventInfo.namaEvent} (Event)`, 'event')
  }

  const handleCancelPublishEvent = () => {
    setEventStatus('draft')
    const resetDenah = denahList.map((item) =>
      item.status === 'pending' ? { ...item, status: 'draft' } : item
    )
    setDenahList(resetDenah)
    syncEOStorage('draft', resetDenah)

    // Hapus request yang masih pending untuk event ini
    try {
      const existingValidations = JSON.parse(
        localStorage.getItem(VALIDATION_STORAGE_KEY) || '[]'
      )
      if (Array.isArray(existingValidations)) {
        const cleaned = existingValidations.filter(
          (req) =>
            !(
              req.eventId === eventInfo.id &&
              (req.adminStatus === 'pending' || req.status === 'Menunggu Verifikasi')
            )
        )
        localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify(cleaned))
      }
    } catch {
      // Abaikan
    }
  }

  // --- HANDLER PUBLISH DENAH / PETA ---
  const handleRequestPublishDenah = (denahId) => {
    if (eventStatus === 'draft') {
      setWarningDenahId((prev) => (prev === denahId ? null : denahId))
      return
    }

    setWarningDenahId(null)
    const targetDenah = denahList.find((d) => d.id === denahId)
    const updatedDenah = denahList.map((item) =>
      item.id === denahId ? { ...item, status: 'pending' } : item
    )
    setDenahList(updatedDenah)
    syncEOStorage(eventStatus, updatedDenah)

    if (targetDenah) {
      pushValidationToAdmin(
        `${eventInfo.namaEvent} (Denah: ${targetDenah.namaDenah})`,
        'denah',
        targetDenah
      )
    }
  }

  const handleCancelPublishDenah = (denahId) => {
    const updatedDenah = denahList.map((item) =>
      item.id === denahId ? { ...item, status: 'draft' } : item
    )
    setDenahList(updatedDenah)
    syncEOStorage(eventStatus, updatedDenah)
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
        <div className="demo-simulator-bar">
          <span className="demo-label">Simulasi Status Event (Testing):</span>
          <div className="demo-btn-group">
            <button
              type="button"
              className={`demo-pill ${eventStatus === 'draft' ? 'active' : ''}`}
              onClick={() => {
                setEventStatus('draft')
                setWarningDenahId(null)
                syncEOStorage('draft', denahList)
              }}
            >
              1. Draft / Ditolak
            </button>
            <button
              type="button"
              className={`demo-pill ${eventStatus === 'pending' ? 'active' : ''}`}
              onClick={() => {
                setEventStatus('pending')
                setWarningDenahId(null)
                syncEOStorage('pending', denahList)
              }}
            >
              2. Menunggu Verifikasi
            </button>
            <button
              type="button"
              className={`demo-pill ${eventStatus === 'published' ? 'active' : ''}`}
              onClick={() => {
                setEventStatus('published')
                setWarningDenahId(null)
                syncEOStorage('published', denahList)
              }}
            >
              3. Sudah Dipublish Admin
            </button>
          </div>
        </div>

        <div className="event-top-header">
          <h2 className="event-main-title">{eventInfo.namaEvent}</h2>

          {eventStatus === 'pending' ? (
            <button
              type="button"
              className="btn-red-action"
              onClick={handleCancelPublishEvent}
            >
              Batalkan Request Publish
            </button>
          ) : (
            <button
              type="button"
              className="btn-cyan-edit"
              onClick={() =>
                navigate('/edit-event', {
                  state: { eventData: buildFullEventPayload(), role: 'eo' }
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
                src={eventInfo.posterUrl}
                alt={eventInfo.namaEvent}
                className="event-poster-img"
              />
            </div>

            <div className="metadata-list">
              <p>
                <strong>Nama Event:</strong> {eventInfo.namaEvent}
              </p>
              <p>
                <strong>Tanggal Event:</strong> {eventInfo.tanggalEvent}
              </p>
              <p>
                <strong>Lokasi Event:</strong> {eventInfo.lokasiEvent}
              </p>
              <p>
                <strong>Jenis Event:</strong> {eventInfo.jenisEvent}
              </p>
              <p>
                <strong>Event Organizer:</strong> {eventInfo.eventOrganizer}
              </p>
              <p>
                <strong>Sumber:</strong> {eventInfo.sumber}
              </p>
              <p>
                <strong>Status:</strong> {getStatusLabel()}
              </p>

              <div className="deskripsi-block">
                <strong>Deskripsi Singkat:</strong>
                <p className="deskripsi-text">{eventInfo.deskripsiSingkat}</p>
              </div>
            </div>
          </div>

          <hr className="detail-divider" />

          <div className="denah-acara-section">
            <h2 className="denah-section-heading">Denah Acara</h2>

            {denahList.map((denah) => {
              const isDenahPending = denah.status === 'pending'
              const showWarning = warningDenahId === denah.id

              return (
                <div key={denah.id} className="denah-item-wrapper">
                  <div className="denah-title-row">
                    <h3 className="denah-item-name">{denah.namaDenah}</h3>

                    {isDenahPending && (
                      <button
                        type="button"
                        className="btn-red-action"
                        onClick={() => handleCancelPublishDenah(denah.id)}
                      >
                        Batalkan Request Publish
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
                          onClick={() => handleRequestPublishDenah(denah.id)}
                        >
                          Kirim Request Publish
                        </button>
                        <button
                          type="button"
                          className="btn-cyan-denah"
                          onClick={() =>
                            navigate('/digitasi-eo', {
                              state: { eventData: buildFullEventPayload(), denah }
                            })
                          }
                        >
                          Buka Map Editor
                        </button>
                      </div>

                      {showWarning && (
                        <div className="warning-dropdown-box">
                          <div className="warning-dropdown-content">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#b91c1c"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                              <line x1="12" y1="9" x2="12" y2="13"></line>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            <span>
                              <strong>Peta belum dapat dipublish!</strong> Ajukan request
                              publish pada event utama terlebih dahulu sebelum mengajukan
                              publish peta.
                            </span>
                          </div>
                          <button
                            type="button"
                            className="warning-close-btn"
                            onClick={() => setWarningDenahId(null)}
                            title="Tutup peringatan"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="detail-eo-footer">
          {eventStatus === 'pending' ? (
            <div className="waiting-verification-bar full-footer-bar">
              Mohon ditunggu sampai admin memverifikasi permintaan
            </div>
          ) : (
            <div className="footer-dual-buttons">
              <button
                type="button"
                className="btn-cyan-footer"
                onClick={handleRequestPublishEvent}
              >
                Kirim Request Publish Event
              </button>
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
      </main>
    </div>
  )
}

export default DetailEventEO