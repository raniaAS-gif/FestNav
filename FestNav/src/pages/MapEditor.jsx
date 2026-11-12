import { useRef, useState } from 'react';
import './common.css';
import './MapEditor.css';
import './GalleryEvent.css';
import { NavBar } from './FacilityManagement';

const WARNA = ['#8b5cf6', '#f59e0b', '#10b981', '#0ea5e9', '#475569', '#f43f5e'];
const JENIS_WARNA = { 'Panggung / Stage': 0, Kuliner: 1, 'Bazzar / Tenant': 2, 'Fasilitas Umum': 3, Parkir: 4, VIP: 5 };
const TOOLS = [['pilih', 'Pilih'], ['zona', 'Zona'], ['rute', 'Rute'], ['marker', 'Marker'], ['overlay', 'Overlay']];
const rect = (x, y, w, h) => `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`;

const ZONA_AWAL = [
  { id: 'P1', nama: 'Panggung Utama', jenis: 'Panggung / Stage', warna: 0, pts: '462,10 610,18 640,80 590,130 470,130 455,70', luas: 1240, mx: 540, my: 62 },
  { id: 'F1', nama: 'Food Court A', jenis: 'Kuliner', warna: 1, pts: '345,45 425,80 415,185 340,168', luas: 900, mx: 375, my: 118 },
  { id: 'B1', nama: 'Bazzar', jenis: 'Bazzar / Tenant', warna: 2, pts: '612,148 695,160 685,215 600,212', luas: 700, mx: 650, my: 183 },
  { id: 'T1', nama: 'Toilet Utara', jenis: 'Fasilitas Umum', warna: 3, pts: '375,190 450,200 435,245 365,230', luas: 120, mx: 410, my: 215 },
  { id: 'K1', nama: 'Parkir Timur', jenis: 'Parkir', warna: 4, pts: '460,230 565,255 545,325 460,290', luas: 1500, mx: null },
  { id: 'V1', nama: 'Area VIP', jenis: 'VIP', warna: 5, pts: '600,237 670,237 668,290 598,285', luas: 400, mx: 637, my: 262 },
];

function Swatches({ value, onChange }) {
  return (
    <div className="swatches">
      {WARNA.map((c, i) => (
        <button key={c} className={`sw ${value === i ? 'on' : ''}`} style={{ background: c }} aria-label={`Warna ${i + 1}`} onClick={() => onChange(i)} />
      ))}
    </div>
  );
}
function Layers({ labels }) {
  const c = ['#8b5cf6', '#000', '#fff', '#64748b'];
  return <div className="layers">{labels.map((l, i) => <div key={l}><span className="dot" style={{ width: 8, height: 8, borderRadius: 2, background: c[i] }} />{l}</div>)}</div>;
}

