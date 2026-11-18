import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin'
import NavbarEO from '../components/NavbarEO'
import './TambahEventAdmin.css'

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000'

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

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'))
    reader.readAsDataURL(file)
  })

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

  // Format "21 Oktober 2026"
  const idMatch = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (idMatch) {
    const bulanNum = BULAN_ID[idMatch[2].toLowerCase()]
    if (bulanNum) {
      return `${idMatch[3]}-${bulanNum}-${idMatch[1].padStart(2, '0')}`
    }
  }

  return null
}

function parseDateRangeInput(text) {
  const today = new Date().toISOString().slice(0, 10)
  const raw = (text || '').trim()
  if (!raw) {
    return { tanggal_mulai: today, tanggal_selesai: today }
  }

  // Format rentang ISO: "2026-11-20 - 2026-11-22"
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

  const start = parseSingleDate(parts[0]) || today
  const end =
    (parts[1] ? parseSingleDate(parts[1]) : parseSingleDate(parts[0])) || start

  return {
    tanggal_mulai: start,
    tanggal_selesai: end < start ? start : end
  }
}

// Perbaikan 1: Gunakan 'campuran' (bukan 'hybrid') agar sesuai constraint schemaix.sql
function mapJenisToTipeLokasi(jenisEvent) {
  if (jenisEvent === 'Event Indoor') return 'indoor'
  if (jenisEvent === 'Event Outdoor') return 'outdoor'
  return 'campuran'
}

