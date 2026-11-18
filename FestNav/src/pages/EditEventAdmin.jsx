import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin'
import NavbarEO from '../components/NavbarEO'
import './EditEventAdmin.css'

const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'

const API_BASE = isLocal
  ? 'http://127.0.0.1:8000'
  : 'https://festnav.onrender.com'

const JENIS_EVENT_OPTIONS = [
  'Event Indoor',
  'Event Outdoor',
  'Event Indoor & Outdoor'
]

const SUMBER_EVENT_OPTIONS = [
  'Kerjasama Event Organizer',
  'Hasil Scrapping'
]

const BULAN_ID = {
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  mei: '05',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12'
}

const getAuthHeaders = (withJson = false) => {
  const token =
    localStorage.getItem('access_token') || localStorage.getItem('token') || ''
  const h = {}
  if (withJson) h['Content-Type'] = 'application/json'
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'))
    reader.readAsDataURL(file)
  })

function formatDateRange(mulai, selesai) {
  if (!mulai && !selesai) return ''
  const fmt = (d) =>
    new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  if (mulai && selesai && mulai !== selesai) return `${fmt(mulai)} - ${fmt(selesai)}`
  return fmt(mulai || selesai)
}

function parseSingleDate(token) {
  if (!token) return null
  const clean = token.trim()
  // Format YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }
  // Format DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`
  }
  // Format "21 Oktober 2025"
  const idMatch = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (idMatch) {
    const bulanNum = BULAN_ID[idMatch[2].toLowerCase()]
    if (bulanNum) {
      return `${idMatch[3]}-${bulanNum}-${idMatch[1].padStart(2, '0')}`
    }
  }
  return null
}

function parseDateRangeInput(text, fallbackMulai, fallbackSelesai) {
  const raw = (text || '').trim()
  if (!raw) {
    return {
      tanggal_mulai: fallbackMulai || new Date().toISOString().slice(0, 10),
      tanggal_selesai:
        fallbackSelesai || fallbackMulai || new Date().toISOString().slice(0, 10)
    }
  }

  // Format ISO "2026-11-20 - 2026-11-22"
  const isoRange = raw.match(
    /(\d{4}-\d{2}-\d{2})\s*(?:–|—|-|\bsampai\b|\bs\/d\b)\s*(\d{4}-\d{2}-\d{2})/i
  )
  if (isoRange) {
    const start = isoRange[1]
    const end = isoRange[2] < start ? start : isoRange[2]
    return { tanggal_mulai: start, tanggal_selesai: end }
  }

  const parts = raw
    .split(/\s*(?:–|—|-|\bsampai\b|\bs\/d\b)\s*/i)
    .filter(Boolean)

  const start =
    parseSingleDate(parts[0]) || fallbackMulai || new Date().toISOString().slice(0, 10)
  const end =
    (parts[1] ? parseSingleDate(parts[1]) : parseSingleDate(parts[0])) ||
    fallbackSelesai ||
    start

  return {
    tanggal_mulai: start,
    tanggal_selesai: end < start ? start : end
  }
}

// Disesuaikan dengan Literal["outdoor", "indoor", "campuran"] di schemas_event.py
function mapJenisToTipeLokasi(jenisEvent) {
  if (jenisEvent === 'Event Indoor') return 'indoor'
  if (jenisEvent === 'Event Outdoor') return 'outdoor'
  return 'campuran'
}

