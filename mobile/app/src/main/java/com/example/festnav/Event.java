package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;

import com.example.festnav.api.ApiClient;
import com.example.festnav.api.ApiService;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Event extends AppCompatActivity {

    private static final String KAT_SEMUA = "semua";
    private static final String KAT_MUSIK = "musik";
    private static final String KAT_MARATON = "maraton";
    private static final String KAT_LAINNYA = "lainnya";

    private TextView tvHaloUser, tvPesanKosongDetail;
    private EditText etSearchEventPage;
    private Button btnCatSemua, btnCatMusik, btnCatMaraton, btnCatLainnya, btnResetPencarian;
    private LinearLayout layoutDaftarEvent, layoutStateKosong;
    private TextView navEvent, navPeta, navFavorit, navProfil;

    private String kategoriAktif = KAT_SEMUA;
    private final List<EventResponse> semuaEvent = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_event);

        tvHaloUser = findViewById(R.id.tvHaloUser);
        tvPesanKosongDetail = findViewById(R.id.tvPesanKosongDetail);
        etSearchEventPage = findViewById(R.id.etSearchEventPage);
        btnCatSemua = findViewById(R.id.btnCatSemua);
        btnCatMusik = findViewById(R.id.btnCatMusik);
        btnCatMaraton = findViewById(R.id.btnCatMaraton);
        btnCatLainnya = findViewById(R.id.btnCatLainnya);
        btnResetPencarian = findViewById(R.id.btnResetPencarian);
        layoutDaftarEvent = findViewById(R.id.layoutDaftarEvent);
        layoutStateKosong = findViewById(R.id.layoutStateKosong);

        navEvent = findViewById(R.id.navEvent);
        navPeta = findViewById(R.id.navPeta);
        navFavorit = findViewById(R.id.navFavorit);
        navProfil = findViewById(R.id.navProfil);

        tampilkanSapaanUser();
        setupKategori();
        setupPencarian();
        setupNavigasiBawah();

        String queryAwal = getIntent().getStringExtra(Dashboard.EXTRA_SEARCH_QUERY);
        if (!TextUtils.isEmpty(queryAwal)) {
            etSearchEventPage.setText(queryAwal);
        }

        muatDaftarEvent();
    }

    private void tampilkanSapaanUser() {
        SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
        String nama = prefs.getString("nama", "");
        String username = prefs.getString("username", "");

        if (!TextUtils.isEmpty(nama)) {
            tvHaloUser.setText("Halo, " + nama);
        } else if (!TextUtils.isEmpty(username)) {
            tvHaloUser.setText("Halo, @" + username);
        } else {
            tvHaloUser.setText("Halo, Pengunjung");
        }
    }

    private void setupKategori() {
        updateTampilanTombolKategori();

        btnCatSemua.setOnClickListener(v -> pilihKategori(KAT_SEMUA));
        btnCatMusik.setOnClickListener(v -> pilihKategori(KAT_MUSIK));
        btnCatMaraton.setOnClickListener(v -> pilihKategori(KAT_MARATON));
        btnCatLainnya.setOnClickListener(v -> pilihKategori(KAT_LAINNYA));

        btnResetPencarian.setOnClickListener(v -> {
            etSearchEventPage.setText("");
            kategoriAktif = KAT_SEMUA;
            updateTampilanTombolKategori();
            terapkanFilterLokal();
            muatDaftarEvent();
        });
    }

    private void pilihKategori(String kategori) {
        kategoriAktif = kategori;
        updateTampilanTombolKategori();
        terapkanFilterLokal();
    }

    private void updateTampilanTombolKategori() {
        aturStyleTombol(btnCatSemua, KAT_SEMUA.equals(kategoriAktif));
        aturStyleTombol(btnCatMusik, KAT_MUSIK.equals(kategoriAktif));
        aturStyleTombol(btnCatMaraton, KAT_MARATON.equals(kategoriAktif));
        aturStyleTombol(btnCatLainnya, KAT_LAINNYA.equals(kategoriAktif));
    }

    private void aturStyleTombol(Button tombol, boolean aktif) {
        if (aktif) {
            tombol.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor("#7C3AED")));
            tombol.setTextColor(Color.WHITE);
        } else {
            tombol.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor("#F3F4F6")));
            tombol.setTextColor(Color.parseColor("#4B5563"));
        }
    }

    private void setupPencarian() {
        etSearchEventPage.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                terapkanFilterLokal();
            }

            @Override
            public void afterTextChanged(Editable s) {
            }
        });

        etSearchEventPage.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH || actionId == EditorInfo.IME_ACTION_DONE) {
                muatDaftarEvent();
                return true;
            }
            return false;
        });
    }

    private void muatDaftarEvent() {
        String kataKunci = etSearchEventPage.getText() != null
                ? etSearchEventPage.getText().toString().trim()
                : "";
        String searchParam = TextUtils.isEmpty(kataKunci) ? null : kataKunci;

        ApiService apiService = ApiClient.getClient().create(ApiService.class);
        apiService.getEvents(searchParam, null).enqueue(new Callback<List<EventResponse>>() {
            @Override
            public void onResponse(
                    @NonNull Call<List<EventResponse>> call,
                    @NonNull Response<List<EventResponse>> response
            ) {
                if (response.isSuccessful() && response.body() != null) {
                    semuaEvent.clear();
                    semuaEvent.addAll(response.body());
                    terapkanFilterLokal();
                } else {
                    Toast.makeText(
                            Event.this,
                            "Gagal memuat event (Kode: " + response.code() + ")",
                            Toast.LENGTH_SHORT
                    ).show();
                    terapkanFilterLokal();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<EventResponse>> call, @NonNull Throwable t) {
                Toast.makeText(
                        Event.this,
                        "Koneksi gagal: " + t.getMessage(),
                        Toast.LENGTH_SHORT
                ).show();
                terapkanFilterLokal();
            }
        });
    }

    private void terapkanFilterLokal() {
        String query = etSearchEventPage.getText() != null
                ? etSearchEventPage.getText().toString().trim().toLowerCase()
                : "";

        List<EventResponse> hasil = new ArrayList<>();
        for (EventResponse ev : semuaEvent) {
            if (!cocokKategori(ev, kategoriAktif)) {
                continue;
            }
            if (!TextUtils.isEmpty(query)) {
                String nama = ev.getNama_event() != null ? ev.getNama_event().toLowerCase() : "";
                String lokasi = ev.getLokasi() != null ? ev.getLokasi().toLowerCase() : "";
                String jenis = ev.getJenis_event() != null ? ev.getJenis_event().toLowerCase() : "";
                if (!nama.contains(query) && !lokasi.contains(query) && !jenis.contains(query)) {
                    continue;
                }
            }
            hasil.add(ev);
        }

        tampilkanHasil(hasil);
    }

    private boolean cocokKategori(EventResponse ev, String kategori) {
        if (KAT_SEMUA.equals(kategori)) {
            return true;
        }
        String jenis = ev.getJenis_event() != null ? ev.getJenis_event().trim().toLowerCase() : "";
        if (KAT_MUSIK.equals(kategori)) {
            return jenis.contains("musik");
        }
        if (KAT_MARATON.equals(kategori)) {
            return jenis.contains("maraton") || jenis.contains("marathon") || jenis.contains("lari");
        }
        if (KAT_LAINNYA.equals(kategori)) {
            return !jenis.contains("musik") && !jenis.contains("maraton") && !jenis.contains("marathon");
        }
        return true;
    }

    private void tampilkanHasil(List<EventResponse> items) {
        layoutDaftarEvent.removeAllViews();

        if (items.isEmpty()) {
            layoutDaftarEvent.setVisibility(View.GONE);
            layoutStateKosong.setVisibility(View.VISIBLE);
            tvPesanKosongDetail.setText("Tidak ada hasil untuk pencarian ini. Coba kata kunci lain atau ubah filter.");
            return;
        }

        layoutStateKosong.setVisibility(View.GONE);
        layoutDaftarEvent.setVisibility(View.VISIBLE);

        for (EventResponse ev : items) {
            layoutDaftarEvent.addView(buatCardEvent(ev));
        }
    }

    private CardView buatCardEvent(EventResponse ev) {
        int pad16 = dpToPx(16);
        int pad12 = dpToPx(12);
        int marginBawah = dpToPx(16);
        int ukuranLogo = dpToPx(70);

        CardView card = new CardView(this);
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        cardParams.setMargins(0, 0, 0, marginBawah);
        card.setLayoutParams(cardParams);
        card.setRadius(dpToPx(16));
        card.setCardElevation(dpToPx(2));
        card.setCardBackgroundColor(Color.WHITE);

        LinearLayout row = new LinearLayout(this);
        row.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(pad16, pad16, pad16, pad16);
        row.setGravity(Gravity.CENTER_VERTICAL);

        ImageView imgLogo = new ImageView(this);
        LinearLayout.LayoutParams imgParams = new LinearLayout.LayoutParams(ukuranLogo, ukuranLogo);
        imgParams.setMarginEnd(dpToPx(14));
        imgLogo.setLayoutParams(imgParams);
        imgLogo.setBackgroundColor(Color.parseColor("#EEF2FF"));
        imgLogo.setPadding(pad12, pad12, pad12, pad12);
        imgLogo.setImageResource(android.R.drawable.ic_menu_agenda);
        imgLogo.setScaleType(ImageView.ScaleType.CENTER_INSIDE);

        LinearLayout infoCol = new LinearLayout(this);
        infoCol.setLayoutParams(new LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
        ));
        infoCol.setOrientation(LinearLayout.VERTICAL);

        String mode = !TextUtils.isEmpty(ev.getMode_event()) ? ev.getMode_event() : "interaktif";
        TextView tvBadge = new TextView(this);
        tvBadge.setText("  " + mode.substring(0, 1).toUpperCase() + mode.substring(1) + "  ");
        tvBadge.setTextSize(10f);
        tvBadge.setTypeface(null, Typeface.BOLD);
        tvBadge.setTextColor(Color.WHITE);
        tvBadge.setBackgroundColor(Color.parseColor("direktori".equalsIgnoreCase(mode) ? "#EC4899" : "#0066FF"));
        tvBadge.setPadding(dpToPx(4), dpToPx(3), dpToPx(4), dpToPx(3));
        LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        badgeParams.setMargins(0, 0, 0, dpToPx(6));
        tvBadge.setLayoutParams(badgeParams);

        TextView tvNama = new TextView(this);
        tvNama.setText(!TextUtils.isEmpty(ev.getNama_event()) ? ev.getNama_event() : "-");
        tvNama.setTextSize(15f);
        tvNama.setTypeface(null, Typeface.BOLD);
        tvNama.setTextColor(Color.BLACK);

        String tanggal = formatTanggal(ev.getTanggal_mulai(), ev.getTanggal_selesai());
        String lokasi = !TextUtils.isEmpty(ev.getLokasi()) ? ev.getLokasi() : "-";
        TextView tvSub = new TextView(this);
        tvSub.setText(tanggal + "\n" + lokasi);
        tvSub.setTextSize(11f);
        tvSub.setTextColor(Color.parseColor("#6B7280"));

        infoCol.addView(tvBadge);
        infoCol.addView(tvNama);
        infoCol.addView(tvSub);

        row.setOnClickListener(v -> {
            Intent intent = new Intent(Event.this, DetailEvent.class);
            intent.putExtra(DetailEvent.EXTRA_EVENT_ID, ev.getId_event());
            startActivity(intent);
        });

        row.addView(imgLogo);
        row.addView(infoCol);
        card.addView(row);

        return card;
    }

    private String formatTanggal(String mulai, String selesai) {
        boolean adaMulai = !TextUtils.isEmpty(mulai);
        boolean adaSelesai = !TextUtils.isEmpty(selesai);
        if (adaMulai && adaSelesai && !mulai.equals(selesai)) {
            return mulai + " - " + selesai;
        }
        if (adaMulai) {
            return mulai;
        }
        if (adaSelesai) {
            return selesai;
        }
        return "-";
    }

    private int dpToPx(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    private void setupNavigasiBawah() {
        navEvent.setOnClickListener(v -> {
            // Sudah di halaman Event
        });
        navPeta.setOnClickListener(v ->
                startActivity(new Intent(Event.this, Peta.class))
        );
        navFavorit.setOnClickListener(v ->
                startActivity(new Intent(Event.this, Favorit1.class))
        );
        navProfil.setOnClickListener(v ->
                startActivity(new Intent(Event.this, Profil.class))
        );
    }
}