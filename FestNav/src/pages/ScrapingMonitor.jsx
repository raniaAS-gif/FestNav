import { useState } from 'react';
import './ScrapingMonitor.css';
import NavbarScraping from '../components/NavbarScraping';

/* ---------- data awal (ganti dengan data dari API) ---------- */
const SUMBER_AWAL = [
  { id: 1, nama: 'Portal Tiket A', url: 'contoh-tiket.id/events', terakhir: 'Hari ini 08.05', hasil: 'Berhasil', aktif: true },
  { id: 2, nama: 'Konser Kampus Bali', url: 'konser-kampus-bali.com/info-events', terakhir: 'Kemarin 21.40', hasil: 'Gagal', aktif: true },
  { id: 3, nama: 'Akun komunitas', url: 'contoh-komunitas.id/agenda', terakhir: 'Hari ini 07.00', hasil: 'Berhasil', aktif: true },
  { id: 4, nama: 'Poster Festival Seni', url: 'contoh-seni.com/festivals', terakhir: 'Hari ini 07.30', hasil: 'Berhasil', aktif: false },
];
const DESK = 'ini adalah itu, itu adalah ini, lalu dia adalah saya, saya adalh kami, kami adalah rambut, rambut adalah bok, bok adalah sayuran, sayuran adalah nama gang, dan lain sebagainya.';
const mk = (id, nama, tanggal, denah, lokasi, status) => ({
  id, nama, tanggal, denah, lokasi, status, lokasiEvent: 'Lapangan Bajra Sandhi', jenis: 'Outdoor',
  sumber: 'Scrapping', deskripsi: DESK, namaDenah: 'Lapangan Bajra Sandhi',
});
const EVENT_AWAL = [
  mk(1, 'Konser Malam Seni', '28 November 2026', true, 'Ditemukan', 'Menunggu Review'),
  mk(2, 'Bazzar Akhir Tahun', '5 Desember 2026', false, 'Perlu cek', 'Menunggu Review'),
  mk(3, 'Pameran Teknologi', '18 Desember 2026', true, 'Ditemukan', 'Menunggu Review'),
  mk(4, 'Pagelaran Budaya Tradisional', '4 November 2026', true, 'Ditemukan', 'Sudah Ada'),
  mk(5, 'Festival Musik Kampus', '2 Januari 2025', false, 'Perlu cek', 'Dibuang'),
];
const STATUS_CLS = { 'Menunggu Review': 'w', 'Sudah Ada': 'c2', Dibuang: 'r' };

/* ---------- komponen kecil ---------- */
function Header({ judul, sub = 'Festival Navigation' }) {
  return (
    <>
      <NavbarScraping userName="Admin Esai" />
      <header className="sc-head">
        <h1 className="sc-title" style={{ margin: '0 0 0 32px' }}>{judul}</h1>
        <div className="sc-sub">{sub}</div>
      </header>
    </>
  );
}
function Pagination() {
  const [p, setP] = useState(1);
  return (
    <nav className="sc-pg" aria-label="Halaman">
      {[1, 2, 3, 4, 5].map((n) => <button key={n} className={p === n ? 'on' : ''} onClick={() => setP(n)}>{n}</button>)}
      <button disabled aria-hidden>…</button>
    </nav>
  );
}
function Stats({ s }) {
  return (
    <div className="sc-stats">
      <div className="sc-stat"><b style={{ color: '#06b6d4' }}>Sumber Aktif</b><span style={{ color: '#06b6d4' }}>{s.aktif}</span></div>
      <div className="sc-stat"><b style={{ color: '#f59e0b' }}>Menunggu Review</b><span style={{ color: '#f59e0b' }}>{s.review}</span></div>
      <div className="sc-stat"><b style={{ color: '#10b981' }}>Berhasil</b><span style={{ color: '#10b981' }}>{s.ok}</span></div>
      <div className="sc-stat"><b style={{ color: '#d60000' }}>Gagal</b><span style={{ color: '#d60000' }}>{s.gagal}</span></div>
    </div>
  );
}
const Denah = () => (
  <div className="sc-map" role="img" aria-label="Denah acara">
    <svg viewBox="0 0 720 410">
      {[['#8b5cf6', '395,15 525,25 545,85 500,125 410,125 385,70', 'P1', 462, 72],
        ['#f59e0b', '285,45 360,75 350,170 280,150', 'F1', 320, 115],
        ['#10b981', '515,150 590,160 580,215 510,210', 'B1', 550, 183],
        ['#0ea5e9', '315,185 385,195 372,235 305,222', 'T1', 345, 210],
        ['#475569', '385,225 470,250 455,320 385,285', '', 0, 0],
        ['#f43f5e', '500,235 565,235 563,285 498,283', 'V1', 531, 260]].map(([c, pts, l, x, y], i) => (
        <g key={i}>
          <polygon points={pts} fill={c} fillOpacity=".35" stroke={c} strokeWidth="2" />
          {l && <><circle cx={x} cy={y} r="13" fill={c} stroke="#fff" strokeWidth="2" /><text x={x} y={y + 4} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{l}</text></>}
        </g>
      ))}
    </svg>
  </div>
);

