import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarEO from '../components/NavbarEO'
import './DashboardEO.css'

function DashboardEO() {
  const navigate = useNavigate()

  // Data Event EO yang Sudah Dipublish
  const [publishedEvents] = useState([
    {
      id: 1,
      title: 'Dies Natalis Udayana 2026',
      lastEdited: '21 Oktober 2026'
    },
    {
      id: 2,
      title: 'Festival Musik',
      lastEdited: '21 Oktober 2026'
    },
    {
      id: 3,
      title: 'Pameran Seni',
      lastEdited: '21 Oktober 2026'
    }
  ])

  const [unpublishedEvents] = useState([
    {
      id: 4,
      title: 'Denah bonding nyamur',
      lastEdited: '21 Oktober 2026'
    },
    {
      id: 5,
      title: 'Festival Musik',
      lastEdited: '21 Oktober 2026'
    },
    {
      id: 6,
      title: 'Pameran Seni',
      lastEdited: '21 Oktober 2026'
    }
  ])

  return (
    <div className="dash-eo-container">
      {/* Reusable Navbar EO */}
      <NavbarEO />

      {/* Hero Header */}
      <div className="dash-eo-hero">
        <h1 className="hero-title">Dashboard FestNav</h1>
        <p className="hero-subtitle">Festival Navigation</p>
      </div>

      {/* Main Content Area (Max-width 950px) */}
      <main className="dash-eo-content">
        {/* Card 1: Eventmu yang sudah dipublish */}
        <section className="dash-eo-card">
          <div className="card-header-row">
            <h2 className="card-heading">Eventmu yang sudah dipublish</h2>
            <button 
              className="btn-cyan-header"
              onClick={() => navigate('/daftar-event-eo')}
            >
              Lihat Daftar Event
            </button>
          </div>

          <div className="event-rows-list">
            {publishedEvents.map((evt) => (
              <div key={evt.id} className="dash-event-row">
                <div className="event-row-info">
                  <h3 className="event-row-title">{evt.title}</h3>
                  <p className="event-row-date">Terakhir diedit: {evt.lastEdited}</p>
                </div>
                <button 
                  className="btn-cyan-detail"
                  onClick={() => navigate('/detail-event-eo')}
                >
                  Lihat Detail
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Card 2: Eventmu yang belum dipublish */}
        <section className="dash-eo-card">
          <div className="card-header-row">
            <h2 className="card-heading">Eventmu yang belum dipublish</h2>
            <button 
              className="btn-cyan-header"
              onClick={() => navigate('/daftar-validasi-eo')}
            >
              Lihat Daftar Validasi
            </button>
          </div>

          <div className="event-rows-list">
            {unpublishedEvents.map((evt) => (
              <div key={evt.id} className="dash-event-row">
                <div className="event-row-info">
                  <h3 className="event-row-title">{evt.title}</h3>
                  <p className="event-row-date">Terakhir diedit: {evt.lastEdited}</p>
                </div>
                <button 
                  className="btn-cyan-detail"
                  onClick={() => navigate('/detail-event-eo')}
                >
                  Lihat Detail
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default DashboardEO