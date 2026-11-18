import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './common.css';
import './GalleryEvent.css';
import NavbarEditing from '../components/NavbarEditing';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000';

/* gambar_event: id_gambar, id_event, url_gambar, public_id, jenis_gambar, keterangan, waktu_diunggah
   jenis_gambar hanya: foto_venue | jadwal | lainnya (poster utama disimpan di event.poster_url) */
const JENIS = [
  ['foto_venue', 'Foto Venue'],
  ['jadwal', 'Jadwal'],
  ['lainnya', 'Lainnya'],
];
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
  iso
    ? new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '-';

const getAuthHeaders = (withJson = false) => {
  const token =
    localStorage.getItem('access_token') || localStorage.getItem('token') || '';
  const h = {};
  if (withJson) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

const getEditorContext = () => {
  try {
    return JSON.parse(sessionStorage.getItem('festnav_editor_ctx') || 'null') || {};
  } catch {
    return {};
  }
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

const parseJsonOrThrow = async (res, fallbackMsg) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || fallbackMsg);
  }
  return data;
};

const prepGaleriInFlight = new Map();

function siapkanGaleriSekali(idScraping) {
  const key = String(idScraping);
  if (prepGaleriInFlight.has(key)) {
    return prepGaleriInFlight.get(key);
  }
  const req = fetch(`${API_BASE}/api/scraping/${key}/siapkan-galeri`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
    .then(async (res) => (res.ok ? res.json() : null))
    .finally(() => {
      setTimeout(() => prepGaleriInFlight.delete(key), 2000);
    });

  prepGaleriInFlight.set(key, req);
  return req;
}

export const httpApi = {
  list: async (idEvent) => {
    const headers = getAuthHeaders();
    const [resGambar, resEv] = await Promise.all([
      fetch(`${API_BASE}/api/events/${idEvent}/gambar`, { headers }),
      fetch(`${API_BASE}/api/events/${idEvent}`, { headers }),
    ]);
    const gambar = await parseJsonOrThrow(
      resGambar,
      'Gagal memuat gambar event.'
    );
    const ev = resEv.ok ? await resEv.json() : null;
    return {
      gambar,
      poster_url: ev?.poster_url ?? null,
      event: ev,
    };
  },

  upload: async (idEvent, { file, imageUrl, keterangan, jenis }) => {
    const finalUrl = imageUrl?.trim()
      ? imageUrl.trim()
      : await fileToDataUrl(file);

    const res = await fetch(`${API_BASE}/api/events/${idEvent}/gambar`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        url_gambar: finalUrl,
        public_id: null,
        jenis_gambar: jenis,
        keterangan,
      }),
    });
    return parseJsonOrThrow(res, 'Gagal mengunggah gambar event.');
  },

  remove: async (ids) => {
    const headers = getAuthHeaders();
    await Promise.all(
      ids.map(async (idGambar) => {
        const res = await fetch(`${API_BASE}/api/gambar/${idGambar}`, {
          method: 'DELETE',
          headers,
        });
        if (!res.ok && res.status !== 404) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Gagal menghapus gambar #${idGambar}.`);
        }
      })
    );
  },

  jadikanPoster: async (idGambar) => {
    const res = await fetch(
      `${API_BASE}/api/gambar/${idGambar}/jadikan-poster`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
      }
    );
    return parseJsonOrThrow(res, 'Gagal menjadikan gambar sebagai poster.');
  },

  jadikanDenah: async (idGambar, namaMap) => {
    const res = await fetch(`${API_BASE}/api/gambar/${idGambar}/jadikan-denah`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ nama_map: namaMap }),
    });
    return parseJsonOrThrow(res, 'Gagal menjadikan gambar sebagai denah.');
  },
};

