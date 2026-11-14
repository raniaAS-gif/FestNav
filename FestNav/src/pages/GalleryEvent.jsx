import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import './common.css';
import './GalleryEvent.css';
import NavbarEditing from '../components/NavbarEditing';

/* Kolom tabel gambar_event: id_gambar, id_event, url_gambar, jenis_gambar, keterangan, waktu_diunggah
   (+ public_id Cloudinary, disarankan ditambah agar file bisa dihapus dari Cloudinary) */
const JENIS = [['poster', 'Poster'], ['denah', 'Denah'], ['lainnya', 'Lainnya']];
const GRAD = { poster: 'linear-gradient(135deg,#fde68a,#f472b6)', denah: 'linear-gradient(135deg,#e2e8f0,#a3e635)', lainnya: 'linear-gradient(135deg,#c7d2fe,#818cf8)' };
const TIPE = ['image/jpeg', 'image/png', 'image/webp'], MAKS_MB = 10;

/* Thumbnail Cloudinary: sisipkan transformasi setelah /upload/ (url asli tetap disimpan di DB) */
const thumb = (u) => (u?.includes('res.cloudinary.com') ? u.replace('/upload/', '/upload/c_fill,w_600,h_330,q_auto,f_auto/') : u);
const tgl = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- API ----------
   Bawaan: data tiruan di memori supaya layar bisa dicoba. Ganti dengan httpApi saat backend siap:
   <GalleryEvent api={httpApi} /> */
const SEED = [['Denah Parkir', 'denah'], ['Denah Lantai 1', 'denah'], ['Denah Tenant', 'denah'], ['Poster Utama', 'poster'], ['Denah Outdoor', 'denah']]
  .map(([k, j], i) => ({ id_gambar: i + 1, id_event: 1, url_gambar: '', public_id: null, jenis_gambar: j, keterangan: k, waktu_diunggah: new Date(Date.now() - i * 864e5).toISOString() }));
const mockApi = (() => {
  let rows = [...SEED];
  return {
    list: async () => rows,
    upload: async (idEvent, { file, keterangan, jenis }) => { const r = { id_gambar: Date.now(), id_event: idEvent, url_gambar: URL.createObjectURL(file), public_id: null, jenis_gambar: jenis, keterangan, waktu_diunggah: new Date().toISOString() }; rows = [...rows, r]; return r; },
    remove: async (ids) => { rows = rows.filter((r) => !ids.includes(r.id_gambar)); },
  };
})();
/* Backend yang mengunggah ke Cloudinary dan mengisi tabel (kunci Cloudinary tidak boleh ada di frontend) */
export const httpApi = {
  list: (idEvent) => fetch(`/api/events/${idEvent}/gambar`).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
  upload: (idEvent, { file, keterangan, jenis }) => {
    const fd = new FormData(); fd.append('file', file); fd.append('keterangan', keterangan); fd.append('jenis_gambar', jenis);
    return fetch(`/api/events/${idEvent}/gambar`, { method: 'POST', body: fd }).then((r) => { if (!r.ok) throw new Error(); return r.json(); });
  },
  remove: (ids) => fetch('/api/gambar', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).then((r) => { if (!r.ok) throw new Error(); }),
};

