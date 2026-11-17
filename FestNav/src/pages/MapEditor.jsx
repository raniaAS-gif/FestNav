import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './common.css';
import './MapEditor.css';
import NavbarEditing from '../components/NavbarEditing';

/* Zona = bentuk (kolom fasilitas.bentuk). Pin muncul otomatis begitu zona dipilihkan fasilitasnya.
   Nama, jenis, warna, deskripsi, dan label pin SEMUA datang dari fasilitas (view v_fasilitas_peta), bukan diketik di sini. */
const ABU = '#94a3b8';
const AKSES = [['umum', 'Umum'], ['vip', 'VIP'], ['staf', 'Staf']];       // nilai CHECK rute.akses_penggunaan
const WARNA_AKSES = { umum: '#2563eb', vip: '#dc2626', staf: '#000000' };
const NAMA_WARNA = { umum: 'Biru', vip: 'Merah', staf: 'Hitam' };
const W_DEF = 850, H_DEF = 485, ZOOM_AWAL = 18, OPASITAS_AWAL = 0.7;
const KEY = { zona: 'zona', rute: 'rute' };
const IDK = { zona: 'id_zona', rute: 'id_rute' };
const BENTUK = { rectangle: 'persegi panjang', ellipse: 'lingkaran', polygon: 'poligon' };

const I = (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{c}</svg>;
const ICON = { select: I(<path d="M5 3l14 8-6 2-2 6z" />), rectangle: I(<rect x="3" y="6" width="18" height="12" rx="1" />), ellipse: I(<circle cx="12" cy="12" r="8" />), polygon: I(<path d="M12 3l8 5v8l-8 5-8-5V8z" />), line: I(<path d="M5 19L19 5" />) };

/* ---------- loader Google Maps JS SDK ---------- */
let gmPromise = null;
const loadGoogleMaps = (apiKey) => {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!apiKey) return Promise.reject(new Error('API Key Google Maps belum diatur'));
  if (gmPromise) return gmPromise;
  gmPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gm-sdk]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', () => { gmPromise = null; reject(new Error('Gagal memuat Google Maps SDK')); });
      return;
    }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    s.async = true;
    s.defer = true;
    s.dataset.gmSdk = '1';
    s.onload = () => resolve(window.google.maps);
    s.onerror = () => { gmPromise = null; reject(new Error('Gagal memuat Google Maps SDK')); };
    document.head.appendChild(s);
  });
  return gmPromise;
};

/* ---------- data contoh (ganti dengan data dari API) ---------- */
const DENAH_DEMO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 545 310"><rect width="545" height="310" fill="#f8fafc"/><rect x="20" y="20" width="200" height="120" fill="#dbeafe" stroke="#334155"/><rect x="240" y="20" width="140" height="120" fill="#dcfce7" stroke="#334155"/><rect x="400" y="20" width="125" height="120" fill="#fee2e2" stroke="#334155"/><rect x="20" y="160" width="505" height="40" fill="#e2e8f0"/><rect x="20" y="220" width="240" height="70" fill="#fef3c7" stroke="#334155"/><rect x="280" y="220" width="245" height="70" fill="#ede9fe" stroke="#334155"/></svg>');
const MAP_DEFAULT = { id_map: 1, id_event: 1, nama_map: 'Day 1: Lapangan Rektorat', tipe_map: 'outdoor', status_map: 'draft', garis_lintang_pusat: -8.6724, garis_bujur_pusat: 115.2362,
  gambar_layout: DENAH_DEMO, gambar_public_id: null, tampilkan_denah: false, barat_daya_lat: null, barat_daya_lng: null, timur_laut_lat: null, timur_laut_lng: null, rotasi: 0, opasitas: OPASITAS_AWAL };
const rectPts = (b) => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
const F = (id, nama, kode, namaJenis, warna, desk, label, px, kind) => ({ id_fasilitas: id, id_map: 1, nama_fasilitas: nama, kode_jenis: kode, nama_jenis: namaJenis, warna, deskripsi_tampil: desk, label_penanda: label, sudah_digambar: !!px, bentuk_px: px, bentuk_kind: kind });
const FAS_DEFAULT = [
  F(1, 'Toilet Utara', 'toilet', 'Toilet', '#3B82F6', 'Toilet umum', 'TU', rectPts([365, 190, 450, 245]), 'rectangle'),
  F(2, 'Food Court A', 'foodcourt', 'Foodcourt', '#FB923C', 'Area bersama stan makanan', 'FCA', [[345, 45], [425, 80], [415, 185], [340, 168]], 'polygon'),
  F(3, 'Panggung Utama', 'panggung', 'Panggung', '#EF4444', 'Panggung pertunjukan', 'PU', [[462, 10], [610, 18], [640, 80], [590, 130], [470, 130], [455, 70]], 'polygon'),
  F(4, 'Parkir Timur', 'parkir', 'Parkir', '#6B7280', 'Area parkir kendaraan', 'PT', [[460, 230], [565, 255], [545, 325], [460, 290]], 'polygon'),
  F(5, 'Area VIP', 'area_vip', 'Area VIP', '#D946EF', 'Area khusus tamu VIP', 'AV', rectPts([598, 237, 670, 290]), 'rectangle'),
  F(6, 'Bazzar Tenant 12', 'kuliner', 'Kuliner', '#F59E0B', 'Area makanan dan minuman', 'BT12', null, null),
];
const RUTE_DEFAULT = [{ id_rute: 1, nama_rute: 'Rute Pejalan Kaki Utama', titik_awal: 'Pintu Masuk', titik_akhir: 'Area VIP', akses_penggunaan: 'umum', pts_px: [[538, 98], [480, 150], [535, 205], [528, 228]] }];

/* ---------- proyeksi Web Mercator piksel <-> [bujur, lintang] (sinkron dengan Google Maps) ---------- */
const mercatorProj = ({ lat, lng, zoom }, { w, h }) => {
  const scale = 256 * Math.pow(2, zoom);
  const r7 = (n) => Math.round(n * 1e7) / 1e7;
  const llToWorld = (lt, lg) => {
    const s = Math.min(Math.max(Math.sin((lt * Math.PI) / 180), -0.9999), 0.9999);
    return [((lg + 180) / 360) * scale, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale];
  };
  const [cx, cy] = llToWorld(lat, lng);
  return {
    mpp: (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom),
    toPx: ([lg, lt]) => {
      const [wx, wy] = llToWorld(lt, lg);
      return [wx - cx + w / 2, wy - cy + h / 2];
    },
    toLL: ([px, py]) => {
      const wx = px - w / 2 + cx;
      const wy = py - h / 2 + cy;
      const lg = (wx / scale) * 360 - 180;
      const n = Math.PI - (2 * Math.PI * wy) / scale;
      const lt = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
      return [r7(lg), r7(lt)];
    },
  };
};