// Perbaikan 3: Urai error validasi FastAPI (array of objects) menjadi string terbaca
function formatApiError(detail, fallback = 'Gagal menyimpan event baru.') {
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

function TambahEventAdmin({ role = 'admin' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const activeRole = location.state?.role || role
  const isEO = activeRole === 'eo'
  const storedUser = getStoredUser()

  // State Form Utama
  const [formData, setFormData] = useState({
    namaEvent: '',
    tanggalEvent: '',
    lokasiEvent: '',
    jenisEvent: 'Belum dipilih',
    eventOrganizer: isEO
      ? storedUser?.nama_organisasi || storedUser?.nama || ''
      : '',
    sumber: isEO ? 'Kerjasama Event Organizer' : 'Belum dipilih',
    deskripsiSingkat: ''
  })

  useEffect(() => {
    if (isEO) {
      setFormData((prev) => ({
        ...prev,
        sumber: 'Kerjasama Event Organizer'
      }))
    }
  }, [isEO])

  // State Dropdown Terbuka ('jenis' | 'sumber' | null)
  const [openDropdown, setOpenDropdown] = useState(null)
  const jenisDropdownRef = useRef(null)
  const sumberDropdownRef = useRef(null)

  // State Poster Image & Preview
  const [posterFile, setPosterFile] = useState(null)
  const [posterPreview, setPosterPreview] = useState(null)

  // State List Denah Acara (Dinamis)
  const [denahList, setDenahList] = useState([
    { id: Date.now(), namaDenah: '', imageFile: null, imagePreview: null }
  ])

  const [isSaving, setIsSaving] = useState(false)

  // Tutup dropdown otomatis jika klik di luar area dropdown
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

  // Handle Input Form Utama
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle Pilih Opsi Custom Dropdown
  const handleSelectOption = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
    setOpenDropdown(null)
  }

  // Handle Upload Poster
  const handlePosterUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPosterFile(file)
      setPosterPreview(URL.createObjectURL(file))
    }
  }

  // Handle Change Nama Denah
  const handleDenahNameChange = (id, value) => {
    setDenahList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, namaDenah: value } : item))
    )
  }

  // Handle Upload Gambar Denah
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

  // Tambah Blok Denah Baru
  const handleAddDenahBlock = () => {
    setDenahList((prev) => [
      ...prev,
      { id: Date.now(), namaDenah: '', imageFile: null, imagePreview: null }
    ])
  }

  // Hapus Blok Denah
  const handleRemoveDenahBlock = (id) => {
    if (denahList.length > 1) {
      setDenahList((prev) => prev.filter((item) => item.id !== id))
    }
  }

  // Handle Simpan Event ke PostgreSQL melalui FastAPI
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSaving) return

    const namaEventClean = formData.namaEvent.trim()
    if (!namaEventClean) {
      alert('Nama Event wajib diisi.')
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
        formData.tanggalEvent
      )

      const posterUrl = posterFile ? await fileToDataUrl(posterFile) : null

      // Perbaikan 2: Payload bersih sesuai schema EventCreate (status 'draft')
      const eventPayload = {
        nama_event: namaEventClean,
        deskripsi: formData.deskripsiSingkat.trim() || null,
        tanggal_mulai,
        tanggal_selesai,
        lokasi: formData.lokasiEvent.trim() || null,
        garis_lintang: -8.6724,
        garis_bujur: 115.2362,
        jenis_event: resolvedJenis,
        tipe_lokasi: tipeLokasi,
        mode_event: 'interaktif',
        status_event: 'draft',
        poster_url: posterUrl
      }

      // 1. Buat Event baru di backend
      const resEvent = await fetch(`${API_BASE}/api/events`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(eventPayload)
      })

      const createdEvent = await resEvent.json().catch(() => ({}))
      if (!resEvent.ok) {
        throw new Error(formatApiError(createdEvent.detail))
      }

      // 2. Buat Denah Peta (Map) jika user mengisi nama denah atau mengunggah gambar denah
      const validDenahs = denahList.filter(
        (d) => d.namaDenah.trim() || d.imageFile
      )

      for (let i = 0; i < validDenahs.length; i++) {
        const d = validDenahs[i]
        const gambarLayout = d.imageFile
          ? await fileToDataUrl(d.imageFile)
          : null

        const resMap = await fetch(`${API_BASE}/api/maps`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            id_event: createdEvent.id_event,
            nama_map: d.namaDenah.trim() || `Denah ${i + 1}`,
            tipe_map: tipeLokasi === 'indoor' ? 'indoor' : 'outdoor',
            is_utama: i === 0,
            gambar_layout: gambarLayout,
            tampilkan_denah: Boolean(gambarLayout),
            garis_lintang_pusat: createdEvent.garis_lintang ?? -8.6724,
            garis_bujur_pusat: createdEvent.garis_bujur ?? 115.2362
          })
        })

        if (!resMap.ok) {
          const errMap = await resMap.json().catch(() => ({}))
          console.error('Gagal menyimpan denah:', formatApiError(errMap.detail))
        }
      }

  alert('Event baru berhasil disimpan sebagai draft!')

        const eventId = createdEvent.id_event
        if (eventId) {
          navigate(isEO ? '/detail-event-eo' : '/detail-event', {
            state: {
              role: activeRole,
              event: createdEvent,
              id_event: eventId,
              eventId: eventId,
              id: eventId
            }
          })
        } else {
          navigate(isEO ? '/daftar-event-eo' : '/daftar-event')
        }
    } catch (err) {
      alert(err.message || 'Gagal menyimpan event baru.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="tambah-container">
      {/* Navbar Dinamis sesuai Role */}
      {isEO ? <NavbarEO /> : <NavbarAdmin />}

      {/* Hero Header */}
      <div className="tambah-hero">
        <h1 className="hero-title">Tambah Event</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      {/* Main Content Form */}
      <main className="tambah-content">
        <form onSubmit={handleSubmit}>
          <div className="tambah-card">
            {/* Top Grid: Poster Upload + Event Info Form */}
            <div className="top-form-grid">
              {/* Upload Poster Box */}
              <div className="poster-upload-box">
                <label htmlFor="poster-input" className="poster-upload-label">
                  {posterPreview ? (
                    <img
                      src={posterPreview}
                      alt="Preview Poster"
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
                      <span>Unggah Gambar Poster</span>
                    </div>
                  )}
                </label>
                <input
                  id="poster-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePosterUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Input Fields Grid */}
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

                {/* Custom Dropdown: Jenis Event */}
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

                {/* Custom Dropdown: Sumber */}
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

            {/* Deskripsi Singkat */}
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

            {/* Section: Denah Acara */}
            <div className="denah-section">
              <h2 className="section-title text-cyan">Denah Acara</h2>

              {denahList.map((denah, index) => (
                <div key={denah.id} className="denah-block">
                  {denahList.length > 1 && (
                    <div className="denah-header-actions">
                      <span className="denah-number">Denah #{index + 1}</span>
                      <button
                        type="button"
                        className="btn-delete-denah"
                        onClick={() => handleRemoveDenahBlock(denah.id)}
                      >
                        Hapus Denah Ini
                      </button>
                    </div>
                  )}

                  <div className="form-group full-width">
                    <label>Nama Denah</label>
                    <input
                      type="text"
                      placeholder="Nama denah..."
                      value={denah.namaDenah}
                      onChange={(e) =>
                        handleDenahNameChange(denah.id, e.target.value)
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Gambar Denah</label>
                    <label
                      htmlFor={`denah-input-${denah.id}`}
                      className="denah-upload-label"
                    >
                      {denah.imagePreview ? (
                        <img
                          src={denah.imagePreview}
                          alt="Preview Denah"
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
                            Unggah Gambar Denah
                          </span>
                          <span className="placeholder-sub">
                            Format: JPEG, JPG, PNG
                          </span>
                        </div>
                      )}
                    </label>
                    <input
                      id={`denah-input-${denah.id}`}
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

              {/* Dashed Button to Add New Map */}
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

          {/* Bottom Submit Button */}
          <div className="tambah-actions">
            <button
              type="submit"
              className="btn-cyan-submit"
              disabled={isSaving}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default TambahEventAdmin