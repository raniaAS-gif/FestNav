import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './common.css';
import './FacilityManagement.css';
import NavbarEditing from '../components/NavbarEditing'

/* Pratinjau label pin. MIRIP aturan SQL inisial_label(); nilai resmi tetap dari database (kolom label_penanda).
   tiap kata -> huruf pertama, kata angka diambil utuh, nama satu kata -> 2 huruf, maksimal 4 karakter. */
export const inisialLabel = (nama) => {
  const kata = (nama ?? '').split(/\s+/).filter((t) => /^[\p{L}\p{N}]/u.test(t));
  if (!kata.length) return '';
  const r = kata.length === 1 ? kata[0].slice(0, 2).toUpperCase() : kata.map((t) => (/^\d+$/.test(t) ? t : t[0].toUpperCase())).join('');
  return r.slice(0, 4);
};

/* ---------- data contoh: sama dengan isi tabel jenis_fasilitas ---------- */
const JENIS_CONTOH = [['toilet', 'Toilet', 'Toilet umum', '#3B82F6'], ['parkir', 'Parkir', 'Area parkir kendaraan', '#6B7280'], ['panggung', 'Panggung', 'Panggung pertunjukan', '#EF4444'],
  ['kuliner', 'Kuliner', 'Area makanan dan minuman', '#F59E0B'], ['foodcourt', 'Foodcourt', 'Area bersama stan makanan', '#FB923C'], ['pintu_masuk', 'Pintu Masuk', 'Pintu masuk area acara', '#10B981'],
  ['pintu_keluar', 'Pintu Keluar', 'Pintu keluar dan jalur evakuasi', '#14B8A6'], ['medis', 'Pos Medis', 'Pos kesehatan dan pertolongan pertama', '#F43F5E'], ['ibadah', 'Tempat Ibadah', 'Fasilitas ibadah', '#8B5CF6'],
  ['info', 'Pusat Informasi', 'Pusat informasi dan bantuan', '#0EA5E9'], ['area_vip', 'Area VIP', 'Area khusus tamu VIP', '#D946EF'], ['area_festival', 'Area Festival', 'Area utama kegiatan festival', '#84CC16']]
  .map(([kode, nama_jenis, deskripsi_default, warna]) => ({ kode, nama_jenis, deskripsi_default, warna }));
const PETA = [{ id_map: 1, nama_map: 'Day 1: Lapangan Rektorat' }, { id_map: 2, nama_map: 'Day 2: Gedung Rektorat' }];
const KOSONG = { id_map: '', kode_jenis: '', nama_fasilitas: '', deskripsi: '' };

/* ---------- API ----------
   Bawaan: data tiruan di memori. Ganti dengan httpApi saat backend siap: <FacilityManagement api={httpApi} />
   Baris fasilitas = kolom view v_fasilitas_peta + deskripsi (nilai asli, bukan deskripsi_tampil). */
const mockApi = (() => {
  const jenisOf = (k) => JENIS_CONTOH.find((j) => j.kode === k);
  const baris = (f, digambar) => { const j = jenisOf(f.kode_jenis); return { id_fasilitas: f.id_fasilitas, id_map: f.id_map, nama_fasilitas: f.nama_fasilitas, label_penanda: inisialLabel(f.nama_fasilitas),
    kode_jenis: f.kode_jenis, nama_jenis: j.nama_jenis, warna: j.warna, deskripsi: f.deskripsi ?? '', deskripsi_tampil: f.deskripsi?.trim() || j.deskripsi_default, sudah_digambar: digambar }; };
  let rows = [[1, 'Toilet Utara', 'toilet', true], [2, 'Food Court A', 'foodcourt', true], [3, 'Panggung Utama', 'panggung', true], [4, 'Parkir Timur', 'parkir', true],
    [5, 'Area VIP', 'area_vip', true], [6, 'Bazzar Tenant 12', 'kuliner', false]].map(([id, n, k, d]) => baris({ id_fasilitas: id, id_map: 1, nama_fasilitas: n, kode_jenis: k }, d));
  return {
    list: async () => ({ fasilitas: rows, peta: PETA, jenis: JENIS_CONTOH }),
    create: async (idEvent, b) => { const r = baris({ id_fasilitas: Date.now(), ...b }, false); rows = [...rows, r]; return r; },
    update: async (id, b) => { const old = rows.find((x) => x.id_fasilitas === id); const r = baris({ id_fasilitas: id, ...b, id_map: old.sudah_digambar ? old.id_map : b.id_map }, old.sudah_digambar); rows = rows.map((x) => (x.id_fasilitas === id ? r : x)); return r; },
    remove: async (ids) => { rows = rows.filter((x) => !ids.includes(x.id_fasilitas)); },
  };
})();
const j = (r) => { if (!r.ok) throw new Error(); return r.json(); };
const H = { 'Content-Type': 'application/json' };
export const httpApi = {
  list: (idEvent) => fetch(`/api/events/${idEvent}/fasilitas`).then(j),   // -> { fasilitas:[...v_fasilitas_peta + deskripsi], peta:[{id_map,nama_map}], jenis:[...jenis_fasilitas aktif, urut] }
  create: (idEvent, b) => fetch(`/api/events/${idEvent}/fasilitas`, { method: 'POST', headers: H, body: JSON.stringify(b) }).then(j),
  update: (id, b) => fetch(`/api/fasilitas/${id}`, { method: 'PUT', headers: H, body: JSON.stringify(b) }).then(j),
  remove: (ids) => fetch('/api/fasilitas', { method: 'DELETE', headers: H, body: JSON.stringify({ ids }) }).then((r) => { if (!r.ok) throw new Error(); }),
};