export default function GalleryEvent({ idEvent, namaEvent = 'Dies Natalis Udayana 2026', api = mockApi }) {
  const params = useParams();
  const id = idEvent ?? params.idEvent ?? 1;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cari, setCari] = useState('');
  const [filter, setFilter] = useState('semua');
  const [modeHapus, setModeHapus] = useState(false);
  const [dipilih, setDipilih] = useState([]);
  const [modal, setModal] = useState(null); // 'tambah' | 'hapus'
  const [form, setForm] = useState({ file: null, preview: '', keterangan: '', jenis: '' });
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef();

  useEffect(() => {
    setLoading(true);
    api.list(id).then(setItems).catch(() => setError('Gagal memuat gambar event.')).finally(() => setLoading(false));
  }, [id, api]);

  const tampil = items.filter((d) => (filter === 'semua' || d.jenis_gambar === filter) && d.keterangan.toLowerCase().includes(cari.toLowerCase()));
  const terpilih = items.filter((d) => dipilih.includes(d.id_gambar));
  const toggle = (k) => setDipilih((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const tutup = () => { if (busy) return; if (form.preview) URL.revokeObjectURL(form.preview); setModal(null); setForm({ file: null, preview: '', keterangan: '', jenis: '' }); setFormErr(''); };
  const pilihFile = (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    if (!TIPE.includes(f.type)) return setFormErr('Format harus JPG, PNG, atau WebP.');
    if (f.size > MAKS_MB * 1048576) return setFormErr(`Ukuran maksimal ${MAKS_MB} MB.`);
    if (form.preview) URL.revokeObjectURL(form.preview);
    setFormErr(''); setForm({ ...form, file: f, preview: URL.createObjectURL(f) });
  };
  const unggah = async () => {
    if (!form.file) return setFormErr('Pilih gambar terlebih dahulu.');
    if (!form.keterangan.trim()) return setFormErr('Nama gambar wajib diisi.');
    if (!form.jenis) return setFormErr('Pilih jenis gambar.');
    setBusy(true); setFormErr('');
    try {
      const baru = await api.upload(id, { file: form.file, keterangan: form.keterangan.trim(), jenis: form.jenis });
      setItems((s) => [...s, baru]); setBusy(false); tutup();
    } catch { setBusy(false); setFormErr('Gagal mengunggah. Coba lagi.'); }
  };
  const klikHapus = () => {
    if (!modeHapus) return setModeHapus(true);
    if (dipilih.length) setModal('hapus'); else setModeHapus(false);
  };
  const hapus = async () => {
    setBusy(true);
    try {
      await api.remove(dipilih);
      setItems((s) => s.filter((d) => !dipilih.includes(d.id_gambar)));
      setDipilih([]); setModeHapus(false); setBusy(false); setModal(null);
    } catch { setBusy(false); setError('Gagal menghapus gambar.'); setModal(null); }
  };

  const Img = ({ d, cls }) => (d.url_gambar
    ? <img className={cls} src={thumb(d.url_gambar)} alt={d.keterangan} loading="lazy" />
    : <div className={`${cls} ph`} role="img" aria-label={d.keterangan} style={{ backgroundImage: GRAD[d.jenis_gambar] }} />);

  return (
    <div className="fn-app">
      <NavbarEditing />
      <div className="fn-sub">
        <span className="fn-title">{namaEvent}</span>
        <div className="fn-actions">
          <button className={`btn btn-red ${modeHapus ? 'on' : ''}`} onClick={klikHapus}>{modeHapus && dipilih.length ? `Hapus (${dipilih.length})` : 'Hapus'}</button>
          <button className={`btn btn-primary ${modal === 'tambah' ? 'on' : ''}`} onClick={() => setModal('tambah')}>Tambah</button>
        </div>
      </div>
      <div className="gal-row">
        <input className="search" placeholder="Cari gambar event..." value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari gambar event" />
        <select className="gal-filter" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter jenis gambar">
          <option value="semua">Semua jenis</option>{JENIS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {error && <p className="gal-err" role="alert">{error}</p>}

      {loading ? <p className="gal-state">Memuat gambar…</p> : tampil.length === 0 ? (
        <p className="gal-state">{items.length ? 'Gambar tidak ditemukan. Coba kata kunci atau filter lain.' : 'Belum ada gambar. Klik Tambah untuk mengunggah.'}</p>
      ) : (
        <div className="gal-grid">
          {tampil.map((d) => (
            <figure className="gal-card" key={d.id_gambar}>
              <Img d={d} cls="gal-img" />
              <figcaption className="gal-cap">
                <div style={{ minWidth: 0 }}>
                  <div className="gal-name" title={d.keterangan}>{d.keterangan}</div>
                  <div className="gal-meta"><span className="gal-badge">{d.jenis_gambar}</span>{tgl(d.waktu_diunggah)}</div>
                </div>
                {modeHapus && <button className="gal-check" aria-label={`Pilih ${d.keterangan}`} aria-pressed={dipilih.includes(d.id_gambar)} onClick={() => toggle(d.id_gambar)}>{dipilih.includes(d.id_gambar) ? '✓' : ''}</button>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {modal === 'tambah' && (
        <div className="overlay" onClick={tutup}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>Upload Gambar Event</h2>
            <button className="drop" onClick={() => input.current.click()}>
              {form.preview ? <img src={form.preview} alt="Pratinjau" /> : <span><span className="plus">+</span><br />Klik bagian ini untuk menambah gambar</span>}
            </button>
            <input ref={input} type="file" accept={TIPE.join(',')} hidden onChange={pilihFile} />
            <input className="field" style={{ marginTop: 14 }} placeholder="Tambahkan nama gambar..." aria-label="Nama gambar" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            <select className="field" style={{ marginTop: 10 }} aria-label="Jenis gambar" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}>
              <option value="">Pilih jenis gambar...</option>{JENIS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            {formErr && <p className="form-err" role="alert">{formErr}</p>}
            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={tutup} disabled={busy}>Batal</button>
              <button className="btn btn-solid" onClick={unggah} disabled={busy}>{busy ? 'Mengunggah…' : 'Unggah'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'hapus' && (
        <div className="overlay" onClick={() => !busy && setModal(null)}>
          <div className="modal danger" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>Yakin ingin menghapus {terpilih.length > 1 ? `${terpilih.length} gambar` : 'gambar'} ini?</h2>
            <div className="confirm-list">
              {terpilih.map((d) => (<div key={d.id_gambar}><Img d={d} cls="confirm-img" /><div className="field" style={{ lineHeight: '44px', marginBottom: 10 }}>{d.keterangan}</div></div>))}
            </div>
            <p className="muted" style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>File juga dihapus dari penyimpanan dan tidak dapat dikembalikan.</p>
            <div className="modal-actions">
              <button className="btn btn-red" onClick={() => setModal(null)} disabled={busy}>Batal</button>
              <button className="btn btn-red on" onClick={hapus} disabled={busy}>{busy ? 'Menghapus…' : 'Yakin'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
