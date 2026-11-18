package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;

public class Event extends AppCompatActivity {

    private TextView tvHaloUser, tvPesanKosongDetail;
    private EditText etSearchEventPage;
    private Button btnCatSemua, btnCatMusik, btnCatMaraton, btnCatLainnya, btnResetPencarian;
    private LinearLayout layoutDaftarEvent, layoutStateKosong;
    private CardView cardEventDiesUdayana, cardEventPernikahanSita;

    private String currentCategory = "Semua";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_event);

        // Inisialisasi Views
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

        cardEventDiesUdayana = findViewById(R.id.cardEventDiesUdayana);
        cardEventPernikahanSita = findViewById(R.id.cardEventPernikahanSita);

        TextView navEvent = findViewById(R.id.navEvent);
        TextView navPeta = findViewById(R.id.navPeta);
        TextView navFavorit = findViewById(R.id.navFavorit);
        TextView navProfil = findViewById(R.id.navProfil);

        // Ambil nama user dari SharedPreferences untuk sapaan
        SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
        String displayName = prefs.getString("display_name", "Pengguna");
        if (tvHaloUser != null) {
            tvHaloUser.setText("Halo, " + displayName);
        }

        // 1. Logika Tombol Kategori
        btnCatSemua.setOnClickListener(v -> setKategori("Semua"));
        btnCatMusik.setOnClickListener(v -> setKategori("Musik"));
        btnCatMaraton.setOnClickListener(v -> setKategori("Maraton"));
        btnCatLainnya.setOnClickListener(v -> setKategori("Lainnya"));

        // 2. Logika Real-time Search & Tombol Search Keyboard
        etSearchEventPage.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filterPencarian(s.toString().trim());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        etSearchEventPage.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH || actionId == EditorInfo.IME_ACTION_DONE) {
                String keyword = etSearchEventPage.getText().toString().trim();
                filterPencarian(keyword);
                return true;
            }
            return false;
        });

        // 3. Tombol Reset Pencarian
        btnResetPencarian.setOnClickListener(v -> {
            etSearchEventPage.setText("");
            setKategori("Semua");
        });

        // 4. Navigasi 4 Tombol Bawah
        if (navEvent != null) {
            navEvent.setOnClickListener(v -> Toast.makeText(this, "Anda sudah berada di halaman Event", Toast.LENGTH_SHORT).show());
        }
        if (navPeta != null) {
            navPeta.setOnClickListener(v -> {
                startActivity(new Intent(Event.this, Peta.class));
            });
        }
        if (navFavorit != null) {
            navFavorit.setOnClickListener(v -> {
                startActivity(new Intent(Event.this, Favorit1.class));
            });
        }
        if (navProfil != null) {
            navProfil.setOnClickListener(v -> {
                startActivity(new Intent(Event.this, Profil.class));
            });
        }
    }

    // Mengatur Filter Berdasarkan Kategori
    private void setKategori(String kategori) {
        currentCategory = kategori;

        // Reset warna tombol kategori
        resetWarnaTombolKategori();

        if (kategori.equals("Semua")) {
            btnCatSemua.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#7C3AED")));
            btnCatSemua.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
        } else if (kategori.equals("Musik")) {
            btnCatMusik.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#7C3AED")));
            btnCatMusik.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
        } else if (kategori.equals("Maraton")) {
            btnCatMaraton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#7C3AED")));
            btnCatMaraton.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
        } else {
            btnCatLainnya.setBackgroundTintList(android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#7C3AED")));
            btnCatLainnya.setTextColor(android.graphics.Color.parseColor("#FFFFFF"));
        }

        // Jalankan ulang filter pencarian berdasarkan kategori yang dipilih
        filterPencarian(etSearchEventPage.getText().toString().trim());
    }

    private void resetWarnaTombolKategori() {
        android.content.res.ColorStateList bgGray = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#F3F4F6"));
        int textGray = android.graphics.Color.parseColor("#4B5563");

        btnCatSemua.setBackgroundTintList(bgGray); btnCatSemua.setTextColor(textGray);
        btnCatMusik.setBackgroundTintList(bgGray); btnCatMusik.setTextColor(textGray);
        btnCatMaraton.setBackgroundTintList(bgGray); btnCatMaraton.setTextColor(textGray);
        btnCatLainnya.setBackgroundTintList(bgGray); btnCatLainnya.setTextColor(textGray);
    }

    // Logika Inti Pencarian & Filter Kategori + Munculkan Pop-up Sesuai Permintaan
    private void filterPencarian(String keyword) {
        String query = keyword.toLowerCase();

        // Jika kategori Musik atau Maraton dipilih (yang datanya dikosongkan)
        if (currentCategory.equals("Musik") || currentCategory.equals("Maraton")) {
            layoutDaftarEvent.setVisibility(View.GONE);
            layoutStateKosong.setVisibility(View.VISIBLE);
            tvPesanKosongDetail.setText("Tidak ada hasil untuk \"" + (query.isEmpty() ? keyword : query) + "\" di kategori " + currentCategory + ". Coba kata kunci lain atau ubah filter.");
            return;
        }

        // Logika untuk kategori "Semua" atau "Lainnya"
        boolean matchDies = query.isEmpty() || query.contains("dies") || query.contains("udayana");
        boolean matchSita = query.isEmpty() || query.contains("sita") || query.contains("pernikahan");

        int countVisible = 0;

        if (matchDies) {
            cardEventDiesUdayana.setVisibility(View.VISIBLE);
            countVisible++;
        } else {
            cardEventDiesUdayana.setVisibility(View.GONE);
        }

        if (matchSita) {
            cardEventPernikahanSita.setVisibility(View.VISIBLE);
            countVisible++;
        } else {
            cardEventPernikahanSita.setVisibility(View.GONE);
        }

        // Cek jika pencarian tidak ditemukan sama sekali
        if (countVisible == 0) {
            layoutDaftarEvent.setVisibility(View.GONE);
            layoutStateKosong.setVisibility(View.VISIBLE);
            tvPesanKosongDetail.setText("Tidak ada hasil untuk \"" + keyword + "\". Coba kata kunci lain atau ubah filter.");

            // Munculkan Pop-up Toast khusus pencarian tidak ditemukan
            Toast.makeText(this, "Event tidak ditemukan!", Toast.LENGTH_SHORT).show();
        } else {
            layoutDaftarEvent.setVisibility(View.VISIBLE);
            layoutStateKosong.setVisibility(View.GONE);

            // Munculkan pop-up / Toast saat keyword spesifik dicari
            if (!query.isEmpty()) {
                if (query.contains("dies") || query.contains("udayana")) {
                    Toast.makeText(this, "Menampilkan hasil: Dies Natalis Udayana", Toast.LENGTH_SHORT).show();
                } else if (query.contains("sita") || query.contains("pernikahan")) {
                    Toast.makeText(this, "Menampilkan hasil: Pernikahan Sita", Toast.LENGTH_SHORT).show();
                }
            }
        }
    }
}