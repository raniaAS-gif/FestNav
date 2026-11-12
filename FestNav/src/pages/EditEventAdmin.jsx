import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin'
import NavbarEO from '../components/NavbarEO'
import './EditEventAdmin.css'

const JENIS_EVENT_OPTIONS = [
  'Event Indoor',
  'Event Outdoor',
  'Event Indoor & Outdoor'
]

const SUMBER_EVENT_OPTIONS = [
  'Kerjasama Event Organizer',
  'Hasil Scrapping'
]

const DEFAULT_EDIT_EVENT = {
  id: 1,
  namaEvent: 'Dies Natalis Udayana 2026',
  tanggalEvent: '21 Oktober 2025 - 31 Desember 2025',
  lokasiEvent: 'Rektorat Universitas Udayana',
  jenisEvent: 'Event Indoor & Outdoor',
  eventOrganizer: 'Universitas Udayana',
  sumber: 'Kerjasama Event Organizer',
  deskripsiSingkat:
    'ini adalah itu, itu adalah ini, lalu dia adalah saya, saya adalh kami, kami adalah rambut, rambut adalah bok, bok adalah sayuran, sayuran adalah nama gang, dan lain sebagainya.',
  posterUrl: '',
  denahList: [
    {
      id: 1,
      namaDenah: 'Day 1: Lapangan Rektorat',
      imageFile: null,
      imagePreview: ''
    },
    {
      id: 2,
      namaDenah: 'Day 2: Gedung Rektorat',
      imageFile: null,
      imagePreview: ''
    }
  ]
}

