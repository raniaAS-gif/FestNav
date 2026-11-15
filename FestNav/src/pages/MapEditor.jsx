import { useEffect, useMemo, useRef, useState } from 'react';
import './common.css';
import './MapEditor.css';
import NavbarEditing from '../components/NavbarEditing'
import { JENIS_ZONA } from './FacilityManagement';

/* Rute: warna garis otomatis mengikuti akses_penggunaan */
const AKSES = ['Umum', 'VIP', 'Staf'];
const WARNA_AKSES = { Umum: '#2563eb', VIP: '#dc2626', Staf: '#000000' };
const NAMA_WARNA = { Umum: 'Biru', VIP: 'Merah', Staf: 'Hitam' };
const ABU = '#94a3b8';
const warnaJ = (j) => JENIS_ZONA[j] || ABU;
const W = 850, H = 485, MPP = 0.5, OPASITAS_AWAL = 0.7;
const KEY = { zona: 'zona', rute: 'rute', marker: 'penanda' };
const IDK = { zona: 'id_zona', rute: 'id_rute', marker: 'id_penanda' };
const BENTUK = { rectangle: 'persegi panjang', ellipse: 'lingkaran', polygon: 'poligon' };

const I = (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{c}</svg>;
const ICON = { select: I(<path d="M5 3l14 8-6 2-2 6z" />), rectangle: I(<rect x="3" y="6" width="18" height="12" rx="1" />), ellipse: I(<circle cx="12" cy="12" r="8" />), polygon: I(<path d="M12 3l8 5v8l-8 5-8-5V8z" />), line: I(<path d="M5 19L19 5" />) };

/* Denah contoh. Di aplikasi nyata: mapData.gambar_layout berasal dari Detail Event / Review Event / Lihat Event */
const DENAH_DEMO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 545 310"><rect width="545" height="310" fill="#f8fafc"/><rect x="20" y="20" width="200" height="120" fill="#dbeafe" stroke="#334155"/><rect x="240" y="20" width="140" height="120" fill="#dcfce7" stroke="#334155"/><rect x="400" y="20" width="125" height="120" fill="#fee2e2" stroke="#334155"/><rect x="20" y="160" width="505" height="40" fill="#e2e8f0"/><rect x="20" y="220" width="240" height="70" fill="#fef3c7" stroke="#334155"/><rect x="280" y="220" width="245" height="70" fill="#ede9fe" stroke="#334155"/></svg>');
const MAP_DEFAULT = { id_map: 1, id_event: 1, nama_map: 'Day 1: Lapangan Rektorat', tipe_map: 'outdoor', level_lantai: null, garis_lintang_pusat: -8.6724, garis_bujur_pusat: 115.2362, gambar_layout: DENAH_DEMO };
/* Fasilitas milik peta ini (dari Manajemen Fasilitas), lengkap dengan marker yang diketik di sana */
const FAS_DEFAULT = [[1, 'Toilet Utara', 'Fasilitas Umum', 'T1', 'Toilet umum area utara.'], [2, 'Food Court A', 'Kuliner', 'F1', 'Area makanan dan minuman.'], [3, 'Panggung Utama', 'Panggung / Stage', 'P1', 'Panggung utama pertunjukan.'],
  [4, 'Parkir Timur', 'Parkir', 'K2', 'Parkir kendaraan sisi timur.'], [5, 'Area VIP', 'VIP', 'V1', 'Area khusus tamu VIP.'], [6, 'Bazzar Tenant 12', 'Bazzar / Tenant', 'B12', 'Tenant bazar nomor 12.']]
  .map(([id, n, j, m, d]) => ({ id_fasilitas: id, id_map: 1, nama_fasilitas: n, jenis_fasilitas: j, deskripsi: d, penanda: { id_penanda: id, nama_penanda: m } }));

/* ---------- proyeksi piksel <-> [bujur, lintang] ---------- */
const proj = (c) => {
  const dLat = MPP / 110574, dLng = MPP / (111320 * Math.cos((c.lat * Math.PI) / 180));
  const r7 = (n) => Math.round(n * 1e7) / 1e7;
  return { toLL: ([x, y]) => [r7(c.lng + (x - W / 2) * dLng), r7(c.lat - (y - H / 2) * dLat)], toPx: ([lng, lat]) => [(lng - c.lng) / dLng + W / 2, (c.lat - lat) / dLat + H / 2] };
};
/* ---------- geometri murni (piksel) ---------- */
const rectPts = (b) => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
const ellPts = (b) => { const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, rx = (b[2] - b[0]) / 2, ry = (b[3] - b[1]) / 2; return Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * 2 * Math.PI; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }); };
const hexPts = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos((i * Math.PI) / 3), cy + r * Math.sin((i * Math.PI) / 3)]);
const bbox = (p) => { const xs = p.map((a) => a[0]), ys = p.map((a) => a[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const corners = (b) => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
const area = (p) => (Math.abs(p.reduce((s, a, i) => { const q = p[(i + 1) % p.length]; return s + a[0] * q[1] - q[0] * a[1]; }, 0)) / 2) * MPP * MPP;
const plen = (p) => p.reduce((s, a, i) => (i ? s + Math.hypot(a[0] - p[i - 1][0], a[1] - p[i - 1][1]) : 0), 0) * MPP;
const centroid = (p) => { let a = 0, cx = 0, cy = 0; p.forEach((q, i) => { const r = p[(i + 1) % p.length], c = q[0] * r[1] - r[0] * q[1]; a += c; cx += (q[0] + r[0]) * c; cy += (q[1] + r[1]) * c; }); a /= 2; return a ? [cx / (6 * a), cy / (6 * a)] : p[0]; };
const ring = (z) => z.bentuk_batas_zona.coordinates[0].slice(0, -1);
const pts2s = (p) => p.map((a) => a.join(',')).join(' ');
const fmt = (c) => `${c[1].toFixed(6)}, ${c[0].toFixed(6)}`; // lintang, bujur
const makeShape = (kind, p0, p1) => {
  const r = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), click = r < 6;
  if (kind === 'rectangle') return rectPts(click ? [p0[0] - 50, p0[1] - 30, p0[0] + 50, p0[1] + 30] : [Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1])]);
  if (kind === 'ellipse') { const R = click ? 35 : r; return ellPts([p0[0] - R, p0[1] - R, p0[0] + R, p0[1] + R]); }
  return hexPts(p0[0], p0[1], click ? 45 : r);
};