export default function GalleryEvent({
  idEvent,
  namaEvent = 'Dies Natalis Udayana 2026',
  api = httpApi,
}) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const editorCtx = getEditorContext();
  const navState = location.state || {};

  const initialId =
    idEvent ??
    navState.eventId ??
    navState.idEvent ??
    navState.id_event ??
    params.idEvent ??
    editorCtx.eventId ??
    editorCtx.id_event ??
    null;

  const [activeEventId, setActiveEventId] = useState(initialId);
  const [judulEvent, setJudulEvent] = useState(
    navState.eventTitle || navState.namaEvent || editorCtx.eventTitle || namaEvent
  );
  const asalReview = navState.from;

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
  const [form, setForm] = useState({
    file: null,
    imageUrl: '',
    preview: '',
    keterangan: '',
    jenis: JENIS_AWAL,
  });
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef();

  const muat = async (targetId = activeEventId) => {
    if (!targetId) return;
    const r = await api.list(targetId);
    setItems(r.gambar || []);
    setAdaPoster(!!r.poster_url);
    if (r.event?.nama_event) {
      setJudulEvent(r.event.nama_event);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initGaleri = async () => {
      setLoading(true);
      setError('');
      try {
        let resolvedId = initialId;

        // Jika dibuka dari Review Scraping, pastikan draft event & kandidat gambar scraping siap (idempoten)
        if (navState.idScraping) {
          const jobData = await siapkanGaleriSekali(navState.idScraping);
          if (jobData?.id_event) {
            resolvedId = jobData.id_event;
          }
        }

        if (!resolvedId) {
          throw new Error(
            'ID event tidak ditemukan. Buka galeri dari halaman Review Scraping atau Detail Event.'
          );
        }

        if (cancelled) return;
        setActiveEventId(resolvedId);
        await muat(resolvedId);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Gagal memuat gambar event.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initGaleri();
    return () => {
      cancelled = true;
    };
    /* eslint-disable-next-line */
  }, [initialId, navState.idScraping, api]);

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
    if (form.preview && form.file) URL.revokeObjectURL(form.preview);
    setModal(null);
    setItem(null);
    setNamaDenah('');
    setForm({
      file: null,
      imageUrl: '',
      preview: '',
      keterangan: '',
      jenis: JENIS_AWAL,
    });
    setFormErr('');
  };

  const pilihFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!TIPE.includes(f.type))
      return setFormErr('Format harus JPG, PNG, atau WebP.');
    if (f.size > MAKS_MB * 1048576)
      return setFormErr(`Ukuran maksimal ${MAKS_MB} MB.`);
    if (form.preview && form.file) URL.revokeObjectURL(form.preview);
    setFormErr('');
    setForm({
      ...form,
      file: f,
      imageUrl: '',
      preview: URL.createObjectURL(f),
    });
  };

  const unggah = async () => {
    if (!activeEventId)
      return setFormErr('ID event belum tersedia. Muat ulang halaman ini.');
    if (!form.file && !form.imageUrl.trim())
      return setFormErr('Pilih file gambar atau tempel URL gambar terlebih dahulu.');
    if (!form.keterangan.trim()) return setFormErr('Nama gambar wajib diisi.');
    setBusy(true);
    setFormErr('');
    try {
      const baru = await api.upload(activeEventId, {
        file: form.file,
        imageUrl: form.imageUrl,
        keterangan: form.keterangan.trim(),
        jenis: form.jenis,
      });
      setItems((s) => [...s, baru]);
      setBusy(false);
      tutup();
      flash('Gambar berhasil ditambahkan ke galeri event.');
    } catch (err) {
      setBusy(false);
      setFormErr(err.message || 'Gagal mengunggah. Coba lagi.');
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
    } catch (err) {
      setBusy(false);
      setError(err.message || 'Gagal menghapus gambar.');
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
    if (modal === 'denah' && nama.length > 100)
      return setFormErr('Nama denah maksimal 100 karakter.');

    setBusy(true);
    setFormErr('');
    try {
      if (modal === 'poster') {
        await api.jadikanPoster(item.id_gambar);
      } else {
        const resDenah = await api.jadikanDenah(item.id_gambar, nama);
        setDenahDipilih(nama);
        if (resDenah?.id_map) {
          try {
            const nextCtx = {
              ...editorCtx,
              eventId: activeEventId,
              id_event: activeEventId,
              id_map: resDenah.id_map,
              eventTitle: judulEvent,
              selectedDenah: {
                id: resDenah.id_map,
                id_map: resDenah.id_map,
                title: resDenah.nama_map,
                namaDenah: resDenah.nama_map,
              },
            };
            sessionStorage.setItem('festnav_editor_ctx', JSON.stringify(nextCtx));
          } catch {
            // Abaikan
          }
        }
      }
      await muat(activeEventId);
      setBusy(false);
      setModal(null);
      setItem(null);
      setNamaDenah('');
      flash(
        modal === 'poster'
          ? 'Gambar dipindahkan menjadi poster event.'
          : `Gambar ditambahkan menjadi denah "${nama}".`
      );
    } catch (err) {
      setBusy(false);
      setFormErr(err.message || 'Gagal memindahkan gambar. Coba lagi.');
    }
  };

  const kembaliKeReview = () => {
    navigate(asalReview || '/scraping', {
      state: {
        view: 'review',
        idScraping: navState.idScraping,
        eventId: activeEventId,
        idEvent: activeEventId,
        id_event: activeEventId,
        posterSudahDiatur: adaPoster,
        denahSudahDiatur: denahDipilih,
      },
    });
  };

  const Img = ({ d, cls }) =>
    d.url_gambar ? (
      <img
        className={cls}
        src={thumb(d.url_gambar)}
        alt={d.keterangan ?? ''}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
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
          <button
            className={`btn btn-red ${modeHapus ? 'on' : ''}`}
            onClick={klikHapus}
          >
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
                    <span className="gal-badge">
                      {LABEL[d.jenis_gambar] ?? d.jenis_gambar}
                    </span>
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
                  <button onClick={() => bukaAksi('poster', d)}>
                    Jadikan Poster
                  </button>
                  <button onClick={() => bukaAksi('denah', d)}>
                    Jadikan Denah
                  </button>
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
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 26 }}>Upload Gambar Event</h2>
            <button className="drop" onClick={() => input.current.click()}>
              {form.preview ? (
                <img
                  src={form.preview}
                  alt="Pratinjau"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>
                  <span className="plus">+</span>
                  <br />
                  Klik bagian ini untuk memilih file gambar
                </span>
              )}
            </button>
            <input
              ref={input}
              type="file"
              accept={TIPE.join(',')}
              hidden
              onChange={pilihFile}
            />
            <input
              className="field"
              style={{ marginTop: 10 }}
              placeholder="Atau tempel URL gambar (https://...)..."
              aria-label="URL gambar"
              value={form.imageUrl}
              onChange={(e) => {
                const url = e.target.value;
                setForm({
                  ...form,
                  file: null,
                  imageUrl: url,
                  preview: url.trim(),
                });
                setFormErr('');
              }}
            />
            <input
              className="field"
              style={{ marginTop: 10 }}
              placeholder="Tambahkan nama gambar..."
              aria-label="Nama gambar"
              value={form.keterangan}
              onChange={(e) =>
                setForm({ ...form, keterangan: e.target.value })
              }
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
              <button
                className="btn btn-ghost"
                onClick={tutup}
                disabled={busy}
              >
                Batal
              </button>
              <button
                className="btn btn-solid"
                onClick={unggah}
                disabled={busy}
              >
                {busy ? 'Mengunggah…' : 'Unggah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(modal === 'poster' || modal === 'denah') && item && (
        <div className="overlay" onClick={tutup}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 26 }}>
              {modal === 'poster'
                ? 'Jadikan Poster Event?'
                : 'Jadikan Denah Event?'}
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
              <p className="gal-warn">
                Event ini sudah punya poster. Poster lama akan diganti.
              </p>
            )}
            <p className="gal-note">
              Gambar dipindahkan, bukan disalin: setelah ini ia hilang dari
              galeri.
            </p>
            {formErr && (
              <p className="form-err" role="alert">
                {formErr}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={tutup}
                disabled={busy}
              >
                Batal
              </button>
              <button
                className="btn btn-solid"
                onClick={pindah}
                disabled={busy}
              >
                {busy
                  ? 'Memindahkan…'
                  : modal === 'poster'
                  ? 'Jadikan Poster'
                  : 'Jadikan Denah'}
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
              Yakin ingin menghapus{' '}
              {terpilih.length > 1 ? `${terpilih.length} gambar` : 'gambar'}{' '}
              ini?
            </h2>
            <div className="confirm-list">
              {terpilih.map((d) => (
                <div key={d.id_gambar}>
                  <Img d={d} cls="confirm-img" />
                  <div
                    className="field"
                    style={{ lineHeight: '44px', marginBottom: 10 }}
                  >
                    {d.keterangan}
                  </div>
                </div>
              ))}
            </div>
            <p className="gal-note">
              File juga dihapus dari penyimpanan dan tidak dapat dikembalikan.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-red"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                Batal
              </button>
              <button
                className="btn btn-red on"
                onClick={hapus}
                disabled={busy}
              >
                {busy ? 'Menghapus…' : 'Yakin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}