/* ---------- geometri murni (piksel) ---------- */
const ellPts = (b) => { const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, rx = (b[2] - b[0]) / 2, ry = (b[3] - b[1]) / 2; return Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * 2 * Math.PI; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }); };
const hexPts = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos((i * Math.PI) / 3), cy + r * Math.sin((i * Math.PI) / 3)]);
const bbox = (p) => { const xs = p.map((a) => a[0]), ys = p.map((a) => a[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const corners = (b) => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
const area = (p, mpp) => (Math.abs(p.reduce((s, a, i) => { const q = p[(i + 1) % p.length]; return s + a[0] * q[1] - q[0] * a[1]; }, 0)) / 2) * mpp * mpp;
const plen = (p, mpp) => p.reduce((s, a, i) => (i ? s + Math.hypot(a[0] - p[i - 1][0], a[1] - p[i - 1][1]) : 0), 0) * mpp;
const titikPin = (p) => {
  const y = (bbox(p)[1] + bbox(p)[3]) / 2, xs = [];
  p.forEach((a, i) => { const c = p[(i + 1) % p.length]; if ((a[1] > y) !== (c[1] > y)) xs.push(a[0] + ((y - a[1]) / (c[1] - a[1])) * (c[0] - a[0])); });
  xs.sort((m, n) => m - n);
  if (xs.length < 2) return p[0];
  let best = [xs[0], xs[1]];
  for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > best[1] - best[0]) best = [xs[i], xs[i + 1]];
  return [(best[0] + best[1]) / 2, y];
};
const ring = (z) => z.geom.coordinates[0].slice(0, -1);
const pts2s = (p) => p.map((a) => a.join(',')).join(' ');
const rotVec = ([vx, vy], deg) => { const rad = (deg * Math.PI) / 180, c = Math.cos(rad), s = Math.sin(rad); return [vx * c - vy * s, vx * s + vy * c]; };
const normDeg = (d) => ((((Math.round(d) + 180) % 360) + 360) % 360) - 180;
const makeShape = (kind, p0, p1) => {
  const r = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), click = r < 6;
  if (kind === 'rectangle') return rectPts(click ? [p0[0] - 50, p0[1] - 30, p0[0] + 50, p0[1] + 30] : [Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1])]);
  if (kind === 'ellipse') { const R = click ? 35 : r; return ellPts([p0[0] - R, p0[1] - R, p0[0] + R, p0[1] + R]); }
  return hexPts(p0[0], p0[1], click ? 45 : r);
};

const seed = (toLL, map, fasilitas, rute) => {
  const P = (pts) => ({ type: 'Polygon', coordinates: [[...pts, pts[0]].map(toLL)] });
  const geomOf = (f) => f.bentuk_geojson ?? (f.bentuk_px ? P(f.bentuk_px) : null);
  const b = map.barat_daya_lng != null && map.timur_laut_lng != null ? [[map.barat_daya_lng, map.barat_daya_lat], [map.timur_laut_lng, map.timur_laut_lat]] : null;
  return {
    zona: fasilitas.filter((f) => f.id_map === map.id_map && geomOf(f)).map((f, i) => ({ id_zona: i + 1, id_fasilitas: f.id_fasilitas, kind: f.bentuk_kind ?? 'polygon', geom: geomOf(f) })),
    rute: rute.map((r) => ({ id_rute: r.id_rute, id_map: map.id_map, nama_rute: r.nama_rute, titik_awal: r.titik_awal ?? '', titik_akhir: r.titik_akhir ?? '', akses_penggunaan: r.akses_penggunaan,
      bentuk_jalur_rute: r.bentuk_jalur_rute ?? { type: 'LineString', coordinates: r.pts_px.map(toLL) } })),
    overlay: map.gambar_layout && b ? { url: map.gambar_layout, bounds: b, opacity: map.opasitas ?? OPASITAS_AWAL, rotasi: map.rotasi ?? 0, tampil: !!map.tampilkan_denah } : null,
  };
};