export default function MapEditor() {
  const [tool, setTool] = useState('pilih');
  const [zonas, setZonas] = useState(ZONA_AWAL);
  const [sel, setSel] = useState('P1');
  const [rute, setRute] = useState({ nama: 'Rute Pejalan Kaki Utama', warna: 4, gaya: 'dash', pts: [[538, 98], [480, 150], [535, 205], [528, 228]] });
  const [shape, setShape] = useState('Rectangle');
  const [pen, setPen] = useState('Pen');
  const [menu, setMenu] = useState(false);
  const [hover, setHover] = useState(null);
  const [modal, setModal] = useState(false);
  const [ovlFile, setOvlFile] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [selMarker, setSelMarker] = useState('P1');
  const svg = useRef();

  const z = zonas.find((x) => x.id === sel);
  const upd = (patch) => setZonas(zonas.map((x) => (x.id === sel ? { ...x, ...patch } : x)));
  const markers = zonas.filter((x) => x.mx != null);
  const pos = (e) => {
    const r = svg.current.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * 850), Math.round(((e.clientY - r.top) / r.height) * 485)];
  };
  const ubahTool = (t) => { setTool(t); setMenu(false); if (t === 'overlay') setOvlFile(null); };

  const klikKanvas = (e) => {
    const [x, y] = pos(e);
    if (tool === 'zona') {
      const id = `Z${Date.now() % 1000}`;
      setZonas([...zonas, { id, nama: 'Food Court B', jenis: 'Kuliner', warna: 1, pts: rect(x - 45, y - 22, 90, 45), luas: 800, mx: null }]);
      setSel(id);
    } else if (tool === 'rute') setRute({ ...rute, pts: [...rute.pts, [x, y]] });
    else if (tool === 'marker') {
      const t = zonas.find((q) => q.mx == null) ;
      if (t) { setZonas(zonas.map((q) => (q.id === t.id ? { ...q, mx: x, my: y } : q))); setSelMarker(t.id); }
    }
  };
  const klikZona = (e, id) => {
    if (tool === 'pilih' || tool === 'zona') { e.stopPropagation(); setSel(id); }
    if (tool === 'marker') { e.stopPropagation(); setSelMarker(id); }
  };
  const hapus = () => { if (tool === 'pilih' || tool === 'zona') { setZonas(zonas.filter((x) => x.id !== sel)); setSel(null); } else if (tool === 'rute') setRute({ ...rute, pts: [] }); else if (tool === 'overlay') setOverlay(null); };
  const unggah = () => { setOverlay(ovlFile); setModal(false); };
  const pilihFile = (e) => { const f = e.target.files?.[0]; if (f) setOvlFile(URL.createObjectURL(f)); };

  const aktifBentuk = tool === 'zona' ? shape : pen;
  const opsi = tool === 'zona' ? ['Rectangle', 'Ellipse', 'Polygon'] : ['Pen', 'Line'];

  return (
    <div className="fn-app" style={{ height: '100vh' }}>
      <NavBar aktif="Map Editor" />
      <div className="me-body">
        <aside className="me-tools">
          {TOOLS.map(([k, l]) => <button key={k} className={`tool ${tool === k ? 'on' : ''}`} onClick={() => ubahTool(k)}>{l}</button>)}
          <button className="tool del" onClick={hapus}>Hapus</button>
        </aside>

        <section className="me-main">
          <div className="me-top">
            <span className="fn-title">Dies Natalis Udayana 2026</span>
            <div className="me-top-r">
              <span className="chip">Draft</span>
              <button className="sq" aria-label="Urungkan">↶</button><button className="sq" aria-label="Ulangi">↷</button>
              <button className="btn btn-solid">Simpan</button>
              <button className="btn btn-ghost" style={{ background: 'transparent', padding: '0 40px', borderColor: '#334155' }}>Mobile View</button>
              <button className="btn btn-cyan">Publish</button>
            </div>
          </div>

          <div className="me-canvas-wrap">
            <div className={`map ${['zona', 'rute', 'marker'].includes(tool) ? 'crosshair' : ''}`}>
              <svg ref={svg} viewBox="0 0 850 485" onClick={klikKanvas}
                onMouseMove={(e) => tool === 'marker' && setHover(pos(e))} onMouseLeave={() => setHover(null)}>
                {overlay && <image href={overlay} x="170" y="65" width="545" height="310" preserveAspectRatio="xMidYMid slice" opacity=".85" />}
                {zonas.map((q) => (
                  <polygon key={q.id} points={q.pts} fill={WARNA[q.warna]} fillOpacity={0.3} stroke={WARNA[q.warna]} strokeWidth="2"
                    strokeDasharray={sel === q.id && tool === 'pilih' ? '8 4' : 'none'} onClick={(e) => klikZona(e, q.id)} />
                ))}
                {rute.pts.length > 1 && <polyline points={rute.pts.join(' ')} fill="none" stroke={WARNA[rute.warna] === '#475569' ? '#000' : WARNA[rute.warna]} strokeWidth="3" strokeDasharray={rute.gaya === 'dash' ? '4 6' : 'none'} />}
                {tool === 'rute' && rute.pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#06b6d4" />)}
                {markers.map((q) => (
                  <g key={q.id} onClick={(e) => klikZona(e, q.id)}>
                    <circle cx={q.mx} cy={q.my} r="15" fill={WARNA[q.warna]} stroke="#fff" strokeWidth="2" strokeDasharray={tool === 'marker' && selMarker === q.id ? '3 3' : 'none'} />
                    <text x={q.mx} y={q.my + 5} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">{q.id}</text>
                  </g>
                ))}
                {tool === 'zona' && sel && z && <>{z.pts.split(' ').map((p) => { const [x, y] = p.split(','); return <rect key={p} x={x - 4} y={y - 4} width="8" height="8" fill="#fff" stroke="#4f46e5" />; })}</>}
              </svg>
            </div>
            {tool === 'marker' && hover && <div className="tip" style={{ left: 12 + hover[0] * 1, top: 12 + hover[1] }}>Tambah Marker</div>}
            {tool === 'overlay' && <button className="btn btn-solid ovl-add" onClick={() => setModal(true)}>Tambah Overlay</button>}

            {(tool === 'zona' || tool === 'rute' || tool === 'overlay') && (
              <div className="toolbar">
                {tool === 'overlay' ? ['⛶', '↻', '◢', '◣'].map((i) => <button key={i} className="tb" aria-label="Transformasi overlay">{i}</button>) : (
                  <>
                    <button className="tb on" aria-label="Pilih">➤</button>
                    <button className={`tb ${menu ? 'on' : ''}`} onClick={() => setMenu(!menu)} aria-label="Bentuk gambar">{tool === 'zona' ? '▭' : '✒'} ▾</button>
                    {menu && (
                      <div className="tb-menu">
                        {opsi.map((o) => <button key={o} className={aktifBentuk === o ? 'on' : ''} onClick={() => { tool === 'zona' ? setShape(o) : setPen(o); setMenu(false); }}>{o}{aktifBentuk === o ? ' ✓' : ''}</button>)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="me-foot">
            <button className="btn btn-solid" style={{ height: 34 }}>Kanvas</button>
            <button className="btn" style={{ height: 34, borderColor: '#334155' }}>Lihat GeoJSON</button>
            <span className="count">{zonas.length} zona - 1 rute - {markers.length} marker</span>
          </div>
        </section>

        <aside className="insp">
          {(tool === 'pilih' || tool === 'zona') && z && (
            <>
              <h3>{tool === 'pilih' ? 'Inspector Properti' : 'Inspector Zona'}</h3>
              <label>NAMA</label><input className="box" value={z.nama} onChange={(e) => upd({ nama: e.target.value })} />
              <label>JENIS</label>
              <select className="box" value={z.jenis} onChange={(e) => upd({ jenis: e.target.value, warna: JENIS_WARNA[e.target.value] })}>
                {Object.keys(JENIS_WARNA).map((j) => <option key={j} style={{ background: '#1e293b' }}>{j}</option>)}
              </select>
              <label>WARNA</label><Swatches value={z.warna} onChange={(i) => upd({ warna: i })} />
              {tool === 'pilih' ? (
                <><label>IKON MARKER</label><div className="box">{z.id} - {z.jenis.split(' ')[0]}</div></>
              ) : (
                <>
                  <label>OPASITAS ISI</label><input type="range" className="range" defaultValue="25" />
                  <label>LUAS</label><div className="box">{z.luas} m²</div>
                </>
              )}
              <label>LAYER MANAGER</label>
              <Layers labels={tool === 'pilih' ? ['Zona', 'Rute', 'Marker', 'Overlay Denah'] : [`Zona ${z.nama}`, 'Rute', `Marker ${z.id}`, 'Overlay Denah']} />
            </>
          )}
          {tool === 'rute' && (
            <>
              <h3>Inspector Rute</h3>
              <label>NAMA</label><input className="box" value={rute.nama} onChange={(e) => setRute({ ...rute, nama: e.target.value })} />
              <label>WARNA GARIS</label><Swatches value={rute.warna} onChange={(i) => setRute({ ...rute, warna: i })} />
              <label>JENIS GARIS</label>
              <div className="seg">
                <button className={`btn ${rute.gaya === 'solid' ? 'on' : ''}`} onClick={() => setRute({ ...rute, gaya: 'solid' })}>Solid</button>
                <button className={`btn ${rute.gaya === 'dash' ? 'on' : ''}`} onClick={() => setRute({ ...rute, gaya: 'dash' })}>Putus - putus</button>
              </div>
              <label>PANJANG</label>
              <div className="box">{Math.round(rute.pts.reduce((s, p, i, a) => (i ? s + Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) : 0), 0) * 0.5)} m</div>
            </>
          )}
          {tool === 'marker' && (
            <>
              <h3>Inspector Marker</h3>
              <label>NAMA</label><input className="box" value={selMarker || ''} readOnly />
              <label>WARNA</label>
              <Swatches value={zonas.find((q) => q.id === selMarker)?.warna} onChange={(i) => setZonas(zonas.map((q) => (q.id === selMarker ? { ...q, warna: i } : q)))} />
              <label>LAYER MANAGER</label><Layers labels={['Zona', 'Rute', 'Marker', 'Overlay Denah']} />
            </>
          )}
        </aside>
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ width: 'min(592px,92vw)' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>Upload Overlay</h2>
            <label className="drop" style={{ display: 'grid' }}>
              {ovlFile ? <img src={ovlFile} alt="Pratinjau overlay" /> : <span><span className="plus">+</span><br />Klik bagian ini untuk menambah overlay</span>}
              <input type="file" accept="image/*" hidden onChange={pilihFile} />
            </label>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
              <button className="btn btn-solid" onClick={unggah} disabled={!ovlFile}>Unggah</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
