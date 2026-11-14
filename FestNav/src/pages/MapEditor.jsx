import { useEffect, useMemo, useRef, useState } from 'react';
import './common.css';
import './MapEditor.css';
import NavbarEditing from '../components/NavbarEditing';
import { JENIS_ZONA } from './FacilityManagement';

const WARNA_GARIS = ['#8b5cf6', '#f59e0b', '#10b981', '#0ea5e9', '#000000', '#f43f5e'];
const AKSES = ['Umum', 'VIP', 'Staf'];
const MAP_DEFAULT = { id_map: 1, id_event: 1, nama_map: 'Day 1: Lapangan Rektorat', tipe_map: 'outdoor', level_lantai: null, garis_lintang_pusat: -8.6724, garis_bujur_pusat: 115.2362 };
const W = 850, H = 485, MPP = 0.5; // ukuran kanvas (px) dan meter per piksel
const KEY = { zona: 'zona', rute: 'rute', marker: 'penanda' };
const IDK = { zona: 'id_zona', rute: 'id_rute', marker: 'id_penanda' };
const ICON = { rectangle: '▭', ellipse: '◯', polygon: '⬡' };

/* ---------- proyeksi piksel <-> [bujur, lintang] (urutan GeoJSON) ---------- */
const proj = (c) => {
  const dLat = MPP / 110574, dLng = MPP / (111320 * Math.cos((c.lat * Math.PI) / 180));
  const r7 = (n) => Math.round(n * 1e7) / 1e7;
  return {
    toLL: ([x, y]) => [r7(c.lng + (x - W / 2) * dLng), r7(c.lat - (y - H / 2) * dLat)],
    toPx: ([lng, lat]) => [(lng - c.lng) / dLng + W / 2, (c.lat - lat) / dLat + H / 2],
  };
};
/* ---------- geometri murni (dalam piksel) ---------- */
const rectPts = (b) => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
const ellPts = (b) => { const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, rx = (b[2] - b[0]) / 2, ry = (b[3] - b[1]) / 2; return Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * 2 * Math.PI; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }); };
const hexPts = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos((i * Math.PI) / 3), cy + r * Math.sin((i * Math.PI) / 3)]);
const bbox = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const corners = (b) => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
const area = (p) => (Math.abs(p.reduce((s, a, i) => { const q = p[(i + 1) % p.length]; return s + a[0] * q[1] - q[0] * a[1]; }, 0)) / 2) * MPP * MPP;
const plen = (p) => p.reduce((s, a, i) => (i ? s + Math.hypot(a[0] - p[i - 1][0], a[1] - p[i - 1][1]) : 0), 0) * MPP;
const ring = (z) => z.bentuk_batas_zona.coordinates[0].slice(0, -1);
const pts2s = (p) => p.map((a) => a.join(',')).join(' ');
const fmt = (c) => `${c[1].toFixed(6)}, ${c[0].toFixed(6)}`; // lintang, bujur
const makeShape = (kind, p0, p1) => {
  const r = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), click = r < 6;
  if (kind === 'rectangle') return rectPts(click ? [p0[0] - 50, p0[1] - 30, p0[0] + 50, p0[1] + 30] : [Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1])]);
  if (kind === 'ellipse') { const R = click ? 35 : r; return ellPts([p0[0] - R, p0[1] - R, p0[0] + R, p0[1] + R]); } // elips = mulai dari lingkaran
  return hexPts(p0[0], p0[1], click ? 45 : r);
};