/* ---------- data contoh (ganti dengan data dari API) ---------- */
const seed = (toLL, idMap, fas) => {
  const P = (pts) => ({ type: 'Polygon', coordinates: [[...pts, pts[0]].map(toLL)] });
  const Z = (idz, fid, bentuk, pts) => { const f = fas.find((x) => x.id_fasilitas === fid); return { id_zona: idz, id_map: idMap, id_fasilitas: fid, nama_zona: f.nama_fasilitas, jenis_zona: f.jenis_fasilitas, deskripsi: f.deskripsi, bentuk, bentuk_batas_zona: P(pts) }; };
  const dipasang = { 3: 1, 2: 2, 1: 4, 5: 5 }; // id_fasilitas -> id_zona (K2 sengaja belum diletakkan)
  return {
    zona: [Z(1, 3, 'polygon', [[462, 10], [610, 18], [640, 80], [590, 130], [470, 130], [455, 70]]), Z(2, 2, 'polygon', [[345, 45], [425, 80], [415, 185], [340, 168]]),
      Z(3, 4, 'polygon', [[460, 230], [565, 255], [545, 325], [460, 290]]), Z(4, 1, 'rectangle', rectPts([365, 190, 450, 245])), Z(5, 5, 'rectangle', rectPts([598, 237, 670, 290]))],
    rute: [{ id_rute: 1, id_map: idMap, nama_rute: 'Rute Pejalan Kaki Utama', akses_penggunaan: 'Umum', bentuk_jalur_rute: { type: 'LineString', coordinates: [[538, 98], [480, 150], [535, 205], [528, 228]].map(toLL) } }],
    penanda: fas.map((f) => ({ id_penanda: f.penanda.id_penanda, id_map: idMap, id_fasilitas: f.id_fasilitas, nama_penanda: f.penanda.nama_penanda, dipasang: dipasang[f.id_fasilitas] != null, id_zona: dipasang[f.id_fasilitas] ?? null })),
    overlay: null,
  };
};

