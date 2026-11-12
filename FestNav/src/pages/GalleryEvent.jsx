import { useRef, useState } from 'react';
import './common.css';
import './GalleryEvent.css';
import { NavBar } from './FacilityManagement';

// Ganti `src` dengan URL gambar sebenarnya; gradient dipakai sebagai placeholder.
const grad = (a, b) => `linear-gradient(135deg, ${a}, ${b})`;
const AWAL = [
  { id: 1, nama: 'Denah Parkir', src: grad('#fff', '#cbd5e1') },
  { id: 2, nama: 'Denah Lantai 1', src: grad('#ede9fe', '#fce7f3') },
  { id: 3, nama: 'Denah Tenant', src: grad('#9b0000', '#fecaca') },
  { id: 4, nama: 'Denah Parkir', src: grad('#fff', '#cbd5e1') },
  { id: 5, nama: 'Denah Outdoor', src: grad('#d4d4d8', '#a3e635') },
];

export default function GalleryEvent() {
  const [data, setData] = useState(AWAL);
  const [cari, setCari] = useState('');
  const [modeHapus, setModeHapus] = useState(false);
  const [dipilih, setDipilih] = useState([]);
  const [modal, setModal] = useState(null); // 'tambah' | 'hapus'
  const [file, setFile] = useState(null); // {url}
  const [nama, setNama] = useState('');
  const input = useRef();

  const tampil = data.filter((d) => d.nama.toLowerCase().includes(cari.toLowerCase()));
  const toggle = (id) => setDipilih((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const tutup = () => { setModal(null); setFile(null); setNama(''); };

  const pilihFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile({ url: URL.createObjectURL(f) });
  };
  const unggah = () => {
    if (!file || !nama.trim()) return;
    setData([...data, { id: Date.now(), nama: nama.trim(), src: `url(${file.url})` }]);
    tutup();
  };
  const klikHapus = () => {
    if (!modeHapus) return setModeHapus(true);
    if (dipilih.length) setModal('hapus'); else setModeHapus(false);
  };
  const hapus = () => {
    setData(data.filter((d) => !dipilih.includes(d.id)));
    setDipilih([]); setModeHapus(false); tutup();
  };
  const terpilih = data.filter((d) => dipilih.includes(d.id));

  return (
    <div className="fn-app">
      <NavBar aktif="Galeri Gambar Event" />
      <div className="fn-sub">
        <span className="fn-title">Dies Natalis Udayana 2026</span>
        <div className="fn-actions">
          <button className={`btn btn-red ${modeHapus ? 'on' : ''}`} onClick={klikHapus}>Hapus</button>
          <button className={`btn btn-primary ${modal === 'tambah' ? 'on' : ''}`} onClick={() => setModal('tambah')}>Tambah</button>
        </div>
      </div>
      <input className="search" placeholder="Cari gambar event..." value={cari} onChange={(e) => setCari(e.target.value)} />

      <div className="gal-grid">
        {tampil.map((d) => (
          <figure className="gal-card" key={d.id} style={{ margin: 0 }}>
            <div className="gal-img" style={{ backgroundImage: d.src }} />
            <figcaption className="gal-cap">
              {d.nama}
              {modeHapus && (
                <button className="gal-check" aria-label={`Pilih ${d.nama}`} onClick={() => toggle(d.id)}>
                  {dipilih.includes(d.id) ? '✓' : ''}
                </button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {modal === 'tambah' && (
        <div className="overlay" onClick={tutup}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>Upload Gambar Event</h2>
            <button className="drop" onClick={() => input.current.click()}>
              {file ? <img src={file.url} alt="Pratinjau" /> : (
                <span><span className="plus">+</span><br />Klik bagian ini untuk menambah gambar</span>
              )}
            </button>
            <input ref={input} type="file" accept="image/*" hidden onChange={pilihFile} />
            <input className="field" style={{ marginTop: 16 }} placeholder="Tambahkan nama gambar..." value={nama} onChange={(e) => setNama(e.target.value)} />
            <div className="modal-actions" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost" onClick={tutup}>Batal</button>
              <button className="btn btn-solid" onClick={unggah}>Unggah</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'hapus' && (
        <div className="overlay" onClick={tutup}>
          <div className="modal danger" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 26 }}>Yakin ingin menghapus gambar ini?</h2>
            {terpilih.map((d) => (
              <div key={d.id}>
                <div className="confirm-img ph" style={{ backgroundImage: d.src }} />
                <div className="field" style={{ lineHeight: '44px', marginBottom: 12 }}>{d.nama}</div>
              </div>
            ))}
            <div className="modal-actions" style={{ marginTop: 6 }}>
              <button className="btn btn-red" onClick={tutup}>Batal</button>
              <button className="btn btn-red on" onClick={hapus}>Yakin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
