import { useState } from 'react'
import './TambahEventAdmin.css'

function TambahEventAdmin() {
  // State Form Utama
  const [formData, setFormData] = useState({
    namaEvent: '',
    tanggalEvent: '',
    lokasiEvent: '',
    jenisEvent: 'Belum dipilih',
    eventOrganizer: '',
    sumber: 'Belum dipilih',
    deskripsiSingkat: ''
  })

  // State Poster Image & Preview
  const [posterFile, setPosterFile] = useState(null)
  const [posterPreview, setPosterPreview] = useState(null)

  // State List Denah Acara (Dinamis)
  const [denahList, setDenahList] = useState([
    { id: Date.now(), namaDenah: '', imageFile: null, imagePreview: null }
  ])

  // Handle Input Form Utama
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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

  // Handle Simpan Event (Nanti disambung ke Node.js / Express API)
  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Data Event Dikirim:', formData)
    console.log('Poster File:', posterFile)
    console.log('Daftar Denah:', denahList)
    alert('Data event berhasil disimpan (Simulasi)!')
  }

  return (
    <div className="tambah-container">
      {/* Navbar */}
      <header className="tambah-navbar">
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
                      {/* Camera Icon */}
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