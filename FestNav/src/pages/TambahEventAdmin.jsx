import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin'
import NavbarEO from '../components/NavbarEO'
import './TambahEventAdmin.css'

const JENIS_EVENT_OPTIONS = [
  'Event Indoor',
  'Event Outdoor',
  'Event Indoor & Outdoor'
]

const SUMBER_EVENT_OPTIONS = [
  'Kerjasama Event Organizer',
  'Hasil Scrapping'
]

const FALLBACK_ADMIN_EVENTS = [
  {
    id: 1,
    title: 'Dies Natalis Udayana 2026',
    type: 'eo',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Outdoor', color: '#38bdf8' },
      { label: 'Event Indoor', color: '#f87171' }
    ],
    status: 'Sudah Dipublish',
    statusColor: '#3b82f6',
    dateRange: '21 Oktober 2025 – 31 Desember 2025'
  },
  {
    id: 2,
    title: 'Pernikahan Sita 2026',
    type: 'eo',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' }
    ],
    status: 'Draft',
    statusColor: '#3730a3',
    dateRange: '4 November 2026 – 5 November 2026'
  },
  {
    id: 3,
    title: 'Festival Musik Lovina',
    type: 'eo',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Outdoor', color: '#38bdf8' }
    ],
    status: 'Sudah Dipublish',
    statusColor: '#3b82f6',
    dateRange: '21 Maret 2025'
  },
  {
    id: 4,
    title: 'Bazzar Pagi Makanan',
    type: 'eo',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Outdoor', color: '#38bdf8' }
    ],
    status: 'Draft',
    statusColor: '#3730a3',
    dateRange: '4 Januari 2025 – 5 Januari 2025'
  },
  {
    id: 5,
    title: 'Seminar Nasional Teknologi',
    type: 'eo',
    tags: [
      { label: 'Kerjasama Event Organizer', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' }
    ],
    status: 'Sudah Dipublish',
    statusColor: '#3b82f6',
    dateRange: '15 Desember 2025'
  },
  {
    id: 6,
    title: 'Pameran Seni Buleleng',
    type: 'scrapping',
    tags: [
      { label: 'Hasil Scrapping', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' },
      { label: 'Event Outdoor', color: '#38bdf8' }
    ],
    status: 'Sudah Dipublish',
    statusColor: '#3b82f6',
    dateRange: '29 Februari 2024 – 3 Maret 2024'
  },
  {
    id: 7,
    title: 'Pagelaran Busana Tradisional',
    type: 'scrapping',
    tags: [
      { label: 'Hasil Scrapping', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' }
    ],
    status: 'Draft',
    statusColor: '#3730a3',
    dateRange: '4 November 2026 – 5 November 2026'
  },
  {
    id: 8,
    title: 'Acara Ulang Tahun Novita',
    type: 'scrapping',
    tags: [
      { label: 'Hasil Scrapping', color: '#00bcd4' },
      { label: 'Event Outdoor', color: '#38bdf8' }
    ],
    status: 'Sudah Dipublish',
    statusColor: '#3b82f6',
    dateRange: '1 November 2026'
  },
  {
    id: 9,
    title: 'Lari Marathon 1 AU',
    type: 'scrapping',
    tags: [
      { label: 'Hasil Scrapping', color: '#00bcd4' },
      { label: 'Event Outdoor', color: '#38bdf8' }
    ],
    status: 'Draft',
    statusColor: '#3730a3',
    dateRange: '21 April 2025 – 31 Desember 2025'
  },
  {
    id: 10,
    title: 'Workshop Sintaks III',
    type: 'scrapping',
    tags: [
      { label: 'Hasil Scrapping', color: '#00bcd4' },
      { label: 'Event Indoor', color: '#f87171' }
    ],
    status: 'Sudah Dipublish',
    statusColor: '#3b82f6',
    dateRange: '5 Mei 2026'
  }
]

function TambahEventAdmin({ role = 'admin' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const activeRole = location.state?.role || role
  const isEO = activeRole === 'eo'

  // State Form Utama
  const [formData, setFormData] = useState({
    namaEvent: '',
    tanggalEvent: '',
    lokasiEvent: '',
    jenisEvent: 'Belum dipilih',
    eventOrganizer: '',
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

  // Handle Simpan Event & Langsung Simpan ke Daftar
  const handleSubmit = (e) => {
    e.preventDefault()

    const resolvedSumber = isEO
      ? 'Kerjasama Event Organizer'
      : formData.sumber === 'Belum dipilih'
      ? 'Kerjasama Event Organizer'
      : formData.sumber

    const isScrapping = resolvedSumber === 'Hasil Scrapping'

    // Susun badge tag agar tampilannya sama seperti kartu event
    const generatedTags = [{ label: resolvedSumber, color: '#00bcd4' }]

    if (formData.jenisEvent === 'Event Indoor') {
      generatedTags.push({ label: 'Event Indoor', color: '#f87171' })
    } else if (formData.jenisEvent === 'Event Outdoor') {
      generatedTags.push({ label: 'Event Outdoor', color: '#38bdf8' })
    } else if (formData.jenisEvent === 'Event Indoor & Outdoor') {
      generatedTags.push({ label: 'Event Outdoor', color: '#38bdf8' })
      generatedTags.push({ label: 'Event Indoor', color: '#f87171' })
    }

    const resolvedDate = formData.tanggalEvent.trim() || 'Tanggal belum diatur'

    const newEvent = {
      id: Date.now(),
      title: formData.namaEvent.trim() || 'Event Baru',
      type: isScrapping ? 'scrapping' : 'eo',
      tags: generatedTags,
      status: isEO ? 'Belum Dipublish' : 'Draft',
      statusColor: '#3730a3',
      dateRange: resolvedDate,
      eventDate: resolvedDate,
      lokasiEvent: formData.lokasiEvent.trim() || '-',
      jenisEvent:
        formData.jenisEvent === 'Belum dipilih' ? 'Event Indoor' : formData.jenisEvent,
      eventOrganizer: formData.eventOrganizer.trim() || (isEO ? 'EO Esai' : '-'),
      sumber: resolvedSumber,
      deskripsiSingkat: formData.deskripsiSingkat.trim() || '-'
    }

    const storageKey = isEO ? 'festnav_eo_events' : 'festnav_admin_events'
    try {
      const rawSaved = localStorage.getItem(storageKey)
      const currentList = rawSaved
        ? JSON.parse(rawSaved)
        : isEO
        ? []
        : FALLBACK_ADMIN_EVENTS

      localStorage.setItem(storageKey, JSON.stringify([newEvent, ...currentList]))
    } catch (err) {
      console.error('Gagal menyimpan event:', err)
    }

    if (isEO) {
      navigate('/daftar-event-eo', { state: { newEvent } })
    } else {
      navigate('/daftar-event', {
        state: { newEvent, activeTab: isScrapping ? 'scrapping' : 'eo' }
      })
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
                    <img src={posterPreview} alt="Preview Poster" className="poster-preview-img" />
                  ) : (
                    <div className="upload-placeholder">
                      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
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
                  />
                </div>

                <div className="form-group">
                  <label>Tanggal Event</label>
                  <input
                    type="text"
                    name="tanggalEvent"
                    placeholder="Tanggal event..."
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
                        className={`dropdown-chevron ${openDropdown === 'jenis' ? 'open' : ''}`}
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
                      onClick={() =>
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
                      <svg
                        className={`dropdown-chevron ${openDropdown === 'sumber' ? 'open' : ''}`}
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

                    {openDropdown === 'sumber' && (
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
                      onChange={(e) => handleDenahNameChange(denah.id, e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Gambar Denah</label>
                    <label htmlFor={`denah-input-${denah.id}`} className="denah-upload-label">
                      {denah.imagePreview ? (
                        <img src={denah.imagePreview} alt="Preview Denah" className="denah-preview-img" />
                      ) : (
                        <div className="upload-placeholder denah-placeholder">
                          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                          </svg>
                          <span className="placeholder-main">Unggah Gambar Denah</span>
                          <span className="placeholder-sub">Format: JPEG, JPG, PNG</span>
                        </div>
                      )}
                    </label>
                    <input
                      id={`denah-input-${denah.id}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDenahImageUpload(denah.id, e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              ))}

              {/* Dashed Button to Add New Map */}
              <div className="add-denah-dashed-box" onClick={handleAddDenahBlock}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Klik di bagian ini untuk menambahkan denah baru</span>
              </div>
            </div>
          </div>

          {/* Bottom Submit Button */}
          <div className="tambah-actions">
            <button type="submit" className="btn-cyan-submit">
              Simpan
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default TambahEventAdmin