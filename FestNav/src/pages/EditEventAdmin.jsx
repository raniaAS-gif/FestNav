import { useState } from 'react'
import './EditEventAdmin.css'

function EditEventAdmin() {
  // State Form Utama (Diisi data existing dari Database MySQL)
  const [formData, setFormData] = useState({
    namaEvent: 'Dies Natalis Udayana 2026',
    tanggalEvent: '21 Oktober 2025 - 31 Desember 2025',
    lokasiEvent: 'Rektorat Universitas Udayana',
    jenisEvent: 'Belum dipilih',
    eventOrganizer: 'Universitas Udayana',
    sumber: 'Belum dipilih',
    deskripsiSingkat:
      'ini adalah itu, itu adalah ini, lalu dia adalah saya, saya adalh kami, kami adalah rambut, rambut adalah bok, bok adalah sayuran, sayuran adalah nama gang, dan lain sebagainya.'
  })

  // State Poster Image Existing / Preview
  const [posterFile, setPosterFile] = useState(null)
  const [posterPreview, setPosterPreview] = useState('') // Isi path poster lokal jika ada, misal '/assets/poster.jpg'

  // State List Denah Acara (Pre-filled dengan data Day 1 & Day 2)
  const [denahList, setDenahList] = useState([
    {
      id: 1,
      namaDenah: 'Day 1: Lapangan Rektorat',
      imageFile: null,
      imagePreview: '' // Path gambar denah Day 1 jika ada
    },
    {
      id: 2,
      namaDenah: 'Day 2: Gedung Rektorat',
      imageFile: null,
      imagePreview: '' // Path gambar denah Day 2 jika ada
    }
  ])

  // Handle Input Form Utama
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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

  // Hapus Denah (Opsional)
  const handleRemoveDenahBlock = (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus denah ini?')) {
      setDenahList((prev) => prev.filter((item) => item.id !== id))
    }
  }

  // Handle Submit Edit Event
  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Update Data Event:', formData)
    console.log('Poster File Baru:', posterFile)
    console.log('Update List Denah:', denahList)
    alert('Perubahan event berhasil disimpan (Simulasi)!')
  }

  return (
    <div className="edit-container">
      {/* Navbar */}
      <header className="edit-navbar">
        <div className="nav-brand">FestNav</div>
        <div className="nav-actions">
          <button className="btn-cyan">Lihat Daftar Event</button>
          <button className="btn-cyan">+ Tambah Peta baru</button>
          <div className="user-profile">
            <span className="user-name">Admin Esai</span>
            <div className="avatar-placeholder">👤</div>
            <button className="logout-btn" title="Logout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>

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

                <div className="form-group">
                  <label>Jenis Event</label>
                  <select
                    name="jenisEvent"
                    value={formData.jenisEvent}
                    onChange={handleInputChange}
                    className="form-input form-select"
                  >
                    <option value="Belum dipilih">Belum dipilih</option>
                    <option value="Event Indoor">Event Indoor</option>
                    <option value="Event Outdoor">Event Outdoor</option>
                    <option value="Event Indoor & Outdoor">Event Indoor & Outdoor</option>
                  </select>
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

                <div className="form-group">
                  <label>Sumber</label>
                  <select
                    name="sumber"
                    value={formData.sumber}
                    onChange={handleInputChange}
                    className="form-input form-select"
                  >
                    <option value="Belum dipilih">Belum dipilih</option>
                    <option value="Kerjasama Event Organizer">Kerjasama Event Organizer</option>
                    <option value="Hasil Scrapping">Hasil Scrapping</option>
                  </select>
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

              {/* Dashed Box untuk Menambah Denah Baru (TETAP ADA) */}
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