export default function MapEditor({ namaEvent = 'Dies Natalis Udayana 2026', mapData = MAP_DEFAULT, fasilitas = FAS_DEFAULT, onSave, onPublish }) {
  const { toLL, toPx } = useMemo(() => proj({ lat: mapData.garis_lintang_pusat, lng: mapData.garis_bujur_pusat }), [mapData]);
  const [doc, setDoc] = useState(() => seed(toLL, mapData.id_map, fasilitas));
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [tool, setTool] = useState('pilih');
  const [mode, setMode] = useState('draw');
  const [shape, setShape] = useState('rectangle');
  const [menu, setMenu] = useState(false);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [rDraw, setRDraw] = useState(null);
  const [hidden, setHidden] = useState({});
  const [view, setView] = useState('kanvas');
  const [oDlg, setODlg] = useState(false);
  const [toast, setToast] = useState(null);
  const svgRef = useRef(); const drag = useRef(null); const snap = useRef(null); const seq = useRef(100);
  const nid = () => ++seq.current;

  /* ---------- riwayat ---------- */
  const push = (before) => { setPast((p) => [...p, before]); setFuture([]); };
  const commit = (next) => { push(doc); setDoc(next); };
  const undo = () => { if (!past.length) return; setFuture((f) => [doc, ...f]); setDoc(past[past.length - 1]); setPast(past.slice(0, -1)); setRDraw(null); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, doc]); setDoc(future[0]); setFuture(future.slice(1)); };

  /* ---------- helper ---------- */
  const zoneOf = (id) => doc.zona.find((z) => z.id_zona === id);
  const warnaZ = (id) => warnaJ(zoneOf(id)?.jenis_zona);
  const markerPos = (m) => centroid(ring(zoneOf(m.id_zona)).map(toPx)); // marker selalu di tengah zona
  const placed = doc.penanda.filter((m) => m.dipasang && zoneOf(m.id_zona));
  const selObj = sel ? doc[KEY[sel.type]].find((o) => o[IDK[sel.type]] === sel.id) : null;
  const patch = (type, id, p) => ({ ...doc, [KEY[type]]: doc[KEY[type]].map((o) => (o[IDK[type]] === id ? { ...o, ...p } : o)) });
  const edit = (p) => setDoc(patch(sel.type, sel.id, p));
  const editC = (p) => commit(patch(sel.type, sel.id, p));
  const polyGeom = (pts) => ({ type: 'Polygon', coordinates: [[...pts, pts[0]].map(toLL)] });
  const shift = (c, dx, dy) => { const [x, y] = toPx(c); return toLL([x + dx, y + dy]); };
  const hid = (k) => hidden[k];
  const tg = (k) => setHidden((h) => ({ ...h, [k]: !h[k] }));
  const flash = (t, err = false) => { setToast({ t, err }); setTimeout(() => setToast(null), 2600); };

  const closeRoute = (dropLast) => {
    if (!rDraw) return; const id = rDraw; setRDraw(null);
    setDoc((cur) => ({ ...cur, rute: cur.rute.flatMap((r) => { if (r.id_rute !== id) return [r]; const c = dropLast ? r.bentuk_jalur_rute.coordinates.slice(0, -1) : r.bentuk_jalur_rute.coordinates; return c.length < 2 ? [] : [{ ...r, bentuk_jalur_rute: { type: 'LineString', coordinates: c } }]; }) }));
  };
  const ubahTool = (t) => { closeRoute(false); setTool(t); setMode('draw'); setMenu(false); };

  /* ---------- zona <-> fasilitas ---------- */
  const pilihFasilitas = (z, v) => {
    const f = fasilitas.find((x) => x.id_fasilitas === Number(v));
    commit({ ...doc,
      zona: doc.zona.map((q) => (q.id_zona === z.id_zona ? { ...q, id_fasilitas: f?.id_fasilitas ?? null, nama_zona: f?.nama_fasilitas ?? '', jenis_zona: f?.jenis_fasilitas ?? null, deskripsi: f?.deskripsi ?? '' } : q)),
      penanda: doc.penanda.map((m) => (m.id_zona === z.id_zona ? { ...m, dipasang: false, id_zona: null } : m)) }); // marker lama dilepas
  };
  const pasangMarker = (z) => {
    if (!z.id_fasilitas) return flash('Pilih fasilitas untuk zona ini dulu (panel kanan).', true);
    const m = doc.penanda.find((x) => x.id_fasilitas === z.id_fasilitas);
    if (!m) return flash('Fasilitas ini belum punya marker.', true);
    if (m.dipasang) { setSel({ type: 'marker', id: m.id_penanda }); return flash('Zona ini sudah punya marker.'); }
    commit(patch('marker', m.id_penanda, { dipasang: true, id_zona: z.id_zona })); setSel({ type: 'marker', id: m.id_penanda });
  };

  /* ---------- pointer ---------- */
  const pt = (e) => { const r = svgRef.current.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  const startDrag = (e, d) => { drag.current = { ...d, before: doc, moved: false }; svgRef.current.setPointerCapture(e.pointerId); };
  const drawingRoute = tool === 'rute' && mode === 'draw';

  const addPoint = (p) => {
    const ll = toLL(p);
    if (!rDraw) {
      const id = nid();
      commit({ ...doc, rute: [...doc.rute, { id_rute: id, id_map: mapData.id_map, nama_rute: `Rute baru ${id - 100}`, akses_penggunaan: 'Umum', bentuk_jalur_rute: { type: 'LineString', coordinates: [ll] } }] });
      setRDraw(id); setSel({ type: 'rute', id }); return;
    }
    setDoc((cur) => ({ ...cur, rute: cur.rute.map((r) => (r.id_rute !== rDraw ? r : { ...r, bentuk_jalur_rute: { type: 'LineString', coordinates: [...r.bentuk_jalur_rute.coordinates, ll] } })) }));
  };
  const bgDown = (e) => {
    const p = pt(e);
    if (tool === 'zona' && mode === 'draw') { setSel(null); startDrag(e, { kind: 'draw' }); setDraft({ shape, p0: p, p1: p }); return; }
    if (drawingRoute) { addPoint(p); return; }
    setSel(null);
  };
  const objDown = (e, type, o) => {
    e.stopPropagation();
    if (drawingRoute) return bgDown(e);
    if (tool === 'overlay') return;
    if (tool === 'marker' && type === 'zona') return pasangMarker(o);
    const id = o[IDK[type]];
    setSel({ type, id });
    if (type !== 'marker') startDrag(e, { kind: 'move', type, id, last: pt(e) }); // marker tidak bisa digeser
  };
  const reshape = (z, d, p) => {
    let pts;
    if (z.bentuk === 'polygon') { pts = ring(z).map(toPx); pts[d.i] = p; }
    else {
      const b = [Math.min(p[0], d.opp[0]), Math.min(p[1], d.opp[1]), Math.max(p[0], d.opp[0]), Math.max(p[1], d.opp[1])];
      if (b[2] - b[0] < 6 || b[3] - b[1] < 6) return z;
      pts = z.bentuk === 'rectangle' ? rectPts(b) : ellPts(b);
    }
    return { ...z, bentuk_batas_zona: polyGeom(pts) };
  };
  const onMove = (e) => {
    const d = drag.current; if (!d) return; const p = pt(e);
    if (d.kind === 'draw') { setDraft((x) => x && { ...x, p1: p }); return; }
    d.moved = true;
    if (d.kind === 'move') {
      const dx = p[0] - d.last[0], dy = p[1] - d.last[1]; d.last = p;
      setDoc((cur) => ({ ...cur, [KEY[d.type]]: cur[KEY[d.type]].map((o) => {
        if (o[IDK[d.type]] !== d.id) return o;
        if (d.type === 'zona') return { ...o, bentuk_batas_zona: { type: 'Polygon', coordinates: [o.bentuk_batas_zona.coordinates[0].map((c) => shift(c, dx, dy))] } };
        return { ...o, bentuk_jalur_rute: { type: 'LineString', coordinates: o.bentuk_jalur_rute.coordinates.map((c) => shift(c, dx, dy)) } };
      }) }));
    } else if (d.kind === 'vert') setDoc((cur) => ({ ...cur, zona: cur.zona.map((z) => (z.id_zona === d.id ? reshape(z, d, p) : z)) }));
    else if (d.kind === 'rvert') setDoc((cur) => ({ ...cur, rute: cur.rute.map((r) => (r.id_rute !== d.id ? r : { ...r, bentuk_jalur_rute: { type: 'LineString', coordinates: r.bentuk_jalur_rute.coordinates.map((c, i) => (i === d.i ? toLL(p) : c)) } })) }));
  };
  const onUp = () => {
    const d = drag.current; drag.current = null; if (!d) return;
    if (d.kind === 'draw') {
      const dr = draft; setDraft(null); if (!dr) return;
      const id = nid();
      const z = { id_zona: id, id_map: mapData.id_map, id_fasilitas: null, nama_zona: '', jenis_zona: null, deskripsi: '', bentuk: dr.shape, bentuk_batas_zona: polyGeom(makeShape(dr.shape, dr.p0, dr.p1)) };
      push(d.before); setDoc((cur) => ({ ...cur, zona: [...cur.zona, z] })); setSel({ type: 'zona', id }); return;
    }
    if (d.moved) push(d.before);
  };

  const hapus = () => {
    if (tool === 'overlay') { if (doc.overlay) commit({ ...doc, overlay: null }); return; }
    if (!selObj) return;
    if (sel.type === 'marker') { commit(patch('marker', sel.id, { dipasang: false, id_zona: null })); setSel(null); return; } // lepas dari peta
    const k = KEY[sel.type];
    const next = { ...doc, [k]: doc[k].filter((o) => o[IDK[sel.type]] !== sel.id) };
    if (sel.type === 'zona') next.penanda = next.penanda.map((m) => (m.id_zona === sel.id ? { ...m, dipasang: false, id_zona: null } : m));
    commit(next); setSel(null);
  };
  const tambahOverlay = () => { commit({ ...doc, overlay: { url: mapData.gambar_layout, bounds: [toLL([170, 375]), toLL([715, 65])], opacity: OPASITAS_AWAL } }); setODlg(false); };

  /* ---------- keluaran sesuai kolom database ---------- */
  const rows = () => ({
    map: { ...mapData, gambar_layout: mapData.gambar_layout ?? null, overlay_bounds: doc.overlay?.bounds ?? null, overlay_opacity: doc.overlay?.opacity ?? null },
    zona: doc.zona.map(({ bentuk, ...z }) => z),
    rute: doc.rute.map((r) => { const c = r.bentuk_jalur_rute.coordinates; return { ...r, titik_awal: c[0], titik_akhir: c[c.length - 1], jarak: Math.round(plen(c.map(toPx))) }; }),
    penanda_lokasi: doc.penanda.map((m) => { const z = m.dipasang && zoneOf(m.id_zona); const [lng, lat] = z ? toLL(markerPos(m)) : [null, null];
      return { id_penanda: m.id_penanda, id_map: m.id_map, id_fasilitas: m.id_fasilitas, jenis_penanda: z?.jenis_zona ?? null, garis_lintang: lat, garis_bujur: lng }; }),
  });
  const geojson = () => {
    const r = rows();
    return { type: 'FeatureCollection', features: [
      ...r.zona.map(({ bentuk_batas_zona: g, ...p }) => ({ type: 'Feature', geometry: g, properties: { layer: 'zona', ...p, luas_m2: Math.round(area(g.coordinates[0].slice(0, -1).map(toPx))) } })),
      ...r.rute.map(({ bentuk_jalur_rute: g, ...p }) => ({ type: 'Feature', geometry: g, properties: { layer: 'rute', ...p } })),
      ...r.penanda_lokasi.filter((m) => m.garis_lintang != null).map((m) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [m.garis_bujur, m.garis_lintang] }, properties: { layer: 'marker', nama_penanda: doc.penanda.find((x) => x.id_penanda === m.id_penanda)?.nama_penanda, ...m } })),
    ] };
  };
  const simpan = () => {
    const kosong = doc.zona.filter((z) => !z.id_fasilitas).length;
    if (kosong) return flash(`${kosong} zona belum memilih fasilitas.`, true);
    (onSave ?? ((r) => console.log('Simpan', r)))(rows()); flash('Perubahan disimpan');
  };
  const gjText = view === 'geojson' ? JSON.stringify(geojson(), null, 2) : '';
  const unduh = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([gjText], { type: 'application/geo+json' })); a.download = `map-${mapData.id_map}.geojson`; a.click(); };

  /* ---------- keyboard ---------- */
  const api = useRef(); api.current = { undo, redo, hapus, closeRoute };
  useEffect(() => {
    const h = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase(), m = e.ctrlKey || e.metaKey;
      if (m && k === 'z') { e.preventDefault(); e.shiftKey ? api.current.redo() : api.current.undo(); }
      else if (m && k === 'y') { e.preventDefault(); api.current.redo(); }
      else if (k === 'delete' || k === 'backspace') api.current.hapus();
      else if (k === 'escape' || k === 'enter') api.current.closeRoute(false);
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  /* ---------- inspector ---------- */
  const renderInsp = () => {
    if (tool === 'overlay') return doc.overlay ? (<>
      <label>OPASITAS PETA · {Math.round(doc.overlay.opacity * 100)}%</label>
      <input data-live type="range" min="0" max="100" value={Math.round(doc.overlay.opacity * 100)} aria-label="Opasitas peta" onChange={(e) => setDoc({ ...doc, overlay: { ...doc.overlay, opacity: e.target.value / 100 } })} />
      <p className="help">Bawaan 70%. Geser untuk mengatur seberapa jelas denah terlihat di atas peta.</p></>) : <p className="muted">Belum ada overlay. Klik "Tambah Overlay" di bawah peta.</p>;
    if (!selObj) return <p className="muted">Klik zona, rute, atau marker pada kanvas (atau di Layer Manager) untuk melihat propertinya.</p>;
    const o = selObj;
    if (sel.type === 'zona') {
      const tersedia = fasilitas.filter((f) => f.id_map === mapData.id_map && (f.id_fasilitas === o.id_fasilitas || !doc.zona.some((z) => z.id_fasilitas === f.id_fasilitas)));
      const m = doc.penanda.find((x) => x.id_fasilitas === o.id_fasilitas);
      return (<>
        <label>NAMA FASILITAS</label>
        <select className="box" value={o.id_fasilitas ?? ''} onChange={(e) => pilihFasilitas(o, e.target.value)}>
          <option value="">Pilih fasilitas..</option>{tersedia.map((f) => <option key={f.id_fasilitas} value={f.id_fasilitas}>{f.nama_fasilitas}</option>)}
        </select>
        {!tersedia.length && <p className="help">Semua fasilitas sudah punya zona. Tambah fasilitas di Manajemen Fasilitas.</p>}
        <label>JENIS</label><div className="box ro">{o.jenis_zona ? <><span className="dot" style={{ background: warnaJ(o.jenis_zona) }} />{o.jenis_zona}</> : '-'}</div>
        <label>DESKRIPSI</label><div className="box ro desc">{o.deskripsi || '-'}</div>
        <label>MARKER</label><div className="box ro">{m ? `${m.nama_penanda} · ${m.dipasang ? 'di tengah zona' : 'belum diletakkan'}` : '-'}</div>
        <label>LUAS</label><div className="box ro">{Math.round(area(ring(o).map(toPx))).toLocaleString('id-ID')} m²</div>
      </>);
    }
    if (sel.type === 'rute') { const c = o.bentuk_jalur_rute.coordinates; return (<>
      <label>NAMA</label><input data-live className="box" value={o.nama_rute} onChange={(e) => edit({ nama_rute: e.target.value })} />
      <label>AKSES PENGGUNAAN</label><select className="box" value={o.akses_penggunaan} onChange={(e) => editC({ akses_penggunaan: e.target.value })}>{AKSES.map((a) => <option key={a}>{a}</option>)}</select>
      <label>WARNA GARIS</label><div className="box ro"><span className="dot" style={{ background: WARNA_AKSES[o.akses_penggunaan] }} />{NAMA_WARNA[o.akses_penggunaan]} (otomatis)</div>
      <label>PANJANG</label><div className="box ro">{Math.round(plen(c.map(toPx)))} m</div>
      <label>TITIK AWAL</label><div className="box ro sm">{fmt(c[0])}</div>
      <label>TITIK AKHIR</label><div className="box ro sm">{fmt(c[c.length - 1])}</div>
    </>); }
    const z = zoneOf(o.id_zona), f = fasilitas.find((x) => x.id_fasilitas === o.id_fasilitas);
    return (<>
      <label>NAMA MARKER</label><div className="box ro">{o.nama_penanda}</div>
      <label>FASILITAS</label><div className="box ro">{f?.nama_fasilitas ?? '-'}</div>
      <label>JENIS</label><div className="box ro"><span className="dot" style={{ background: warnaZ(o.id_zona) }} />{z?.jenis_zona ?? '-'}</div>
      <label>POSISI</label><div className="box ro">Tengah zona {z?.nama_zona}</div>
      <label>KOORDINAT</label><div className="box ro sm">{z ? fmt(toLL(markerPos(o))) : '-'}</div>
    </>);
  };
  const colorOf = (t, o) => (t === 'zona' ? warnaJ(o.jenis_zona) : t === 'rute' ? WARNA_AKSES[o.akses_penggunaan] : warnaZ(o.id_zona));
  const groups = [['zona', 'Zona', doc.zona, 'nama_zona'], ['rute', 'Rute', doc.rute, 'nama_rute'], ['marker', 'Marker', placed, 'nama_penanda']];
  const Eye = ({ k }) => <button className="eye" aria-label={hid(k) ? 'Tampilkan' : 'Sembunyikan'} aria-pressed={!hid(k)} onClick={() => tg(k)}>{hid(k) ? '○' : '◉'}</button>;
  const show = (t, id) => !hid(`g:${t}`) && !hid(`${t}:${id}`);

  const zSel = sel?.type === 'zona' && selObj && show('zona', sel.id) ? selObj : null;
  const rSel = sel?.type === 'rute' && selObj && show('rute', sel.id) ? selObj : null;
  const zPx = zSel ? ring(zSel).map(toPx) : null;
  const hint = { zona: `Seret di kanvas untuk menggambar ${BENTUK[shape]}, lalu pilih fasilitasnya di panel kanan. Seret kotak kecil di sudut untuk mengubah ukuran.`, rute: 'Klik untuk menambah titik, klik dua kali (atau Enter) untuk selesai.', marker: 'Klik zona yang sudah punya fasilitas untuk menaruh marker di tengahnya.', overlay: 'Denah diambil dari detail event. Atur opasitas di panel kanan.' }[tool];
  const heads = { zona: 'Inspector Zona', rute: 'Inspector Rute', marker: 'Inspector Marker' };
  const labelHapus = tool !== 'overlay' && sel?.type === 'marker' ? 'Lepas' : 'Hapus';

  return (
    <div className="fn-app" style={{ height: '100vh' }}>
      <NavbarEditing />
      <div className="me-body">
        <aside className="me-tools">
          {[['pilih', 'Pilih'], ['zona', 'Zona'], ['rute', 'Rute'], ['marker', 'Marker'], ['overlay', 'Overlay']].map(([k, l]) => <button key={k} className={`tool ${tool === k ? 'on' : ''}`} onClick={() => ubahTool(k)}>{l}</button>)}
          <button className="tool del" onClick={hapus} disabled={tool === 'overlay' ? !doc.overlay : !selObj}>{labelHapus}</button>
        </aside>

        <section className="me-main">
          <div className="me-top">
            <span className="fn-title">{namaEvent} – {mapData.nama_map}</span>
            <div className="me-top-r">
              <span className="chip">Draft</span>
              <button className="sq" onClick={undo} disabled={!past.length} aria-label="Urungkan (Ctrl+Z)">↶</button>
              <button className="sq" onClick={redo} disabled={!future.length} aria-label="Ulangi (Ctrl+Y)">↷</button>
              <button className="btn btn-solid" onClick={simpan}>Simpan</button>
              <button className="btn" style={{ borderColor: '#334155', padding: '0 36px' }}>Mobile View</button>
              <button className="btn btn-cyan" onClick={() => onPublish?.()}>Publish</button>
            </div>
          </div>

          <div className="me-canvas-wrap">
            {view === 'kanvas' ? (<>
              <div className={`map ${(tool === 'zona' && mode === 'draw') || drawingRoute ? 'draw' : ''}`}>
                <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} onPointerDown={bgDown} onPointerMove={onMove} onPointerUp={onUp} onDoubleClick={() => closeRoute(true)}>
                  {doc.overlay && !hid('g:overlay') && (() => { const a = toPx(doc.overlay.bounds[0]), b = toPx(doc.overlay.bounds[1]); return <image href={doc.overlay.url} x={a[0]} y={b[1]} width={b[0] - a[0]} height={a[1] - b[1]} preserveAspectRatio="none" opacity={doc.overlay.opacity} style={{ pointerEvents: 'none' }} />; })()}
                  {doc.zona.filter((z) => show('zona', z.id_zona)).map((z) => <polygon key={z.id_zona} points={pts2s(ring(z).map(toPx))} fill={warnaJ(z.jenis_zona)} fillOpacity=".3" stroke={warnaJ(z.jenis_zona)} strokeWidth="2" strokeDasharray={sel?.id === z.id_zona && sel.type === 'zona' ? '8 4' : undefined} onPointerDown={(e) => objDown(e, 'zona', z)} />)}
                  {doc.rute.filter((r) => show('rute', r.id_rute)).map((r) => { const p = pts2s(r.bentuk_jalur_rute.coordinates.map(toPx)); return (<g key={r.id_rute}>
                    <polyline points={p} fill="none" stroke={WARNA_AKSES[r.akses_penggunaan]} strokeWidth="3.5" strokeLinejoin="round" />
                    <polyline points={p} fill="none" stroke="transparent" strokeWidth="14" onPointerDown={(e) => objDown(e, 'rute', r)} /></g>); })}
                  {placed.filter((m) => show('marker', m.id_penanda)).map((m) => { const [x, y] = markerPos(m); return (
                    <g key={m.id_penanda} onPointerDown={(e) => objDown(e, 'marker', m)} style={{ cursor: 'pointer' }}>
                      <title>{m.nama_penanda}</title>
                      <circle cx={x} cy={y} r="15" fill={warnaZ(m.id_zona)} stroke="#fff" strokeWidth="2" strokeDasharray={sel?.id === m.id_penanda && sel.type === 'marker' ? '3 3' : undefined} />
                      <text x={x} y={y + 4} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" style={{ pointerEvents: 'none' }}>{m.nama_penanda.slice(0, 3)}</text></g>); })}
                  {draft && <polygon points={pts2s(makeShape(draft.shape, draft.p0, draft.p1))} fill={ABU} fillOpacity=".25" stroke="#fff" strokeWidth="2" strokeDasharray="6 4" />}
                  {zSel && zSel.bentuk !== 'polygon' && <rect className="bb" x={bbox(zPx)[0]} y={bbox(zPx)[1]} width={bbox(zPx)[2] - bbox(zPx)[0]} height={bbox(zPx)[3] - bbox(zPx)[1]} />}
                  {zSel && (zSel.bentuk === 'polygon' ? zPx : corners(bbox(zPx))).map((p, i) => <rect key={i} className="hnd" x={p[0] - 5} y={p[1] - 5} width="10" height="10" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, { kind: 'vert', id: zSel.id_zona, i, opp: zSel.bentuk === 'polygon' ? null : corners(bbox(zPx))[(i + 2) % 4] }); }} />)}
                  {rSel && rSel.bentuk_jalur_rute.coordinates.map(toPx).map((p, i) => <circle key={i} className="hnd round" cx={p[0]} cy={p[1]} r="5" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, { kind: 'rvert', id: rSel.id_rute, i }); }} />)}
                </svg>
              </div>
              <div className="me-under">
                {(tool === 'zona' || tool === 'rute') && (
                  <div className="toolbar">
                    <button className={`tb ${mode === 'select' ? 'on' : ''}`} onClick={() => { closeRoute(false); setMode('select'); setMenu(false); }} aria-label="Mode pilih">{ICON.select}</button>
                    <button className={`tb ${mode === 'draw' ? 'on' : ''}`} style={tool === 'zona' ? { width: 62 } : undefined} onClick={() => { setMode('draw'); if (tool === 'zona') setMenu((m) => (mode === 'draw' ? !m : false)); }} aria-label={tool === 'zona' ? 'Alat gambar zona' : 'Gambar rute'}>{tool === 'zona' ? <>{ICON[shape]} ▾</> : ICON.line}</button>
                    {menu && tool === 'zona' && <div className="tb-menu">{[['rectangle', 'Rectangle'], ['ellipse', 'Ellipse'], ['polygon', 'Polygon']].map(([k, l]) => <button key={k} className={shape === k ? 'on' : ''} onClick={() => { setShape(k); setMenu(false); }}>{ICON[k]} {l}{shape === k ? ' ✓' : ''}</button>)}</div>}
                  </div>
                )}
                {tool === 'overlay' && <button className="btn btn-solid" disabled={!!doc.overlay} onClick={() => setODlg(true)}>{doc.overlay ? 'Overlay sudah ditambahkan' : 'Tambah Overlay'}</button>}
                {hint && <p className="hint">{hint}</p>}
              </div>
            </>) : (
              <div className="gj-wrap">
                <div className="gj-bar"><b>GeoJSON – {mapData.nama_map}</b><span><button className="btn" style={{ borderColor: '#334155' }} onClick={() => navigator.clipboard?.writeText(gjText).then(() => flash('GeoJSON disalin'))}>Salin</button> <button className="btn btn-solid" onClick={unduh}>Unduh .geojson</button></span></div>
                <pre className="gj" tabIndex={0}>{gjText}</pre>
              </div>
            )}
          </div>

          <div className="me-foot">
            <button className={`btn ${view === 'kanvas' ? 'btn-solid' : ''}`} style={{ height: 34, borderColor: '#334155' }} onClick={() => setView('kanvas')}>Kanvas</button>
            <button className={`btn ${view === 'geojson' ? 'btn-solid' : ''}`} style={{ height: 34, borderColor: '#334155' }} onClick={() => { closeRoute(false); setView('geojson'); }}>Lihat GeoJSON</button>
            {toast && <span role="status" className={`toast ${toast.err ? 'err' : ''}`}>{toast.t}</span>}
            <span className="count">{doc.zona.length} zona - {doc.rute.length} rute - {placed.length} marker</span>
          </div>
        </section>

        <aside className="insp" onFocus={(e) => { if (e.target.dataset.live && !snap.current) snap.current = doc; }} onBlur={(e) => { if (!e.target.dataset.live) return; if (snap.current && snap.current !== doc) push(snap.current); snap.current = null; }}>
          <h3>{tool === 'overlay' ? 'Inspector Overlay' : selObj ? (tool === 'pilih' ? 'Inspector Properti' : heads[sel.type]) : 'Inspector'}</h3>
          {renderInsp()}
          <label>LAYER MANAGER</label>
          <div className="layers">
            {groups.map(([t, l, arr, nk]) => (
              <div key={t} className="lg">
                <div className="lh"><span>{l} ({arr.length})</span><Eye k={`g:${t}`} /></div>
                {arr.map((o) => <div key={o[IDK[t]]} className={`li ${sel?.type === t && sel.id === o[IDK[t]] ? 'on' : ''}`}>
                  <button className="lname" onClick={() => setSel({ type: t, id: o[IDK[t]] })}><span className="dot" style={{ background: colorOf(t, o) }} />{o[nk] || 'Zona baru'}</button><Eye k={`${t}:${o[IDK[t]]}`} /></div>)}
              </div>
            ))}
            <div className="lg"><div className="lh"><span>Overlay Denah ({doc.overlay ? 1 : 0})</span><Eye k="g:overlay" /></div></div>
          </div>
        </aside>
      </div>

      {oDlg && (
        <div className="overlay" onClick={() => setODlg(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>Tambah Overlay</h2>
            {mapData.gambar_layout ? (<>
              <img className="ovl-prev" src={mapData.gambar_layout} alt={`Denah ${mapData.nama_map}`} />
              <p className="help">Gambar denah ini berasal dari detail event untuk peta "{mapData.nama_map}".</p></>)
              : <p className="muted">Peta ini belum punya gambar denah. Tambahkan di detail event, lalu buka editor lagi.</p>}
            <div className="modal-actions"><button className="btn btn-ghost" onClick={() => setODlg(false)}>Batal</button><button className="btn btn-solid" onClick={tambahOverlay} disabled={!mapData.gambar_layout}>Tambahkan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