/* ---------- data contoh (ganti dengan data dari API) ---------- */
const seed = (toLL, idMap) => {
  const P = (pts) => ({ type: 'Polygon', coordinates: [[...pts, pts[0]].map(toLL)] });
  const Z = (id, nama, jenis, bentuk, pts) => ({ id_zona: id, id_map: idMap, nama_zona: nama, jenis_zona: jenis, deskripsi: '', bentuk, bentuk_batas_zona: P(pts) });
  const M = (id, idz, nama, x, y) => { const [lng, lat] = toLL([x, y]); return { id_penanda: id, id_map: idMap, id_fasilitas: null, id_zona: idz, nama_penanda: nama, garis_lintang: lat, garis_bujur: lng, icon: 'circle' }; };
  return {
    zona: [
      Z(1, 'Panggung Utama', 'Panggung / Stage', 'polygon', [[462, 10], [610, 18], [640, 80], [590, 130], [470, 130], [455, 70]]),
      Z(2, 'Food Court A', 'Kuliner', 'polygon', [[345, 45], [425, 80], [415, 185], [340, 168]]),
      Z(3, 'Area Bazzar', 'Bazzar / Tenant', 'polygon', [[612, 148], [695, 160], [685, 215], [600, 212]]),
      Z(4, 'Toilet Utara', 'Fasilitas Umum', 'rectangle', rectPts([365, 190, 450, 245])),
      Z(5, 'Parkir Timur', 'Parkir', 'polygon', [[460, 230], [565, 255], [545, 325], [460, 290]]),
      Z(6, 'Area VIP', 'VIP', 'rectangle', rectPts([598, 237, 670, 290])),
    ],
    rute: [{ id_rute: 1, id_map: idMap, nama_rute: 'Rute Pejalan Kaki Utama', akses_penggunaan: 'Umum', warna: '#000000', gaya_garis: 'dash', bentuk_jalur_rute: { type: 'LineString', coordinates: [[538, 98], [480, 150], [535, 205], [528, 228]].map(toLL) } }],
    penanda: [M(1, 1, 'P1', 540, 72), M(2, 2, 'F1', 380, 125), M(3, 3, 'B1', 650, 185), M(4, 4, 'T1', 408, 217), M(5, 6, 'V1', 634, 263)],
    overlay: null,
  };
};

