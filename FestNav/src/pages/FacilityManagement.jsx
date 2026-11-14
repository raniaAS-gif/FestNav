import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import './common.css';
import './FacilityManagement.css';
import NavbarEditing from '../components/NavbarEditing';

export const JENIS_ZONA = {
  'Panggung / Stage': '#8b5cf6', Kuliner: '#f59e0b', 'Bazzar / Tenant': '#10b981',
  'Fasilitas Umum': '#0ea5e9', Parkir: '#64748b', VIP: '#f43f5e',
};

const JENIS = Object.keys(JENIS_ZONA);
const STATUS = [['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']]; // sesuaikan dengan nilai kolom fasilitas.status
const KOSONG = { id_map: '', nama_fasilitas: '', jenis_fasilitas: '', nama_penanda: '', deskripsi: '', status: 'aktif' };

/* ---------- API ----------
   fasilitas + penanda_lokasi dibuat/diubah/dihapus bersamaan (satu transaksi di backend).
   Bawaan: data tiruan di memori. Ganti dengan httpApi saat backend siap. */
const PETA = [{ id_map: 1, nama_map: 'Day 1: Lapangan Rektorat' }, { id_map: 2, nama_map: 'Day 2: Gedung Rektorat' }];
const F = (id, nama, jenis, mk, placed = true) => ({ id_fasilitas: id, id_map: 1, nama_fasilitas: nama, jenis_fasilitas: jenis, deskripsi: '', status: 'aktif',
  penanda: { id_penanda: id, nama_penanda: mk, garis_lintang: placed ? -8.6724 : null, garis_bujur: placed ? 115.2362 : null } });
const mockApi = (() => {
  let rows = [F(1, 'Toilet Utara', 'Fasilitas Umum', 'T1'), F(2, 'Food Court A', 'Kuliner', 'F1'), F(3, 'Panggung Utama', 'Panggung / Stage', 'P1'),
    F(4, 'Parkir Timur', 'Parkir', 'K2'), F(5, 'Area VIP', 'VIP', 'V1'), F(6, 'Bazzar Tenant 12', 'Bazzar / Tenant', 'B12', false)];
  const build = (id, f, old) => ({ ...(old ?? {}), id_fasilitas: id, id_map: f.id_map, nama_fasilitas: f.nama_fasilitas, jenis_fasilitas: f.jenis_fasilitas, deskripsi: f.deskripsi, status: f.status,
    penanda: { garis_lintang: null, garis_bujur: null, ...(old?.penanda ?? {}), id_penanda: id, nama_penanda: f.nama_penanda } });
  return {
    list: async () => ({ fasilitas: rows, peta: PETA }),
    create: async (idEvent, f) => { const r = build(Date.now(), f); rows = [...rows, r]; return r; },
    update: async (id, f) => { const r = build(id, f, rows.find((x) => x.id_fasilitas === id)); rows = rows.map((x) => (x.id_fasilitas === id ? r : x)); return r; },
    remove: async (ids) => { rows = rows.filter((x) => !ids.includes(x.id_fasilitas)); },
  };
})();
const j = (r) => { if (!r.ok) throw new Error(); return r.json(); };
const H = { 'Content-Type': 'application/json' };
export const httpApi = {
  list: (idEvent) => fetch(`/api/events/${idEvent}/fasilitas`).then(j),               // -> { fasilitas:[{..., penanda:{...}}], peta:[{id_map,nama_map}] }
  create: (idEvent, f) => fetch(`/api/events/${idEvent}/fasilitas`, { method: 'POST', headers: H, body: JSON.stringify(f) }).then(j),
  update: (id, f) => fetch(`/api/fasilitas/${id}`, { method: 'PUT', headers: H, body: JSON.stringify(f) }).then(j),
  remove: (ids) => fetch('/api/fasilitas', { method: 'DELETE', headers: H, body: JSON.stringify({ ids }) }).then((r) => { if (!r.ok) throw new Error(); }),
};

/* Dropdown jenis dengan kotak warna */
function JenisSelect({ value, onChange, bad }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dd">
      <button type="button" className={`field ${bad ? 'bad' : ''}`} style={{ textAlign: 'left' }} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        {value ? <span className="jenis"><span className="dot" style={{ background: JENIS_ZONA[value] }} />{value}</span> : <span className="placeholder">Pilih jenis fasilitas..</span>}
      </button>
      {open && (
        <div className="dd-list" role="listbox">
          {JENIS.map((n) => <button key={n} type="button" role="option" aria-selected={n === value} onClick={() => { onChange(n); setOpen(false); }}><span className="dot" style={{ background: JENIS_ZONA[n] }} />{n}</button>)}
        </div>
      )}
    </div>
  );
}