/* ---------- layar utama ---------- */
export default function ScrapingMonitor() {
  // view: sumber | hasil | tambah | review | lihat | edit
  const [view, setView] = useState('sumber');
  const [sumber, setSumber] = useState(SUMBER_AWAL);
  const [events, setEvents] = useState(EVENT_AWAL);
  const [cari, setCari] = useState('');
  const [aktifId, setAktifId] = useState(null); // event yang dibuka
  const [kembaliEdit, setKembaliEdit] = useState('review');
  const [form, setForm] = useState({ nama: '', url: '', wilayah: '' });
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState(null);

  const stats = {
    aktif: sumber.filter((s) => s.aktif).length,
    review: events.filter((e) => e.status === 'Menunggu Review').length,
    ok: sumber.filter((s) => s.hasil === 'Berhasil').length,
    gagal: sumber.filter((s) => s.hasil === 'Gagal').length,
  };
  const ev = events.find((e) => e.id === aktifId);
  const ubahEv = (patch) => setEvents(events.map((e) => (e.id === aktifId ? { ...e, ...patch } : e)));
  const q = cari.toLowerCase();

  const simpanSumber = () => {
    if (!form.nama.trim() || !form.url.trim()) return setErr('Nama sumber dan URL wajib diisi.');
    setSumber([...sumber, { id: Date.now(), ...form, nama: form.nama.trim(), terakhir: null, hasil: null, aktif: false }]);
    setForm({ nama: '', url: '', wilayah: '' }); setErr(''); setView('sumber');
  };
  const buka = (id, v) => { setAktifId(id); setView(v); };
  const selesai = (status) => { if (status) ubahEv({ status }); setView('hasil'); };
  const bukaEdit = () => { setDraft({ ...ev }); setKembaliEdit(view); setView('edit'); };
  const simpanEdit = () => { ubahEv(draft); setView(kembaliEdit); };

  /* ---- Tambah sumber ---- */
  if (view === 'tambah') return (
    <div className="sc-app">
      <Header judul="Tambah Sumber" />
      <main className="sc-body">
        <section className="sc-panel">
          {[['nama', 'Nama Sumber', 'Nama sumber..'], ['url', 'URL', 'URL..'], ['wilayah', 'Wilayah & domain diizinkan', 'Wilayah & domain diizinkan...']].map(([k, l, ph]) => (
            <div key={k}><label htmlFor={k}>{l}</label>
              <input id={k} className="sc-in" placeholder={ph} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
          ))}
          {err && <p className="sc-err" role="alert">{err}</p>}
        </section>
        <div className="sc-actions">
          <button className="sc-btn red" onClick={() => { setErr(''); setView('sumber'); }}>Batalkan</button>
          <button className="sc-btn" onClick={simpanSumber}>Simpan</button>
        </div>
      </main>
    </div>
  );

  /* ---- Review / Lihat event ---- */
  if ((view === 'review' || view === 'lihat') && ev) return (
    <div className="sc-app">
      <Header judul={view === 'review' ? 'Review Event' : 'Lihat Event'} />
      <main className="sc-body">
        <div className="sc-evhead">
          <span>{ev.nama}</span>
          <div><button className="sc-btn red" onClick={() => selesai('Dibuang')}>Buang</button><button className="sc-btn" onClick={bukaEdit}>Edit Detail</button></div>
        </div>
        <section className="sc-panel">
          <div className="sc-detail">
            <div className="sc-big" aria-label="Poster event">FEST</div>
            <div className="sc-info">
              <p><b>Nama Event:</b> {ev.nama}</p><p><b>Tanggal Event:</b> {ev.tanggal}</p>
              <p><b>Lokasi Event:</b> {ev.lokasiEvent}</p><p><b>Jenis Event:</b> {ev.jenis}</p>
              <p><b>Sumber:</b> {ev.sumber}</p><p><b>Status:</b> {ev.status === 'Sudah Ada' ? 'Sudah dipublish' : 'Belum dipublish'}</p>
              <p style={{ lineHeight: 1.4, marginTop: 8 }}><b>Deskripsi Singkat:</b><br />{ev.deskripsi}</p>
            </div>
          </div>
          <h2 className="sc-h2">Denah Acara</h2>
          <h3 style={{ margin: '0 0 8px', fontSize: 22 }}>{ev.namaDenah}</h3>
          <Denah />
          <div className="sc-center"><button className="sc-btn" onClick={() => alert('Arahkan ke halaman Map Editor, mis. navigate("/map-editor")')}>Buka Map Editor</button></div>
        </section>
        <div className="sc-actions">
          <button className="sc-btn red" onClick={() => selesai('Dibuang')}>Tolak</button>
          <button className="sc-btn" onClick={() => selesai('Sudah Ada')}>Simpan</button>
        </div>
      </main>
    </div>
  );

  /* ---- Edit event ---- */
  if (view === 'edit' && draft) {
    const set = (k, v) => setDraft({ ...draft, [k]: v });
    const Sel = ({ k, label, opsi }) => (
      <><label htmlFor={k}>{label}</label><div className="sc-sel"><select id={k} className="sc-in" value={draft[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="">Belum dipilih</option>{opsi.map((o) => <option key={o}>{o}</option>)}</select></div></>
    );
    return (
      <div className="sc-app">
        <Header judul="Edit Event" />
        <main className="sc-body">
          <section className="sc-panel">
            <div className="sc-form2">
              <div className="sc-big" style={{ width: 260, height: 330 }}>FEST</div>
              <div>
                <label htmlFor="nm">Nama Event</label><input id="nm" className="sc-in" value={draft.nama} onChange={(e) => set('nama', e.target.value)} />
                <label htmlFor="tg">Tanggal Event</label><input id="tg" className="sc-in" value={draft.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
                <label htmlFor="lk">Lokasi Event</label><input id="lk" className="sc-in" value={draft.lokasiEvent} onChange={(e) => set('lokasiEvent', e.target.value)} />
                <Sel k="jenis" label="Jenis Event" opsi={['Outdoor', 'Indoor']} />
                <Sel k="sumber" label="Sumber" opsi={['Scrapping', 'Manual']} />
              </div>
            </div>
            <label htmlFor="ds">Deskripsi Singkat</label>
            <textarea id="ds" className="sc-in" value={draft.deskripsi} onChange={(e) => set('deskripsi', e.target.value)} />
            <h2 className="sc-h2" style={{ textAlign: 'left', margin: '26px 0 4px', fontSize: 34 }}>Denah Acara</h2>
            <label htmlFor="nd">Nama Denah</label><input id="nd" className="sc-in" value={draft.namaDenah} onChange={(e) => set('namaDenah', e.target.value)} />
            <label>Gambar Denah</label><Denah />
            <button className="sc-drop" onClick={() => alert('Buka dialog pilih file denah')}><i>+</i><span>Klik di bagian ini untuk menambahkan denah baru</span></button>
          </section>
          <div className="sc-actions"><button className="sc-btn" onClick={simpanEdit}>Simpan</button></div>
        </main>
      </div>
    );
  }

  /* ---- Sumber & Hasil scrapping ---- */
  const isSumber = view === 'sumber';
  return (
    <div className="sc-app">
      <Header judul="Monitor Scrapping" />
      <nav className="sc-tabs">
        <button className={`sc-tab ${isSumber ? 'on' : ''}`} onClick={() => setView('sumber')}>Sumber Scrapping</button>
        <button className={`sc-tab ${!isSumber ? 'on' : ''}`} onClick={() => setView('hasil')}>Hasil Scrapping</button>
      </nav>
      <main className="sc-body">
        <Stats s={stats} />
        <div className="sc-row">
          <input className="sc-search" placeholder={isSumber ? 'Cari sumber scrapping..' : 'Cari hasil scrapping..'} value={cari} onChange={(e) => setCari(e.target.value)} />
          <button className="sc-btn" onClick={() => setView('tambah')}>+ Tambah Sumber</button>
        </div>

        <div className="sc-card">
          {isSumber ? (
            <table className="sc-table">
              <thead><tr><th>NAMA SUMBER</th><th>URL</th><th>TERAKHIR BERJALAN</th><th>AKTIF</th></tr></thead>
              <tbody>
                {sumber.filter((s) => s.nama.toLowerCase().includes(q)).map((s) => (
                  <tr key={s.id}>
                    <td className="sc-name">{s.nama}</td><td>{s.url}</td>
                    <td><span className={`sc-badge ${s.hasil === 'Berhasil' ? 'g' : 'r'}`}>{s.hasil ? `${s.terakhir} - ${s.hasil}` : 'Belum Berjalan'}</span></td>
                    <td><button role="switch" aria-checked={s.aktif} aria-label={`Aktifkan ${s.nama}`} className="sc-sw"
                      onClick={() => setSumber(sumber.map((x) => (x.id === s.id ? { ...x, aktif: !x.aktif } : x)))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="sc-table">
              <thead><tr><th>POSTER</th><th>EVENT</th><th className="c">DENAH</th><th className="c">LOKASI</th><th className="c">STATUS</th><th className="c">AKSI</th></tr></thead>
              <tbody>
                {events.filter((e) => e.nama.toLowerCase().includes(q)).map((e) => (
                  <tr key={e.id}>
                    <td><div className="sc-poster">FEST</div></td>
                    <td><div className="sc-evn">{e.nama}</div><div style={{ fontSize: 14 }}>{e.tanggal.replace('ember', '').replace('uari', '').replace('November', 'Nov')}</div></td>
                    <td className="c"><span className={`sc-badge ${e.denah ? 'g' : 'r'}`}>{e.denah ? 'Ada' : 'Tidak Ada'}</span></td>
                    <td className="c"><span className={`sc-badge ${e.lokasi === 'Ditemukan' ? 'g' : 'r'}`}>{e.lokasi}</span></td>
                    <td className="c"><span className={`sc-badge ${STATUS_CLS[e.status]}`}>{e.status}</span></td>
                    <td className="c">{e.status === 'Menunggu Review'
                      ? <button className="sc-btn-s on" onClick={() => buka(e.id, 'review')}>Review</button>
                      : <button className="sc-btn-s" onClick={() => buka(e.id, 'lihat')}>Lihat</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="sc-foot">
          <button className="sc-back" aria-label="Kembali" onClick={() => setView('sumber')}>←</button>
          <Pagination />
        </div>
      </main>
    </div>
  );
}
