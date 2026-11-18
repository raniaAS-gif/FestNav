import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './common.css';
import './GalleryEvent.css';
import NavbarEditing from '../components/NavbarEditing';

/* gambar_event: id_gambar, id_event, url_gambar, public_id, jenis_gambar, keterangan, waktu_diunggah
   jenis_gambar hanya: foto_venue | jadwal | lainnya (poster utama disimpan di event.poster_url) */
const JENIS = [['foto_venue', 'Foto Venue'], ['jadwal', 'Jadwal'], ['lainnya', 'Lainnya']];
const LABEL = Object.fromEntries(JENIS);
const JENIS_AWAL = 'lainnya';
const GRAD = {
  foto_venue: 'linear-gradient(135deg,#bae6fd,#34d399)',
  jadwal: 'linear-gradient(135deg,#ddd6fe,#6366f1)',
  lainnya: 'linear-gradient(135deg,#e2e8f0,#94a3b8)',
};
const TIPE = ['image/jpeg', 'image/png', 'image/webp'];
const MAKS_MB = 10;

const thumb = (u) =>
  u?.includes('res.cloudinary.com')
    ? u.replace('/upload/', '/upload/c_fill,w_600,h_330,q_auto,f_auto/')
    : u;
const tgl = (iso) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- API ----------
   Bawaan: data tiruan di memori. Ganti dengan httpApi saat backend siap: <GalleryEvent api={httpApi} />
   list -> { gambar:[...gambar_event], poster_url }
   Jadikan Denah / Jadikan Poster = DIPINDAH (bukan disalin):
   - Jadikan Poster: baris gambar_event dihapus, file pindah ke event.poster_url
   - Jadikan Denah : baris gambar_event dihapus, membuat baris baru di tabel map (nama_map, gambar_layout) */
const SEED = [
  ['Foto Panggung Utama', 'foto_venue'],
  ['Jadwal Acara Hari 1', 'jadwal'],
  ['Foto Area Kuliner', 'foto_venue'],
  ['Jadwal Acara Hari 2', 'jadwal'],
  ['Spanduk Sponsor', 'lainnya'],
  ['Denah Parkir', 'lainnya'],
].map(([k, j], i) => ({
  id_gambar: i + 1,
  id_event: 1,
  url_gambar: '',
  public_id: null,
  jenis_gambar: j,
  keterangan: k,
  waktu_diunggah: new Date(Date.now() - i * 864e5).toISOString(),
}));

const mockApi = (() => {
  let rows = [...SEED];
  let poster = null;
  let peta = [
    { id_map: 1, nama_map: 'Day 1: Lapangan Rektorat', punya_denah: true },
    { id_map: 2, nama_map: 'Day 2: Gedung Rektorat', punya_denah: false },
  ];
  return {
    list: async () => ({ gambar: rows, peta, poster_url: poster }),
    upload: async (idEvent, { file, keterangan, jenis }) => {
      const r = {
        id_gambar: Date.now(),
        id_event: idEvent,
        url_gambar: URL.createObjectURL(file),
        public_id: null,
        jenis_gambar: jenis,
        keterangan,
        waktu_diunggah: new Date().toISOString(),
      };
      rows = [...rows, r];
      return r;
    },
    remove: async (ids) => {
      rows = rows.filter((r) => !ids.includes(r.id_gambar));
    },
    jadikanPoster: async (idGambar) => {
      const g = rows.find((r) => r.id_gambar === idGambar);
      poster = g?.url_gambar || 'poster-contoh';
      rows = rows.filter((r) => r.id_gambar !== idGambar);
    },
    jadikanDenah: async (idGambar, namaMap) => {
      rows = rows.filter((r) => r.id_gambar !== idGambar);
      peta = [...peta, { id_map: Date.now(), nama_map: namaMap, punya_denah: true }];
    },
  };
})();

const ok = (r) => {
  if (!r.ok) throw new Error();
  return r;
};
const H = { 'Content-Type': 'application/json' };

