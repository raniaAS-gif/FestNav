import { useState } from 'react'
import './DashboardAdmin.css'

function DashboardAdmin() {
  // Mock Data (Nanti data ini diambil dari Backend MySQL via fetch/axios)
  const [stats, setStats] = useState({
    totalEvents: 40,
    startYear: 2024,
    outdoorEvents: 25,
    indoorEvents: 15,
    activeEventsCount: 5,
    activeEventsList: [
      { id: 1, name: 'Dies Natalis Udayana', color: '#ff4d4f' },
      { id: 2, name: 'Pagerwesi', color: '#13c2c2' },
      { id: 3, name: 'Upacara nikahan sita', color: '#13c2c2' },
      { id: 4, name: 'Grand Launching Konclong', color: '#ff4d4f' },
      { id: 5, name: 'Grand Opening Porseni FMIPA 2026', color: '#13c2c2' }
    ],
    totalMaps: 60,
    eoMaps: 25,
    scrappedMaps: 35,
    scrapingProgress: 65,
    scrapingStatusText: 'Scrapping denah...',
    lastScraped: [
      'Scrapping denah kegiatan Festival Malam',
      'Scrapping denah kegiatan pernikahan Trisia'
    ]
  })

  const [drafts, setDrafts] = useState([
    { id: 1, title: 'Denah bonding nyamur', lastEdited: '21 Oktober 2026' },
    { id: 2, title: 'Festival Musik', lastEdited: '21 Oktober 2026' },
    { id: 3, title: 'Pameran Seni', lastEdited: '21 Oktober 2026' }
  ])

  const [requests, setRequests] = useState([
    { id: 1, title: 'Denah bonding nyamur', author: 'EO Esai' },
    { id: 2, title: 'Festival Musik', author: 'EO Esai' },
    { id: 3, title: 'Pameran Seni', author: 'EO Esai' }
  ])

  return (
    <div className="dashboard-container">
      {/* Top Navbar */}
      <header className="dash-navbar">
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

      {/* Main Title Section */}
      <div className="dash-hero">
        <h1 className="hero-title">Dashboard FestNav</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      {/* Content Grid */}
      <main className="dash-content">
        {/* Top 4 Cards Grid */}
        <div className="cards-grid">
          {/* Card 1: Total Event */}
          <div className="dash-card">
            <h3 className="card-title text-cyan">Total Event Dikerjakan:</h3>
            <h2 className="card-heading">
              {stats.totalEvents} Event sudah dipetakan sejak {stats.startYear}!
            </h2>
            <p className="card-subtext">Terdiri dari:</p>
            <div className="legend-group">
              <div className="legend-item">
                <span className="dot dot-blue"></span>
                <span>{stats.outdoorEvents} Event Outdoor</span>
              </div>
              <div className="legend-item">
                <span className="dot dot-red"></span>
                <span>{stats.indoorEvents} Event Indoor</span>
              </div>
            </div>
          </div>

          {/* Card 2: Event Aktif */}
          <div className="dash-card card-bordered">
            <h3 className="card-title text-cyan">Event yang aktif saat ini...</h3>
            <h2 className="card-heading">
              {stats.activeEventsCount} Event sedang berjalan
            </h2>
            <div className="tags-container">
              {stats.activeEventsList.map((evt) => (
                <span 
                  key={evt.id} 
                  className="tag" 
                  style={{ backgroundColor: evt.color }}
                >
                  {evt.name}
                </span>
              ))}
            </div>
          </div>

          {/* Card 3: Jumlah Peta */}
          <div className="dash-card">
            <h3 className="card-title text-cyan">Jumlah Peta yang Dimiliki</h3>
            <h2 className="card-heading">
              Terdapat {stats.totalMaps} peta event siap diproses!
            </h2>
            <ul className="bullet-list">
              <li>{stats.eoMaps} peta dari event organizer</li>
              <li>{stats.scrappedMaps} peta hasil proses scrapping</li>
            </ul>
          </div>

          {/* Card 4: Proses Scrapping */}
          <div className="dash-card">
            <div className="card-header-flex">
              <h3 className="card-title text-cyan">Proses Scrapping</h3>
              <button className="btn-cyan-small">Laman Scrapping</button>
            </div>
            <div className="progress-header">
              <span className="progress-label">{stats.scrapingStatusText}</span>
              <span className="progress-percentage text-cyan">{stats.scrapingProgress}%</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${stats.scrapingProgress}%` }}
              ></div>
            </div>
            <div className="scraping-history">
              <p className="scraping-history-title">Hasil Scrapping Terakhir</p>
              <ul className="bullet-list small">
                {stats.lastScraped.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Section: Draft Belum Dipublish */}
        <section className="dash-section-card">
          <div className="section-header">
            <h3 className="section-title text-cyan">Draft Belum Dipublish</h3>
            <button className="btn-cyan">Lihat Daftar Event</button>
          </div>
          <div className="list-container">
            {drafts.map((draft) => (
              <div key={draft.id} className="list-item">
                <div className="item-info">
                  <h4 className="item-title">{draft.title}</h4>
                  <p className="item-sub">Terakhir diedit: {draft.lastEdited}</p>
                </div>
                <button className="btn-cyan-action">Lanjutkan digitasi</button>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Request Publish EO */}
        <section className="dash-section-card">
          <div className="section-header">
            <h3 className="section-title text-cyan">Request Publish EO</h3>
            <button className="btn-cyan">Lihat Daftar Validasi</button>
          </div>
          <div className="list-container">
            {requests.map((req) => (
              <div key={req.id} className="list-item simple">
                <div className="item-info">
                  <h4 className="item-title">{req.title}</h4>
                  <p className="item-sub">Oleh: {req.author}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default DashboardAdmin