export default function MapEditor({ namaEvent = 'Dies Natalis Udayana 2026', mapData = MAP_DEFAULT, onSave, onPublish }) {
  const { toLL, toPx } = useMemo(() => proj({ lat: mapData.garis_lintang_pusat, lng: mapData.garis_bujur_pusat }), [mapData]);
  const [doc, setDoc] = useState(() => seed(toLL, mapData.id_map));
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [tool, setTool] = useState('pilih');
  const [mode, setMode] = useState('draw'); // draw | select (untuk tool zona & rute)
  const [shape, setShape] = useState('rectangle');
  const [pen, setPen] = useState('pen');
  const [menu, setMenu] = useState(false);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [rDraw, setRDraw] = useState(null);
  const [hidden, setHidden] = useState({});
  const [view, setView] = useState('kanvas');
  const [mDlg, setMDlg] = useState(null);
  const [oDlg, setODlg] = useState(false);
  const [oFile, setOFile] = useState(null);
  const [toast, setToast] = useState('');
  const svgRef = useRef(); const drag = useRef(null); const snap = useRef(null); const seq = useRef(100);
  const nid = () => ++seq.current;

  /* ---------- riwayat (undo / redo) ---------- */
  const push = (before) => { setPast((p) => [...p, before]); setFuture([]); };
  const commit = (next) => { push(doc); setDoc(next); };
  const undo = () => { if (!past.length) return; setFuture((f) => [doc, ...f]); setDoc(past[past.length - 1]); setPast(past.slice(0, -1)); setRDraw(null); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, doc]); setDoc(future[0]); setFuture(future.slice(1)); };

  /* ---------- helper objek ---------- */
  const zoneOf = (id) => doc.zona.find((z) => z.id_zona === id);
  const warnaZ = (id) => JENIS_ZONA[zoneOf(id)?.jenis_zona] || '#64748b';
  const selObj = sel ? doc[KEY[sel.type]].find((o) => o[IDK[sel.type]] === sel.id) : null;
  const patch = (type, id, p) => ({ ...doc, [KEY[type]]: doc[KEY[type]].map((o) => (o[IDK[type]] === id ? { ...o, ...p } : o)) });
  const edit = (p) => setDoc(patch(sel.type, sel.id, p));   // teks: riwayat dicatat saat blur
  const editC = (p) => commit(patch(sel.type, sel.id, p));  // pilihan: langsung masuk riwayat
  const polyGeom = (pts) => ({ type: 'Polygon', coordinates: [[...pts, pts[0]].map(toLL)] });
  const shift = (c, dx, dy) => { const [x, y] = toPx(c); return toLL([x + dx, y + dy]); };
  const hid = (k) => hidden[k];
  const tg = (k) => setHidden((h) => ({ ...h, [k]: !h[k] }));
  const flash = (t) => { setToast(t); setTimeout(() => setToast(''), 2000); };

  const closeRoute = (dropLast) => {
    if (!rDraw) return; const id = rDraw; setRDraw(null);
    setDoc((cur) => ({ ...cur, rute: cur.rute.flatMap((r) => { if (r.id_rute !== id) return [r]; const c = dropLast ? r.bentuk_jalur_rute.coordinates.slice(0, -1) : r.bentuk_jalur_rute.coordinates; return c.length < 2 ? [] : [{ ...r, bentuk_jalur_rute: { type: 'LineString', coordinates: c } }]; }) }));
  };
  const ubahTool = (t) => { closeRoute(false); setTool(t); setMode('draw'); setMenu(false); if (t === 'overlay') setOFile(null); };

  /* ---------- pointer ---------- */
  const pt = (e) => { const r = svgRef.current.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  const startDrag = (e, d) => { drag.current = { ...d, before: doc, moved: false }; svgRef.current.setPointerCapture(e.pointerId); };
  const drawingRoute = tool === 'rute' && mode === 'draw';

  const addPoint = (p) => {
    const ll = toLL(p);
    if (!rDraw) {
      const id = nid();
      commit({ ...doc, rute: [...doc.rute, { id_rute: id, id_map: mapData.id_map, nama_rute: `Rute baru ${id - 100}`, akses_penggunaan: 'Umum', warna: '#000000', gaya_garis: 'dash', bentuk_jalur_rute: { type: 'LineString', coordinates: [ll] } }] });
      setRDraw(id); setSel({ type: 'rute', id }); return;
    }
    setDoc((cur) => ({ ...cur, rute: cur.rute.map((r) => (r.id_rute !== rDraw ? r : { ...r, bentuk_jalur_rute: { type: 'LineString', coordinates: [...r.bentuk_jalur_rute.coordinates, ll] } })) }));
    if (pen === 'line') setRDraw(null);
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
    const p = pt(e);
    if (tool === 'marker' && type === 'zona') { setSel(null); setMDlg({ id_zona: o.id_zona, p, nama: '' }); return; }
    setSel({ type, id: o[IDK[type]] });
    startDrag(e, { kind: 'move', type, id: o[IDK[type]], last: p });
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
        if (d.type === 'rute') return { ...o, bentuk_jalur_rute: { type: 'LineString', coordinates: o.bentuk_jalur_rute.coordinates.map((c) => shift(c, dx, dy)) } };
        const [lng, lat] = shift([o.garis_bujur, o.garis_lintang], dx, dy); return { ...o, garis_bujur: lng, garis_lintang: lat };
      }) }));
    } else if (d.kind === 'vert') setDoc((cur) => ({ ...cur, zona: cur.zona.map((z) => (z.id_zona === d.id ? reshape(z, d, p) : z)) }));
    else if (d.kind === 'rvert') setDoc((cur) => ({ ...cur, rute: cur.rute.map((r) => (r.id_rute !== d.id ? r : { ...r, bentuk_jalur_rute: { type: 'LineString', coordinates: r.bentuk_jalur_rute.coordinates.map((c, i) => (i === d.i ? toLL(p) : c)) } })) }));
  };
  const onUp = () => {
    const d = drag.current; drag.current = null; if (!d) return;
    if (d.kind === 'draw') {
      const dr = draft; setDraft(null); if (!dr) return;
      const id = nid();
      const z = { id_zona: id, id_map: mapData.id_map, nama_zona: `Zona baru ${id - 100}`, jenis_zona: 'Fasilitas Umum', deskripsi: '', bentuk: dr.shape, bentuk_batas_zona: polyGeom(makeShape(dr.shape, dr.p0, dr.p1)) };
      push(d.before); setDoc((cur) => ({ ...cur, zona: [...cur.zona, z] })); setSel({ type: 'zona', id }); return;
    }
    if (d.moved) push(d.before);
  };

  const buatMarker = () => {
    const nm = mDlg.nama.trim(); if (!nm) return;
    const id = nid(), [lng, lat] = toLL(mDlg.p);
    commit({ ...doc, penanda: [...doc.penanda, { id_penanda: id, id_map: mapData.id_map, id_fasilitas: null, id_zona: mDlg.id_zona, nama_penanda: nm, garis_lintang: lat, garis_bujur: lng, icon: 'circle' }] });
    setSel({ type: 'marker', id }); setMDlg(null);
  };
  const hapus = () => {
    if (tool === 'overlay') { if (doc.overlay) commit({ ...doc, overlay: null }); return; }
    if (!selObj) return;
    const next = { ...doc, [KEY[sel.type]]: doc[KEY[sel.type]].filter((o) => o[IDK[sel.type]] !== sel.id) };
    if (sel.type === 'zona') next.penanda = next.penanda.filter((m) => m.id_zona !== sel.id);
    commit(next); setSel(null);
  };
  const unggah = () => { commit({ ...doc, overlay: { url: oFile, bounds: [toLL([170, 375]), toLL([715, 65])] } }); setODlg(false); };

  /* ---------- keluaran sesuai kolom database ---------- */
  const rows = () => ({
    map: { ...mapData, gambar_layout: doc.overlay?.url ?? mapData.gambar_layout ?? null, overlay_bounds: doc.overlay?.bounds ?? null },
    zona: doc.zona.map(({ bentuk, ...z }) => z),
    rute: doc.rute.map((r) => { const c = r.bentuk_jalur_rute.coordinates; return { ...r, titik_awal: c[0], titik_akhir: c[c.length - 1], jarak: Math.round(plen(c.map(toPx))) }; }),
    penanda_lokasi: doc.penanda.map((m) => ({ ...m, jenis_penanda: zoneOf(m.id_zona)?.jenis_zona ?? null })),
  });
  const geojson = () => {
    const r = rows();
    return { type: 'FeatureCollection', features: [
      ...r.zona.map(({ bentuk_batas_zona: g, ...p }) => ({ type: 'Feature', geometry: g, properties: { layer: 'zona', ...p, luas_m2: Math.round(area(g.coordinates[0].slice(0, -1).map(toPx))) } })),
      ...r.rute.map(({ bentuk_jalur_rute: g, ...p }) => ({ type: 'Feature', geometry: g, properties: { layer: 'rute', ...p } })),
      ...r.penanda_lokasi.map((m) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [m.garis_bujur, m.garis_lintang] }, properties: { layer: 'marker', ...m } })),
    ] };
  };
  const simpan = () => { (onSave ?? ((r) => console.log('Simpan', r)))(rows()); flash('Perubahan disimpan'); };
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
    if (!selObj) return <p className="muted">Klik zona, rute, atau marker pada kanvas (atau di Layer Manager) untuk melihat propertinya.</p>;
    const o = selObj;
    if (sel.type === 'zona') return (<>
      <label>NAMA</label><input data-live className="box" value={o.nama_zona} onChange={(e) => edit({ nama_zona: e.target.value })} />
      <label>JENIS</label><select className="box" value={o.jenis_zona} onChange={(e) => editC({ jenis_zona: e.target.value })}>{Object.keys(JENIS_ZONA).map((j) => <option key={j}>{j}</option>)}</select>
      <label>WARNA</label><div className="box ro"><span className="dot" style={{ background: JENIS_ZONA[o.jenis_zona] }} />Mengikuti jenis</div>
      <label>DESKRIPSI</label><textarea data-live className="box ta" value={o.deskripsi} onChange={(e) => edit({ deskripsi: e.target.value })} />
      <label>LUAS</label><div className="box ro">{Math.round(area(ring(o).map(toPx))).toLocaleString('id-ID')} m²</div>
    </>);
    if (sel.type === 'rute') { const c = o.bentuk_jalur_rute.coordinates; return (<>
      <label>NAMA</label><input data-live className="box" value={o.nama_rute} onChange={(e) => edit({ nama_rute: e.target.value })} />
      <label>WARNA GARIS</label><div className="swatches">{WARNA_GARIS.map((w) => <button key={w} aria-label={`Warna ${w}`} className={`sw ${o.warna === w ? 'on' : ''}`} style={{ background: w }} onClick={() => editC({ warna: w })} />)}</div>
      <label>JENIS GARIS</label><div className="seg"><button className={`btn ${o.gaya_garis === 'solid' ? 'on' : ''}`} onClick={() => editC({ gaya_garis: 'solid' })}>Solid</button><button className={`btn ${o.gaya_garis === 'dash' ? 'on' : ''}`} onClick={() => editC({ gaya_garis: 'dash' })}>Putus - putus</button></div>
      <label>AKSES PENGGUNAAN</label><select className="box" value={o.akses_penggunaan} onChange={(e) => editC({ akses_penggunaan: e.target.value })}>{AKSES.map((a) => <option key={a}>{a}</option>)}</select>
      <label>PANJANG</label><div className="box ro">{Math.round(plen(c.map(toPx)))} m</div>
      <label>TITIK AWAL</label><div className="box ro sm">{fmt(c[0])}</div>
      <label>TITIK AKHIR</label><div className="box ro sm">{fmt(c[c.length - 1])}</div>
    </>); }
    return (<>
      <label>NAMA</label><input data-live className="box" value={o.nama_penanda} onChange={(e) => edit({ nama_penanda: e.target.value })} />
      <label>JENIS</label><div className="box ro">{zoneOf(o.id_zona)?.jenis_zona ?? '-'}</div>
      <label>WARNA</label><div className="box ro"><span className="dot" style={{ background: warnaZ(o.id_zona) }} />Mengikuti jenis zona</div>
      <label>ZONA</label><div className="box ro">{zoneOf(o.id_zona)?.nama_zona ?? '-'}</div>
      <label>KOORDINAT</label><div className="box ro sm">{fmt([o.garis_bujur, o.garis_lintang])}</div>
      <label>FASILITAS</label><div className="box ro">{o.id_fasilitas ?? 'Belum ditautkan'}</div>
    </>);
  };
  const colorOf = (t, o) => (t === 'zona' ? JENIS_ZONA[o.jenis_zona] : t === 'rute' ? o.warna : warnaZ(o.id_zona));
  const groups = [['zona', 'Zona', doc.zona, 'nama_zona'], ['rute', 'Rute', doc.rute, 'nama_rute'], ['marker', 'Marker', doc.penanda, 'nama_penanda']];
  const Eye = ({ k }) => <button className="eye" aria-label={hid(k) ? 'Tampilkan' : 'Sembunyikan'} aria-pressed={!hid(k)} onClick={() => tg(k)}>{hid(k) ? '○' : '◉'}</button>;
  const show = (t, id) => !hid(`g:${t}`) && !hid(`${t}:${id}`);

  const zSel = sel?.type === 'zona' && selObj && show('zona', sel.id) ? selObj : null;
  const rSel = sel?.type === 'rute' && selObj && show('rute', sel.id) ? selObj : null;
  const zPx = zSel ? ring(zSel).map(toPx) : null;
  const hint = { zona: `Seret di kanvas untuk menggambar ${shape}. Seret kotak kecil di sudut untuk mengubah ukuran/bentuk.`, rute: 'Klik untuk menambah titik, klik dua kali (atau Enter) untuk selesai.', marker: 'Klik sebuah zona untuk menambahkan marker.' }[tool];
  const heads = { zona: 'Inspector Zona', rute: 'Inspector Rute', marker: 'Inspector Marker' };

  return (
    <div className="fn-app" style={{ height: '100vh' }}>
      <NavbarEditing />
      <div className="me-body">
        <aside className="me-tools">
          {[['pilih', 'Pilih'], ['zona', 'Zona'], ['rute', 'Rute'], ['marker', 'Marker'], ['overlay', 'Overlay']].map(([k, l]) => <button key={k} className={`tool ${tool === k ? 'on' : ''}`} onClick={() => ubahTool(k)}>{l}</button>)}
          <button className="tool del" onClick={hapus} disabled={tool === 'overlay' ? !doc.overlay : !selObj}>Hapus</button>
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
              <div className={`map ${tool === 'zona' && mode === 'draw' || drawingRoute ? 'draw' : ''}`}>
                <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} onPointerDown={bgDown} onPointerMove={onMove} onPointerUp={onUp} onDoubleClick={() => closeRoute(true)}>
                  {doc.overlay && !hid('g:overlay') && (() => { const a = toPx(doc.overlay.bounds[0]), b = toPx(doc.overlay.bounds[1]); return <image href={doc.overlay.url} x={a[0]} y={b[1]} width={b[0] - a[0]} height={a[1] - b[1]} preserveAspectRatio="none" opacity=".85" style={{ pointerEvents: 'none' }} />; })()}
                  {doc.zona.filter((z) => show('zona', z.id_zona)).map((z) => <polygon key={z.id_zona} points={pts2s(ring(z).map(toPx))} fill={JENIS_ZONA[z.jenis_zona]} fillOpacity=".3" stroke={JENIS_ZONA[z.jenis_zona]} strokeWidth="2" strokeDasharray={sel?.id === z.id_zona && sel.type === 'zona' ? '8 4' : undefined} onPointerDown={(e) => objDown(e, 'zona', z)} />)}
                  {doc.rute.filter((r) => show('rute', r.id_rute)).map((r) => { const p = pts2s(r.bentuk_jalur_rute.coordinates.map(toPx)); return (<g key={r.id_rute}>
                    <polyline points={p} fill="none" stroke={r.warna} strokeWidth="3" strokeDasharray={r.gaya_garis === 'dash' ? '4 6' : undefined} />
                    <polyline points={p} fill="none" stroke="transparent" strokeWidth="14" onPointerDown={(e) => objDown(e, 'rute', r)} /></g>); })}
                  {doc.penanda.filter((m) => show('marker', m.id_penanda)).map((m) => { const [x, y] = toPx([m.garis_bujur, m.garis_lintang]); return (
                    <g key={m.id_penanda} onPointerDown={(e) => objDown(e, 'marker', m)} style={{ cursor: 'pointer' }}>
                      <title>{m.nama_penanda}</title>
                      <circle cx={x} cy={y} r="15" fill={warnaZ(m.id_zona)} stroke="#fff" strokeWidth="2" strokeDasharray={sel?.id === m.id_penanda && sel.type === 'marker' ? '3 3' : undefined} />
                      <text x={x} y={y + 4} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" style={{ pointerEvents: 'none' }}>{m.nama_penanda.slice(0, 3)}</text></g>); })}
                  {draft && <polygon points={pts2s(makeShape(draft.shape, draft.p0, draft.p1))} fill={JENIS_ZONA['Fasilitas Umum']} fillOpacity=".25" stroke="#fff" strokeWidth="2" strokeDasharray="6 4" />}
                  {zSel && zSel.bentuk !== 'polygon' && <rect className="bb" x={bbox(zPx)[0]} y={bbox(zPx)[1]} width={bbox(zPx)[2] - bbox(zPx)[0]} height={bbox(zPx)[3] - bbox(zPx)[1]} />}
                  {zSel && (zSel.bentuk === 'polygon' ? zPx : corners(bbox(zPx))).map((p, i) => <rect key={i} className="hnd" x={p[0] - 5} y={p[1] - 5} width="10" height="10" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, { kind: 'vert', id: zSel.id_zona, i, opp: zSel.bentuk === 'polygon' ? null : corners(bbox(zPx))[(i + 2) % 4] }); }} />)}
                  {rSel && rSel.bentuk_jalur_rute.coordinates.map(toPx).map((p, i) => <circle key={i} className="hnd round" cx={p[0]} cy={p[1]} r="5" onPointerDown={(e) => { e.stopPropagation(); startDrag(e, { kind: 'rvert', id: rSel.id_rute, i }); }} />)}
                </svg>
              </div>
              {hint && <p className="hint">{hint}</p>}
              {tool === 'overlay' && <button className="btn btn-solid ovl-add" onClick={() => setODlg(true)}>Tambah Overlay</button>}
              {(tool === 'zona' || tool === 'rute') && (
                <div className="toolbar">
                  <button className={`tb ${mode === 'select' ? 'on' : ''}`} onClick={() => { closeRoute(false); setMode('select'); setMenu(false); }} aria-label="Mode pilih">➤</button>
                  <button className={`tb ${mode === 'draw' ? 'on' : ''}`} style={{ width: 62 }} onClick={() => { setMode('draw'); setMenu((m) => (mode === 'draw' ? !m : false)); }} aria-label="Alat gambar">{tool === 'zona' ? ICON[shape] : '✒'} ▾</button>
                  {menu && <div className="tb-menu">{(tool === 'zona' ? [['rectangle', 'Rectangle'], ['ellipse', 'Ellipse'], ['polygon', 'Polygon']] : [['pen', 'Pen'], ['line', 'Line']]).map(([k, l]) => { const on = (tool === 'zona' ? shape : pen) === k; return <button key={k} className={on ? 'on' : ''} onClick={() => { tool === 'zona' ? setShape(k) : setPen(k); setMenu(false); }}>{l}{on ? ' ✓' : ''}</button>; })}</div>}
                </div>
              )}
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
            {toast && <span role="status" className="toast">{toast}</span>}
            <span className="count">{doc.zona.length} zona - {doc.rute.length} rute - {doc.penanda.length} marker</span>
          </div>
        </section>

        <aside className="insp" onFocus={(e) => { if (e.target.dataset.live && !snap.current) snap.current = doc; }} onBlur={(e) => { if (!e.target.dataset.live) return; if (snap.current && snap.current !== doc) push(snap.current); snap.current = null; }}>
          <h3>{selObj ? (tool === 'pilih' ? 'Inspector Properti' : heads[sel.type]) : 'Inspector'}</h3>
          {renderInsp()}
          <label>LAYER MANAGER</label>
          <div className="layers">
            {groups.map(([t, l, arr, nk]) => (
              <div key={t} className="lg">
                <div className="lh"><span>{l} ({arr.length})</span><Eye k={`g:${t}`} /></div>
                {arr.map((o) => <div key={o[IDK[t]]} className={`li ${sel?.type === t && sel.id === o[IDK[t]] ? 'on' : ''}`}>
                  <button className="lname" onClick={() => setSel({ type: t, id: o[IDK[t]] })}><span className="dot" style={{ background: colorOf(t, o) }} />{o[nk]}</button><Eye k={`${t}:${o[IDK[t]]}`} /></div>)}
              </div>
            ))}
            <div className="lg"><div className="lh"><span>Overlay Denah ({doc.overlay ? 1 : 0})</span><Eye k="g:overlay" /></div></div>
          </div>
        </aside>
      </div>

      {mDlg && (
        <div className="overlay" onClick={() => setMDlg(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>Tambah Marker</h2>
            <p className="muted" style={{ margin: 0 }}>Zona: {zoneOf(mDlg.id_zona)?.nama_zona} · {zoneOf(mDlg.id_zona)?.jenis_zona}</p>
            <label htmlFor="nm">Nama marker</label>
            <input id="nm" className="field" autoFocus placeholder="Contoh: P1" value={mDlg.nama} onChange={(e) => setMDlg({ ...mDlg, nama: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') buatMarker(); if (e.key === 'Escape') setMDlg(null); }} />
            <div className="modal-actions"><button className="btn btn-ghost" onClick={() => setMDlg(null)}>Batal</button><button className="btn btn-solid" onClick={buatMarker} disabled={!mDlg.nama.trim()}>Tambah</button></div>
          </div>
        </div>
      )}
      {oDlg && (
        <div className="overlay" onClick={() => setODlg(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>Upload Overlay</h2>
            <label className="drop" style={{ display: 'grid' }}>
              {oFile ? <img src={oFile} alt="Pratinjau overlay" /> : <span><span className="plus">+</span><br />Klik bagian ini untuk menambah overlay</span>}
              <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setOFile(URL.createObjectURL(f)); }} />
            </label>
            <div className="modal-actions"><button className="btn btn-ghost" onClick={() => setODlg(false)}>Batal</button><button className="btn btn-solid" onClick={unggah} disabled={!oFile}>Unggah</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
