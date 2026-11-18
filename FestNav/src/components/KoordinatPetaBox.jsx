import { useEffect, useState } from 'react';
import './KoordinatPetaBox.css';

export default function KoordinatPetaBox({
  lat = -8.6724,
  lng = 115.2362,
  hasOverlay = false,
  onArahkan,
}) {
  const [open, setOpen] = useState(true);
  const [latInput, setLatInput] = useState(String(lat ?? ''));
  const [lngInput, setLngInput] = useState(String(lng ?? ''));
  const [pindahkanOverlay, setPindahkanOverlay] = useState(true);
  const [error, setError] = useState('');

  // Sinkronkan nilai input jika pusat peta dimuat ulang dari database
  useEffect(() => {
    if (lat != null) setLatInput(String(Number(lat).toFixed(6)));
    if (lng != null) setLngInput(String(Number(lng).toFixed(6)));
  }, [lat, lng]);

  // Otomatis pisahkan jika admin menempel "lat, lng" langsung dari Google Maps
  const handleLatChange = (value) => {
    setError('');
    if (value.includes(',')) {
      const [rawLat, rawLng] = value.split(',').map((s) => s.trim());
      setLatInput(rawLat || '');
      if (rawLng !== undefined) setLngInput(rawLng);
      return;
    }
    setLatInput(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedLat = Number.parseFloat(String(latInput).replace(',', '.'));
    const parsedLng = Number.parseFloat(String(lngInput).replace(',', '.'));

    if (Number.isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setError('Latitude harus angka antara -90 sampai 90.');
      return;
    }
    if (Number.isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setError('Longitude harus angka antara -180 sampai 180.');
      return;
    }

    setError('');
    onArahkan?.({
      lat: parsedLat,
      lng: parsedLng,
      pindahkanOverlay: hasOverlay && pindahkanOverlay,
    });
  };

  return (
    <div className="kpb-wrap">
      {!open ? (
        <button
          type="button"
          className="kpb-toggle"
          onClick={() => setOpen(true)}
          title="Buka input koordinat"
        >
          <span>📍</span>
          <span>Koordinat</span>
        </button>
      ) : (
        <form className="kpb-card" onSubmit={handleSubmit}>
          <div className="kpb-head">
            <span className="kpb-title">Arahkan Peta via Koordinat</span>
            <button
              type="button"
              className="kpb-min"
              onClick={() => setOpen(false)}
              aria-label="Sembunyikan kotak koordinat"
              title="Perkecil"
            >
              −
            </button>
          </div>

          <div className="kpb-grid">
            <div className="kpb-field">
              <label htmlFor="kpb-lat">Latitude</label>
              <input
                id="kpb-lat"
                type="text"
                inputMode="decimal"
                placeholder="-8.6724"
                value={latInput}
                onChange={(e) => handleLatChange(e.target.value)}
              />
            </div>

            <div className="kpb-field">
              <label htmlFor="kpb-lng">Longitude</label>
              <input
                id="kpb-lng"
                type="text"
                inputMode="decimal"
                placeholder="115.2362"
                value={lngInput}
                onChange={(e) => {
                  setError('');
                  setLngInput(e.target.value);
                }}
              />
            </div>
          </div>

          <p className="kpb-tip">
            Bisa langsung <em>paste</em> salinan Google Maps (mis.{' '}
            <code>-8.6724, 115.2362</code>) di kolom Latitude.
          </p>

          {hasOverlay && (
            <label className="kpb-chk">
              <input
                type="checkbox"
                checked={pindahkanOverlay}
                onChange={(e) => setPindahkanOverlay(e.target.checked)}
              />
              <span>Ikut pindahkan overlay denah ke titik ini</span>
            </label>
          )}

          {error && (
            <div className="kpb-err" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="kpb-submit">
            Arahkan Peta
          </button>
        </form>
      )}
    </div>
  );
}