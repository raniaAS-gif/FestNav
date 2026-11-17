import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ScrapingMonitor.css';
import NavbarScraping from '../components/NavbarScraping';

/* sumber_scraping: satu baris = satu job.
   status_job    : antri | berjalan | selesai | gagal | dibatalkan   (diubah otomatis oleh backend/bot)
   status_review : menunggu_review | disimpan | dibuang                (diubah admin di halaman Review) */
const TAHAP = ['Membuka halaman', 'Mengambil teks', 'Mengunduh denah', 'Upload gambar', 'Geocoding', 'Selesai'];
const STATUS_JOB = { antri: ['Antri', 'a'], berjalan: ['Berjalan', 'c'], selesai: ['Selesai', 'g'], gagal: ['Gagal', 'r'], dibatalkan: ['Dibatalkan', 'x'] };
const STATUS_REVIEW = { menunggu_review: ['Menunggu Review', 'w'], disimpan: ['Disimpan', 'g'], dibuang: ['Dibuang', 'r'] };
const SIBUK = ['antri', 'berjalan'];
const PER_HALAMAN = 5;

const hostDari = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } };
const thumb = (u) => (u?.includes('res.cloudinary.com') ? u.replace('/upload/', '/upload/c_fill,w_500,h_300,q_auto,f_auto/') : u);
const tglKey = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
const waktu = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso), jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  const hariIni = tglKey(new Date()), kemarin = tglKey(new Date(Date.now() - 864e5)), k = tglKey(d);
  if (k === hariIni) return `Hari ini ${jam}`;
  if (k === kemarin) return `Kemarin ${jam}`;
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })} ${jam}`;
};

const formatRentangTanggal = (mulai, selesai) => {
  const fmt = (tgl) =>
    tgl
      ? new Date(tgl).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        })
      : '';
  if (mulai && selesai && mulai !== selesai) return `${fmt(mulai)} – ${fmt(selesai)}`;
  return fmt(mulai) || '-';
};

/* ---------- API ----------
   Bawaan: simulasi di memori (job antri -> berjalan -> selesai berjalan sendiri, supaya perubahan status bisa dicoba).
   Ganti dengan httpApi saat backend siap: <ScrapingMonitor api={httpApi} />                       */
export const buatMockApi = (tick = 1500) => {
  let seq = 100;
  const timers = {};
  const hms = () => new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' }).replace(/\./g, ':');
  const gbr = (idEvent) => ['Hero situs', 'Banner utama', 'Foto panggung', 'Jadwal acara', 'Denah lokasi'].map((k, i) => ({ id_gambar: idEvent * 100 + i, url_gambar: '', keterangan: k, jenis_gambar: 'lainnya' }));
  const hasil = (url, nama) => ({ url_sumber: url, nama_event: nama, deskripsi: `${nama} hadir dengan banyak pertunjukan.`, tanggal_mulai: '2026-12-05', tanggal_selesai: '2026-12-06', lokasi_teks: 'Denpasar, Bali, ID',
    garis_lintang: -8.65, garis_bujur: 115.216, keyakinan_geocoding: 'ditemukan', gambar_kandidat: ['https://contoh.id/hero.png', 'https://contoh.id/banner.png'], adapter: 'generic', status: 'berhasil', pesan_error: null, peringatan: [], waktu_scrape: new Date().toISOString() });
  const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
  let events = { 1: { nama_event: 'Konser Malam Seni', gambar: gbr(1), poster_url: null, denah: null }, 2: { nama_event: 'Bazzar Akhir Tahun', gambar: [], poster_url: 'poster', denah: { nama_map: 'Peta Utama', gambar_layout: 'denah' } },
    3: { nama_event: 'Pameran Teknologi', gambar: [], poster_url: 'poster', denah: { nama_map: 'Peta Utama', gambar_layout: 'denah' } } };
  const J = (id, nama, url, st, p = {}) => ({ id_scraping: id, id_event: null, nama_event: null, dipicu_nama: 'Admin Esai', nama_sumber: nama, url_sumber: url, status_job: st, tahap_saat_ini: null, log_proses: '', pesan_error: null,
    hasil_mentah: null, status_review: 'menunggu_review', waktu_scraping: ago(60), waktu_selesai: null, update_terakhir: ago(60), ...p });
  let jobs = [
    J(1, 'Portal Tiket A', 'https://contoh-tiket.id/events', 'selesai', { id_event: 1, nama_event: 'Konser Malam Seni', tahap_saat_ini: 'Selesai', log_proses: '08:05:01 Membuka halaman\n08:05:30 Mengambil teks\n08:05:38 Selesai', hasil_mentah: hasil('https://contoh-tiket.id/events', 'Konser Malam Seni'), waktu_selesai: ago(55) }),
    J(2, 'Konser Kampus Bali', 'https://konser-kampus-bali.com/info-events', 'gagal', { tahap_saat_ini: 'Membuka halaman', log_proses: '21:40:02 Membuka halaman', pesan_error: 'Halaman tidak dapat dibuka (timeout 30 detik).', waktu_scraping: ago(1400), waktu_selesai: ago(1399) }),
    J(3, 'Akun komunitas', 'https://contoh-komunitas.id/agenda', 'selesai', { id_event: 2, nama_event: 'Bazzar Akhir Tahun', status_review: 'disimpan', tahap_saat_ini: 'Selesai', hasil_mentah: hasil('https://contoh-komunitas.id/agenda', 'Bazzar Akhir Tahun'), waktu_scraping: ago(300), waktu_selesai: ago(299) }),
    J(4, 'Poster Festival Seni', 'https://contoh-seni.com/festivals', 'selesai', { id_event: 3, nama_event: 'Pameran Teknologi', status_review: 'dibuang', tahap_saat_ini: 'Selesai', hasil_mentah: hasil('https://contoh-seni.com/festivals', 'Pameran Teknologi'), waktu_scraping: ago(500), waktu_selesai: ago(499) }),
    J(5, 'Info Lomba Bali', 'https://info-lomba-bali.com/lomba-bali', 'dibatalkan', { waktu_scraping: ago(900) }),
  ];
  const set = (id, p) => { jobs = jobs.map((j) => (j.id_scraping === id ? { ...j, ...p, update_terakhir: new Date().toISOString() } : j)); };
  const jalan = (id, gagalDi) => {
    let i = 0; const log = [];
    const langkah = () => {
      const j = jobs.find((x) => x.id_scraping === id); if (!j || j.status_job === 'dibatalkan') return;
      log.push(`${hms()} ${TAHAP[i]}`);
      if (gagalDi === i) return set(id, { status_job: 'gagal', tahap_saat_ini: TAHAP[i], log_proses: log.join('\n'), pesan_error: 'Halaman tidak dapat dibuka (contoh kegagalan).', waktu_selesai: new Date().toISOString() });
      if (i === TAHAP.length - 1) {
        const idEv = ++seq, nama = `Event dari ${hostDari(j.url_sumber)}`; events[idEv] = { nama_event: nama, gambar: gbr(idEv), poster_url: null, denah: null };
        return set(id, { status_job: 'selesai', tahap_saat_ini: 'Selesai', log_proses: log.join('\n'), id_event: idEv, nama_event: nama, hasil_mentah: hasil(j.url_sumber, nama), waktu_selesai: new Date().toISOString() });
      }
      set(id, { status_job: 'berjalan', tahap_saat_ini: TAHAP[i], log_proses: log.join('\n') }); i++; timers[id] = setTimeout(langkah, tick);
    };
    timers[id] = setTimeout(langkah, tick);
  };
  const baru = (nama, url) => { const id = ++seq; jobs = [...jobs, J(id, nama || hostDari(url), url, 'antri', { waktu_scraping: new Date().toISOString() })]; jalan(id, url.includes('gagal') ? 2 : null); return id; };
  return {
    list: async () => ({ jobs }),
    tambah: async ({ nama_sumber, url_sumber }) => { baru(nama_sumber, url_sumber); },
    batal: async (id) => { clearTimeout(timers[id]); set(id, { status_job: 'dibatalkan', waktu_selesai: new Date().toISOString() }); },
    ulang: async (id) => { const j = jobs.find((x) => x.id_scraping === id); baru(j.nama_sumber, j.url_sumber); },
    detail: async (id) => { const job = jobs.find((x) => x.id_scraping === id), ev = events[job.id_event] ?? { gambar: [] };
      return { job, event: { id_event: job.id_event, nama_event: job.nama_event }, gambar: ev.gambar, poster_url: ev.poster_url ?? null, denah: ev.denah ?? null }; },
    simpan: async (id) => set(id, { status_review: 'disimpan' }),
    buang: async (id) => set(id, { status_review: 'dibuang' }),
    /* khusus contoh tanpa backend: menyinkronkan poster & denah yang diatur di Galeri Gambar Event */
    simulasiLengkap: async (idEvent, { poster, denah } = {}) => {
      const e = events[idEvent];
      if (!e) return;
      if (poster && !e.poster_url) {
        e.poster_url = 'poster';
        e.gambar = e.gambar.slice(1);
      }
      if (denah && !e.denah) {
        e.denah = { nama_map: denah, gambar_layout: 'denah' };
        e.gambar = e.gambar.slice(1);
      }
    },
  };
};
const mockApi = buatMockApi();
const ok = (r) => { if (!r.ok) throw new Error(); return r; };
const H = { 'Content-Type': 'application/json' };
export const httpApi = {
  list: () => fetch('/api/scraping').then(ok).then((r) => r.json()),
  tambah: (b) => fetch('/api/scraping', { method: 'POST', headers: H, body: JSON.stringify(b) }).then(ok),
  batal: (id) => fetch(`/api/scraping/${id}/batal`, { method: 'POST' }).then(ok),
  ulang: (id) => fetch(`/api/scraping/${id}/ulang`, { method: 'POST' }).then(ok),
  detail: (id) => fetch(`/api/scraping/${id}`).then(ok).then((r) => r.json()),
  simpan: (id) => fetch(`/api/scraping/${id}/simpan`, { method: 'POST' }).then(ok),
  buang: (id) => fetch(`/api/scraping/${id}/buang`, { method: 'POST' }).then(ok),
};

function Header({ judul, namaAdmin }) {
  return (
    <>
      <NavbarScraping userName={namaAdmin} />
      <header className="sc-head">
        <h1 className="sc-title">{judul}</h1>
        <div className="sc-sub">Festival Navigation</div>
      </header>
    </>
  );
}

const Badge = ({ peta, k }) => <span className={`sc-badge ${peta[k][1]}`}>{peta[k][0]}</span>;
function Halaman({ total, aktif, onPilih }) {
  const n = Math.ceil(total / PER_HALAMAN); if (n <= 1) return <span />;
  return <nav className="sc-pg" aria-label="Halaman">{Array.from({ length: n }, (_, i) => i + 1).map((p) => <button key={p} className={p === aktif ? 'on' : ''} aria-current={p === aktif} onClick={() => onPilih(p)}>{p}</button>)}</nav>;
}
function Modal({ judul, bahaya, children, aksi, onTutup }) {
  return (
    <div className="sc-mbg" onClick={onTutup}>
      <div className={`sc-modal ${bahaya ? 'bahaya' : ''}`} role="dialog" aria-modal="true" aria-label={judul} onClick={(e) => e.stopPropagation()}>
        <h2>{judul}</h2>{children}<div className="sc-mact">{aksi}</div>
      </div>
    </div>
  );
}

export default function ScrapingMonitor({ namaAdmin = 'Admin Esai', api = mockApi, viewAwal = 'sumber', idAwal = null, onNavigasi, onBukaGaleri, interval = 4000 }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState(location.state?.view || viewAwal);          // sumber | hasil | tambah | review | lihat
  const [idAktif, setIdAktif] = useState(location.state?.idScraping ?? idAwal); // id_scraping yang sedang direview / dilihat
  const [jobs, setJobs] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cari, setCari] = useState('');
  const [hal, setHal] = useState({ sumber: 1, hasil: 1 });
  const [form, setForm] = useState({ nama_sumber: '', url_sumber: '' });
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);            // { tipe:'log'|'batal'|'buang', job }

  const muat = useCallback(() => api.list().then((r) => setJobs(r.jobs)), [api]);
  const flash = (t) => { setInfo(t); setTimeout(() => setInfo(''), 3500); };
  const go = (v, id = null) => { setView(v); setIdAktif(id); setDetail(null); setCari(''); setError(''); onNavigasi?.(v, id); };

  // Sinkronkan state ketika kembali dari /galeri
  useEffect(() => {
    if (location.state?.view) setView(location.state.view);
    if (location.state?.idScraping != null) setIdAktif(location.state.idScraping);
  }, [location.state]);

  useEffect(() => { muat().catch(() => setError('Gagal memuat daftar scraping.')).finally(() => setLoading(false)); }, [muat]);

  // status job berubah otomatis di backend -> baca ulang berkala selama ada job antri/berjalan
  useEffect(() => {
    if (!['sumber', 'hasil'].includes(view) || !jobs.some((j) => SIBUK.includes(j.status_job))) return undefined;
    const t = setInterval(() => muat().catch(() => {}), interval); return () => clearInterval(t);
  }, [view, jobs, muat, interval]);

  // halaman review/lihat: muat detail, dan muat ulang saat admin kembali dari Galeri Gambar Event
  const muatDetail = useCallback(() => api.detail(idAktif).then(setDetail).catch(() => setError('Gagal memuat detail event.')), [api, idAktif]);
  useEffect(() => {
    if (!['review', 'lihat'].includes(view) || idAktif == null) return undefined;
    muatDetail(); const f = () => muatDetail(); window.addEventListener('focus', f); document.addEventListener('visibilitychange', f);
    return () => { window.removeEventListener('focus', f); document.removeEventListener('visibilitychange', f); };
  }, [view, idAktif, muatDetail]);

  // Sinkronkan status poster & denah saat kembali dari Galeri Gambar Event (khusus mockApi)
  useEffect(() => {
    const posterBaru = location.state?.posterSudahDiatur && !detail?.poster_url;
    const denahBaru = location.state?.denahSudahDiatur && !detail?.denah;
    if ((posterBaru || denahBaru) && detail?.event?.id_event) {
      api
        .simulasiLengkap?.(detail.event.id_event, {
          poster: location.state?.posterSudahDiatur,
          denah: location.state?.denahSudahDiatur,
        })
        .then(() => muatDetail());
    }
  }, [location.state, detail, api, muatDetail]);

  const stat = { jalan: jobs.filter((j) => SIBUK.includes(j.status_job)).length, review: jobs.filter((j) => j.status_job === 'selesai' && j.id_event && j.status_review === 'menunggu_review').length,
    ok: jobs.filter((j) => j.status_job === 'selesai').length, gagal: jobs.filter((j) => j.status_job === 'gagal').length };
  const aksi = async (fn, pesan) => { setBusy(true); try { await fn(); await muat(); if (pesan) flash(pesan); } catch { setError('Aksi gagal. Coba lagi.'); } setBusy(false); setModal(null); };

  const mulai = async () => {
    const url = form.url_sumber.trim(); let u;
    try { u = new URL(url); } catch { return setFormErr('URL tidak valid. Contoh: https://contoh.com/events'); }
    if (!/^https?:$/.test(u.protocol)) return setFormErr('URL harus diawali http:// atau https://');
    if (jobs.some((j) => j.url_sumber === url && SIBUK.includes(j.status_job))) return setFormErr('URL ini sedang diproses. Tunggu sampai selesai.');
    setBusy(true); setFormErr('');
    try { await api.tambah({ nama_sumber: form.nama_sumber.trim() || null, url_sumber: url }); await muat(); setForm({ nama_sumber: '', url_sumber: '' }); setBusy(false); go('sumber'); flash('Scraping dimulai. Status akan berubah otomatis.'); }
    catch { setBusy(false); setFormErr('Gagal memulai scraping. Coba lagi.'); }
  };

  // Arahkan ke halaman Galeri Gambar Event (/galeri)
  const bukaGaleri = () => {
    if (onBukaGaleri) {
      onBukaGaleri(detail.event.id_event);
    } else {
      navigate('/galeri', {
        state: {
          from: '/scraping',
          idScraping: detail.job.id_scraping,
          idEvent: detail.event.id_event,
          namaEvent: detail.event.nama_event,
        },
      });
    }
  };

  // Simpan event dari Review Event dan arahkan ke /daftar-event (tab Hasil Scrapping) dengan format rapi
  const handleSimpanEvent = async (d) => {
    const mentah = d.job.hasil_mentah || {};
    const eventRapi = {
      id: d.event.id_event || Date.now(),
      title: mentah.nama_event || d.event.nama_event,
      type: 'scrapping',
      tags: [
        { label: 'Hasil Scrapping', color: '#00bcd4' },
        { label: 'Event Outdoor', color: '#38bdf8' },
      ],
      status: 'Draft',
      statusColor: '#3730a3',
      dateRange: formatRentangTanggal(mentah.tanggal_mulai, mentah.tanggal_selesai),
      description: mentah.deskripsi || '',
      location: mentah.lokasi_teks || '',
      sourceUrl: d.job.url_sumber,
      posterUrl: d.poster_url,
      denah: d.denah,
    };

    await aksi(() => api.simpan(d.job.id_scraping), 'Event disimpan.');
    navigate('/daftar-event', {
      state: {
        activeTab: 'scrapping',
        newEvent: eventRapi,
      },
    });
  };

  const q = cari.toLowerCase();
  const daftar = view === 'sumber'
    ? jobs.filter((j) => `${j.nama_sumber ?? ''} ${j.url_sumber}`.toLowerCase().includes(q))
    : jobs.filter((j) => j.status_job === 'selesai' && j.id_event && (j.nama_event ?? '').toLowerCase().includes(q));
  const urut = [...daftar].sort((a, b) => new Date(b.waktu_scraping) - new Date(a.waktu_scraping));
  const halAktif = Math.min(hal[view] ?? 1, Math.max(1, Math.ceil(urut.length / PER_HALAMAN)));
  const baris = urut.slice((halAktif - 1) * PER_HALAMAN, halAktif * PER_HALAMAN);

  /* ---------- Tambah sumber ---------- */
  if (view === 'tambah') return (
    <div className="sc-app">
      <Header judul="Tambah Sumber" namaAdmin={namaAdmin} />
      <main className="sc-body">
        <section className="sc-panel">
          <label htmlFor="url">URL <span className="req">*</span></label>
          <input id="url" className="sc-in" placeholder="https://contoh.com/events" value={form.url_sumber} onChange={(e) => { setForm({ ...form, url_sumber: e.target.value }); setFormErr(''); }} />
          <label htmlFor="nm">Nama Sumber</label>
          <input id="nm" className="sc-in" maxLength={100} placeholder={hostDari(form.url_sumber.trim()) ? `Kosongkan untuk memakai "${hostDari(form.url_sumber.trim())}"` : 'Nama sumber (opsional)'} value={form.nama_sumber} onChange={(e) => setForm({ ...form, nama_sumber: e.target.value })} />
          {formErr && <p className="sc-err" role="alert">{formErr}</p>}
          <p className="sc-help">Setelah disimpan, bot scraping dijalankan otomatis. Pantau statusnya di daftar sumber.</p>
        </section>
        <div className="sc-actions">
          <button className="sc-btn red" onClick={() => { setFormErr(''); go('sumber'); }} disabled={busy}>Batalkan</button>
          <button className="sc-btn" onClick={mulai} disabled={busy}>{busy ? 'Memulai…' : 'Mulai Scraping'}</button>
        </div>
      </main>
    </div>
  );

  /* ---------- Review / Lihat event ---------- */
  if (view === 'review' || view === 'lihat') {
    const review = view === 'review', d = detail, lengkap = !!(d?.poster_url && d?.denah);
    const mentah = d?.job?.hasil_mentah || {};

    return (
      <div className="sc-app">
        <Header judul={review ? 'Review Event' : 'Lihat Event'} namaAdmin={namaAdmin} />
        <main className="sc-body">
          {error && <p className="sc-banner err" role="alert">{error}</p>}
          {!d ? <p className="sc-state white">Memuat…</p> : (<>
            <div className="sc-evhead">
              <div>
                <h2>{d.event.nama_event}</h2>
                <div className="sc-meta">{d.job.url_sumber} · <Badge peta={STATUS_REVIEW} k={d.job.status_review} /></div>
              </div>
            </div>

            <section className="sc-panel">
              {review ? (
                <>
                  <div className="sc-ph">
                    <h3>Hasil Mentah (JSON)</h3>
                    <button className="sc-btn-s" onClick={() => navigator.clipboard?.writeText(JSON.stringify(d.job.hasil_mentah, null, 2)).then(() => flash('JSON disalin'))}>Salin</button>
                  </div>
                  <pre className="sc-json" tabIndex={0} aria-label="Hasil mentah JSON">{d.job.hasil_mentah ? JSON.stringify(d.job.hasil_mentah, null, 2) : 'Tidak ada hasil mentah.'}</pre>
                </>
              ) : (
                <>
                  <div className="sc-ph">
                    <h3>Detail Event</h3>
                  </div>
                  <div style={{ display: 'grid', gap: '10px', fontSize: '14px', lineHeight: 1.6 }}>
                    <div><strong>Nama Event:</strong> {mentah.nama_event || d.event.nama_event}</div>
                    <div><strong>Deskripsi:</strong> {mentah.deskripsi || '-'}</div>
                    <div><strong>Tanggal Event:</strong> {formatRentangTanggal(mentah.tanggal_mulai, mentah.tanggal_selesai)}</div>
                    <div><strong>Lokasi:</strong> {mentah.lokasi_teks || '-'}</div>
                    <div><strong>URL Sumber:</strong> {d.job.url_sumber}</div>
                  </div>
                </>
              )}
            </section>

            <section className="sc-panel">
              <div className="sc-ph"><h3>Gambar Hasil Scraping ({d.gambar.length})</h3>
                {review && <button className="sc-btn cta" onClick={bukaGaleri}>Buka Galeri Gambar Event</button>}</div>
              {d.gambar.length ? (
                <div className="sc-gal">{d.gambar.map((g) => (
                  <figure key={g.id_gambar}>{g.url_gambar ? <img src={thumb(g.url_gambar)} alt={g.keterangan ?? ''} loading="lazy" /> : <div className="ph" role="img" aria-label={g.keterangan ?? ''} />}<figcaption>{g.keterangan}</figcaption></figure>))}</div>
              ) : <p className="sc-state">Tidak ada gambar tersisa di galeri.</p>}
              <p className="sc-help">Semua gambar hasil scraping tersimpan lebih dulu di Galeri Gambar Event dengan jenis "Lainnya".</p>
            </section>

            <section className="sc-panel">
              <h3>Kelengkapan</h3>
              <ul className="sc-check">
                <li className={d.poster_url ? 'ya' : ''}><span aria-hidden="true">{d.poster_url ? '✓' : '○'}</span> Poster {d.poster_url ? 'sudah diatur' : 'belum diatur'}</li>
                <li className={d.denah ? 'ya' : ''}><span aria-hidden="true">{d.denah ? '✓' : '○'}</span> Denah {d.denah ? `sudah diatur (${d.denah.nama_map})` : 'belum diatur'}</li>
              </ul>
              {review && !lengkap && <p className="sc-help">Tombol Simpan aktif setelah satu gambar dijadikan poster dan satu gambar dijadikan denah di Galeri Gambar Event.</p>}
            </section>

            <div className="sc-actions">
              {review ? (<>
                <button className="sc-btn ghost" onClick={() => go('hasil')} disabled={busy}>Kembali</button>
                <button className="sc-btn red" onClick={() => setModal({ tipe: 'buang', job: d.job })} disabled={busy}>Buang</button>
                <button className="sc-btn" disabled={!lengkap || busy} title={lengkap ? '' : 'Atur poster dan denah dulu'} onClick={() => handleSimpanEvent(d)}>Simpan</button>
              </>) : (
                <button className="sc-btn" onClick={() => go('hasil')}>Kembali</button>
              )}
            </div>
          </>)}
        </main>
        {info && <p className="sc-toast" role="status">{info}</p>}
        {modal?.tipe === 'buang' && (
          <Modal judul="Buang hasil scraping ini?" bahaya onTutup={() => setModal(null)}
            aksi={<><button className="sc-btn ghost" onClick={() => setModal(null)}>Batal</button><button className="sc-btn red" disabled={busy} onClick={() => aksi(() => api.buang(modal.job.id_scraping), 'Event dibuang.').then(() => go('hasil'))}>Buang</button></>}>
            <p>"{modal.job.nama_event}" ditandai dibuang dan tidak akan diproses lebih lanjut.</p>
          </Modal>)}
      </div>
    );
  }

  /* ---------- Sumber & Hasil scrapping ---------- */
  const isSumber = view === 'sumber';
  return (
    <div className="sc-app">
      <Header judul="Monitor Scrapping" namaAdmin={namaAdmin} />
      <nav className="sc-tabs">
        <button className={`sc-tab ${isSumber ? 'on' : ''}`} onClick={() => go('sumber')}>Sumber Scrapping</button>
        <button className={`sc-tab ${!isSumber ? 'on' : ''}`} onClick={() => go('hasil')}>Hasil Scrapping</button>
      </nav>
      <main className="sc-body">
        <div className="sc-stats">
          {[['Sedang Berjalan', stat.jalan, '#06b6d4'], ['Menunggu Review', stat.review, '#f59e0b'], ['Berhasil', stat.ok, '#10b981'], ['Gagal', stat.gagal, '#d60000']].map(([l, n, c]) => (
            <div key={l} className="sc-stat"><b style={{ color: c }}>{l}</b><span style={{ color: c }}>{n}</span></div>))}
        </div>
        <div className="sc-row">
          <input className="sc-search" aria-label="Cari" placeholder={isSumber ? 'Cari sumber scrapping..' : 'Cari hasil scrapping..'} value={cari} onChange={(e) => { setCari(e.target.value); setHal({ sumber: 1, hasil: 1 }); }} />
          <button className="sc-btn" onClick={() => go('tambah')}>+ Tambah Sumber</button>
        </div>
        {error && <p className="sc-banner err" role="alert">{error}</p>}
        {info && <p className="sc-banner ok" role="status">{info}</p>}

        <div className="sc-card">
          {loading ? <p className="sc-state">Memuat…</p> : isSumber ? (
            <table className="sc-table">
              <thead><tr><th>NAMA SUMBER</th><th>URL</th><th>TERAKHIR BERJALAN</th><th>STATUS JOB</th><th>AKSI</th></tr></thead>
              <tbody>
                {baris.map((j) => (
                  <tr key={j.id_scraping}>
                    <td className="sc-name">{j.nama_sumber ?? '-'}</td>
                    <td className="sc-url">{j.url_sumber}</td>
                    <td>{j.status_job === 'antri' ? <span className="sc-muted">Belum berjalan</span> : waktu(j.waktu_selesai ?? j.waktu_scraping)}</td>
                    <td><Badge peta={STATUS_JOB} k={j.status_job} />{j.status_job === 'berjalan' && j.tahap_saat_ini && <div className="sc-tahap">{j.tahap_saat_ini}…</div>}</td>
                    <td className="sc-aksi">
                      {SIBUK.includes(j.status_job) && <button className="sc-btn-s red" onClick={() => setModal({ tipe: 'batal', job: j })}>Batalkan</button>}
                      {['gagal', 'dibatalkan'].includes(j.status_job) && <button className="sc-btn-s on" disabled={busy} onClick={() => aksi(() => api.ulang(j.id_scraping), 'Scraping dijalankan ulang.')}>Jalankan Ulang</button>}
                      <button className="sc-btn-s" onClick={() => setModal({ tipe: 'log', job: j })}>Log</button>
                    </td>
                  </tr>))}
                {!baris.length && <tr><td colSpan="5" className="sc-state">{jobs.length ? 'Sumber tidak ditemukan.' : 'Belum ada sumber. Klik "+ Tambah Sumber".'}</td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="sc-table">
              <thead><tr><th>NAMA EVENT</th><th>STATUS</th><th className="c">AKSI</th></tr></thead>
              <tbody>
                {baris.map((j) => (
                  <tr key={j.id_scraping}>
                    <td className="sc-name">{j.nama_event}</td>
                    <td><Badge peta={STATUS_REVIEW} k={j.status_review} /></td>
                    <td className="c">{j.status_review === 'menunggu_review' ? <button className="sc-btn-s on" onClick={() => go('review', j.id_scraping)}>Review</button> : <button className="sc-btn-s" onClick={() => go('lihat', j.id_scraping)}>Lihat</button>}</td>
                  </tr>))}
                {!baris.length && <tr><td colSpan="3" className="sc-state">Belum ada hasil scraping.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
        <div className="sc-foot"><Halaman total={urut.length} aktif={halAktif} onPilih={(p) => setHal({ ...hal, [view]: p })} /></div>
      </main>

      {modal?.tipe === 'log' && (
        <Modal judul={`Log: ${modal.job.nama_sumber ?? modal.job.url_sumber}`} onTutup={() => setModal(null)} aksi={<button className="sc-btn" onClick={() => setModal(null)}>Tutup</button>}>
          {modal.job.pesan_error && <p className="sc-err" role="alert">{modal.job.pesan_error}</p>}
          <pre className="sc-json" tabIndex={0}>{modal.job.log_proses || 'Belum ada log.'}</pre>
        </Modal>)}
      {modal?.tipe === 'batal' && (
        <Modal judul="Batalkan scraping ini?" bahaya onTutup={() => setModal(null)}
          aksi={<><button className="sc-btn ghost" onClick={() => setModal(null)}>Tidak</button><button className="sc-btn red" disabled={busy} onClick={() => aksi(() => api.batal(modal.job.id_scraping), 'Scraping dibatalkan.')}>Batalkan</button></>}>
          <p>{modal.job.nama_sumber ?? modal.job.url_sumber} akan dihentikan pada tahap berikutnya.</p>
        </Modal>)}
    </div>
  );
}