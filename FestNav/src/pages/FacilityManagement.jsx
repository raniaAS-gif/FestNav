import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import './common.css';
import './FacilityManagement.css';
import NavbarEditing from '../components/NavbarEditing';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000';

/* Pratinjau label pin. MIRIP aturan SQL inisial_label(); nilai resmi tetap dari database (kolom label_penanda).
   tiap kata -> huruf pertama, kata angka diambil utuh, nama satu kata -> 2 huruf, maksimal 4 karakter. */
export const inisialLabel = (nama) => {
  const kata = (nama ?? '').split(/\s+/).filter((t) => /^[\p{L}\p{N}]/u.test(t));
  if (!kata.length) return '';
  const r =
    kata.length === 1
      ? kata[0].slice(0, 2).toUpperCase()
      : kata.map((t) => (/^\d+$/.test(t) ? t : t[0].toUpperCase())).join('');
  return r.slice(0, 4);
};

const KOSONG = { id_map: '', kode_jenis: '', nama_fasilitas: '', deskripsi: '' };

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

const parseJsonOrThrow = async (res, fallbackMsg) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || fallbackMsg);
  }
  return data;
};

const normalizeFasilitasRow = (f, jenisList = []) => {
  const jObj = jenisList.find((x) => x.kode === f.kode_jenis);
  const warna = f.jenis?.warna ?? jObj?.warna ?? '#3B82F6';
  const namaJenis = f.jenis?.nama_jenis ?? jObj?.nama_jenis ?? f.kode_jenis;
  return {
    id_fasilitas: f.id_fasilitas,
    id_map: f.id_map,
    nama_fasilitas: f.nama_fasilitas,
    label_penanda: f.label_penanda || inisialLabel(f.nama_fasilitas),
    kode_jenis: f.kode_jenis,
    nama_jenis: namaJenis,
    warna,
    deskripsi: f.deskripsi ?? '',
    deskripsi_tampil: f.deskripsi?.trim() || jObj?.deskripsi_default || '',
    sudah_digambar: Boolean(f.bentuk),
  };
};

export const httpApi = {
  list: async (idEvent) => {
    const headers = getAuthHeaders();
    const [resEv, resMaps, resJenis] = await Promise.all([
      fetch(`${API_BASE}/api/events/${idEvent}`, { headers }),
      fetch(`${API_BASE}/api/maps/event/${idEvent}`, { headers }),
      fetch(`${API_BASE}/api/jenis-fasilitas`, { headers }),
    ]);

    const eventData = resEv.ok ? await resEv.json() : null;
    const maps = await parseJsonOrThrow(resMaps, 'Gagal memuat daftar peta event.');
    const jenis = await parseJsonOrThrow(resJenis, 'Gagal memuat jenis fasilitas.');

    const fasPerMap = await Promise.all(
      maps.map(async (m) => {
        const resFas = await fetch(`${API_BASE}/api/fasilitas/map/${m.id_map}`, {
          headers,
        });
        const list = await parseJsonOrThrow(
          resFas,
          `Gagal memuat fasilitas pada peta ${m.nama_map}.`
        );
        return list.map((item) => normalizeFasilitasRow(item, jenis));
      })
    );

    return {
      fasilitas: fasPerMap.flat(),
      peta: maps,
      jenis,
      event: eventData,
    };
  },

  create: async (_idEvent, body, jenisList = []) => {
    const res = await fetch(`${API_BASE}/api/fasilitas`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        id_map: body.id_map,
        kode_jenis: body.kode_jenis,
        nama_fasilitas: body.nama_fasilitas,
        deskripsi: body.deskripsi,
      }),
    });
    const created = await parseJsonOrThrow(res, 'Gagal menambahkan fasilitas.');
    return normalizeFasilitasRow(created, jenisList);
  },

  update: async (idFasilitas, body, oldItem, jenisList = []) => {
    // Jika fasilitas belum digambar dan user memindahkannya ke peta lain
    if (oldItem && !oldItem.sudah_digambar && Number(body.id_map) !== Number(oldItem.id_map)) {
      const created = await httpApi.create(null, body, jenisList);
      const resDel = await fetch(`${API_BASE}/api/fasilitas/${idFasilitas}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!resDel.ok && resDel.status !== 404) {
        throw new Error('Gagal memindahkan fasilitas ke peta baru.');
      }
      return created;
    }

    const res = await fetch(`${API_BASE}/api/fasilitas/${idFasilitas}`, {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        kode_jenis: body.kode_jenis,
        nama_fasilitas: body.nama_fasilitas,
        deskripsi: body.deskripsi,
      }),
    });
    const updated = await parseJsonOrThrow(res, 'Gagal memperbarui fasilitas.');
    return normalizeFasilitasRow(updated, jenisList);
  },

  remove: async (ids) => {
    const headers = getAuthHeaders();
    await Promise.all(
      ids.map(async (idFas) => {
        const res = await fetch(`${API_BASE}/api/fasilitas/${idFas}`, {
          method: 'DELETE',
          headers,
        });
        if (!res.ok && res.status !== 404) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Gagal menghapus fasilitas #${idFas}.`);
        }
      })
    );
  },
};

