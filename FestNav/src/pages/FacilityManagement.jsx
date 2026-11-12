import { useState } from 'react';
import './common.css';
import './FacilityManagement.css';

const JENIS = [
  { nama: 'Fasilitas Umum', warna: '#0ea5e9' },
  { nama: 'Kuliner', warna: '#f59e0b' },
  { nama: 'Panggung / Stage', warna: '#5b4de6' },
  { nama: 'Parkir', warna: '#94a3b8' },
  { nama: 'VIP', warna: '#dc0000' },
  { nama: 'Bazzar / Tenant', warna: '#10b981' },
];
const MARKERS = ['T1', 'T2', 'F1', 'P1', 'K2', 'V1', 'B12'];
const AWAL = [
  { id: 1, nama: 'Toilet Utara', jenis: 'Fasilitas Umum', marker: 'T1' },
  { id: 2, nama: 'Food Court A', jenis: 'Kuliner', marker: 'F1' },
  { id: 3, nama: 'Panggung Utama', jenis: 'Panggung / Stage', marker: 'P1' },
  { id: 4, nama: 'Parkir Timur', jenis: 'Parkir', marker: 'K2' },
  { id: 5, nama: 'Area VIP', jenis: 'VIP', marker: 'V1' },
  { id: 6, nama: 'Bazzar Tenant 12', jenis: 'Bazzar / Tenant', marker: '' },
];
const warnaJenis = (n) => JENIS.find((j) => j.nama === n)?.warna;

export function NavBar({ aktif }) {
  const menu = ['Map Editor', 'Galeri Gambar Event', 'Manajemen Fasilitas'];
  return (
    <header className="fn-nav">
      <div className="fn-logo">FestNav</div>
      <nav className="fn-links">
        {menu.map((m) => <a key={m} href="#" className={m === aktif ? 'active' : ''}>{m}</a>)}
      </nav>
      <div className="fn-user"><div className="fn-avatar" /><button className="fn-logout" aria-label="Keluar">⎋</button></div>
    </header>
  );
}

/* Dropdown dengan kotak warna (field Jenis) */
function JenisSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dd">
      <button type="button" className="field" style={{ textAlign: 'left' }} onClick={() => setOpen(!open)}>
        {value || <span className="placeholder">Pilih jenis fasilitas..</span>}
      </button>
      {open && (
        <div className="dd-list">
          {JENIS.map((j) => (
            <button key={j.nama} type="button" onClick={() => { onChange(j.nama); setOpen(false); }}>
              <span className="dot" style={{ background: j.warna }} />{j.nama}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FacilityManagement() {
  const [data, setData] = useState(AWAL);
  const [cari, setCari] = useState('');
  const [modeHapus, setModeHapus] = useState(false);
  const [dipilih, setDipilih] = useState([]);
  const [modal, setModal] = useState(null); // {tipe:'tambah'|'edit'|'hapus', form}

  const tampil = data.filter((d) => d.nama.toLowerCase().includes(cari.toLowerCase()));
  const tutup = () => setModal(null);
  const setForm = (k, v) => setModal((m) => ({ ...m, form: { ...m.form, [k]: v } }));

  const simpan = () => {
    const f = modal.form;
    if (!f.nama?.trim() || !f.jenis) return;
    if (modal.tipe === 'tambah') setData([...data, { ...f, id: Date.now() }]);
    else setData(data.map((d) => (d.id === f.id ? f : d)));
    tutup();
  };

  const klikHapus = () => {
    if (!modeHapus) return setModeHapus(true);
    if (dipilih.length === 0) { setModeHapus(false); return; }
    setModal({ tipe: 'hapus' });
  };
  const konfirmasiHapus = () => {
    setData(data.filter((d) => !dipilih.includes(d.id)));
    setDipilih([]); setModeHapus(false); tutup();
  };
  const toggle = (id) => setDipilih((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="fn-app">
      <NavBar aktif="Manajemen Fasilitas" />
      <div className="fn-sub">
        <span className="fn-title">Dies Natalis Udayana 2026</span>
        <div className="fn-actions">
          <button className={`btn btn-red ${modeHapus ? 'on' : ''}`} onClick={klikHapus}>Hapus</button>
          <button className={`btn btn-primary ${modal?.tipe === 'tambah' ? 'on' : ''}`}
            onClick={() => setModal({ tipe: 'tambah', form: { nama: '', jenis: '', marker: '' } })}>Tambah</button>
        </div>
      </div>

      <input className="search" placeholder="Cari fasilitas..." value={cari} onChange={(e) => setCari(e.target.value)} />

      <div className="fac-table">
        <div className="fac-row"><span>NAMA</span><span>JENIS</span><span>MARKER</span><span /></div>
        {tampil.map((d) => (
          <div className="fac-row" key={d.id}>
            <b>{d.nama}</b>
            <span className="jenis"><span className="dot" style={{ background: warnaJenis(d.jenis) }} />{d.jenis}</span>
            <span className={d.marker ? '' : 'placeholder'}>{d.marker || 'Tautkan marker'}</span>
            {modeHapus ? (
              <button className="check" aria-label={`Pilih ${d.nama}`} onClick={() => toggle(d.id)}>
                {dipilih.includes(d.id) ? '✓' : ''}
              </button>
            ) : (
              <button className="btn-edit" onClick={() => setModal({ tipe: 'edit', form: { ...d } })}>Edit</button>
            )}
          </div>
        ))}
        {tampil.length === 0 && <div className="empty">Fasilitas tidak ditemukan. Coba kata kunci lain.</div>}
      </div>

      {modal && (
        <div className="overlay" onClick={tutup}>
          <div className={`modal ${modal.tipe === 'hapus' ? 'danger' : ''}`} onClick={(e) => e.stopPropagation()}>
            {modal.tipe === 'hapus' ? (
              <>
                <h2>Hapus Fasilitas</h2>
                {data.filter((d) => dipilih.includes(d.id)).map((d) => (
                  <div key={d.id}>
                    <label>Nama fasilitas</label><div className="field" style={{ lineHeight: '44px' }}>{d.nama}</div>
                    <label>Jenis</label><div className="field" style={{ lineHeight: '44px' }}>{d.jenis}</div>
                    <label>Marker</label><div className="field" style={{ lineHeight: '44px' }}>{d.marker || <span className="placeholder">Tautkan marker..</span>}</div>
                  </div>
                ))}
                <div className="modal-actions">
                  <button className="btn btn-red" onClick={tutup}>Batal</button>
                  <button className="btn btn-red on" onClick={konfirmasiHapus}>Hapus</button>
                </div>
              </>
            ) : (
              <>
                <h2>{modal.tipe === 'tambah' ? 'Tambah Fasilitas' : 'Edit Fasilitas'}</h2>
                <label>Nama fasilitas</label>
                <input className="field" placeholder="Masukkan nama fasilitas.." value={modal.form.nama} onChange={(e) => setForm('nama', e.target.value)} />
                <label>Jenis</label>
                <JenisSelect value={modal.form.jenis} onChange={(v) => setForm('jenis', v)} />
                <label>Marker</label>
                <select className="field" value={modal.form.marker} onChange={(e) => setForm('marker', e.target.value)}>
                  <option value="">Tautkan marker..</option>
                  {MARKERS.map((m) => <option key={m}>{m}</option>)}
                </select>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={tutup}>Batal</button>
                  <button className="btn btn-solid" onClick={simpan}>{modal.tipe === 'tambah' ? 'Tambah' : 'Simpan'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
