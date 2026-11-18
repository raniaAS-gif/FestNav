import { useState, useEffect, useCallback } from 'react'
import NavbarAdmin from '../components/NavbarAdmin'
import { useNavigate } from 'react-router-dom'
import './DashboardAdmin.css'

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000'

const TAHAP_PERSEN = {
  'Membuka halaman': 20,
  'Mengambil teks': 40,
  'Mengunduh denah': 60,
  'Upload gambar': 75,
  Geocoding: 90,
  Selesai: 100
}

const getAuthHeaders = () => {
  const token =
    localStorage.getItem('access_token') || localStorage.getItem('token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatTanggalIndo(isoOrDate) {
  if (!isoOrDate) return '-'
  const dt = new Date(isoOrDate)
  if (Number.isNaN(dt.getTime())) return String(isoOrDate)
  return dt.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function DashboardAdmin() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalEvents: 0,
    startYear: new Date().getFullYear(),
    outdoorEvents: 0,
    indoorEvents: 0,
    activeEventsCount: 0,
    activeEventsList: [],
    totalMaps: 0,
    eoMaps: 0,
    scrappedMaps: 0,
    scrapingProgress: 0,
    scrapingStatusText: 'Memuat status scraping...',
    lastScraped: []
  })

  const [drafts, setDrafts] = useState([])
  const [requests, setRequests] = useState([])

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const headers = getAuthHeaders()
      const [resEv, resReq, resScrape] = await Promise.all([
        fetch(`${API_BASE}/api/events`, { headers }),
        fetch(`${API_BASE}/api/request-publish`, { headers }),
        fetch(`${API_BASE}/api/scraping`, { headers })
      ])

      const eventsData = resEv.ok ? await resEv.json().catch(() => []) : []
      const reqData = resReq.ok ? await resReq.json().catch(() => []) : []
      const scrapeData = resScrape.ok
        ? await resScrape.json().catch(() => [])
        : []

      const eventsList = Array.isArray(eventsData) ? eventsData : []
      const reqList = Array.isArray(reqData) ? reqData : []
      const scrapeList = Array.isArray(scrapeData)
        ? scrapeData
        : scrapeData.jobs || []

      // 1. Statistik Total Event & Kategori Indoor/Outdoor
      let outdoorCount = 0
      let indoorCount = 0
      const years = []

      eventsList.forEach((ev) => {
        const jenis = (ev.jenis_event || '').toLowerCase()
        const tipe = (ev.tipe_lokasi || '').toLowerCase()

        const hasOutdoor =
          jenis.includes('outdoor') || tipe === 'outdoor' || tipe === 'hybrid'
        const hasIndoor =
          jenis.includes('indoor') || tipe === 'indoor' || tipe === 'hybrid'

        if (hasOutdoor) outdoorCount += 1
        if (hasIndoor) indoorCount += 1

        const dateRef = ev.dibuat_pada || ev.tanggal_mulai
        if (dateRef) {
          const y = new Date(dateRef).getFullYear()
          if (!Number.isNaN(y)) years.push(y)
        }
      })

      const startYear =
        years.length > 0 ? Math.min(...years) : new Date().getFullYear()

      // 2. Event Aktif (status_event === 'published')
      const publishedEvents = eventsList.filter(
        (ev) => ev.status_event === 'published'
      )
      const activeEventsList = publishedEvents.slice(0, 6).map((ev) => {
        const tipe = (ev.tipe_lokasi || '').toLowerCase()
        const jenis = (ev.jenis_event || '').toLowerCase()
        const isIndoorOnly =
          tipe === 'indoor' ||
          (jenis.includes('indoor') && !jenis.includes('outdoor'))
        return {
          id: ev.id_event,
          name: ev.nama_event,
          color: isIndoorOnly ? '#ff4d4f' : '#13c2c2'
        }
      })

      // 3. Jumlah Peta per Sumber (EO vs Scrapping)
      const mapsPerEvent = await Promise.all(
        eventsList.map(async (ev) => {
          try {
            const r = await fetch(
              `${API_BASE}/api/maps/event/${ev.id_event}`,
              { headers }
            )
            if (!r.ok) return { sumber: ev.sumber, count: 0 }
            const maps = await r.json()
            return {
              sumber: ev.sumber,
              count: Array.isArray(maps) ? maps.length : 0
            }
          } catch {
            return { sumber: ev.sumber, count: 0 }
          }
        })
      )

      let eoMaps = 0
      let scrappedMaps = 0
      mapsPerEvent.forEach((item) => {
        if (item.sumber === 'scraping') {
          scrappedMaps += item.count
        } else {
          eoMaps += item.count
        }
      })

      // 4. Progres & Riwayat Scraping
      const runningJob = scrapeList.find((j) =>
        ['berjalan', 'antri'].includes(j.status_job)
      )
      let scrapingProgress = 0
      let scrapingStatusText = 'Belum ada aktivitas scraping'

      if (runningJob) {
        if (runningJob.status_job === 'antri') {
          scrapingProgress = 10
          scrapingStatusText = 'Menunggu antrean scraping...'
        } else {
          const tahap = runningJob.tahap_saat_ini || 'Membuka halaman'
          scrapingProgress = TAHAP_PERSEN[tahap] ?? 50
          scrapingStatusText = `${tahap}...`
        }
      } else if (scrapeList.length > 0) {
        const hasCompleted = scrapeList.some((j) => j.status_job === 'selesai')
        scrapingProgress = hasCompleted ? 100 : 0
        scrapingStatusText = hasCompleted
          ? 'Semua proses selesai'
          : 'Tidak ada proses berjalan'
      }

      const lastScraped = scrapeList
        .filter((j) => j.status_job === 'selesai')
        .slice(0, 3)
        .map((j) => {
          const nama =
            j.hasil_mentah?.nama_event || j.nama_sumber || j.url_sumber
          return `Scrapping ${nama}`
        })

      setStats({
        totalEvents: eventsList.length,
        startYear,
        outdoorEvents: outdoorCount,
        indoorEvents: indoorCount,
        activeEventsCount: publishedEvents.length,
        activeEventsList,
        totalMaps: eoMaps + scrappedMaps,
        eoMaps,
        scrappedMaps,
        scrapingProgress,
        scrapingStatusText,
        lastScraped
      })

      // 5. Draft Belum Dipublish
      const draftEvents = eventsList
        .filter((ev) => ev.status_event === 'draft')
        .sort(
          (a, b) =>
            new Date(b.diperbarui_pada || b.dibuat_pada || 0) -
            new Date(a.diperbarui_pada || a.dibuat_pada || 0)
        )
        .slice(0, 5)
        .map((ev) => ({
          id: ev.id_event,
          id_event: ev.id_event,
          title: ev.nama_event,
          lastEdited: formatTanggalIndo(ev.diperbarui_pada || ev.dibuat_pada),
          rawEvent: ev
        }))
      setDrafts(draftEvents)

      // 6. Request Publish EO yang Menunggu Validasi
      const eventLookup = new Map(eventsList.map((ev) => [ev.id_event, ev]))
      const pendingRequests = reqList
        .filter((r) => r.status_request === 'menunggu')
        .slice(0, 5)
        .map((r) => {
          const ev = eventLookup.get(r.id_event)
          return {
            id: r.id_request,
            eventId: r.id_event,
            title: ev?.nama_event || `Event #${r.id_event}`,
            author:
              ev?.nama_organizer || `Pengelola #${r.id_pengirim ?? '-'}`
          }
        })
      setRequests(pendingRequests)
    } catch (err) {
      console.error('Gagal memuat data dashboard admin:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  return (
    <div className="dashboard-container">
      <NavbarAdmin />

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
              {stats.activeEventsList.length > 0 ? (
                stats.activeEventsList.map((evt) => (
                  <span
                    key={evt.id}
                    className="tag"
                    style={{ backgroundColor: evt.color }}
                  >
                    {evt.name}
                  </span>
                ))
              ) : (
                <span className="card-subtext">
                  {isLoading ? 'Memuat...' : 'Belum ada event yang dipublish.'}
                </span>
              )}
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
              <button
                className="btn-cyan-small"
                onClick={() => navigate('/scraping')}
              >
                Laman Scrapping
              </button>
            </div>
            <div className="progress-header">
              <span className="progress-label">{stats.scrapingStatusText}</span>
              <span className="progress-percentage text-cyan">
                {stats.scrapingProgress}%
              </span>
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
                {stats.lastScraped.length > 0 ? (
                  stats.lastScraped.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))
                ) : (
                  <li>Belum ada hasil scraping selesai</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Section: Draft Belum Dipublish */}
        <section className="dash-section-card">
          <div className="section-header">
            <h3 className="section-title text-cyan">Draft Belum Dipublish</h3>
            <button
              className="btn-cyan"
              onClick={() => navigate('/daftar-event')}
            >
              Lihat Daftar Event
            </button>
          </div>
          <div className="list-container">
            {isLoading ? (
              <div className="list-item simple">
                <p className="item-sub">Memuat daftar draft...</p>
              </div>
            ) : drafts.length > 0 ? (
              drafts.map((draft) => (
                <div key={draft.id_event} className="list-item">
                  <div className="item-info">
                    <h4 className="item-title">{draft.title}</h4>
                    <p className="item-sub">
                      Terakhir diedit: {draft.lastEdited}
                    </p>
                  </div>
                  <button
                    className="btn-cyan-action"
                    onClick={() =>
                      navigate('/detail-event', {
                        state: {
                          eventId: draft.id_event,
                          id_event: draft.id_event,
                          eventTitle: draft.title,
                          eventData: draft.rawEvent
                        }
                      })
                    }
                  >
                    Lihat Detail
                  </button>
                </div>
              ))
            ) : (
              <div className="list-item simple">
                <p className="item-sub">
                  Semua draft sudah dipublish atau belum ada draft baru.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Section: Request Publish EO */}
        <section className="dash-section-card">
          <div className="section-header">
            <h3 className="section-title text-cyan">Request Publish EO</h3>
            <button
              className="btn-cyan"
              onClick={() => navigate('/daftar-validasi')}
            >
              Lihat Daftar Validasi
            </button>
          </div>
          <div className="list-container">
            {isLoading ? (
              <div className="list-item simple">
                <p className="item-sub">Memuat permintaan publish...</p>
              </div>
            ) : requests.length > 0 ? (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="list-item simple"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/daftar-validasi')}
                >
                  <div className="item-info">
                    <h4 className="item-title">{req.title}</h4>
                    <p className="item-sub">Oleh: {req.author}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="list-item simple">
                <p className="item-sub">
                  Tidak ada permintaan publish yang menunggu validasi.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default DashboardAdmin