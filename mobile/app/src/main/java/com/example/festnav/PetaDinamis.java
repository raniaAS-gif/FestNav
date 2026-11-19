package com.example.festnav;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.AppCompatButton;
import androidx.core.app.ActivityCompat;

import com.bumptech.glide.Glide;
import com.bumptech.glide.request.target.CustomTarget;
import com.bumptech.glide.request.transition.Transition;
import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.BitmapDescriptor;
import com.google.android.gms.maps.model.BitmapDescriptorFactory;
import com.google.android.gms.maps.model.GroundOverlay;
import com.google.android.gms.maps.model.GroundOverlayOptions;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.LatLngBounds;
import com.google.android.gms.maps.model.MapStyleOptions;
import com.google.android.gms.maps.model.Marker;
import com.google.android.gms.maps.model.MarkerOptions;
import com.google.android.gms.maps.model.Polyline;
import com.google.android.gms.maps.model.PolylineOptions;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PetaDinamis extends AppCompatActivity implements OnMapReadyCallback {

    private static final int REQ_LOCATION_PERMISSION = 101;

    private enum UiState {
        JELAJAH,
        FASILITAS_DIPILIH,
        NAVIGASI,
        TIBA
    }

    private static class FasilitasItem {
        String id;
        String nama;
        String subtitle;
        String kategori;
        String kodeHuruf;
        int badgeColor;
        int zoneFillColor;
        int zoneStrokeColor;
        float normLeft, normTop, normRight, normBottom;
        LatLng posisi;
        int jarakMeter;
        int estimasiMenit;
        int lantai; // 0 = outdoor, 1..3 = indoor

        FasilitasItem(String id, String nama, String subtitle, String kategori,
                      String kodeHuruf, int badgeColor, int zoneFillColor, int zoneStrokeColor,
                      float normLeft, float normTop, float normRight, float normBottom,
                      int jarakMeter, int estimasiMenit, int lantai) {
            this.id = id;
            this.nama = nama;
            this.subtitle = subtitle;
            this.kategori = kategori;
            this.kodeHuruf = kodeHuruf;
            this.badgeColor = badgeColor;
            this.zoneFillColor = zoneFillColor;
            this.zoneStrokeColor = zoneStrokeColor;
            this.normLeft = normLeft;
            this.normTop = normTop;
            this.normRight = normRight;
            this.normBottom = normBottom;
            this.posisi = normToLatLng((normLeft + normRight) / 2f, (normTop + normBottom) / 2f);
            this.jarakMeter = jarakMeter;
            this.estimasiMenit = estimasiMenit;
            this.lantai = lantai;
        }
    }

    // Batas geografis area venue / gedung yang sudah diperkecil agar proporsional di peta
    private static final double AREA_LAT_MIN = -8.79895; // Selatan (bawah)
    private static final double AREA_LAT_MAX = -8.79815; // Utara (atas)
    private static final double AREA_LNG_MIN = 115.17212; // Barat (kiri)
    private static final double AREA_LNG_MAX = 115.17268; // Timur (kanan)

    private static LatLng normToLatLng(float nx, float ny) {
        double lat = AREA_LAT_MAX - (ny * (AREA_LAT_MAX - AREA_LAT_MIN));
        double lng = AREA_LNG_MIN + (nx * (AREA_LNG_MAX - AREA_LNG_MIN));
        return new LatLng(lat, lng);
    }

    private GoogleMap mMap;
    private GroundOverlay zoneOverlay;
    private Polyline activeRoutePolyline;
    private Marker userMarker;

    private LocationManager locationManager;
    private LocationListener locationListener;

    private String modePeta = "OUTDOOR";
    private String namaLokasi = "Gedung Pameran";
    private ArrayList<String> customFloorUrls = new ArrayList<>();
    private int currentFloor = 2;
    private String activeCategoryFilter = "";
    private String searchQuery = "";

    private final LatLng CENTER_EVENT = normToLatLng(0.50f, 0.48f);
    private final LatLng DEFAULT_USER_POS = normToLatLng(0.45f, 0.29f);
    private final double CORRIDOR_LNG = AREA_LNG_MIN + (0.55f * (AREA_LNG_MAX - AREA_LNG_MIN));
    private LatLng currentUserPos = DEFAULT_USER_POS;

    private final List<FasilitasItem> allFacilities = new ArrayList<>();
    private final Map<Marker, FasilitasItem> markerMap = new HashMap<>();
    private FasilitasItem selectedFacility;

    private LinearLayout topExploreContainer, navBannerContainer, floorSelectorContainer;
    private LinearLayout bottomNavContainer, facilityDetailCard, navActiveCard;
    private FrameLayout arrivalModalOverlay;
    private TextView tvIndoorBadge, btnLantai1, btnLantai2, btnLantai3;
    private TextView chipToilet, chipParkir, chipPanggung, chipKuliner;
    private TextView tvFacilityName, tvFacilitySubtitle, tvFacilityDistance, tvFacilityEstimate;
    private TextView tvNavDistanceStep, tvNavInstruction, tvNavRemainingTime, tvNavRemainingDistance, tvNavDestinationLabel;
    private TextView tvArrivalFacilityName;
    private EditText etSearchFasilitas;

    private final Handler walkHandler = new Handler(Looper.getMainLooper());
    private Runnable walkRunnable;
    private boolean isUsingRealGpsMovement = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.peta_dinamis);

        readIntentData();
        initViews();
        initDummyFacilities();
        setupListeners();

        SupportMapFragment mapFragment = (SupportMapFragment) getSupportFragmentManager()
                .findFragmentById(R.id.mapFragment);
        if (mapFragment != null) {
            mapFragment.getMapAsync(this);
        }
    }

    private void readIntentData() {
        if (getIntent() != null) {
            String mode = getIntent().getStringExtra("MODE_PETA");
            if (mode != null && !mode.isEmpty()) {
                modePeta = mode.toUpperCase();
            }
            String lokasi = getIntent().getStringExtra("NAMA_LOKASI");
            if (lokasi != null && !lokasi.isEmpty()) {
                namaLokasi = lokasi;
            }
            ArrayList<String> urls = getIntent().getStringArrayListExtra("URL_DENAH_LANTAI");
            if (urls != null && !urls.isEmpty()) {
                customFloorUrls = urls;
            }
        }
    }

    private void initViews() {
        topExploreContainer = findViewById(R.id.topExploreContainer);
        navBannerContainer = findViewById(R.id.navBannerContainer);
        floorSelectorContainer = findViewById(R.id.floorSelectorContainer);
        bottomNavContainer = findViewById(R.id.bottomNavContainer);
        facilityDetailCard = findViewById(R.id.facilityDetailCard);
        navActiveCard = findViewById(R.id.navActiveCard);
        arrivalModalOverlay = findViewById(R.id.arrivalModalOverlay);

        tvIndoorBadge = findViewById(R.id.tvIndoorBadge);
        btnLantai1 = findViewById(R.id.btnLantai1);
        btnLantai2 = findViewById(R.id.btnLantai2);
        btnLantai3 = findViewById(R.id.btnLantai3);

        chipToilet = findViewById(R.id.chipToilet);
        chipParkir = findViewById(R.id.chipParkir);
        chipPanggung = findViewById(R.id.chipPanggung);
        chipKuliner = findViewById(R.id.chipKuliner);

        tvFacilityName = findViewById(R.id.tvFacilityName);
        tvFacilitySubtitle = findViewById(R.id.tvFacilitySubtitle);
        tvFacilityDistance = findViewById(R.id.tvFacilityDistance);
        tvFacilityEstimate = findViewById(R.id.tvFacilityEstimate);

        tvNavDistanceStep = findViewById(R.id.tvNavDistanceStep);
        tvNavInstruction = findViewById(R.id.tvNavInstruction);
        tvNavRemainingTime = findViewById(R.id.tvNavRemainingTime);
        tvNavRemainingDistance = findViewById(R.id.tvNavRemainingDistance);
        tvNavDestinationLabel = findViewById(R.id.tvNavDestinationLabel);

        tvArrivalFacilityName = findViewById(R.id.tvArrivalFacilityName);
        etSearchFasilitas = findViewById(R.id.etSearchFasilitas);

        if ("INDOOR".equals(modePeta)) {
            tvIndoorBadge.setVisibility(View.VISIBLE);
            floorSelectorContainer.setVisibility(View.VISIBLE);
            updateFloorUI(currentFloor);
        } else {
            tvIndoorBadge.setVisibility(View.GONE);
            floorSelectorContainer.setVisibility(View.GONE);
        }

        switchUiState(UiState.JELAJAH);
    }

    private void initDummyFacilities() {
        allFacilities.clear();

        int purpleBadge = Color.parseColor("#9333EA"), purpleFill = Color.parseColor("#DFC4E8"), purpleStroke = Color.parseColor("#A855F7");
        int tealBadge   = Color.parseColor("#0D9488"), tealFill   = Color.parseColor("#BCE0E6"), tealStroke   = Color.parseColor("#0D9488");
        int beigeBadge  = Color.parseColor("#B45309"), beigeFill  = Color.parseColor("#E6D3B3"), beigeStroke  = Color.parseColor("#B45309");
        int greenBadge  = Color.parseColor("#16A34A"), greenFill  = Color.parseColor("#A3D9A5"), greenStroke  = Color.parseColor("#16A34A");
        int redBadge    = Color.parseColor("#DC2626"), redFill    = Color.parseColor("#E29B96"), redStroke    = Color.parseColor("#DC2626");
        int greyBadge   = Color.parseColor("#111827"), greyFill   = Color.parseColor("#9CA3AF"), greyStroke   = Color.parseColor("#4B5563");

        // === ZONA & MARKER MODE OUTDOOR (lantai = 0) ===
        allFacilities.add(new FasilitasItem("out_1", "Panggung Utama", "Area Festival Utara", "Panggung",
                "S", purpleBadge, purpleFill, purpleStroke,
                0.05f, 0.04f, 0.48f, 0.25f, 180, 3, 0));
        allFacilities.add(new FasilitasItem("out_2", "Toilet Umum", "Dekat Panggung", "Toilet",
                "T", tealBadge, tealFill, tealStroke,
                0.72f, 0.06f, 0.94f, 0.20f, 130, 2, 0));
        allFacilities.add(new FasilitasItem("out_3", "VIP & Lounge", "Sayap Timur Festival", "VIP",
                "V", beigeBadge, beigeFill, beigeStroke,
                0.62f, 0.24f, 0.94f, 0.44f, 110, 2, 0));
        allFacilities.add(new FasilitasItem("out_4", "Kuliner Makanan", "Zona Food Court Tengah", "Kuliner",
                "K", greenBadge, greenFill, greenStroke,
                0.05f, 0.33f, 0.46f, 0.58f, 95, 1, 0));
        allFacilities.add(new FasilitasItem("out_5", "Pusat Informasi", "Gerbang Masuk Utama", "Informasi",
                "I", redBadge, redFill, redStroke,
                0.05f, 0.61f, 0.38f, 0.78f, 60, 1, 0));
        allFacilities.add(new FasilitasItem("out_6", "Tempat Parkir", "Area Parkir Selatan", "Parkir",
                "P", greyBadge, greyFill, greyStroke,
                0.74f, 0.62f, 0.94f, 0.75f, 210, 3, 0));

        // === ZONA & MARKER MODE INDOOR Lantai 2 ===
        allFacilities.add(new FasilitasItem("in2_1", "Hall Utama", "Sisi Barat Lantai 2", "Panggung",
                "S", purpleBadge, purpleFill, purpleStroke,
                0.05f, 0.04f, 0.48f, 0.25f, 45, 1, 2));
        allFacilities.add(new FasilitasItem("in2_2", "Toilet", "Dekat Panggung", "Toilet",
                "T", tealBadge, tealFill, tealStroke,
                0.72f, 0.06f, 0.94f, 0.20f, 80, 1, 2));
        allFacilities.add(new FasilitasItem("in2_3", "VIP Room", "Sayap Timur Lantai 2", "VIP",
                "V", beigeBadge, beigeFill, beigeStroke,
                0.62f, 0.24f, 0.94f, 0.44f, 65, 1, 2));
        allFacilities.add(new FasilitasItem("in2_4", "Bazar dan Pameran", "Area Tengah Lantai 2", "Kuliner",
                "B", greenBadge, greenFill, greenStroke,
                0.05f, 0.33f, 0.46f, 0.58f, 50, 1, 2));
        allFacilities.add(new FasilitasItem("in2_5", "Registrasi", "Pintu Masuk Lantai 2", "Informasi",
                "R", redBadge, redFill, redStroke,
                0.05f, 0.61f, 0.38f, 0.78f, 30, 1, 2));
        allFacilities.add(new FasilitasItem("in2_6", "Lift", "Akses Lantai 1–3", "Parkir",
                "L", greyBadge, greyFill, greyStroke,
                0.74f, 0.62f, 0.94f, 0.75f, 40, 1, 2));

        // === ZONA & MARKER MODE INDOOR Lantai 1 ===
        allFacilities.add(new FasilitasItem("in1_1", "Kafe & Tenant", "Area Barat Lantai 1", "Kuliner",
                "K", beigeBadge, beigeFill, beigeStroke,
                0.05f, 0.06f, 0.48f, 0.34f, 40, 1, 1));
        allFacilities.add(new FasilitasItem("in1_2", "Toilet Lantai 1", "Koridor Timur Lantai 1", "Toilet",
                "T", tealBadge, tealFill, tealStroke,
                0.72f, 0.06f, 0.94f, 0.22f, 55, 1, 1));
        allFacilities.add(new FasilitasItem("in1_3", "Lobi Utama & Info", "Pintu Masuk Lantai 1", "Informasi",
                "I", purpleBadge, purpleFill, purpleStroke,
                0.05f, 0.50f, 0.52f, 0.78f, 25, 1, 1));

        // === ZONA & MARKER MODE INDOOR Lantai 3 ===
        allFacilities.add(new FasilitasItem("in3_1", "Auditorium Utama", "Aula Atas Lantai 3", "Panggung",
                "S", purpleBadge, purpleFill, purpleStroke,
                0.05f, 0.06f, 0.52f, 0.40f, 90, 2, 3));
        allFacilities.add(new FasilitasItem("in3_2", "Toilet Lantai 3", "Koridor Utara Lantai 3", "Toilet",
                "T", tealBadge, tealFill, tealStroke,
                0.72f, 0.06f, 0.94f, 0.22f, 105, 2, 3));
    }

    private void setupListeners() {
        btnLantai1.setOnClickListener(v -> changeFloor(1));
        btnLantai2.setOnClickListener(v -> changeFloor(2));
        btnLantai3.setOnClickListener(v -> changeFloor(3));

        chipToilet.setOnClickListener(v -> toggleCategoryFilter("Toilet"));
        chipParkir.setOnClickListener(v -> toggleCategoryFilter("Parkir"));
        chipPanggung.setOnClickListener(v -> toggleCategoryFilter("Panggung"));
        chipKuliner.setOnClickListener(v -> toggleCategoryFilter("Kuliner"));

        etSearchFasilitas.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                searchQuery = s.toString().trim().toLowerCase();
                renderZonesAndMarkers();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        AppCompatButton btnMulaiNavigasi = findViewById(R.id.btnMulaiNavigasi);
        btnMulaiNavigasi.setOnClickListener(v -> {
            if (selectedFacility != null) {
                startNavigationTo(selectedFacility);
            }
        });

        AppCompatButton btnBerhentiNavigasi = findViewById(R.id.btnBerhentiNavigasi);
        btnBerhentiNavigasi.setOnClickListener(v -> stopNavigation());

        navBannerContainer.setOnClickListener(v -> triggerArrivalState());

        AppCompatButton btnSelesaiNavigasi = findViewById(R.id.btnSelesaiNavigasi);
        btnSelesaiNavigasi.setOnClickListener(v -> {
            stopWalkAnimation();
            finish();
        });

        // Navigasi Bottom Navbar (Event, Direktori -> PetaStatis, Profil)
        View tabEvent = findNavTab("navTabEvent");
        if (tabEvent != null) {
            tabEvent.setOnClickListener(v -> {
                Intent intent = new Intent(this, Event.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(intent);
                finish();
            });
        }

        View tabDirektori = findNavTab("navTabDirektori", "navTabDirectory");
        if (tabDirektori != null) {
            tabDirektori.setOnClickListener(v -> {
                startActivity(new Intent(this, PetaStatis.class));
                finish();
            });
        }

        View tabProfil = findNavTab("navTabProfil", "navTabProfile");
        if (tabProfil != null) {
            tabProfil.setOnClickListener(v -> {
                startActivity(new Intent(this, Profil.class));
                finish();
            });
        }
    }

    private View findNavTab(String... possibleIds) {
        for (String idName : possibleIds) {
            int resId = getResources().getIdentifier(idName, "id", getPackageName());
            if (resId != 0) {
                View v = findViewById(resId);
                if (v != null) return v;
            }
        }
        return null;
    }

    @Override
    public void onMapReady(@NonNull GoogleMap googleMap) {
        mMap = googleMap;

        try {
            mMap.setMapStyle(MapStyleOptions.loadRawResourceStyle(this, R.raw.map_style_gray));
        } catch (Exception e) {
            e.printStackTrace();
        }

        mMap.getUiSettings().setMapToolbarEnabled(false);
        mMap.getUiSettings().setCompassEnabled(false);
        mMap.getUiSettings().setZoomControlsEnabled(true);
        mMap.getUiSettings().setZoomGesturesEnabled(true);
        mMap.getUiSettings().setScrollGesturesEnabled(true);

        int bottomPadding = (int) (90 * getResources().getDisplayMetrics().density);
        mMap.setPadding(0, 0, 0, bottomPadding);

        enableMyLocationIfPermitted();

        mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(CENTER_EVENT, 17.6f));

        renderZonesAndMarkers();

        mMap.setOnMarkerClickListener(marker -> {
            FasilitasItem item = markerMap.get(marker);
            if (item != null) {
                selectedFacility = item;
                showFacilityDetail(item);
                mMap.animateCamera(CameraUpdateFactory.newLatLng(item.posisi));
                return true;
            }
            return false;
        });

        mMap.setOnMapClickListener(latLng -> {
            FasilitasItem clickedZone = findFacilityAtLatLng(latLng);
            if (clickedZone != null) {
                selectedFacility = clickedZone;
                showFacilityDetail(clickedZone);
                mMap.animateCamera(CameraUpdateFactory.newLatLng(clickedZone.posisi));
            } else if (facilityDetailCard.getVisibility() == View.VISIBLE) {
                selectedFacility = null;
                switchUiState(UiState.JELAJAH);
            }
        });
    }

    private FasilitasItem findFacilityAtLatLng(LatLng point) {
        if (point.latitude < AREA_LAT_MIN || point.latitude > AREA_LAT_MAX
                || point.longitude < AREA_LNG_MIN || point.longitude > AREA_LNG_MAX) {
            return null;
        }
        float nx = (float) ((point.longitude - AREA_LNG_MIN) / (AREA_LNG_MAX - AREA_LNG_MIN));
        float ny = (float) ((AREA_LAT_MAX - point.latitude) / (AREA_LAT_MAX - AREA_LAT_MIN));

        int targetLantai = "INDOOR".equals(modePeta) ? currentFloor : 0;
        for (FasilitasItem item : allFacilities) {
            if (item.lantai != targetLantai) continue;
            if (nx >= item.normLeft && nx <= item.normRight && ny >= item.normTop && ny <= item.normBottom) {
                return item;
            }
        }
        return null;
    }

    private void enableMyLocationIfPermitted() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED) {
            mMap.setMyLocationEnabled(true);
            startRealtimeGpsTracking();
        } else {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                    REQ_LOCATION_PERMISSION
            );
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION_PERMISSION
                && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED
                && mMap != null) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
                mMap.setMyLocationEnabled(true);
                startRealtimeGpsTracking();
            }
        }
    }

    private void startRealtimeGpsTracking() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        if (locationManager == null) {
            locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        }

        if (locationListener != null) {
            locationManager.removeUpdates(locationListener);
        }

        locationListener = location -> {
            LatLng newPos = new LatLng(location.getLatitude(), location.getLongitude());

            float[] distToEvent = new float[1];
            Location.distanceBetween(newPos.latitude, newPos.longitude,
                    CENTER_EVENT.latitude, CENTER_EVENT.longitude, distToEvent);
            if (distToEvent[0] > 5000) {
                return;
            }

            isUsingRealGpsMovement = true;
            stopWalkAnimation();
            currentUserPos = newPos;

            if (userMarker != null) {
                userMarker.setPosition(currentUserPos);
            }

            if (selectedFacility != null && navActiveCard.getVisibility() == View.VISIBLE) {
                updateRealtimeNavigation(currentUserPos, selectedFacility);
            }
        };

        if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 1f, locationListener);
        }
        if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 1500, 1f, locationListener);
        }
    }

    private List<LatLng> buildCorridorRoutePoints(LatLng start, LatLng end) {
        LatLng enterCorridor = new LatLng(start.latitude, CORRIDOR_LNG);
        LatLng exitCorridor = new LatLng(end.latitude, CORRIDOR_LNG);
        return Arrays.asList(start, enterCorridor, exitCorridor, end);
    }

    private void updateRealtimeNavigation(LatLng userPos, FasilitasItem target) {
        if (activeRoutePolyline != null) {
            activeRoutePolyline.setPoints(buildCorridorRoutePoints(userPos, target.posisi));
        }

        float[] results = new float[1];
        Location.distanceBetween(userPos.latitude, userPos.longitude,
                target.posisi.latitude, target.posisi.longitude, results);

        int sisaMeter = Math.round(results[0]);
        int sisaMenit = Math.max(1, (int) Math.ceil(sisaMeter / 60.0));

        tvNavRemainingDistance.setText(sisaMeter + " m");
        tvNavRemainingTime.setText(sisaMenit + " menit");
        tvNavDistanceStep.setText(("INDOOR".equals(modePeta) ? 10 : sisaMeter) + " m");

        if (sisaMeter <= 5) {
            triggerArrivalState();
        }
    }

    private void startSimulatedWalkAlongRoute(FasilitasItem target) {
        stopWalkAnimation();

        final List<LatLng> waypoints = buildCorridorRoutePoints(currentUserPos, target.posisi);
        if (waypoints.size() < 2) return;

        final int segCount = waypoints.size() - 1;
        final float[] segDistances = new float[segCount];
        float totalDistTemp = 0f;

        for (int i = 0; i < segCount; i++) {
            float[] res = new float[1];
            Location.distanceBetween(
                    waypoints.get(i).latitude, waypoints.get(i).longitude,
                    waypoints.get(i + 1).latitude, waypoints.get(i + 1).longitude,
                    res
            );
            segDistances[i] = Math.max(res[0], 0.5f);
            totalDistTemp += segDistances[i];
        }

        final float totalDistance = totalDistTemp;
        final float stepMetersPerTick = Math.max(totalDistance / 110f, 0.4f);
        final float[] traveled = {0f};

        walkRunnable = new Runnable() {
            @Override
            public void run() {
                if (selectedFacility == null || navActiveCard.getVisibility() != View.VISIBLE) {
                    return;
                }

                traveled[0] += stepMetersPerTick;

                if (traveled[0] >= totalDistance) {
                    currentUserPos = target.posisi;
                    if (userMarker != null) {
                        userMarker.setPosition(currentUserPos);
                    }
                    if (activeRoutePolyline != null) {
                        activeRoutePolyline.setPoints(Arrays.asList(currentUserPos, target.posisi));
                    }
                    tvNavRemainingDistance.setText("0 m");
                    tvNavRemainingTime.setText("0 menit");
                    triggerArrivalState();
                    return;
                }

                float acc = 0f;
                int segIndex = 0;
                for (int i = 0; i < segCount; i++) {
                    if (traveled[0] <= acc + segDistances[i]) {
                        segIndex = i;
                        break;
                    }
                    acc += segDistances[i];
                }

                float fraction = (traveled[0] - acc) / segDistances[segIndex];
                fraction = Math.max(0f, Math.min(1f, fraction));

                LatLng pStart = waypoints.get(segIndex);
                LatLng pEnd = waypoints.get(segIndex + 1);

                double lat = pStart.latitude + (pEnd.latitude - pStart.latitude) * fraction;
                double lng = pStart.longitude + (pEnd.longitude - pStart.longitude) * fraction;
                currentUserPos = new LatLng(lat, lng);

                if (userMarker != null) {
                    userMarker.setPosition(currentUserPos);
                }

                List<LatLng> remainingPoints = new ArrayList<>();
                remainingPoints.add(currentUserPos);
                for (int j = segIndex + 1; j < waypoints.size(); j++) {
                    remainingPoints.add(waypoints.get(j));
                }
                if (activeRoutePolyline != null) {
                    activeRoutePolyline.setPoints(remainingPoints);
                }

                int sisaMeter = Math.max(1, Math.round(totalDistance - traveled[0]));
                int sisaMenit = Math.max(1, (int) Math.ceil(sisaMeter / 60.0));
                tvNavRemainingDistance.setText(sisaMeter + " m");
                tvNavRemainingTime.setText(sisaMenit + " menit");

                if (segIndex == 0) {
                    tvNavInstruction.setText("Lurus keluar menuju koridor");
                } else if (segIndex == 1) {
                    tvNavInstruction.setText("Ikuti koridor menuju " + target.nama);
                } else {
                    tvNavInstruction.setText("Belok masuk ke " + target.nama);
                }

                walkHandler.postDelayed(this, 60);
            }
        };

        walkHandler.postDelayed(walkRunnable, 300);
    }

    private void stopWalkAnimation() {
        if (walkRunnable != null) {
            walkHandler.removeCallbacks(walkRunnable);
            walkRunnable = null;
        }
    }

    private void changeFloor(int floor) {
        if (currentFloor == floor) return;
        currentFloor = floor;
        updateFloorUI(floor);
        renderZonesAndMarkers();

        if (facilityDetailCard.getVisibility() == View.VISIBLE) {
            selectedFacility = null;
            switchUiState(UiState.JELAJAH);
        }
    }

    private void updateFloorUI(int activeFloor) {
        tvIndoorBadge.setText("Event Indoor  •  " + namaLokasi + "  •  Lantai " + activeFloor);
        styleFloorButton(btnLantai1, activeFloor == 1);
        styleFloorButton(btnLantai2, activeFloor == 2);
        styleFloorButton(btnLantai3, activeFloor == 3);
    }

    private void styleFloorButton(TextView btn, boolean isActive) {
        if (isActive) {
            btn.setBackgroundResource(R.drawable.bg_pill_indigo);
            btn.setTextColor(Color.WHITE);
        } else {
            btn.setBackgroundColor(Color.TRANSPARENT);
            btn.setTextColor(Color.parseColor("#374151"));
        }
    }

    private void renderZonesAndMarkers() {
        if (mMap == null) return;

        int targetLantai = "INDOOR".equals(modePeta) ? currentFloor : 0;
        LatLngBounds venueBounds = new LatLngBounds(
                new LatLng(AREA_LAT_MIN, AREA_LNG_MIN),
                new LatLng(AREA_LAT_MAX, AREA_LNG_MAX)
        );

        // Langsung tampilkan denah vektor & marker agar tidak pernah kosong
        applyZoneGroundOverlay(buildZoneMapBitmap(targetLantai), venueBounds);
        drawMarkersOnly(targetLantai);

        // Jika ada URL denah asli dari Cloudinary, timpa overlay setelah berhasil dimuat
        if ("INDOOR".equals(modePeta) && customFloorUrls.size() >= targetLantai && targetLantai > 0) {
            String url = customFloorUrls.get(targetLantai - 1);
            if (url != null && !url.contains("res.cloudinary.com/demo")) {
                Glide.with(this).asBitmap().load(url).into(new CustomTarget<Bitmap>() {
                    @Override
                    public void onResourceReady(@NonNull Bitmap resource, @Nullable Transition<? super Bitmap> transition) {
                        applyZoneGroundOverlay(resource, venueBounds);
                    }

                    @Override
                    public void onLoadCleared(@Nullable Drawable placeholder) {}
                });
            }
        }
    }

    private void applyZoneGroundOverlay(Bitmap bitmap, LatLngBounds bounds) {
        if (mMap == null) return;
        if (zoneOverlay != null) {
            zoneOverlay.remove();
        }
        zoneOverlay = mMap.addGroundOverlay(
                new GroundOverlayOptions()
                        .image(BitmapDescriptorFactory.fromBitmap(bitmap))
                        .positionFromBounds(bounds)
                        .zIndex(0f)
        );
    }

    private void drawMarkersOnly(int targetLantai) {
        if (mMap == null) return;

        for (Marker m : markerMap.keySet()) {
            m.remove();
        }
        markerMap.clear();

        if (userMarker != null) {
            userMarker.remove();
        }
        userMarker = mMap.addMarker(new MarkerOptions()
                .position(currentUserPos)
                .title("Posisi Anda")
                .anchor(0.5f, 0.5f)
                .zIndex(20f)
                .icon(createUserDotIcon()));

        for (FasilitasItem item : allFacilities) {
            if (item.lantai != targetLantai) continue;

            if (!activeCategoryFilter.isEmpty() && !item.kategori.equalsIgnoreCase(activeCategoryFilter)) {
                continue;
            }

            if (!searchQuery.isEmpty() && !item.nama.toLowerCase().contains(searchQuery)) {
                continue;
            }

            Marker marker = mMap.addMarker(new MarkerOptions()
                    .position(item.posisi)
                    .title(item.nama)
                    .snippet(item.subtitle)
                    .anchor(0.5f, 0.5f)
                    .zIndex(10f)
                    .icon(createNormalCircleMarker(item.kodeHuruf, item.badgeColor)));

            if (marker != null) {
                markerMap.put(marker, item);
            }
        }
    }

    private Bitmap buildZoneMapBitmap(int targetLantai) {
        int w = 900, h = 1300;
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);

        RectF outerRect = new RectF(10f, 10f, w - 10f, h - 10f);
        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setColor(Color.parseColor("#F5F5F4"));
        c.drawRoundRect(outerRect, 26f, 26f, bg);

        Paint border = new Paint(Paint.ANTI_ALIAS_FLAG);
        border.setColor(Color.parseColor("#A8A29E"));
        border.setStyle(Paint.Style.STROKE);
        border.setStrokeWidth(5f);
        c.drawRoundRect(outerRect, 26f, 26f, border);

        for (FasilitasItem item : allFacilities) {
            if (item.lantai != targetLantai) continue;

            boolean isHighlighted = (activeCategoryFilter.isEmpty() || item.kategori.equalsIgnoreCase(activeCategoryFilter))
                    && (searchQuery.isEmpty() || item.nama.toLowerCase().contains(searchQuery));

            drawZoneBox(
                    c,
                    item.normLeft * w,
                    item.normTop * h,
                    item.normRight * w,
                    item.normBottom * h,
                    item.zoneFillColor,
                    item.zoneStrokeColor,
                    item.nama,
                    isHighlighted
            );
        }

        String bottomZoneTitle = "INDOOR".equals(modePeta) ? "Lobi" : "Area Festival";
        drawZoneBox(
                c,
                0.05f * w, 0.82f * h, 0.94f * w, 0.96f * h,
                Color.parseColor("#DFC4E8"),
                Color.parseColor("#A855F7"),
                bottomZoneTitle,
                true
        );

        return bmp;
    }

    private void drawZoneBox(Canvas c, float left, float top, float right, float bottom,
                             int fillColor, int strokeColor, String title, boolean highlighted) {
        RectF rect = new RectF(left, top, right, bottom);

        Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        fill.setColor(fillColor);
        fill.setAlpha(highlighted ? 255 : 95);
        fill.setStyle(Paint.Style.FILL);
        c.drawRoundRect(rect, 24f, 24f, fill);

        Paint stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        stroke.setColor(strokeColor);
        stroke.setAlpha(highlighted ? 255 : 110);
        stroke.setStyle(Paint.Style.STROKE);
        stroke.setStrokeWidth(4f);
        c.drawRoundRect(rect, 24f, 24f, stroke);

        Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);
        text.setColor(Color.parseColor("#1F2937"));
        text.setAlpha(highlighted ? 255 : 130);
        text.setTextSize(30f);
        text.setTypeface(Typeface.DEFAULT_BOLD);
        c.drawText(title, left + 20f, top + 42f, text);
    }

    private BitmapDescriptor createNormalCircleMarker(String letter, int bgColor) {
        float density = getResources().getDisplayMetrics().density;
        int size = Math.round(24f * density);
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        float cx = size / 2f;
        float cy = size / 2f;

        Paint shadowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        shadowPaint.setColor(Color.parseColor("#26000000"));
        canvas.drawCircle(cx, cy + (1f * density), (size / 2f) - (1.2f * density), shadowPaint);

        Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        borderPaint.setColor(Color.WHITE);
        canvas.drawCircle(cx, cy, (size / 2f) - (1.8f * density), borderPaint);

        Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        fillPaint.setColor(bgColor);
        canvas.drawCircle(cx, cy, (size / 2f) - (3.5f * density), fillPaint);

        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setColor(Color.WHITE);
        textPaint.setTextSize(10f * density);
        textPaint.setTypeface(Typeface.DEFAULT_BOLD);
        textPaint.setTextAlign(Paint.Align.CENTER);

        float textY = cy - ((textPaint.descent() + textPaint.ascent()) / 2f);
        canvas.drawText(letter, cx, textY, textPaint);

        return BitmapDescriptorFactory.fromBitmap(bitmap);
    }

    private BitmapDescriptor createUserDotIcon() {
        float density = getResources().getDisplayMetrics().density;
        int size = Math.round(24f * density);
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        float cx = size / 2f;
        float cy = size / 2f;

        Paint haloPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        haloPaint.setColor(Color.parseColor("#9967E8F9"));
        canvas.drawCircle(cx, cy, (size / 2f) - (1.5f * density), haloPaint);

        Paint corePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        corePaint.setColor(Color.parseColor("#1E3A8A"));
        canvas.drawCircle(cx, cy, 4f * density, corePaint);

        return BitmapDescriptorFactory.fromBitmap(bitmap);
    }

    private void toggleCategoryFilter(String category) {
        if (activeCategoryFilter.equalsIgnoreCase(category)) {
            activeCategoryFilter = "";
        } else {
            activeCategoryFilter = category;
        }

        updateChipStyle(chipToilet, "Toilet".equalsIgnoreCase(activeCategoryFilter));
        updateChipStyle(chipParkir, "Parkir".equalsIgnoreCase(activeCategoryFilter));
        updateChipStyle(chipPanggung, "Panggung".equalsIgnoreCase(activeCategoryFilter));
        updateChipStyle(chipKuliner, "Kuliner".equalsIgnoreCase(activeCategoryFilter));

        renderZonesAndMarkers();
    }

    private void updateChipStyle(TextView chip, boolean active) {
        if (active) {
            chip.setBackgroundResource(R.drawable.bg_pill_indigo);
            chip.setTextColor(Color.WHITE);
        } else {
            chip.setBackgroundResource(R.drawable.bg_card_rounded);
            chip.setTextColor(Color.parseColor("#111827"));
        }
    }

    private void showFacilityDetail(FasilitasItem item) {
        float[] results = new float[1];
        Location.distanceBetween(currentUserPos.latitude, currentUserPos.longitude,
                item.posisi.latitude, item.posisi.longitude, results);
        int jarakAktual = Math.round(results[0]);
        int estimasiAktual = Math.max(1, (int) Math.ceil(jarakAktual / 60.0));

        tvFacilityName.setText(item.nama);
        tvFacilitySubtitle.setText(item.subtitle);
        tvFacilityDistance.setText(jarakAktual + " M");
        tvFacilityEstimate.setText("± " + estimasiAktual + " menit jalan kaki dari posisi anda");

        switchUiState(UiState.FASILITAS_DIPILIH);
    }

    private void startNavigationTo(FasilitasItem target) {
        if (mMap == null) return;

        if (activeRoutePolyline != null) {
            activeRoutePolyline.remove();
        }

        activeRoutePolyline = mMap.addPolyline(new PolylineOptions()
                .addAll(buildCorridorRoutePoints(currentUserPos, target.posisi))
                .width(8f)
                .color(Color.parseColor("#3730A3"))
                .zIndex(15f)
                .geodesic(false));

        tvNavInstruction.setText("Belok kanan di persimpangan");
        tvNavDestinationLabel.setText("Menuju " + target.nama);

        switchUiState(UiState.NAVIGASI);
        updateRealtimeNavigation(currentUserPos, target);

        if (!isUsingRealGpsMovement) {
            startSimulatedWalkAlongRoute(target);
        }
    }

    private void stopNavigation() {
        stopWalkAnimation();
        if (activeRoutePolyline != null) {
            activeRoutePolyline.remove();
            activeRoutePolyline = null;
        }
        if (!isUsingRealGpsMovement) {
            currentUserPos = DEFAULT_USER_POS;
            if (userMarker != null) {
                userMarker.setPosition(currentUserPos);
            }
        }
        selectedFacility = null;
        switchUiState(UiState.JELAJAH);
    }

    private void triggerArrivalState() {
        stopWalkAnimation();
        if (selectedFacility != null) {
            tvArrivalFacilityName.setText(selectedFacility.nama);
        }
        switchUiState(UiState.TIBA);
    }

    private void switchUiState(UiState state) {
        switch (state) {
            case JELAJAH:
                topExploreContainer.setVisibility(View.VISIBLE);
                navBannerContainer.setVisibility(View.GONE);
                bottomNavContainer.setVisibility(View.VISIBLE);
                facilityDetailCard.setVisibility(View.GONE);
                navActiveCard.setVisibility(View.GONE);
                arrivalModalOverlay.setVisibility(View.GONE);
                break;

            case FASILITAS_DIPILIH:
                topExploreContainer.setVisibility(View.VISIBLE);
                navBannerContainer.setVisibility(View.GONE);
                bottomNavContainer.setVisibility(View.GONE);
                facilityDetailCard.setVisibility(View.VISIBLE);
                navActiveCard.setVisibility(View.GONE);
                arrivalModalOverlay.setVisibility(View.GONE);
                break;

            case NAVIGASI:
                topExploreContainer.setVisibility(View.GONE);
                navBannerContainer.setVisibility(View.VISIBLE);
                bottomNavContainer.setVisibility(View.GONE);
                facilityDetailCard.setVisibility(View.GONE);
                navActiveCard.setVisibility(View.VISIBLE);
                arrivalModalOverlay.setVisibility(View.GONE);
                break;

            case TIBA:
                arrivalModalOverlay.setVisibility(View.VISIBLE);
                break;
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopWalkAnimation();
        if (locationManager != null && locationListener != null) {
            locationManager.removeUpdates(locationListener);
        }
    }
}