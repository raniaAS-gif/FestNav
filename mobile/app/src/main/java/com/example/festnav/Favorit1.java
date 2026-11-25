package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;

import com.example.festnav.api.ApiClient;
import com.example.festnav.api.ApiService;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Favorit1 extends AppCompatActivity {

    private TextView tvJumlahFavorit;
    private LinearLayout containerDaftarFavorit;
    private TextView navEvent, navPeta, navFavorit, navProfil;

    private String bearerToken;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_favorit1);

        tvJumlahFavorit = findViewById(R.id.tvJumlahFavorit);
        containerDaftarFavorit = findViewById(R.id.containerDaftarFavorit);
        navEvent = findViewById(R.id.navEvent);
        navPeta = findViewById(R.id.navPeta);
        navFavorit = findViewById(R.id.navFavorit);
        navProfil = findViewById(R.id.navProfil);

        setupNavigasiBawah();
        muatFavorit();
    }

    @Override
    protected void onResume() {
        super.onResume();
        muatFavorit();
    }

    private String ambilBearerToken() {
        SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
        String token = prefs.getString("access_token", "");
        if (TextUtils.isEmpty(token)) {
            return null;
        }
        return "Bearer " + token;
    }

    private void muatFavorit() {
        bearerToken = ambilBearerToken();
        if (bearerToken == null) {
            tvJumlahFavorit.setText("Silakan masuk untuk melihat event favorit");
            containerDaftarFavorit.removeAllViews();
            return;
        }

        ApiService apiService = ApiClient.getClient().create(ApiService.class);
        apiService.getFavoritList(bearerToken).enqueue(new Callback<List<FavoritItemResponse>>() {
            @Override
            public void onResponse(
                    @NonNull Call<List<FavoritItemResponse>> call,
                    @NonNull Response<List<FavoritItemResponse>> response
            ) {
                if (response.isSuccessful() && response.body() != null) {
                    tampilkanDaftarFavorit(response.body());
                } else if (response.code() == 401) {
                    tvJumlahFavorit.setText("Sesi berakhir, silakan masuk kembali");
                    containerDaftarFavorit.removeAllViews();
                } else {
                    tvJumlahFavorit.setText("Gagal memuat favorit");
                    Toast.makeText(Favorit1.this, "Gagal memuat (Kode: " + response.code() + ")", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<FavoritItemResponse>> call, @NonNull Throwable t) {
                tvJumlahFavorit.setText("Tidak dapat terhubung ke server");
                Toast.makeText(Favorit1.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void tampilkanDaftarFavorit(List<FavoritItemResponse> items) {
        containerDaftarFavorit.removeAllViews();
        tvJumlahFavorit.setText(items.size() + " event ditandai");

        if (items.isEmpty()) {
            TextView tvKosong = new TextView(this);
            tvKosong.setText("Belum ada event yang ditandai favorit.");
            tvKosong.setTextColor(Color.parseColor("#6B7280"));
            tvKosong.setTextSize(14f);
            containerDaftarFavorit.addView(tvKosong);
            return;
        }

        for (FavoritItemResponse item : items) {
            if (item.getEvent() != null) {
                containerDaftarFavorit.addView(buatCardFavorit(item.getEvent()));
            }
        }
    }

    private CardView buatCardFavorit(EventResponse ev) {
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
        tvBadge.setTypeface(null, android.graphics.Typeface.BOLD);
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
        tvNama.setTypeface(null, android.graphics.Typeface.BOLD);
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

        TextView tvHati = new TextView(this);
        tvHati.setText("❤️");
        tvHati.setTextSize(22f);
        LinearLayout.LayoutParams hatiParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        hatiParams.setMarginStart(dpToPx(8));
        tvHati.setLayoutParams(hatiParams);

        tvHati.setOnClickListener(v -> konfirmasiHapusFavorit(ev.getId_event()));
        row.setOnClickListener(v -> {
            Intent intent = new Intent(Favorit1.this, DetailEvent.class);
            intent.putExtra(DetailEvent.EXTRA_EVENT_ID, ev.getId_event());
            startActivity(intent);
        });

        row.addView(imgLogo);
        row.addView(infoCol);
        row.addView(tvHati);
        card.addView(row);

        return card;
    }

    private void konfirmasiHapusFavorit(int idEvent) {
        if (bearerToken == null) {
            return;
        }
        ApiService apiService = ApiClient.getClient().create(ApiService.class);
        apiService.hapusFavorit(bearerToken, idEvent).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                if (response.isSuccessful() || response.code() == 204) {
                    Toast.makeText(Favorit1.this, "Dihapus dari favorit", Toast.LENGTH_SHORT).show();
                    muatFavorit();
                } else {
                    Toast.makeText(Favorit1.this, "Gagal menghapus (Kode: " + response.code() + ")", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                Toast.makeText(Favorit1.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
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
        navEvent.setOnClickListener(v ->
                startActivity(new Intent(Favorit1.this, Event.class))
        );
        navPeta.setOnClickListener(v ->
                startActivity(new Intent(Favorit1.this, Peta.class))
        );
        navFavorit.setOnClickListener(v -> {
            // Sudah di halaman Favorit
        });
        navProfil.setOnClickListener(v ->
                startActivity(new Intent(Favorit1.this, Profil.class))
        );
    }
}