export const httpApi = {
  list: (idEvent) => fetch(`/api/events/${idEvent}/gambar`).then(ok).then((r) => r.json()),
  upload: (idEvent, { file, keterangan, jenis }) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('keterangan', keterangan);
    fd.append('jenis_gambar', jenis);
    return fetch(`/api/events/${idEvent}/gambar`, { method: 'POST', body: fd })
      .then(ok)
      .then((r) => r.json());
  },
  remove: (ids) =>
    fetch('/api/gambar', { method: 'DELETE', headers: H, body: JSON.stringify({ ids }) }).then(ok),
  jadikanPoster: (idGambar) =>
    fetch(`/api/gambar/${idGambar}/jadikan-poster`, { method: 'POST' }).then(ok),
  jadikanDenah: (idGambar, namaMap) =>
    fetch(`/api/gambar/${idGambar}/jadikan-denah`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ nama_map: namaMap }),
    }).then(ok),
};

export default function GalleryEvent({
  idEvent,
  namaEvent = 'Dies Natalis Udayana 2026',
  api = mockApi,
}) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const id = idEvent ?? location.state?.idEvent ?? params.idEvent ?? 1;
  const judulEvent = location.state?.namaEvent || namaEvent;
  const asalReview = location.state?.from;

  const [items, setItems] = useState([]);
  const [adaPoster, setAdaPoster] = useState(false);
  const [denahDipilih, setDenahDipilih] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cari, setCari] = useState('');
  const [filter, setFilter] = useState('semua');
  const [modeHapus, setModeHapus] = useState(false);
  const [dipilih, setDipilih] = useState([]);
  const [modal, setModal] = useState(null); // 'tambah' | 'hapus' | 'poster' | 'denah'
  const [item, setItem] = useState(null); // gambar untuk Jadikan Poster / Denah
  const [namaDenah, setNamaDenah] = useState('');
  const [form, setForm] = useState({ file: null, preview: '', keterangan: '', jenis: JENIS_AWAL });
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef();

  const muat = () =>
    api.list(id).then((r) => {
      setItems(r.gambar);
      setAdaPoster(!!r.poster_url);
    });

  useEffect(() => {
    setLoading(true);
    muat()
      .catch(() => setError('Gagal memuat gambar event.'))
      .finally(() => setLoading(false));
    /* eslint-disable-next-line */
  }, [id, api]);

  const tampil = items.filter(
    (d) =>
      (filter === 'semua' || d.jenis_gambar === filter) &&
      (d.keterangan ?? '').toLowerCase().includes(cari.toLowerCase())
  );
  const terpilih = items.filter((d) => dipilih.includes(d.id_gambar));
  const toggle = (k) =>
    setDipilih((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const flash = (t) => {
    setInfo(t);
    setTimeout(() => setInfo(''), 3500);
  };

  const tutup = () => {
    if (busy) return;
    if (form.preview) URL.revokeObjectURL(form.preview);
    setModal(null);
    setItem(null);
    setNamaDenah('');
    setForm({ file: null, preview: '', keterangan: '', jenis: JENIS_AWAL });
    setFormErr('');
  };

  const pilihFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!TIPE.includes(f.type)) return setFormErr('Format harus JPG, PNG, atau WebP.');
    if (f.size > MAKS_MB * 1048576) return setFormErr(`Ukuran maksimal ${MAKS_MB} MB.`);
    if (form.preview) URL.revokeObjectURL(form.preview);
    setFormErr('');
    setForm({ ...form, file: f, preview: URL.createObjectURL(f) });
  };

  const unggah = async () => {
    if (!form.file) return setFormErr('Pilih gambar terlebih dahulu.');
    if (!form.keterangan.trim()) return setFormErr('Nama gambar wajib diisi.');
    setBusy(true);
    setFormErr('');
    try {
      const baru = await api.upload(id, {
        file: form.file,
        keterangan: form.keterangan.trim(),
        jenis: form.jenis,
      });
      setItems((s) => [...s, baru]);
      setBusy(false);
      tutup();
    } catch {
      setBusy(false);
      setFormErr('Gagal mengunggah. Coba lagi.');
    }
  };

  const klikHapus = () => {
    if (!modeHapus) return setModeHapus(true);
    if (dipilih.length) setModal('hapus');
    else setModeHapus(false);
  };

  const hapus = async () => {
    setBusy(true);
    try {
      await api.remove(dipilih);
      setItems((s) => s.filter((d) => !dipilih.includes(d.id_gambar)));
      setDipilih([]);
      setModeHapus(false);
      setBusy(false);
      setModal(null);
    } catch {
      setBusy(false);
      setError('Gagal menghapus gambar.');
      setModal(null);
    }
  };

  const bukaAksi = (tipe, d) => {
    setItem(d);
    setNamaDenah('');
    setFormErr('');
    setModal(tipe);
  };

  const pindah = async () => {
    const nama = namaDenah.trim();
    if (modal === 'denah' && !nama) return setFormErr('Nama denah wajib diisi.');
    if (modal === 'denah' && nama.length > 100) return setFormErr('Nama denah maksimal 100 karakter.');

    setBusy(true);
    setFormErr('');
    try {
      if (modal === 'poster') {
        await api.jadikanPoster(item.id_gambar);
      } else {
        await api.jadikanDenah(item.id_gambar, nama);
        setDenahDipilih(nama);
      }
      await muat();
      setBusy(false);
      setModal(null);
      setItem(null);
      setNamaDenah('');
      flash(
        modal === 'poster'
          ? 'Gambar dipindahkan menjadi poster event.'
          : `Gambar ditambahkan menjadi denah "${nama}".`
      );
    } catch {
      setBusy(false);
      setFormErr('Gagal memindahkan gambar. Coba lagi.');
    }
  };

  const kembaliKeReview = () => {
    navigate(asalReview || '/scraping', {
      state: {
        view: 'review',
        idScraping: location.state?.idScraping,
        posterSudahDiatur: adaPoster,
        denahSudahDiatur: denahDipilih,
      },
    });
  };

  const Img = ({ d, cls }) =>
    d.url_gambar ? (
      <img className={cls} src={thumb(d.url_gambar)} alt={d.keterangan ?? ''} loading="lazy" />
    ) : (
      <div
        className={`${cls} ph`}
        role="img"
        aria-label={d.keterangan ?? ''}
        style={{ backgroundImage: GRAD[d.jenis_gambar] }}
      />
    );

  return (
    <div className="fn-app">
      <NavbarEditing />
      <div className="fn-sub">
        <span className="fn-title">{judulEvent}</span>
        <div className="fn-actions">
          <button className={`btn btn-red ${modeHapus ? 'on' : ''}`} onClick={klikHapus}>
            {modeHapus && dipilih.length ? `Hapus (${dipilih.length})` : 'Hapus'}
          </button>
          <button
            className={`btn btn-primary ${modal === 'tambah' ? 'on' : ''}`}
            onClick={() => setModal('tambah')}
          >
            Tambah
          </button>
        </div>
      </div>

      <div className="gal-row">
        <input
          className="search"
          placeholder="Cari gambar event..."
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          aria-label="Cari gambar event"
        />
        <select
          className="gal-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter jenis gambar"
        >
          <option value="semua">Semua jenis</option>
          {JENIS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="gal-err" role="alert">
          {error}
        </p>
      )}
      {info && (
        <p className="gal-ok" role="status">
          {info}
        </p>
      )}

      {loading ? (
        <p className="gal-state">Memuat gambar…</p>
      ) : tampil.length === 0 ? (
        <p className="gal-state">
          {items.length
            ? 'Gambar tidak ditemukan. Coba kata kunci atau filter lain.'
            : 'Belum ada gambar. Klik Tambah untuk mengunggah.'}
        </p>
      ) : (
        <div className="gal-grid">
          {tampil.map((d) => (
            <figure className="gal-card" key={d.id_gambar}>
              <Img d={d} cls="gal-img" />
              <figcaption className="gal-cap">
                <div style={{ minWidth: 0 }}>
                  <div className="gal-name" title={d.keterangan}>
                    {d.keterangan}
                  </div>
                  <div className="gal-meta">
                    <span className="gal-badge">{LABEL[d.jenis_gambar] ?? d.jenis_gambar}</span>
                    {tgl(d.waktu_diunggah)}
                  </div>
                </div>
                {modeHapus && (
                  <button
                    className="gal-check"
                    aria-label={`Pilih ${d.keterangan}`}
                    aria-pressed={dipilih.includes(d.id_gambar)}
                    onClick={() => toggle(d.id_gambar)}
                  >
                    {dipilih.includes(d.id_gambar) ? '✓' : ''}
                  </button>
                )}
              </figcaption>
              {!modeHapus && (
                <div className="gal-act">
                  <button onClick={() => bukaAksi('poster', d)}>Jadikan Poster</button>
                  <button onClick={() => bukaAksi('denah', d)}>Jadikan Denah</button>
                </div>
              )}
            </figure>
          ))}
        </div>
      )}

      {asalReview && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '20px 24px 32px',
          }}
        >
          <button className="btn btn-primary" onClick={kembaliKeReview}>
            Kembali ke Review Event
          </button>
        </div>
      )}

      {modal === 'tambah' && (
        <div className="overlay" onClick={tutup}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>Upload Gambar Event</h2>
            <button className="drop" onClick={() => input.current.click()}>
              {form.preview ? (
                <img src={form.preview} alt="Pratinjau" />
              ) : (
                <span>
                  <span className="plus">+</span>
                  <br />
                  Klik bagian ini untuk menambah gambar
                </span>
              )}
            </button>
            <input ref={input} type="file" accept={TIPE.join(',')} hidden onChange={pilihFile} />
            <input
              className="field"
              style={{ marginTop: 14 }}
              placeholder="Tambahkan nama gambar..."
              aria-label="Nama gambar"
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
            />
            <select
              className="field"
              style={{ marginTop: 10 }}
              aria-label="Jenis gambar"
              value={form.jenis}
              onChange={(e) => setForm({ ...form, jenis: e.target.value })}
            >
              {JENIS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            {formErr && (
              <p className="form-err" role="alert">
                {formErr}
              </p>
            )}
            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={tutup} disabled={busy}>
                Batal
              </button>
              <button className="btn btn-solid" onClick={unggah} disabled={busy}>
                {busy ? 'Mengunggah…' : 'Unggah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(modal === 'poster' || modal === 'denah') && item && (
        <div className="overlay" onClick={tutup}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>
              {modal === 'poster' ? 'Jadikan Poster Event?' : 'Jadikan Denah Event?'}
            </h2>
            <Img d={item} cls="confirm-img" />
            <div className="field" style={{ lineHeight: '44px' }}>
              {item.keterangan}
            </div>
            {modal === 'denah' && (
              <>
                <label className="gal-lbl" htmlFor="nama-denah">
                  Nama denah
                </label>
                <input
                  id="nama-denah"
                  className="field"
                  maxLength={100}
                  placeholder="Ketik nama denah (mis. Area Utama, Lantai 1)..."
                  value={namaDenah}
                  onChange={(e) => {
                    setNamaDenah(e.target.value);
                    setFormErr('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !busy && pindah()}
                />
              </>
            )}
            {modal === 'poster' && adaPoster && (
              <p className="gal-warn">Event ini sudah punya poster. Poster lama akan diganti.</p>
            )}
            <p className="gal-note">
              Gambar dipindahkan, bukan disalin: setelah ini ia hilang dari galeri.
            </p>
            {formErr && (
              <p className="form-err" role="alert">
                {formErr}
              </p>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={tutup} disabled={busy}>
                Batal
              </button>
              <button className="btn btn-solid" onClick={pindah} disabled={busy}>
                {busy ? 'Memindahkan…' : modal === 'poster' ? 'Jadikan Poster' : 'Jadikan Denah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'hapus' && (
        <div className="overlay" onClick={() => !busy && setModal(null)}>
          <div
            className="modal danger"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 26 }}>
              Yakin ingin menghapus {terpilih.length > 1 ? `${terpilih.length} gambar` : 'gambar'}{' '}
              ini?
            </h2>
            <div className="confirm-list">
              {terpilih.map((d) => (
                <div key={d.id_gambar}>
                  <Img d={d} cls="confirm-img" />
                  <div className="field" style={{ lineHeight: '44px', marginBottom: 10 }}>
                    {d.keterangan}
                  </div>
                </div>
              ))}
            </div>
            <p className="gal-note">
              File juga dihapus dari penyimpanan dan tidak dapat dikembalikan.
            </p>
            <div className="modal-actions">
              <button className="btn btn-red" onClick={() => setModal(null)} disabled={busy}>
                Batal
              </button>
              <button className="btn btn-red on" onClick={hapus} disabled={busy}>
                {busy ? 'Menghapus…' : 'Yakin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}