/* Dropdown jenis dengan kotak warna (isi dari tabel jenis_fasilitas) */
function JenisSelect({ jenis, value, onChange, bad }) {
  const [open, setOpen] = useState(false);
  const dipilih = jenis.find((x) => x.kode === value);
  return (
    <div
      className="dd"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className={`field dd-btn ${bad ? 'bad' : ''}`}
        style={{ textAlign: 'left' }}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {dipilih ? (
          <span className="jenis">
            <span className="dot" style={{ background: dipilih.warna }} />
            {dipilih.nama_jenis}
          </span>
        ) : (
          <span className="placeholder">Pilih jenis fasilitas..</span>
        )}
      </button>
      {open && (
        <div className="dd-list" role="listbox">
          {jenis.map((n) => (
            <button
              key={n.kode}
              type="button"
              role="option"
              aria-selected={n.kode === value}
              onClick={() => {
                onChange(n.kode);
                setOpen(false);
              }}
            >
              <span className="dot" style={{ background: n.warna }} />
              {n.nama_jenis}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FacilityManagement({
  idEvent,
  namaEvent = 'Dies Natalis Udayana 2026',
  api = httpApi,
}) {
  const params = useParams();
  const location = useLocation();
  const editorCtx = getEditorContext();
  const navState = location.state || {};

  const id =
    idEvent ??
    navState.eventId ??
    navState.id_event ??
    params.idEvent ??
    editorCtx.eventId ??
    editorCtx.id_event ??
    1;

  const [eventTitle, setEventTitle] = useState(
    navState.eventTitle || navState.namaEvent || editorCtx.eventTitle || namaEvent
  );
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
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .list(id)
      .then((r) => {
        if (cancelled) return;
        setItems(r.fasilitas || []);
        setPeta(r.peta || []);
        setJenis(r.jenis || []);
        if (r.event?.nama_event) {
          setEventTitle(r.event.nama_event);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Gagal memuat data fasilitas.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, api]);

  const namaPeta = (m) => peta.find((p) => p.id_map === m)?.nama_map ?? '-';
  const q = cari.toLowerCase();
  const tampil = items.filter((d) =>
    [d.nama_fasilitas, d.nama_jenis, d.label_penanda].some((t) =>
      (t || '').toLowerCase().includes(q)
    )
  );
  const terpilih = items.filter((d) => dipilih.includes(d.id_fasilitas));
  const tutup = () => {
    if (!busy) setModal(null);
  };
  const setForm = (k, v) =>
    setModal((m) => ({
      ...m,
      form: { ...m.form, [k]: v },
      errs: { ...m.errs, [k]: undefined },
    }));
  const buka = (tipe, f) => setModal({ tipe, form: f, errs: {} });

  const simpan = async () => {
    const f = modal.form;
    const jn = jenis.find((x) => x.kode === f.kode_jenis);
    const errs = {};
    if (!f.kode_jenis) errs.kode_jenis = 'Pilih jenis fasilitas.';
    if (!f.id_map) errs.id_map = 'Pilih peta.';
    if (Object.keys(errs).length) return setModal({ ...modal, errs });

    const body = {
      id_map: Number(f.id_map),
      kode_jenis: f.kode_jenis,
      nama_fasilitas: f.nama_fasilitas.trim() || jn.nama_jenis,
      deskripsi: f.deskripsi.trim() || null,
    };

    setBusy(true);
    try {
      let r;
      if (modal.tipe === 'tambah') {
        r = await api.create(id, body, jenis);
        setItems((s) => [...s, r]);
      } else {
        const oldItem = items.find((x) => x.id_fasilitas === f.id_fasilitas);
        r = await api.update(f.id_fasilitas, body, oldItem, jenis);
        setItems((s) =>
          s.map((d) => (d.id_fasilitas === f.id_fasilitas ? r : d))
        );
      }
      setBusy(false);
      setModal(null);
    } catch (err) {
      setBusy(false);
      setModal({
        ...modal,
        errs: { umum: err.message || 'Gagal menyimpan. Coba lagi.' },
      });
    }
  };

  const klikHapus = () => {
    if (!modeHapus) return setModeHapus(true);
    if (dipilih.length) setModal({ tipe: 'hapus' });
    else setModeHapus(false);
  };

  const hapus = async () => {
    setBusy(true);
    try {
      await api.remove(dipilih);
      setItems((s) => s.filter((d) => !dipilih.includes(d.id_fasilitas)));
      setDipilih([]);
      setModeHapus(false);
      setBusy(false);
      setModal(null);
    } catch (err) {
      setBusy(false);
      setModal(null);
      setError(err.message || 'Gagal menghapus fasilitas.');
    }
  };

  const toggle = (k) =>
    setDipilih((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const awal = () => {
    const defaultMapId =
      navState.id_map ||
      editorCtx.id_map ||
      (peta.length === 1 ? peta[0].id_map : '');
    return { ...KOSONG, id_map: defaultMapId };
  };

  const f = modal?.form;
  const errs = modal?.errs ?? {};
  const jn = f ? jenis.find((x) => x.kode === f.kode_jenis) : null;
  const labelPreview = f
    ? inisialLabel(f.nama_fasilitas.trim() || jn?.nama_jenis)
    : '';

  return (
    <div className="fn-app">
      <NavbarEditing />
      <div className="fn-sub">
        <span className="fn-title">{eventTitle}</span>
        <div className="fn-actions">
          <button
            className={`btn btn-red ${modeHapus ? 'on' : ''}`}
            onClick={klikHapus}
          >
            {modeHapus && dipilih.length ? `Hapus (${dipilih.length})` : 'Hapus'}
          </button>
          <button
            className={`btn btn-primary ${modal?.tipe === 'tambah' ? 'on' : ''}`}
            onClick={() => buka('tambah', awal())}
          >
            Tambah
          </button>
        </div>
      </div>
      <input
        className="search"
        placeholder="Cari fasilitas..."
        aria-label="Cari fasilitas"
        value={cari}
        onChange={(e) => setCari(e.target.value)}
      />
      {error && (
        <p className="fac-err" role="alert">
          {error}
        </p>
      )}

      <div className="fac-table">
        <div className="fac-inner">
          <div className="fac-row head">
            <span>NAMA</span>
            <span>JENIS</span>
            <span>LABEL</span>
            <span>PETA</span>
            <span />
          </div>
          {loading ? (
            <div className="state">Memuat fasilitas…</div>
          ) : tampil.length === 0 ? (
            <div className="state">
              {items.length
                ? 'Fasilitas tidak ditemukan. Coba kata kunci lain.'
                : 'Belum ada fasilitas. Klik Tambah.'}
            </div>
          ) : (
            tampil.map((d) => (
              <div className="fac-row" key={d.id_fasilitas}>
                <b>{d.nama_fasilitas}</b>
                <span className="jenis">
                  <span className="dot" style={{ background: d.warna }} />
                  {d.nama_jenis}
                </span>
                <span>
                  <span className="lbl" style={{ background: d.warna }}>
                    {d.label_penanda}
                  </span>
                  {!d.sudah_digambar && (
                    <span
                      className="tag"
                      title="Zona belum digambar di Map Editor"
                    >
                      Belum digambar
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>
                  {namaPeta(d.id_map)}
                </span>
                {modeHapus ? (
                  <button
                    className="check"
                    aria-label={`Pilih ${d.nama_fasilitas}`}
                    aria-pressed={dipilih.includes(d.id_fasilitas)}
                    onClick={() => toggle(d.id_fasilitas)}
                  >
                    {dipilih.includes(d.id_fasilitas) ? '✓' : ''}
                  </button>
                ) : (
                  <button
                    className="btn-edit"
                    onClick={() =>
                      buka('edit', {
                        id_fasilitas: d.id_fasilitas,
                        id_map: d.id_map,
                        kode_jenis: d.kode_jenis,
                        nama_fasilitas: d.nama_fasilitas,
                        deskripsi: d.deskripsi ?? '',
                        terkunciPeta: d.sudah_digambar,
                      })
                    }
                  >
                    Edit
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {(modal?.tipe === 'tambah' || modal?.tipe === 'edit') && (
        <div className="overlay" onClick={tutup}>
          <div
            className="modal fac-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              {modal.tipe === 'tambah' ? 'Tambah Fasilitas' : 'Edit Fasilitas'}
            </h2>
            <div className="fac-body">
              <label>
                JENIS <span className="req">*</span>
              </label>
              <JenisSelect
                jenis={jenis}
                value={f.kode_jenis}
                bad={errs.kode_jenis}
                onChange={(v) => setForm('kode_jenis', v)}
              />
              {errs.kode_jenis && (
                <p className="msg" role="alert">
                  {errs.kode_jenis}
                </p>
              )}

              <label htmlFor="nf">NAMA FASILITAS</label>
              <input
                id="nf"
                className="field"
                placeholder={
                  jn
                    ? `Kosongkan untuk memakai "${jn.nama_jenis}"`
                    : 'Masukkan nama fasilitas..'
                }
                value={f.nama_fasilitas}
                onChange={(e) => setForm('nama_fasilitas', e.target.value)}
              />
              <p className="help">
                Label pin:{' '}
                {labelPreview ? (
                  <span
                    className="lbl"
                    style={{ background: jn?.warna ?? '#64748b' }}
                  >
                    {labelPreview}
                  </span>
                ) : (
                  '-'
                )}{' '}
                (dibuat otomatis dari nama)
              </p>

              <label htmlFor="pt">
                PETA <span className="req">*</span>
              </label>
              <select
                id="pt"
                className={`field ${errs.id_map ? 'bad' : ''}`}
                value={f.id_map}
                disabled={f.terkunciPeta}
                onChange={(e) => setForm('id_map', e.target.value)}
              >
                <option value="">Pilih peta..</option>
                {peta.map((p) => (
                  <option key={p.id_map} value={p.id_map}>
                    {p.nama_map}
                  </option>
                ))}
              </select>
              {f.terkunciPeta ? (
                <p className="help">
                  Peta tidak bisa diubah karena zona sudah digambar. Hapus
                  zonanya di Map Editor dulu.
                </p>
              ) : errs.id_map ? (
                <p className="msg" role="alert">
                  {errs.id_map}
                </p>
              ) : (
                <p className="help">
                  Zona fasilitas digambar nanti di Map Editor.
                </p>
              )}

              <label htmlFor="ds">DESKRIPSI</label>
              <textarea
                id="ds"
                className="field"
                placeholder={
                  jn?.deskripsi_default
                    ? `Kosongkan untuk memakai: ${jn.deskripsi_default}`
                    : 'Opsional'
                }
                value={f.deskripsi}
                onChange={(e) => setForm('deskripsi', e.target.value)}
              />
              {errs.umum && (
                <p className="msg" role="alert">
                  {errs.umum}
                </p>
              )}
            </div>
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
                onClick={simpan}
                disabled={busy}
              >
                {busy
                  ? 'Menyimpan…'
                  : modal.tipe === 'tambah'
                  ? 'Tambah'
                  : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal?.tipe === 'hapus' && (
        <div className="overlay" onClick={tutup}>
          <div
            className="modal danger fac-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Hapus Fasilitas</h2>
            <div className="fac-body">
              {terpilih.map((d) => (
                <div key={d.id_fasilitas}>
                  <label>NAMA FASILITAS</label>
                  <div className="field ro">{d.nama_fasilitas}</div>
                  <label>JENIS</label>
                  <div className="field ro">{d.nama_jenis}</div>
                  <label>LABEL</label>
                  <div className="field ro">
                    {d.label_penanda}
                    {d.sudah_digambar ? '' : ' · belum digambar'}
                  </div>
                </div>
              ))}
              <p className="help">
                Zona di peta (jika sudah digambar) ikut terhapus. Tindakan ini
                tidak dapat dibatalkan.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-red"
                onClick={tutup}
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