/* Dropdown jenis dengan kotak warna (isi dari tabel jenis_fasilitas) */
function JenisSelect({ jenis, value, onChange, bad }) {
  const [open, setOpen] = useState(false);
  const dipilih = jenis.find((x) => x.kode === value);
  return (
    <div className="dd" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <button type="button" className={`field dd-btn ${bad ? 'bad' : ''}`} style={{ textAlign: 'left' }} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        {dipilih ? <span className="jenis"><span className="dot" style={{ background: dipilih.warna }} />{dipilih.nama_jenis}</span> : <span className="placeholder">Pilih jenis fasilitas..</span>}
      </button>
      {open && (
        <div className="dd-list" role="listbox">
          {jenis.map((n) => <button key={n.kode} type="button" role="option" aria-selected={n.kode === value} onClick={() => { onChange(n.kode); setOpen(false); }}><span className="dot" style={{ background: n.warna }} />{n.nama_jenis}</button>)}
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
  const [jenis, setJenis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cari, setCari] = useState('');
  const [modeHapus, setModeHapus] = useState(false);
  const [dipilih, setDipilih] = useState([]);
  const [modal, setModal] = useState(null); // { tipe:'tambah'|'edit'|'hapus', form?, errs? }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.list(id).then((r) => { setItems(r.fasilitas); setPeta(r.peta); setJenis(r.jenis); }).catch(() => setError('Gagal memuat data fasilitas.')).finally(() => setLoading(false));
  }, [id, api]);

  const namaPeta = (m) => peta.find((p) => p.id_map === m)?.nama_map ?? '-';
  const q = cari.toLowerCase();
  const tampil = items.filter((d) => [d.nama_fasilitas, d.nama_jenis, d.label_penanda].some((t) => t.toLowerCase().includes(q)));
  const terpilih = items.filter((d) => dipilih.includes(d.id_fasilitas));
  const tutup = () => { if (!busy) setModal(null); };
  const setForm = (k, v) => setModal((m) => ({ ...m, form: { ...m.form, [k]: v }, errs: { ...m.errs, [k]: undefined } }));
  const buka = (tipe, f) => setModal({ tipe, form: f, errs: {} });

  const simpan = async () => {
    const f = modal.form, jn = jenis.find((x) => x.kode === f.kode_jenis), errs = {};
    if (!f.kode_jenis) errs.kode_jenis = 'Pilih jenis fasilitas.';
    if (!f.id_map) errs.id_map = 'Pilih peta.';
    if (Object.keys(errs).length) return setModal({ ...modal, errs });
    const body = { id_map: Number(f.id_map), kode_jenis: f.kode_jenis, nama_fasilitas: f.nama_fasilitas.trim() || jn.nama_jenis, deskripsi: f.deskripsi.trim() || null };
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
  const jn = f ? jenis.find((x) => x.kode === f.kode_jenis) : null;
  const labelPreview = f ? inisialLabel(f.nama_fasilitas.trim() || jn?.nama_jenis) : '';
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
          <div className="fac-row head"><span>NAMA</span><span>JENIS</span><span>LABEL</span><span>PETA</span><span /></div>
          {loading ? <div className="state">Memuat fasilitas…</div> : tampil.length === 0 ? <div className="state">{items.length ? 'Fasilitas tidak ditemukan. Coba kata kunci lain.' : 'Belum ada fasilitas. Klik Tambah.'}</div> :
            tampil.map((d) => (
              <div className="fac-row" key={d.id_fasilitas}>
                <b>{d.nama_fasilitas}</b>
                <span className="jenis"><span className="dot" style={{ background: d.warna }} />{d.nama_jenis}</span>
                <span><span className="lbl" style={{ background: d.warna }}>{d.label_penanda}</span>{!d.sudah_digambar && <span className="tag" title="Zona belum digambar di Map Editor">Belum digambar</span>}</span>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>{namaPeta(d.id_map)}</span>
                {modeHapus
                  ? <button className="check" aria-label={`Pilih ${d.nama_fasilitas}`} aria-pressed={dipilih.includes(d.id_fasilitas)} onClick={() => toggle(d.id_fasilitas)}>{dipilih.includes(d.id_fasilitas) ? '✓' : ''}</button>
                  : <button className="btn-edit" onClick={() => buka('edit', { id_fasilitas: d.id_fasilitas, id_map: d.id_map, kode_jenis: d.kode_jenis, nama_fasilitas: d.nama_fasilitas, deskripsi: d.deskripsi ?? '', terkunciPeta: d.sudah_digambar })}>Edit</button>}
              </div>
            ))}
        </div>
      </div>

      {(modal?.tipe === 'tambah' || modal?.tipe === 'edit') && (
        <div className="overlay" onClick={tutup}>
          <div className="modal fac-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.tipe === 'tambah' ? 'Tambah Fasilitas' : 'Edit Fasilitas'}</h2>
            <div className="fac-body">
              <label>JENIS <span className="req">*</span></label>
              <JenisSelect jenis={jenis} value={f.kode_jenis} bad={errs.kode_jenis} onChange={(v) => setForm('kode_jenis', v)} />
              {errs.kode_jenis && <p className="msg" role="alert">{errs.kode_jenis}</p>}

              <label htmlFor="nf">NAMA FASILITAS</label>
              <input id="nf" className="field" placeholder={jn ? `Kosongkan untuk memakai "${jn.nama_jenis}"` : 'Masukkan nama fasilitas..'} value={f.nama_fasilitas} onChange={(e) => setForm('nama_fasilitas', e.target.value)} />
              <p className="help">Label pin: {labelPreview ? <span className="lbl" style={{ background: jn?.warna ?? '#64748b' }}>{labelPreview}</span> : '-'} (dibuat otomatis dari nama)</p>

              <label htmlFor="pt">PETA <span className="req">*</span></label>
              <select id="pt" className={`field ${errs.id_map ? 'bad' : ''}`} value={f.id_map} disabled={f.terkunciPeta} onChange={(e) => setForm('id_map', e.target.value)}>
                <option value="">Pilih peta..</option>{peta.map((p) => <option key={p.id_map} value={p.id_map}>{p.nama_map}</option>)}
              </select>
              {f.terkunciPeta ? <p className="help">Peta tidak bisa diubah karena zona sudah digambar. Hapus zonanya di Map Editor dulu.</p> : errs.id_map ? <p className="msg" role="alert">{errs.id_map}</p> : <p className="help">Zona fasilitas digambar nanti di Map Editor.</p>}

              <label htmlFor="ds">DESKRIPSI</label>
              <textarea id="ds" className="field" placeholder={jn?.deskripsi_default ? `Kosongkan untuk memakai: ${jn.deskripsi_default}` : 'Opsional'} value={f.deskripsi} onChange={(e) => setForm('deskripsi', e.target.value)} />
              {errs.umum && <p className="msg" role="alert">{errs.umum}</p>}
            </div>
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
            <div className="fac-body">
              {terpilih.map((d) => (
                <div key={d.id_fasilitas}>
                  <label>NAMA FASILITAS</label><div className="field ro">{d.nama_fasilitas}</div>
                  <label>JENIS</label><div className="field ro">{d.nama_jenis}</div>
                  <label>LABEL</label><div className="field ro">{d.label_penanda}{d.sudah_digambar ? '' : ' · belum digambar'}</div>
                </div>
              ))}
              <p className="help">Zona di peta (jika sudah digambar) ikut terhapus. Tindakan ini tidak dapat dibatalkan.</p>
            </div>
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