export default function MapEditor({
  namaEvent = 'Dies Natalis Udayana 2026',
  mapData = MAP_DEFAULT,
  fasilitas = FAS_DEFAULT,
  rute = RUTE_DEFAULT,
  googleMapsApiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '',
  onSave,
  onPublish,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isEO = location.state?.role === 'eo';

  const initView = { lat: mapData.garis_lintang_pusat, lng: mapData.garis_bujur_pusat, zoom: ZOOM_AWAL };
  const [mapView, setMapView] = useState(initView);
  const [size, setSize] = useState({ w: W_DEF, h: H_DEF });
  const [mapType, setMapType] = useState('roadmap');
  const [gmError, setGmError] = useState(null);
  const [dragging, setDragging] = useState(false);

  // State pelacakan perubahan, modal konfirmasi keluar, dan modal publish
  const [isDirty, setIsDirty] = useState(false);
  const [navModal, setNavModal] = useState(null); // null | 'unsaved-warning' | 'confirm-dashboard'
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [statusMap, setStatusMap] = useState(mapData.status_map);

  const { toLL, toPx, mpp } = useMemo(() => mercatorProj(mapView, size), [mapView, size]);
  const fasById = useMemo(() => new Map(fasilitas.map((f) => [f.id_fasilitas, f])), [fasilitas]);
  const [doc, setDoc] = useState(() => {
    const initProj = mercatorProj(initView, { w: W_DEF, h: H_DEF });
    return seed(initProj.toLL, mapData, fasilitas, rute);
  });
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [tool, setTool] = useState('pilih');
  const [mode, setMode] = useState('select');
  const [shape, setShape] = useState('rectangle');
  const [menu, setMenu] = useState(false);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [rDraw, setRDraw] = useState(null);
  const [hidden, setHidden] = useState({});
  const [view, setView] = useState('kanvas');
  const [oDlg, setODlg] = useState(false);
  const [toast, setToast] = useState(null);

  const mapWrapRef = useRef();
  const mapDivRef = useRef();
  const mapInst = useRef(null);
  const svgRef = useRef();
  const drag = useRef(null);
  const snap = useRef(null);
  const seq = useRef(100);
  const nid = () => ++seq.current;

  const isDrawing = (tool === 'zona' && mode === 'draw') || (tool === 'rute' && mode === 'draw');
  const isDrawingRef = useRef(isDrawing);
  isDrawingRef.current = isDrawing;

  /* ---------- ukur dimensi kontainer peta agar proyeksi 1:1 ---------- */
  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  /* ---------- inisialisasi Google Maps SDK ---------- */
  useEffect(() => {
    if (view !== 'kanvas') return;
    let cancelled = false;
    loadGoogleMaps(googleMapsApiKey)
      .then((maps) => {
        if (cancelled || !mapDivRef.current) return;
        setGmError(null);
        const m = new maps.Map(mapDivRef.current, {
          center: { lat: mapView.lat, lng: mapView.lng },
          zoom: mapView.zoom,
          mapTypeId: mapType,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: maps.ControlPosition.RIGHT_BOTTOM },
          gestureHandling: isDrawingRef.current ? 'none' : 'greedy',
          tilt: 0,
          rotateControl: false,
          clickableIcons: false,
        });
        mapInst.current = m;
        m.addListener('bounds_changed', () => {
          const c = m.getCenter();
          const z = m.getZoom();
          if (c && typeof z === 'number') {
            setMapView({ lat: c.lat(), lng: c.lng(), zoom: z });
          }
        });
        m.addListener('click', () => {
          if (!isDrawingRef.current) setSel(null);
        });
      })
      .catch((err) => {
        if (!cancelled) setGmError(err.message);
      });
    return () => {
      cancelled = true;
      mapInst.current = null;
    };
  }, [googleMapsApiKey, view]);

  /* ---------- sinkronisasi mode interaksi & tipe peta ke Google Maps ---------- */
  useEffect(() => {
    if (!mapInst.current) return;
    mapInst.current.setOptions({ gestureHandling: isDrawing ? 'none' : 'greedy' });
  }, [isDrawing]);

  useEffect(() => {
    if (!mapInst.current) return;
    mapInst.current.setMapTypeId(mapType);
  }, [mapType]);

  const resetCenter = () => {
    const c = { lat: mapData.garis_lintang_pusat, lng: mapData.garis_bujur_pusat };
    if (mapInst.current) {
      mapInst.current.panTo(c);
      mapInst.current.setZoom(ZOOM_AWAL);
    }
    setMapView({ ...c, zoom: ZOOM_AWAL });
  };

  /* ---------- riwayat ---------- */
  const push = (before) => { setPast((p) => [...p, before]); setFuture([]); setIsDirty(true); };
  const commit = (next) => { push(doc); setDoc(next); };
  const undo = () => { if (!past.length) return; setFuture((f) => [doc, ...f]); setDoc(past[past.length - 1]); setPast(past.slice(0, -1)); setRDraw(null); setIsDirty(true); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, doc]); setDoc(future[0]); setFuture(future.slice(1)); setIsDirty(true); };

  /* ---------- helper ---------- */
  const fasOf = (z) => fasById.get(z.id_fasilitas);
  const warnaZ = (z) => fasOf(z)?.warna ?? ABU;
  const selObj = sel ? doc[KEY[sel.type]].find((o) => o[IDK[sel.type]] === sel.id) : null;
  const patch = (type, id, p) => ({ ...doc, [KEY[type]]: doc[KEY[type]].map((o) => (o[IDK[type]] === id ? { ...o, ...p } : o)) });
  const edit = (p) => { setDoc(patch(sel.type, sel.id, p)); setIsDirty(true); };
  const editC = (p) => commit(patch(sel.type, sel.id, p));
  const polyGeom = (pts) => ({ type: 'Polygon', coordinates: [[...pts, pts[0]].map(toLL)] });
  const shift = (c, dx, dy) => { const [x, y] = toPx(c); return toLL([x + dx, y + dy]); };
  const hid = (k) => hidden[k];
  const tg = (k) => setHidden((h) => ({ ...h, [k]: !h[k] }));
  const flash = (t, err = false) => { setToast({ t, err }); setTimeout(() => setToast(null), 2600); };

  const getOverlayRect = (ov = doc.overlay) => {
    if (!ov) return null;
    const sw = toPx(ov.bounds[0]), ne = toPx(ov.bounds[1]);
    const x = sw[0], y = ne[1], w = ne[0] - sw[0], h = sw[1] - ne[1];
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, rot: ov.rotasi ?? 0 };
  };
  const scaleOverlay = (factor) => {
    const r = getOverlayRect(); if (!r) return;
    const nw = Math.max(24, r.w * factor), nh = Math.max(24, r.h * factor);
    commit({ ...doc, overlay: { ...doc.overlay, bounds: [toLL([r.cx - nw / 2, r.cy + nh / 2]), toLL([r.cx + nw / 2, r.cy - nh / 2])] } });
  };
  const resetOverlayPos = () => {
    if (!doc.overlay) return;
    commit({ ...doc, overlay: { ...doc.overlay, bounds: [toLL([size.w * 0.2, size.h * 0.78]), toLL([size.w * 0.84, size.h * 0.13])], rotasi: 0 } });
  };

  const closeRoute = (dropLast) => {
    if (!rDraw) return; const id = rDraw; setRDraw(null);
    setDoc((cur) => ({ ...cur, rute: cur.rute.flatMap((r) => { if (r.id_rute !== id) return [r]; const c = dropLast ? r.bentuk_jalur_rute.coordinates.slice(0, -1) : r.bentuk_jalur_rute.coordinates; return c.length < 2 ? [] : [{ ...r, bentuk_jalur_rute: { type: 'LineString', coordinates: c } }]; }) }));
  };
  const ubahTool = (t) => { closeRoute(false); setTool(t); setMode('select'); setMenu(false); };
  const pilihFasilitas = (z, v) => commit({ ...doc, zona: doc.zona.map((q) => (q.id_zona === z.id_zona ? { ...q, id_fasilitas: v === '' ? null : Number(v) } : q)) });

  /* ---------- pointer ---------- */
  const pt = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * size.w, ((e.clientY - r.top) / r.height) * size.h];
  };
  const startDrag = (e, d) => {
    drag.current = { ...d, before: doc, moved: false };
    setDragging(true);
    svgRef.current.setPointerCapture(e.pointerId);
  };
  const drawingRoute = tool === 'rute' && mode === 'draw';

  const addPoint = (p) => {
    const ll = toLL(p);
    if (!rDraw) {
      const id = nid();
      commit({ ...doc, rute: [...doc.rute, { id_rute: id, id_map: mapData.id_map, nama_rute: `Rute baru ${id - 100}`, titik_awal: '', titik_akhir: '', akses_penggunaan: 'umum', bentuk_jalur_rute: { type: 'LineString', coordinates: [ll] } }] });
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
    const id = o[IDK[type]];
    setSel({ type, id });
    if (tool === type) {
      startDrag(e, { kind: 'move', type, id, last: pt(e) });
    }
  };
  const reshape = (z, d, p) => {
    let pts;
    if (z.kind === 'polygon') { pts = ring(z).map(toPx); pts[d.i] = p; }
    else {
      const b = [Math.min(p[0], d.opp[0]), Math.min(p[1], d.opp[1]), Math.max(p[0], d.opp[0]), Math.max(p[1], d.opp[1])];
      if (b[2] - b[0] < 6 || b[3] - b[1] < 6) return z;
      pts = z.kind === 'rectangle' ? rectPts(b) : ellPts(b);
    }
    return { ...z, geom: polyGeom(pts) };
  };
  const onMove = (e) => {
    const d = drag.current; if (!d) return; const p = pt(e);
    if (d.kind === 'draw') { setDraft((x) => x && { ...x, p1: p }); return; }
    d.moved = true;
    if (d.kind === 'move') {
      const dx = p[0] - d.last[0], dy = p[1] - d.last[1]; d.last = p;
      setDoc((cur) => ({ ...cur, [KEY[d.type]]: cur[KEY[d.type]].map((o) => {
        if (o[IDK[d.type]] !== d.id) return o;
        if (d.type === 'zona') return { ...o, geom: { type: 'Polygon', coordinates: [o.geom.coordinates[0].map((c) => shift(c, dx, dy))] } };
        return { ...o, bentuk_jalur_rute: { type: 'LineString', coordinates: o.bentuk_jalur_rute.coordinates.map((c) => shift(c, dx, dy)) } };
      }) }));
    } else if (d.kind === 'vert') setDoc((cur) => ({ ...cur, zona: cur.zona.map((z) => (z.id_zona === d.id ? reshape(z, d, p) : z)) }));
    else if (d.kind === 'rvert') setDoc((cur) => ({ ...cur, rute: cur.rute.map((r) => (r.id_rute !== d.id ? r : { ...r, bentuk_jalur_rute: { type: 'LineString', coordinates: r.bentuk_jalur_rute.coordinates.map((c, i) => (i === d.i ? toLL(p) : c)) } })) }));
    else if (d.kind === 'ov-move') {
      const dx = p[0] - d.last[0], dy = p[1] - d.last[1]; d.last = p;
      setDoc((cur) => cur.overlay ? { ...cur, overlay: { ...cur.overlay, bounds: [shift(cur.overlay.bounds[0], dx, dy), shift(cur.overlay.bounds[1], dx, dy)] } } : cur);
    } else if (d.kind === 'ov-scale') {
      const dw = [p[0] - d.oppWorld[0], p[1] - d.oppWorld[1]];
      const dl = rotVec(dw, -d.rot);
      const nw = Math.max(24, d.sx * dl[0]);
      const nh = Math.max(24, d.sy * dl[1]);
      const off = rotVec([(d.sx * nw) / 2, (d.sy * nh) / 2], d.rot);
      const ncx = d.oppWorld[0] + off[0], ncy = d.oppWorld[1] + off[1];
      setDoc((cur) => cur.overlay ? { ...cur, overlay: { ...cur.overlay, bounds: [toLL([ncx - nw / 2, ncy + nh / 2]), toLL([ncx + nw / 2, ncy - nh / 2])] } } : cur);
    } else if (d.kind === 'ov-rot') {
      const deg = normDeg((Math.atan2(p[1] - d.cy, p[0] - d.cx) * 180) / Math.PI + 90);
      setDoc((cur) => cur.overlay ? { ...cur, overlay: { ...cur.overlay, rotasi: deg } } : cur);
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (d.kind === 'draw') {
      const dr = draft; setDraft(null); if (!dr) return;
      const id = nid();
      push(d.before); setDoc((cur) => ({ ...cur, zona: [...cur.zona, { id_zona: id, id_fasilitas: null, kind: dr.shape, geom: polyGeom(makeShape(dr.shape, dr.p0, dr.p1)) }] })); setSel({ type: 'zona', id }); return;
    }
    if (d.moved) push(d.before);
  };

  const hapus = () => {
    if (tool === 'pilih') return;
    if (tool === 'overlay') { if (doc.overlay) commit({ ...doc, overlay: null }); return; }
    if (!selObj || sel.type !== tool) return;
    commit({ ...doc, [KEY[sel.type]]: doc[KEY[sel.type]].filter((o) => o[IDK[sel.type]] !== sel.id) }); setSel(null);
  };
  const tambahOverlay = () => {
    commit({
      ...doc,
      overlay: {
        url: mapData.gambar_layout,
        bounds: [toLL([size.w * 0.2, size.h * 0.78]), toLL([size.w * 0.84, size.h * 0.13])],
        opacity: mapData.opasitas ?? OPASITAS_AWAL,
        rotasi: 0,
        tampil: true,
      },
    });
    setODlg(false);
  };

  /* ---------- keluaran sesuai kolom database ---------- */
  const rows = () => {
    const ov = doc.overlay;
    return {
      map: {
        id_map: mapData.id_map,
        garis_lintang_pusat: Number(mapView.lat.toFixed(7)),
        garis_bujur_pusat: Number(mapView.lng.toFixed(7)),
        gambar_layout: mapData.gambar_layout ?? null,
        gambar_public_id: mapData.gambar_public_id ?? null,
        tampilkan_denah: !!ov?.tampil,
        barat_daya_lat: ov?.bounds[0][1] ?? null,
        barat_daya_lng: ov?.bounds[0][0] ?? null,
        timur_laut_lat: ov?.bounds[1][1] ?? null,
        timur_laut_lng: ov?.bounds[1][0] ?? null,
        rotasi: ov?.rotasi ?? 0,
        opasitas: ov?.opacity ?? mapData.opasitas ?? OPASITAS_AWAL,
      },
      fasilitas: fasilitas.filter((f) => f.id_map === mapData.id_map).map((f) => ({ id_fasilitas: f.id_fasilitas, bentuk: doc.zona.find((z) => z.id_fasilitas === f.id_fasilitas)?.geom ?? null })),
      rute: doc.rute.map((r) => ({ ...r, jarak: Math.round(plen(r.bentuk_jalur_rute.coordinates.map(toPx), mpp)), titik_awal: r.titik_awal?.trim() || null, titik_akhir: r.titik_akhir?.trim() || null })),
    };
  };
  const geojson = () => ({ type: 'FeatureCollection', features: [
    ...doc.zona.filter((z) => z.id_fasilitas).flatMap((z) => { const f = fasOf(z), pin = toLL(titikPin(ring(z).map(toPx))); return [
      { type: 'Feature', geometry: z.geom, properties: { layer: 'fasilitas', id_fasilitas: f.id_fasilitas, nama_fasilitas: f.nama_fasilitas, kode_jenis: f.kode_jenis, nama_jenis: f.nama_jenis, warna: f.warna, deskripsi: f.deskripsi_tampil, label_penanda: f.label_penanda, luas_m2: Math.round(area(ring(z).map(toPx), mpp)) } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: pin }, properties: { layer: 'pin', id_fasilitas: f.id_fasilitas, label_penanda: f.label_penanda, warna: f.warna } }]; }),
    ...rows().rute.map(({ bentuk_jalur_rute: g, ...p }) => ({ type: 'Feature', geometry: g, properties: { layer: 'rute', ...p } })),
  ] });
  const simpan = () => {
    const kosong = doc.zona.filter((z) => !z.id_fasilitas).length;
    if (kosong) {
      flash(`${kosong} zona belum dipilihkan fasilitasnya.`, true);
      return false;
    }
    (onSave ?? ((r) => console.log('Simpan', r)))(rows());
    setIsDirty(false);
    flash('Perubahan disimpan');
    return true;
  };
  const handlePublish = () => {
    const kosong = doc.zona.filter((z) => !z.id_fasilitas).length;
    if (kosong) return flash(`${kosong} zona belum dipilihkan fasilitasnya.`, true);
    onPublish?.(rows());
    setStatusMap('published');
    setIsDirty(false);
    setShowPublishModal(true);
  };
  const handleLogoClick = () => {
    if (isDirty) {
      setNavModal('unsaved-warning');
    } else {
      setNavModal('confirm-dashboard');
    }
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
    if (tool === 'overlay') {
      if (!doc.overlay) return <p className="muted">Belum ada overlay. Klik "Tambah Overlay" di bawah peta.</p>;
      const rot = doc.overlay.rotasi ?? 0;
      return (<>
        <label>OPASITAS PETA · {Math.round(doc.overlay.opacity * 100)}%</label>
        <input data-live type="range" min="0" max="100" value={Math.round(doc.overlay.opacity * 100)} aria-label="Opasitas peta" onChange={(e) => { setDoc({ ...doc, overlay: { ...doc.overlay, opacity: e.target.value / 100 } }); setIsDirty(true); }} />
        <p className="help">Bawaan 70%. Geser untuk mengatur seberapa jelas denah terlihat di atas peta.</p>

        <label>ROTASI DENAH · {rot}°</label>
        <input data-live type="range" min="-180" max="180" value={rot} aria-label="Rotasi denah" onChange={(e) => { setDoc({ ...doc, overlay: { ...doc.overlay, rotasi: Number(e.target.value) } }); setIsDirty(true); }} />
        <div className="ovl-btns">
          <button type="button" className="btn btn-sm" onClick={() => commit({ ...doc, overlay: { ...doc.overlay, rotasi: normDeg(rot - 15) } })}>-15°</button>
          <button type="button" className="btn btn-sm" onClick={() => commit({ ...doc, overlay: { ...doc.overlay, rotasi: 0 } })}>0°</button>
          <button type="button" className="btn btn-sm" onClick={() => commit({ ...doc, overlay: { ...doc.overlay, rotasi: normDeg(rot + 15) } })}>+15°</button>
        </div>

        <label>UKURAN & POSISI</label>
        <div className="ovl-btns">
          <button type="button" className="btn btn-sm" onClick={() => scaleOverlay(0.9)}>Perkecil</button>
          <button type="button" className="btn btn-sm" onClick={() => scaleOverlay(1.1)}>Perbesar</button>
          <button type="button" className="btn btn-sm" onClick={resetOverlayPos}>Reset</button>
        </div>
        <p className="help">Seret gambar di kanvas untuk menggeser, tarik titik sudut untuk memperbesar/memperkecil, atau tarik titik bulat atas untuk memutar.</p>

        <label className="chk"><input type="checkbox" checked={doc.overlay.tampil} onChange={(e) => commit({ ...doc, overlay: { ...doc.overlay, tampil: e.target.checked } })} /> Tampilkan denah di aplikasi</label>
      </>);
    }

    if (!selObj) return <p className="muted">Klik zona atau rute pada kanvas (atau di Layer Manager) untuk melihat propertinya.</p>;
    const o = selObj;
    const canEdit = tool === sel.type;

    if (sel.type === 'zona') {
      const f = fasOf(o);
      const tersedia = fasilitas.filter((x) => x.id_map === mapData.id_map && (x.id_fasilitas === o.id_fasilitas || !doc.zona.some((z) => z.id_fasilitas === x.id_fasilitas)));
      return (<>
        <label>NAMA FASILITAS</label>
        {canEdit ? (
          <>
            <select className="box" value={o.id_fasilitas ?? ''} onChange={(e) => pilihFasilitas(o, e.target.value)}>
              <option value="">Pilih fasilitas..</option>{tersedia.map((x) => <option key={x.id_fasilitas} value={x.id_fasilitas}>{x.nama_fasilitas}</option>)}
            </select>
            {!tersedia.length && <p className="help">Semua fasilitas sudah punya zona. Tambah fasilitas di Manajemen Fasilitas.</p>}
          </>
        ) : (
          <div className="box ro">{f ? f.nama_fasilitas : 'Belum dipilih'}</div>
        )}
        <label>JENIS</label><div className="box ro">{f ? <><span className="dot" style={{ background: f.warna }} />{f.nama_jenis}</> : '-'}</div>
        <label>DESKRIPSI</label><div className="box ro desc">{f?.deskripsi_tampil || '-'}</div>
        <label>LABEL PIN</label>
        <div className="box ro">
          {f ? (
            <span className="pill" style={{ background: f.warna, fontSize: f.label_penanda?.length > 3 ? 10 : 12 }}>
              {f.label_penanda}
            </span>
          ) : '-'}
        </div>
        <label>LUAS</label><div className="box ro">{Math.round(area(ring(o).map(toPx), mpp)).toLocaleString('id-ID')} m²</div>
      </>);
    }

    const c = o.bentuk_jalur_rute.coordinates;
    const labelAkses = AKSES.find(([k]) => k === o.akses_penggunaan)?.[1] ?? o.akses_penggunaan;
    return (<>
      <label>NAMA</label>
      {canEdit ? (
        <input data-live className="box" value={o.nama_rute} maxLength={100} onChange={(e) => edit({ nama_rute: e.target.value })} />
      ) : (
        <div className="box ro">{o.nama_rute || '-'}</div>
      )}
      <label>AKSES PENGGUNAAN</label>
      {canEdit ? (
        <select className="box" value={o.akses_penggunaan} onChange={(e) => editC({ akses_penggunaan: e.target.value })}>{AKSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      ) : (
        <div className="box ro">{labelAkses}</div>
      )}
      <label>WARNA GARIS</label><div className="box ro"><span className="dot" style={{ background: WARNA_AKSES[o.akses_penggunaan] }} />{NAMA_WARNA[o.akses_penggunaan]} (otomatis)</div>
      <label>PANJANG</label><div className="box ro">{Math.round(plen(c.map(toPx), mpp))} m</div>
    </>);
  };
  const colorOf = (t, o) => (t === 'zona' ? warnaZ(o) : WARNA_AKSES[o.akses_penggunaan]);
  const nameOf = (t, o) => (t === 'zona' ? fasOf(o)?.nama_fasilitas ?? 'Zona baru' : o.nama_rute);
  const groups = [['zona', 'Zona', doc.zona], ['rute', 'Rute', doc.rute]];
  const Eye = ({ k }) => <button className="eye" aria-label={hid(k) ? 'Tampilkan' : 'Sembunyikan'} aria-pressed={!hid(k)} onClick={() => tg(k)}>{hid(k) ? '○' : '◉'}</button>;
  const show = (t, id) => !hid(`g:${t}`) && !hid(`${t}:${id}`);
  const dengan = doc.zona.filter((z) => z.id_fasilitas && fasOf(z));

  const zSel = sel?.type === 'zona' && selObj && show('zona', sel.id) ? selObj : null;
  const rSel = sel?.type === 'rute' && selObj && show('rute', sel.id) ? selObj : null;
  const zPx = zSel ? ring(zSel).map(toPx) : null;
  const ovRect = doc.overlay && !hid('g:overlay') ? getOverlayRect() : null;

  const hint = {
    pilih: 'Mode lihat & pilih. Seret peta untuk menggeser koordinat lokasi, atau klik zona/rute untuk melihat propertinya.',
    zona: mode === 'draw'
      ? `Seret di kanvas untuk menggambar ${BENTUK[shape]}, lalu pilih fasilitasnya di panel kanan.`
      : 'Seret area peta untuk menggeser posisi, atau klik zona untuk mengubah bentuk & ukurannya.',
    rute: mode === 'draw'
      ? 'Klik untuk menambah titik, klik dua kali (atau Enter) untuk selesai.'
      : 'Seret area peta untuk menggeser posisi, atau klik rute untuk mengatur titik jalurnya.',
    overlay: 'Seret area peta untuk menggeser lokasi, atau seret/putar/perbesar gambar denah di atas peta.',
  }[tool];
  const heads = { zona: 'Inspector Zona', rute: 'Inspector Rute' };
  const canDelete = tool === 'pilih' ? false : tool === 'overlay' ? !!doc.overlay : Boolean(selObj && sel?.type === tool);
  const svgInteractive = isDrawing || dragging;

  const displayEventTitle = location.state?.eventTitle || namaEvent;
  const displayMapTitle =
    location.state?.selectedDenah?.title ||
    location.state?.denah?.namaDenah ||
    mapData.nama_map;

  return (
    <div className="fn-app" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <NavbarEditing onBrandClick={handleLogoClick} />
      <div className="me-body">
        <aside className="me-tools">
          {[['pilih', 'Pilih'], ['zona', 'Zona'], ['rute', 'Rute'], ['overlay', 'Overlay']].map(([k, l]) => <button key={k} className={`tool ${tool === k ? 'on' : ''}`} onClick={() => ubahTool(k)}>{l}</button>)}
          <button className="tool del" onClick={hapus} disabled={!canDelete}>Hapus</button>
        </aside>

        <section className="me-main">
          <div className="me-top">
            <span className="fn-title">{displayEventTitle} – {displayMapTitle}</span>
            <div className="me-top-r">
              <span className="chip">{statusMap === 'published' ? 'Published' : 'Draft'}</span>
              <button className="sq" onClick={undo} disabled={!past.length} aria-label="Urungkan (Ctrl+Z)">↶</button>
              <button className="sq" onClick={redo} disabled={!future.length} aria-label="Ulangi (Ctrl+Y)">↷</button>
              <button className="btn btn-solid" onClick={simpan}>Simpan</button>
              <button className="btn" style={{ borderColor: '#334155', padding: '0 36px' }}>Mobile View</button>
              <button className="btn btn-cyan" onClick={handlePublish}>Publish</button>
            </div>
          </div>

          <div className={`me-canvas-wrap ${view === 'geojson' ? 'gj-mode' : ''}`}>
            {view === 'kanvas' ? (<>
              <div ref={mapWrapRef} className={`map ${isDrawing ? 'draw' : ''}`}>
                <div ref={mapDivRef} className="gmap-host" />

                <div className="map-hud">
                  <div className="map-type-sw">
                    <button type="button" className={mapType === 'roadmap' ? 'on' : ''} onClick={() => setMapType('roadmap')}>Peta</button>
                    <button type="button" className={mapType === 'hybrid' ? 'on' : ''} onClick={() => setMapType('hybrid')}>Satelit</button>
                  </div>
                  <button type="button" className="map-center-btn" onClick={resetCenter} title="Kembalikan ke koordinat awal">
                    Pusatkan
                  </button>
                  <span className="map-coord">{mapView.lat.toFixed(5)}, {mapView.lng.toFixed(5)} · z{Math.round(mapView.zoom)}</span>
                </div>

                {gmError && (
                  <div className="gm-fallback">
                    <strong>Google Maps belum tampil ({gmError})</strong>
                    <span>Atur <code>VITE_GOOGLE_MAPS_API_KEY</code> di <code>.env</code> atau kirim prop <code>googleMapsApiKey</code>.</span>
                  </div>
                )}

                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${size.w} ${size.h}`}
                  style={{ pointerEvents: svgInteractive ? 'auto' : 'none' }}
                  onPointerDown={bgDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onDoubleClick={() => closeRoute(true)}
                >
                  {ovRect && (
                    <image
                      href={doc.overlay.url}
                      x={ovRect.x}
                      y={ovRect.y}
                      width={ovRect.w}
                      height={ovRect.h}
                      preserveAspectRatio="none"
                      opacity={doc.overlay.opacity}
                      transform={`rotate(${ovRect.rot} ${ovRect.cx} ${ovRect.cy})`}
                      style={{ pointerEvents: tool === 'overlay' ? 'auto' : 'none', cursor: tool === 'overlay' ? 'move' : 'default' }}
                      onPointerDown={(e) => {
                        if (tool !== 'overlay') return;
                        e.stopPropagation();
                        startDrag(e, { kind: 'ov-move', last: pt(e) });
                      }}
                    />
                  )}
                  {doc.zona.filter((z) => show('zona', z.id_zona)).map((z) => (
                    <polygon
                      key={z.id_zona}
                      points={pts2s(ring(z).map(toPx))}
                      fill={warnaZ(z)}
                      fillOpacity=".32"
                      stroke={warnaZ(z)}
                      strokeWidth="2"
                      strokeDasharray={sel?.id === z.id_zona && sel.type === 'zona' ? '8 4' : undefined}
                      style={{ pointerEvents: isDrawing ? 'none' : 'auto', cursor: tool === 'zona' ? 'move' : 'pointer' }}
                      onPointerDown={(e) => objDown(e, 'zona', z)}
                    />
                  ))}
                  {doc.rute.filter((r) => show('rute', r.id_rute)).map((r) => {
                    const p = pts2s(r.bentuk_jalur_rute.coordinates.map(toPx));
                    return (
                      <g key={r.id_rute}>
                        <polyline points={p} fill="none" stroke={WARNA_AKSES[r.akses_penggunaan]} strokeWidth="3.5" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
                        <polyline
                          points={p}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="14"
                          style={{ pointerEvents: isDrawing ? 'none' : 'auto', cursor: tool === 'rute' ? 'move' : 'pointer' }}
                          onPointerDown={(e) => objDown(e, 'rute', r)}
                        />
                      </g>
                    );
                  })}
                  {!hid('g:pin') && dengan.filter((z) => show('zona', z.id_zona)).map((z) => {
                    const [x, y] = titikPin(ring(z).map(toPx)), f = fasOf(z);
                    return (
                      <g key={`pin${z.id_zona}`} style={{ pointerEvents: 'none' }}>
                        <circle cx={x} cy={y} r="15" fill={f.warna} stroke="#fff" strokeWidth="2" />
                        <text x={x} y={y + (f.label_penanda.length > 3 ? 3 : 4)} textAnchor="middle" fill="#fff" fontSize={f.label_penanda.length > 3 ? 9 : 12} fontWeight="700">{f.label_penanda}</text>
                      </g>
                    );
                  })}
                  {draft && <polygon points={pts2s(makeShape(draft.shape, draft.p0, draft.p1))} fill={ABU} fillOpacity=".25" stroke="#fff" strokeWidth="2" strokeDasharray="6 4" style={{ pointerEvents: 'none' }} />}
                  {zSel && tool === 'zona' && zSel.kind !== 'polygon' && <rect className="bb" x={bbox(zPx)[0]} y={bbox(zPx)[1]} width={bbox(zPx)[2] - bbox(zPx)[0]} height={bbox(zPx)[3] - bbox(zPx)[1]} />}
                  {zSel && tool === 'zona' && (zSel.kind === 'polygon' ? zPx : corners(bbox(zPx))).map((p, i) => (
                    <rect
                      key={i}
                      className="hnd"
                      style={{ pointerEvents: 'auto' }}
                      x={p[0] - 5}
                      y={p[1] - 5}
                      width="10"
                      height="10"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag(e, { kind: 'vert', id: zSel.id_zona, i, opp: zSel.kind === 'polygon' ? null : corners(bbox(zPx))[(i + 2) % 4] });
                      }}
                    />
                  ))}
                  {rSel && tool === 'rute' && rSel.bentuk_jalur_rute.coordinates.map(toPx).map((p, i) => (
                    <circle
                      key={i}
                      className="hnd round"
                      style={{ pointerEvents: 'auto' }}
                      cx={p[0]}
                      cy={p[1]}
                      r="5"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startDrag(e, { kind: 'rvert', id: rSel.id_rute, i });
                      }}
                    />
                  ))}
                  {ovRect && tool === 'overlay' && (() => {
                    const { x, y, w, h, cx, cy, rot } = ovRect;
                    const hw = w / 2, hh = h / 2;
                    const cornerSpecs = [
                      { lx: -hw, ly: -hh, sx: -1, sy: -1 },
                      { lx: hw, ly: -hh, sx: 1, sy: -1 },
                      { lx: hw, ly: hh, sx: 1, sy: 1 },
                      { lx: -hw, ly: hh, sx: -1, sy: 1 },
                    ];
                    return (
                      <g transform={`rotate(${rot} ${cx} ${cy})`}>
                        <rect className="bb" x={x} y={y} width={w} height={h} />
                        <line x1={cx} y1={y} x2={cx} y2={y - 26} stroke="#fff" strokeWidth="1.5" strokeDasharray="3 2" style={{ pointerEvents: 'none' }} />
                        <circle
                          className="hnd round"
                          style={{ pointerEvents: 'auto' }}
                          cx={cx}
                          cy={y - 26}
                          r="6"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startDrag(e, { kind: 'ov-rot', cx, cy });
                          }}
                        />
                        {cornerSpecs.map((c, i) => {
                          const oppOff = rotVec([-c.lx, -c.ly], rot);
                          const oppWorld = [cx + oppOff[0], cy + oppOff[1]];
                          return (
                            <rect
                              key={i}
                              className="hnd"
                              style={{ pointerEvents: 'auto' }}
                              x={cx + c.lx - 5}
                              y={cy + c.ly - 5}
                              width="10"
                              height="10"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                startDrag(e, { kind: 'ov-scale', rot, oppWorld, sx: c.sx, sy: c.sy });
                              }}
                            />
                          );
                        })}
                      </g>
                    );
                  })()}
                </svg>
              </div>
              <div className="me-under">
                {(tool === 'zona' || tool === 'rute') && (
                  <div className="toolbar">
                    <button className={`tb ${mode === 'select' ? 'on' : ''}`} onClick={() => { closeRoute(false); setMode('select'); setMenu(false); }} aria-label="Mode pilih">{ICON.select}</button>
                    <button
                      className={`tb ${mode === 'draw' ? 'on' : ''}`}
                      style={tool === 'zona' ? { width: 62 } : undefined}
                      onClick={() => {
                        if (tool === 'zona') {
                          if (mode === 'select') {
                            setMode('draw');
                            setMenu(false);
                          } else {
                            setMenu((m) => !m);
                          }
                        } else {
                          setMode('draw');
                        }
                      }}
                      aria-label={tool === 'zona' ? 'Alat gambar zona' : 'Gambar rute'}
                    >
                      {tool === 'zona' ? <>{ICON[shape]} ▾</> : ICON.line}
                    </button>
                    {menu && tool === 'zona' && <div className="tb-menu">{[['rectangle', 'Rectangle'], ['ellipse', 'Ellipse'], ['polygon', 'Polygon']].map(([k, l]) => <button key={k} className={shape === k ? 'on' : ''} onClick={() => { setShape(k); setMenu(false); }}>{ICON[k]} {l}{shape === k ? ' ✓' : ''}</button>)}</div>}
                  </div>
                )}
                {tool === 'overlay' && <button className="btn btn-solid" disabled={!!doc.overlay} onClick={() => setODlg(true)}>{doc.overlay ? 'Overlay sudah ditambahkan' : 'Tambah Overlay'}</button>}
                {hint && <p className="hint">{hint}</p>}
              </div>
            </>) : (
              <div className="gj-wrap">
                <div className="gj-bar"><b>GeoJSON – {displayMapTitle}</b><span><button className="btn" style={{ borderColor: '#334155' }} onClick={() => navigator.clipboard?.writeText(gjText).then(() => flash('GeoJSON disalin'))}>Salin</button> <button className="btn btn-solid" onClick={unduh}>Unduh .geojson</button></span></div>
                <pre className="gj" tabIndex={0}>{gjText}</pre>
              </div>
            )}
          </div>

          <div className="me-foot">
            <button className={`btn ${view === 'kanvas' ? 'btn-solid' : ''}`} style={{ height: 34, borderColor: '#334155' }} onClick={() => setView('kanvas')}>Kanvas</button>
            <button className={`btn ${view === 'geojson' ? 'btn-solid' : ''}`} style={{ height: 34, borderColor: '#334155' }} onClick={() => { closeRoute(false); setView('geojson'); }}>Lihat GeoJSON</button>
            <button
              type="button"
              className="btn"
              style={{ height: 34, borderColor: '#334155', padding: '0 36px' }}
              onClick={() =>
                navigate(isEO ? '/detail-event-eo' : '/detail-event', {
                  state: {
                    eventId: location.state?.eventId,
                    eventTitle: location.state?.eventTitle,
                    eventData: location.state?.eventData,
                  },
                })
              }
            >
              Kembali
            </button>
            {toast && <span role="status" className={`toast ${toast.err ? 'err' : ''}`}>{toast.t}</span>}
            <span className="count">{doc.zona.length} zona - {doc.rute.length} rute</span>
          </div>
        </section>

        <aside className="insp" onFocus={(e) => { if (e.target.dataset.live && !snap.current) snap.current = doc; }} onBlur={(e) => { if (!e.target.dataset.live) return; if (snap.current && snap.current !== doc) push(snap.current); snap.current = null; }}>
          <h3>{tool === 'overlay' ? 'Inspector Overlay' : selObj ? (tool !== sel.type ? 'Inspector Properti' : heads[sel.type]) : 'Inspector'}</h3>
          {renderInsp()}
          <label>LAYER MANAGER</label>
          <div className="layers">
            {groups.map(([t, l, arr]) => (
              <div key={t} className="lg">
                <div className="lh"><span>{l} ({arr.length})</span><Eye k={`g:${t}`} /></div>
                {arr.map((o) => <div key={o[IDK[t]]} className={`li ${sel?.type === t && sel.id === o[IDK[t]] ? 'on' : ''}`}>
                  <button className="lname" onClick={() => setSel({ type: t, id: o[IDK[t]] })}><span className="dot" style={{ background: colorOf(t, o) }} />{nameOf(t, o)}</button><Eye k={`${t}:${o[IDK[t]]}`} /></div>)}
              </div>
            ))}
            <div className="lg"><div className="lh"><span>Pin ({dengan.length})</span><Eye k="g:pin" /></div></div>
            <div className="lg"><div className="lh"><span>Overlay Denah ({doc.overlay ? 1 : 0})</span><Eye k="g:overlay" /></div></div>
          </div>
        </aside>
      </div>

      {/* MODAL TAMBAH OVERLAY */}
      {oDlg && (
        <div className="overlay" onClick={() => setODlg(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>Tambah Overlay</h2>
            {mapData.gambar_layout ? (<>
              <img className="ovl-prev" src={mapData.gambar_layout} alt={`Denah ${displayMapTitle}`} />
              <p className="help">Gambar denah ini berasal dari detail event untuk peta "{displayMapTitle}".</p></>)
              : <p className="muted">Peta ini belum punya gambar denah. Tambahkan di detail event atau lewat "Jadikan Denah" di Galeri Gambar Event.</p>}
            <div className="modal-actions"><button className="btn btn-ghost" onClick={() => setODlg(false)}>Batal</button><button className="btn btn-solid" onClick={tambahOverlay} disabled={!mapData.gambar_layout}>Tambahkan</button></div>
          </div>
        </div>
      )}

      {/* MODAL PERINGATAN: PERUBAHAN BELUM DISIMPAN */}
      {navModal === 'unsaved-warning' && (
        <div className="overlay" onClick={() => setNavModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 420 }}>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>Perubahan Belum Disimpan</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              Anda memiliki perubahan yang belum disimpan. Simpan perubahan terlebih dahulu sebelum keluar?
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setNavModal(null)}>
                Batal
              </button>
              <button
                className="btn"
                style={{ borderColor: '#334155' }}
                onClick={() => setNavModal('confirm-dashboard')}
              >
                Jangan Simpan
              </button>
              <button
                className="btn btn-solid"
                onClick={() => {
                  if (simpan()) setNavModal('confirm-dashboard');
                }}
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI KEMBALI KE DASHBOARD */}
      {navModal === 'confirm-dashboard' && (
        <div className="overlay" onClick={() => setNavModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 400 }}>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>Yakin ingin kembali ke dashboard?</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              Anda akan keluar dari halaman Map Editor.
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setNavModal(null)}>
                Batal
              </button>
              <button
                className="btn btn-cyan"
                onClick={() => {
                  setNavModal(null);
                  navigate(isEO ? '/dashboard-eo' : '/dashboard');
                }}
              >
                Ya, Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PUBLISHED (SAMA SEPERTI DETAIL EVENT) */}
      {showPublishModal && (
        <div className="overlay" onClick={() => setShowPublishModal(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: 'center', maxWidth: 380, padding: '32px 24px' }}
          >
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" fill="#22c55e" />
                <path
                  d="M20 32L28 40L44 24"
                  stroke="white"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 24 }}>Berhasil! Konten sudah dipublish</h3>
            <button
              className="btn btn-cyan"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowPublishModal(false)}
            >
              Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  );
}