function formatApiError(detail, fallback = 'Gagal menyimpan perubahan event.') {
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

function EditEventAdmin({ role = 'admin' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const activeRole = location.state?.role || role
  const isEO = activeRole === 'eo'
  const navState = location.state || {}
  const incomingEvent = navState.eventData || navState.event || null
  const targetEventId =
    navState.eventId ||
    navState.id_event ||
    navState.id ||
    incomingEvent?.id_event ||
    incomingEvent?.id

  const [eventObj, setEventObj] = useState(incomingEvent)
  const [isLoading, setIsLoading] = useState(Boolean(targetEventId))
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    namaEvent: incomingEvent?.nama_event || incomingEvent?.namaEvent || '',
    tanggalEvent: incomingEvent?.tanggal_mulai
      ? formatDateRange(incomingEvent.tanggal_mulai, incomingEvent.tanggal_selesai)
      : incomingEvent?.tanggalEvent || '',
    lokasiEvent: incomingEvent?.lokasi || incomingEvent?.lokasiEvent || '',
    jenisEvent: JENIS_EVENT_OPTIONS.includes(incomingEvent?.jenis_event)
      ? incomingEvent.jenis_event
      : 'Belum dipilih',
    eventOrganizer:
      incomingEvent?.nama_organizer || incomingEvent?.eventOrganizer || '',
    sumber: isEO
      ? 'Kerjasama Event Organizer'
      : incomingEvent?.sumber === 'scraping'
      ? 'Hasil Scrapping'
      : 'Kerjasama Event Organizer',
    deskripsiSingkat:
      incomingEvent?.deskripsi || incomingEvent?.deskripsiSingkat || ''
  })

  const [openDropdown, setOpenDropdown] = useState(null)
  const jenisDropdownRef = useRef(null)
  const sumberDropdownRef = useRef(null)

  const [posterFile, setPosterFile] = useState(null)
  const [posterPreview, setPosterPreview] = useState(
    incomingEvent?.poster_url || incomingEvent?.posterUrl || ''
  )

  const [denahList, setDenahList] = useState([])
  const [initialMapIds, setInitialMapIds] = useState([])

  // Muat data event & denah asli dari PostgreSQL
  useEffect(() => {
    let cancelled = false
    if (!targetEventId) return

    const fetchDetail = async () => {
      setIsLoading(true)
      try {
        const headers = getAuthHeaders()
        const [resEv, resMaps] = await Promise.all([
          fetch(`${API_BASE}/api/events/${targetEventId}`, { headers }),
          fetch(`${API_BASE}/api/maps/event/${targetEventId}`, { headers })
        ])

        const ev = resEv.ok ? await resEv.json() : incomingEvent
        const maps = resMaps.ok ? await resMaps.json() : []

        if (cancelled || !ev) return

        setEventObj(ev)
        setFormData({
          namaEvent: ev.nama_event || '',
          tanggalEvent: formatDateRange(ev.tanggal_mulai, ev.tanggal_selesai),
          lokasiEvent: ev.lokasi || '',
          jenisEvent: JENIS_EVENT_OPTIONS.includes(ev.jenis_event)
            ? ev.jenis_event
            : ev.tipe_lokasi === 'indoor'
            ? 'Event Indoor'
            : ev.tipe_lokasi === 'outdoor'
            ? 'Event Outdoor'
            : 'Event Indoor & Outdoor',
          eventOrganizer: ev.nama_organizer || '',
          sumber: isEO
            ? 'Kerjasama Event Organizer'
            : ev.sumber === 'scraping'
            ? 'Hasil Scrapping'
            : 'Kerjasama Event Organizer',
          deskripsiSingkat: ev.deskripsi || ''
        })
        setPosterPreview(ev.poster_url || '')
        setInitialMapIds(maps.map((m) => m.id_map))
        setDenahList(
          maps.map((m) => ({
            id: m.id_map,
            isExisting: true,
            namaDenah: m.nama_map || '',
            imageFile: null,
            imagePreview: m.gambar_layout || ''
          }))
        )
      } catch (err) {
        console.error('Gagal memuat data edit event:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [targetEventId, incomingEvent, isEO])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        jenisDropdownRef.current &&
        !jenisDropdownRef.current.contains(event.target) &&
        sumberDropdownRef.current &&
        !sumberDropdownRef.current.contains(event.target)
      ) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectOption = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
    setOpenDropdown(null)
  }

  const handlePosterUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPosterFile(file)
      setPosterPreview(URL.createObjectURL(file))
    }
  }

  const handleDenahNameChange = (id, value) => {
    setDenahList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, namaDenah: value } : item))
    )
  }

  const handleDenahImageUpload = (id, file) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setDenahList((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, imageFile: file, imagePreview: previewUrl }
            : item
        )
      )
    }
  }

  const handleAddDenahBlock = () => {
    setDenahList((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        isExisting: false,
        namaDenah: `Day ${prev.length + 1}: Nama Denah Baru`,
        imageFile: null,
        imagePreview: ''
      }
    ])
  }

  const handleRemoveDenahBlock = (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus denah ini?')) {
      setDenahList((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!targetEventId || isSaving) {
      if (!targetEventId) alert('ID event tidak ditemukan.')
      return
    }

    const namaEventClean = formData.namaEvent.trim()
    if (namaEventClean.length < 3) {
      alert('Nama Event wajib diisi minimal 3 karakter.')
      return
    }

    setIsSaving(true)
    try {
      const resolvedJenis =
        formData.jenisEvent === 'Belum dipilih'
          ? 'Event Indoor & Outdoor'
          : formData.jenisEvent

      const tipeLokasi = mapJenisToTipeLokasi(resolvedJenis)

      const { tanggal_mulai, tanggal_selesai } = parseDateRangeInput(
        formData.tanggalEvent,
        eventObj?.tanggal_mulai,
        eventObj?.tanggal_selesai
      )

      const finalPosterUrl = posterFile
        ? await fileToDataUrl(posterFile)
        : posterPreview || null

      // 1. Update data utama Event sesuai schema EventUpdate
      const resEvent = await fetch(`${API_BASE}/api/events/${targetEventId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          nama_event: namaEventClean,
          deskripsi: formData.deskripsiSingkat.trim() || null,
          tanggal_mulai,
          tanggal_selesai,
          lokasi: formData.lokasiEvent.trim() || null,
          jenis_event: resolvedJenis,
          tipe_lokasi: tipeLokasi,
          poster_url: finalPosterUrl
        })
      })

      const updatedEvent = await resEvent.json().catch(() => ({}))
      if (!resEvent.ok) {
        throw new Error(formatApiError(updatedEvent.detail))
      }

      // 2. Sinkronisasi daftar denah (hapus yang dibuang, update existing, buat baru)
      const remainingExistingIds = denahList
        .filter((d) => d.isExisting)
        .map((d) => d.id)
      const deletedMapIds = initialMapIds.filter(
        (idMap) => !remainingExistingIds.includes(idMap)
      )

      await Promise.all(
        deletedMapIds.map((idMap) =>
          fetch(`${API_BASE}/api/maps/${idMap}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          })
        )
      )

      for (let i = 0; i < denahList.length; i++) {
        const d = denahList[i]
        const namaMap = d.namaDenah.trim() || `Denah ${i + 1}`
        const gambarLayout = d.imageFile
          ? await fileToDataUrl(d.imageFile)
          : d.imagePreview || null

        if (d.isExisting) {
          const resPatchMap = await fetch(`${API_BASE}/api/maps/${d.id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(true),
            body: JSON.stringify({
              nama_map: namaMap,
              gambar_layout: gambarLayout,
              tampilkan_denah: Boolean(gambarLayout)
            })
          })
          if (!resPatchMap.ok) {
            const errMap = await resPatchMap.json().catch(() => ({}))
            console.error('Gagal memperbarui denah:', formatApiError(errMap.detail))
          }
        } else {
          const resPostMap = await fetch(`${API_BASE}/api/maps`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({
              id_event: Number(targetEventId),
              nama_map: namaMap,
              tipe_map: tipeLokasi === 'indoor' ? 'indoor' : 'outdoor',
              is_utama: initialMapIds.length === 0 && i === 0,
              gambar_layout: gambarLayout,
              tampilkan_denah: Boolean(gambarLayout),
              garis_lintang_pusat: updatedEvent.garis_lintang ?? -8.6724,
              garis_bujur_pusat: updatedEvent.garis_bujur ?? 115.2362
            })
          })
          if (!resPostMap.ok) {
            const errMap = await resPostMap.json().catch(() => ({}))
            console.error('Gagal menambah denah:', formatApiError(errMap.detail))
          }
        }
      }

      alert('Perubahan event berhasil disimpan!')

      const numericId = Number(targetEventId)
      navigate(isEO ? '/detail-event-eo' : '/detail-event', {
        state: {
          role: activeRole,
          event: updatedEvent,
          eventId: numericId,
          id_event: numericId,
          id: numericId
        }
      })
    } catch (err) {
      alert(err.message || 'Gagal menyimpan perubahan event.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="edit-container">
      {isEO ? <NavbarEO /> : <NavbarAdmin />}

      <div className="edit-hero">
        <h1 className="hero-title">Edit Event</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      <main className="edit-content">
        {isLoading ? (
          <div className="edit-card" style={{ textAlign: 'center', padding: '48px' }}>
            Memuat data event dari database...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="edit-card">
              <div className="top-form-grid">
                <div className="poster-upload-box">
                  <label htmlFor="poster-edit-input" className="poster-upload-label">
                    {posterPreview ? (
                      <img
                        src={posterPreview}
                        alt="Poster Event"
                        className="poster-preview-img"
                      />
                    ) : (
                      <div className="upload-placeholder">
                        <svg
                          width="56"
                          height="56"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#888"
                          strokeWidth="1.5"
                        >
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                          <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        <span>Klik untuk Ganti Gambar Poster</span>
                      </div>
                    )}
                  </label>
                  <input
                    id="poster-edit-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePosterUpload}
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="form-fields">
                  <div className="form-group">
                    <label>Nama Event</label>
                    <input
                      type="text"
                      name="namaEvent"
                      placeholder="Nama event..."
                      value={formData.namaEvent}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Tanggal Event</label>
                    <input
                      type="text"
                      name="tanggalEvent"
                      placeholder="Contoh: 20 November 2026 - 22 November 2026"
                      value={formData.tanggalEvent}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Lokasi Event</label>
                    <input
                      type="text"
                      name="lokasiEvent"
                      placeholder="Lokasi event..."
                      value={formData.lokasiEvent}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" ref={jenisDropdownRef}>
                    <label>Jenis Event</label>
                    <div className="custom-dropdown-wrapper">
                      <button
                        type="button"
                        className="form-input custom-dropdown-trigger"
                        onClick={() =>
                          setOpenDropdown(openDropdown === 'jenis' ? null : 'jenis')
                        }
                      >
                        <span
                          className={
                            formData.jenisEvent === 'Belum dipilih'
                              ? 'dropdown-placeholder'
                              : 'dropdown-selected-text'
                          }
                        >
                          {formData.jenisEvent}
                        </span>
                        <svg
                          className={`dropdown-chevron ${
                            openDropdown === 'jenis' ? 'open' : ''
                          }`}
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>

                      {openDropdown === 'jenis' && (
                        <div className="custom-dropdown-menu">
                          {JENIS_EVENT_OPTIONS.map((option) => (
                            <div
                              key={option}
                              className={`custom-dropdown-item ${
                                formData.jenisEvent === option ? 'selected' : ''
                              }`}
                              onClick={() => handleSelectOption('jenisEvent', option)}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Event Organizer</label>
                    <input
                      type="text"
                      name="eventOrganizer"
                      placeholder="Event organizer..."
                      value={formData.eventOrganizer}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" ref={sumberDropdownRef}>
                    <label>Sumber</label>
                    <div className="custom-dropdown-wrapper">
                      <button
                        type="button"
                        className="form-input custom-dropdown-trigger"
                        disabled={isEO}
                        onClick={() =>
                          !isEO &&
                          setOpenDropdown(openDropdown === 'sumber' ? null : 'sumber')
                        }
                      >
                        <span
                          className={
                            formData.sumber === 'Belum dipilih'
                              ? 'dropdown-placeholder'
                              : 'dropdown-selected-text'
                          }
                        >
                          {formData.sumber}
                        </span>
                        {!isEO && (
                          <svg
                            className={`dropdown-chevron ${
                              openDropdown === 'sumber' ? 'open' : ''
                            }`}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#64748b"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        )}
                      </button>

                      {openDropdown === 'sumber' && !isEO && (
                        <div className="custom-dropdown-menu">
                          {SUMBER_EVENT_OPTIONS.map((option) => (
                            <div
                              key={option}
                              className={`custom-dropdown-item ${
                                formData.sumber === option ? 'selected' : ''
                              }`}
                              onClick={() => handleSelectOption('sumber', option)}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Deskripsi Singkat</label>
                <textarea
                  name="deskripsiSingkat"
                  rows="4"
                  placeholder="Tuliskan deskripsi singkat event..."
                  value={formData.deskripsiSingkat}
                  onChange={handleInputChange}
                  className="form-textarea"
                ></textarea>
              </div>

              <hr className="form-divider" />

              <div className="denah-section">
                <h2 className="section-title text-cyan">Denah Acara</h2>

                {denahList.map((denah) => (
                  <div key={denah.id} className="denah-block">
                    <div className="denah-header-actions">
                      <label>Nama Denah</label>
                      <button
                        type="button"
                        className="btn-delete-denah"
                        onClick={() => handleRemoveDenahBlock(denah.id)}
                      >
                        Hapus Denah Ini
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Nama denah..."
                      value={denah.namaDenah}
                      onChange={(e) =>
                        handleDenahNameChange(denah.id, e.target.value)
                      }
                      className="form-input full-width-input"
                    />

                    <div
                      className="form-group full-width"
                      style={{ marginTop: '12px' }}
                    >
                      <label>Gambar Denah</label>
                      <label
                        htmlFor={`denah-edit-input-${denah.id}`}
                        className="denah-upload-label"
                      >
                        {denah.imagePreview ? (
                          <img
                            src={denah.imagePreview}
                            alt={denah.namaDenah}
                            className="denah-preview-img"
                          />
                        ) : (
                          <div className="upload-placeholder denah-placeholder">
                            <svg
                              width="56"
                              height="56"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#888"
                              strokeWidth="1.5"
                            >
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                              <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                            <span className="placeholder-main">
                              [ Tempat Gambar Denah: {denah.namaDenah} ]
                            </span>
                            <span className="placeholder-sub">
                              Klik untuk ganti / unggah gambar denah
                            </span>
                          </div>
                        )}
                      </label>
                      <input
                        id={`denah-edit-input-${denah.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleDenahImageUpload(denah.id, e.target.files[0])
                        }
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                ))}

                <div className="add-denah-dashed-box" onClick={handleAddDenahBlock}>
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#666"
                    strokeWidth="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Klik di bagian ini untuk menambahkan denah baru</span>
                </div>
              </div>
            </div>

            <div className="edit-actions">
              <button
                type="submit"
                className="btn-cyan-submit"
                disabled={isSaving}
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default EditEventAdmin