export default function FacilityManagement({ idEvent, namaEvent = 'Dies Natalis Udayana 2026', api = mockApi }) {
  const params = useParams();
  const id = idEvent ?? params.idEvent ?? 1;
  const [items, setItems] = useState([]);
  const [peta, setPeta] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cari, setCari] = useState('');
  const [modeHapus, setModeHapus] = useState(false);
  const [dipilih, setDipilih] = useState([]);
  const [modal, setModal] = useState(null); // { tipe:'tambah'|'edit'|'hapus', form?, errs? }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.list(id).then((r) => { setItems(r.fasilitas); setPeta(r.peta); }).catch(() => setError('Gagal memuat data fasilitas.')).finally(() => setLoading(false));
  }, [id, api]);

  const namaPeta = (m) => peta.find((p) => p.id_map === m)?.nama_map ?? '-';
  const q = cari.toLowerCase();
  const tampil = items.filter((d) => [d.nama_fasilitas, d.jenis_fasilitas, d.penanda.nama_penanda].some((t) => t.toLowerCase().includes(q)));
  const terpilih = items.filter((d) => dipilih.includes(d.id_fasilitas));
  const tutup = () => { if (!busy) setModal(null); };
  const setForm = (k, v) => setModal((m) => ({ ...m, form: { ...m.form, [k]: v }, errs: { ...m.errs, [k]: undefined } }));
  const buka = (tipe, f) => setModal({ tipe, form: f, errs: {} });

  const cek = (f) => {
    const e = {}, mk = f.nama_penanda.trim();
    if (!f.nama_fasilitas.trim()) e.nama_fasilitas = 'Nama fasilitas wajib diisi.';
    if (!f.jenis_fasilitas) e.jenis_fasilitas = 'Pilih jenis fasilitas.';
    if (!f.id_map) e.id_map = 'Pilih peta.';
    if (!mk) e.nama_penanda = 'Marker wajib diisi. Ketik nama marker.';
    else if (items.some((d) => d.id_fasilitas !== f.id_fasilitas && String(d.id_map) === String(f.id_map) && d.penanda.nama_penanda.toLowerCase() === mk.toLowerCase())) e.nama_penanda = 'Nama marker sudah dipakai di peta ini.';
    return e;
  };
  const simpan = async () => {
    const f = modal.form, errs = cek(f);
    if (Object.keys(errs).length) return setModal({ ...modal, errs });
    const body = { ...f, id_map: Number(f.id_map), nama_fasilitas: f.nama_fasilitas.trim(), nama_penanda: f.nama_penanda.trim() };
    setBusy(true);
    try {
      const r = modal.tipe === 'tambah' ? await api.create(id, body) : await api.update(f.id_fasilitas, body);
      setItems((s) => (modal.tipe === 'tambah' ? [...s, r] : s.map((d) => (d.id_fasilitas === r.id_fasilitas ? r : d))));
      setBusy(false); setModal(null);
    } catch { setBusy(false); setModal({ ...modal, errs: { umum: 'Gagal menyimpan. Coba lagi.' } }); }
  };
  const klikHapus = () => { if (!modeHapus) return setModeHapus(true); if (dipilih.length) setModal({ tipe: 'hapus' }); else setModeHapus(false); };
  const hapus = async () => {
    setBusy(true);
    try { await api.remove(dipilih); setItems((s) => s.filter((d) => !dipilih.includes(d.id_fasilitas))); setDipilih([]); setModeHapus(false); setBusy(false); setModal(null); }
    catch { setBusy(false); setModal(null); setError('Gagal menghapus fasilitas.'); }
  };
  const toggle = (k) => setDipilih((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const awal = () => ({ ...KOSONG, id_map: peta.length === 1 ? peta[0].id_map : '' });

  const f = modal?.form, errs = modal?.errs ?? {};
  return (
    <div className="fn-app">
      <NavbarEditing />
      <div className="fn-sub">
        <span className="fn-title">{namaEvent}</span>
        <div className="fn-actions">
          <button className={`btn btn-red ${modeHapus ? 'on' : ''}`} onClick={klikHapus}>{modeHapus && dipilih.length ? `Hapus (${dipilih.length})` : 'Hapus'}</button>
          <button className={`btn btn-primary ${modal?.tipe === 'tambah' ? 'on' : ''}`} onClick={() => buka('tambah', awal())}>Tambah</button>
        </div>
      </div>
      <input className="search" placeholder="Cari fasilitas..." aria-label="Cari fasilitas" value={cari} onChange={(e) => setCari(e.target.value)} />
      {error && <p className="fac-err" role="alert">{error}</p>}

      <div className="fac-table">
        <div className="fac-inner">
          <div className="fac-row head"><span>NAMA</span><span>JENIS</span><span>MARKER</span><span>PETA</span><span /></div>
          {loading ? <div className="state">Memuat fasilitas…</div> : tampil.length === 0 ? <div className="state">{items.length ? 'Fasilitas tidak ditemukan. Coba kata kunci lain.' : 'Belum ada fasilitas. Klik Tambah.'}</div> :
            tampil.map((d) => (
              <div className="fac-row" key={d.id_fasilitas}>
                <b>{d.nama_fasilitas}</b>
                <span className="jenis"><span className="dot" style={{ background: JENIS_ZONA[d.jenis_fasilitas] }} />{d.jenis_fasilitas}</span>
                <span>{d.penanda.nama_penanda}{d.penanda.garis_lintang == null && <span className="tag" title="Belum diletakkan di peta">Belum di peta</span>}</span>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>{namaPeta(d.id_map)}</span>
                {modeHapus
                  ? <button className="check" aria-label={`Pilih ${d.nama_fasilitas}`} aria-pressed={dipilih.includes(d.id_fasilitas)} onClick={() => toggle(d.id_fasilitas)}>{dipilih.includes(d.id_fasilitas) ? '✓' : ''}</button>
                  : <button className="btn-edit" onClick={() => buka('edit', { id_fasilitas: d.id_fasilitas, id_map: d.id_map, nama_fasilitas: d.nama_fasilitas, jenis_fasilitas: d.jenis_fasilitas, nama_penanda: d.penanda.nama_penanda, deskripsi: d.deskripsi ?? '', status: d.status ?? 'aktif' })}>Edit</button>}
              </div>
            ))}
        </div>
      </div>

      {(modal?.tipe === 'tambah' || modal?.tipe === 'edit') && (
        <div className="overlay" onClick={tutup}>
          <div className="modal fac-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.tipe === 'tambah' ? 'Tambah Fasilitas' : 'Edit Fasilitas'}</h2>

            <label htmlFor="nf">NAMA FASILITAS <span className="req">*</span></label>
            <input id="nf" className={`field ${errs.nama_fasilitas ? 'bad' : ''}`} placeholder="Masukkan nama fasilitas.." value={f.nama_fasilitas} onChange={(e) => setForm('nama_fasilitas', e.target.value)} />
            {errs.nama_fasilitas && <p className="msg" role="alert">{errs.nama_fasilitas}</p>}

            <label>JENIS <span className="req">*</span></label>
            <JenisSelect value={f.jenis_fasilitas} bad={errs.jenis_fasilitas} onChange={(v) => setForm('jenis_fasilitas', v)} />
            {errs.jenis_fasilitas && <p className="msg" role="alert">{errs.jenis_fasilitas}</p>}

            <label htmlFor="pt">PETA <span className="req">*</span></label>
            <select id="pt" className={`field ${errs.id_map ? 'bad' : ''}`} value={f.id_map} onChange={(e) => setForm('id_map', e.target.value)}>
              <option value="">Pilih peta..</option>{peta.map((p) => <option key={p.id_map} value={p.id_map}>{p.nama_map}</option>)}
            </select>
            {errs.id_map && <p className="msg" role="alert">{errs.id_map}</p>}

            <label htmlFor="mk">MARKER <span className="req">*</span></label>
            <input id="mk" className={`field ${errs.nama_penanda ? 'bad' : ''}`} placeholder="Ketik nama marker, mis. T1" maxLength={20} value={f.nama_penanda} onChange={(e) => setForm('nama_penanda', e.target.value)} />
            {errs.nama_penanda ? <p className="msg" role="alert">{errs.nama_penanda}</p> : <p className="help">Posisi marker ditentukan nanti di Map Editor.</p>}

            <label htmlFor="ds">DESKRIPSI</label>
            <textarea id="ds" className="field" placeholder="Opsional" value={f.deskripsi} onChange={(e) => setForm('deskripsi', e.target.value)} />

            <label htmlFor="st">STATUS</label>
            <select id="st" className="field" value={f.status} onChange={(e) => setForm('status', e.target.value)}>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>

            {errs.umum && <p className="msg" role="alert">{errs.umum}</p>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={tutup} disabled={busy}>Batal</button>
              <button className="btn btn-solid" onClick={simpan} disabled={busy}>{busy ? 'Menyimpan…' : modal.tipe === 'tambah' ? 'Tambah' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}

      {modal?.tipe === 'hapus' && (
        <div className="overlay" onClick={tutup}>
          <div className="modal danger fac-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Hapus Fasilitas</h2>
            {terpilih.map((d) => (
              <div key={d.id_fasilitas}>
                <label>NAMA FASILITAS</label><div className="field ro">{d.nama_fasilitas}</div>
                <label>JENIS</label><div className="field ro">{d.jenis_fasilitas}</div>
                <label>MARKER</label><div className="field ro">{d.penanda.nama_penanda}</div>
              </div>
            ))}
            <p className="help">Marker yang tertaut ikut terhapus dari peta. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="modal-actions">
              <button className="btn btn-red" onClick={tutup} disabled={busy}>Batal</button>
              <button className="btn btn-red on" onClick={hapus} disabled={busy}>{busy ? 'Menghapus…' : 'Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