function EditEventAdmin({ role = 'admin' }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Deteksi role baik dari prop maupun dari state navigasi DetailEventAdmin
  const activeRole = location.state?.role || role
  const isEO = activeRole === 'eo'
  const incomingEvent = location.state?.eventData || null

  // State Form Utama (Terisi otomatis dari event yang dipilih)
  const [formData, setFormData] = useState(() => {
    if (!incomingEvent) {
      return {
        namaEvent: DEFAULT_EDIT_EVENT.namaEvent,
        tanggalEvent: DEFAULT_EDIT_EVENT.tanggalEvent,
        lokasiEvent: DEFAULT_EDIT_EVENT.lokasiEvent,
        jenisEvent: DEFAULT_EDIT_EVENT.jenisEvent,
        eventOrganizer: DEFAULT_EDIT_EVENT.eventOrganizer,
        sumber: isEO ? 'Kerjasama Event Organizer' : DEFAULT_EDIT_EVENT.sumber,
        deskripsiSingkat: DEFAULT_EDIT_EVENT.deskripsiSingkat
      }
    }

    const resolvedJenis = JENIS_EVENT_OPTIONS.includes(incomingEvent.jenisEvent)
      ? incomingEvent.jenisEvent
      : 'Belum dipilih'

    const resolvedSumber = isEO
      ? 'Kerjasama Event Organizer'
      : SUMBER_EVENT_OPTIONS.includes(incomingEvent.sumber)
      ? incomingEvent.sumber
      : 'Belum dipilih'

    return {
      namaEvent: incomingEvent.namaEvent || incomingEvent.title || '',
      tanggalEvent: incomingEvent.tanggalEvent || incomingEvent.dateRange || '',
      lokasiEvent:
        incomingEvent.lokasiEvent && incomingEvent.lokasiEvent !== '-'
          ? incomingEvent.lokasiEvent
          : '',
      jenisEvent: resolvedJenis,
      eventOrganizer:
        incomingEvent.eventOrganizer && incomingEvent.eventOrganizer !== '-'
          ? incomingEvent.eventOrganizer
          : '',
      sumber: resolvedSumber,
      deskripsiSingkat:
        incomingEvent.deskripsiSingkat && incomingEvent.deskripsiSingkat !== '-'
          ? incomingEvent.deskripsiSingkat
          : ''
    }
  })

  // State Dropdown Terbuka ('jenis' | 'sumber' | null)
  const [openDropdown, setOpenDropdown] = useState(null)
  const jenisDropdownRef = useRef(null)
  const sumberDropdownRef = useRef(null)

  // State Poster Image Existing / Preview
  const [posterFile, setPosterFile] = useState(null)
  const [posterPreview, setPosterPreview] = useState(
    incomingEvent?.posterUrl || DEFAULT_EDIT_EVENT.posterUrl
  )

  // State List Denah Acara (Terisi otomatis dari denah event yang dipilih)
  const [denahList, setDenahList] = useState(() => {
    if (!incomingEvent) {
      return DEFAULT_EDIT_EVENT.denahList
    }

    if (Array.isArray(incomingEvent.denahList) && incomingEvent.denahList.length > 0) {
      return incomingEvent.denahList.map((d, idx) => ({
        id: d.id || idx + 1,
        namaDenah: d.namaDenah || d.title || '',
        imageFile: null,
        imagePreview: d.imageUrl || d.mapUrl || ''
      }))
    }

    return [
      {
        id: Date.now(),
        namaDenah: '',
        imageFile: null,
        imagePreview: ''
      }
    ]
  })

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

  // Handle Ganti / Upload Poster
  const handlePosterUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPosterFile(file)
      setPosterPreview(URL.createObjectURL(file))
    }
  }

  // Handle Ubah Nama Denah
  const handleDenahNameChange = (id, value) => {
    setDenahList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, namaDenah: value } : item))
    )
  }

  // Handle Upload / Ganti Gambar Denah
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

  // Tambah Blok Denah Baru (Klik area dashed box)
  const handleAddDenahBlock = () => {
    setDenahList((prev) => [
      ...prev,
      {
        id: Date.now(),
        namaDenah: `Day ${prev.length + 1}: Nama Denah Baru`,
        imageFile: null,
        imagePreview: ''
      }
    ])
  }

  // Hapus Denah
  const handleRemoveDenahBlock = (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus denah ini?')) {
      setDenahList((prev) => prev.filter((item) => item.id !== id))
    }
  }

  // Handle Submit Edit Event & Perbarui Data di localStorage
  const handleSubmit = (e) => {
    e.preventDefault()

    const resolvedSumber = isEO
      ? 'Kerjasama Event Organizer'
      : formData.sumber === 'Belum dipilih'
      ? 'Kerjasama Event Organizer'
      : formData.sumber

    const isScrapping = resolvedSumber === 'Hasil Scrapping'

    const generatedTags = [{ label: resolvedSumber, color: '#00bcd4' }]
    if (formData.jenisEvent === 'Event Indoor') {
      generatedTags.push({ label: 'Event Indoor', color: '#f87171' })
    } else if (formData.jenisEvent === 'Event Outdoor') {
      generatedTags.push({ label: 'Event Outdoor', color: '#38bdf8' })
    } else if (formData.jenisEvent === 'Event Indoor & Outdoor') {
      generatedTags.push({ label: 'Event Outdoor', color: '#38bdf8' })
      generatedTags.push({ label: 'Event Indoor', color: '#f87171' })
    }

    const resolvedTitle = formData.namaEvent.trim() || 'Event Tanpa Judul'
    const resolvedDate = formData.tanggalEvent.trim() || 'Tanggal belum diatur'
    const targetId = incomingEvent?.id || DEFAULT_EDIT_EVENT.id
    const originalTitle = incomingEvent?.title || DEFAULT_EDIT_EVENT.namaEvent

    const updatedFields = {
      id: targetId,
      title: resolvedTitle,
      namaEvent: resolvedTitle,
      type: isScrapping ? 'scrapping' : 'eo',
      tags: generatedTags,
      dateRange: resolvedDate,
      tanggalEvent: resolvedDate,
      eventDate: resolvedDate,
      lokasiEvent: formData.lokasiEvent.trim() || '-',
      jenisEvent:
        formData.jenisEvent === 'Belum dipilih' ? 'Event Indoor' : formData.jenisEvent,
      eventOrganizer: formData.eventOrganizer.trim() || (isEO ? 'EO Esai' : '-'),
      sumber: resolvedSumber,
      deskripsiSingkat: formData.deskripsiSingkat.trim() || '-',
      posterUrl: posterPreview,
      denahList: denahList.map((d, idx) => ({
        id: d.id,
        title: d.namaDenah.trim() || `Denah ${idx + 1}`,
        namaDenah: d.namaDenah.trim() || `Denah ${idx + 1}`,
        mapUrl: d.imagePreview || '',
        imageUrl: d.imagePreview || ''
      }))
    }

    // Perbarui item terkait di localStorage agar DaftarEvent & DetailEvent langsung terupdate
    const storageKey = isEO ? 'festnav_eo_events' : 'festnav_admin_events'
    try {
      const savedList = JSON.parse(localStorage.getItem(storageKey) || '[]')
      if (Array.isArray(savedList) && savedList.length > 0) {
        const updatedList = savedList.map((item) =>
          item.id === targetId || item.title === originalTitle
            ? { ...item, ...updatedFields }
            : item
        )
        localStorage.setItem(storageKey, JSON.stringify(updatedList))
      }
    } catch (err) {
      console.error('Gagal menyimpan perubahan event:', err)
    }

    console.log('Role Pengirim:', activeRole)
    console.log('Update Data Event:', updatedFields)
    console.log('Poster File Baru:', posterFile)

    if (isEO) {
      alert('Perubahan event berhasil disimpan dan diajukan untuk validasi!')
      navigate('/daftar-event-eo')
    } else {
      alert('Perubahan event berhasil disimpan!')
      navigate('/daftar-event')
    }
  }

  return (
    <div className="edit-container">
      {/* Navbar Dinamis sesuai Role */}
      {isEO ? <NavbarEO /> : <NavbarAdmin />}

      {/* Hero Header */}
      <div className="edit-hero">
        <h1 className="hero-title">Edit Event</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      {/* Main Content Form */}
      <main className="edit-content">
        <form onSubmit={handleSubmit}>
          <div className="edit-card">
            {/* Top Grid Layout: Poster Upload + Input Details */}
            <div className="top-form-grid">
              {/* Poster Upload Box */}
              <div className="poster-upload-box">
                <label htmlFor="poster-edit-input" className="poster-upload-label">
                  {posterPreview ? (
                    <img src={posterPreview} alt="Poster Event" className="poster-preview-img" />
                  ) : (
                    <div className="upload-placeholder">
                      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
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

              {/* Form Input Fields */}
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

              {denahList.map((denah) => (
                <div key={denah.id} className="denah-block">
                  <div className="denah-header-actions">
                    <label>Nama Denah</label>
                    {denahList.length > 1 && (
                      <button
                        type="button"
                        className="btn-delete-denah"
                        onClick={() => handleRemoveDenahBlock(denah.id)}
                      >
                        Hapus Denah Ini
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Nama denah..."
                    value={denah.namaDenah}
                    onChange={(e) => handleDenahNameChange(denah.id, e.target.value)}
                    className="form-input full-width-input"
                  />

                  <div className="form-group full-width" style={{ marginTop: '12px' }}>
                    <label>Gambar Denah</label>
                    <label htmlFor={`denah-edit-input-${denah.id}`} className="denah-upload-label">
                      {denah.imagePreview ? (
                        <img src={denah.imagePreview} alt={denah.namaDenah} className="denah-preview-img" />
                      ) : (
                        <div className="upload-placeholder denah-placeholder">
                          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                          </svg>
                          <span className="placeholder-main">[ Tempat Gambar Denah: {denah.namaDenah} ]</span>
                          <span className="placeholder-sub">Klik untuk ganti / unggah gambar denah</span>
                        </div>
                      )}
                    </label>
                    <input
                      id={`denah-edit-input-${denah.id}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDenahImageUpload(denah.id, e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              ))}

              {/* Dashed Box untuk Menambah Denah Baru */}
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
          <div className="edit-actions">
            <button type="submit" className="btn-cyan-submit">
              Simpan
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default EditEventAdmin