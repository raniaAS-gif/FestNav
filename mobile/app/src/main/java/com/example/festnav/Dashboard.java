package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.cardview.widget.CardView;

public class Dashboard extends AppCompatActivity {

    private TextView tvWelcome;
    private EditText etSearchEvent;
    private CardView cardEvent1, cardEvent2;
    private Button btnKunjungiFavorit;
    private TextView navEvent, navPeta, navFavorit, navProfil;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        // Inisialisasi Views
        tvWelcome = findViewById(R.id.tvWelcomeDashboard);
        etSearchEvent = findViewById(R.id.etSearchEvent);
        cardEvent1 = findViewById(R.id.cardEvent1);
        cardEvent2 = findViewById(R.id.cardEvent2);
        btnKunjungiFavorit = findViewById(R.id.btnKunjungiFavorit);

        navEvent = findViewById(R.id.navEvent);
        navPeta = findViewById(R.id.navPeta);
        navFavorit = findViewById(R.id.navFavorit);
        navProfil = findViewById(R.id.navProfil);

        // 1. Ambil Display Name dari SharedPreferences secara otomatis saat user login/daftar
        SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
        String displayName = prefs.getString("display_name", "Pengguna");
        if (tvWelcome != null) {
            tvWelcome.setText("Selamat datang\n@" + displayName);
        }

        // 2. Fitur Pencarian Event (Search)
        etSearchEvent.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH || actionId == EditorInfo.IME_ACTION_DONE) {
                prosesPencarian();
                return true;
            }
            return false;
        });

        etSearchEvent.setOnKeyListener((v, keyCode, event) -> {
            if ((event.getAction() == android.view.KeyEvent.ACTION_DOWN) && (keyCode == android.view.KeyEvent.KEYCODE_ENTER)) {
                prosesPencarian();
                return true;
            }
            return false;
        });

        // 3. Tombol "Kunjungi event favoritmu" -> Pindah ke Detail Event
        if (btnKunjungiFavorit != null) {
            btnKunjungiFavorit.setOnClickListener(v -> {
                Intent intent = new Intent(Dashboard.this, DetailEvent.class);
                startActivity(intent);
            });
        }

        // 4. Navigasi 4 Tombol Bawah (Tombol Event diarahkan ke Event.class)
        if (navEvent != null) {
            navEvent.setOnClickListener(v -> {
                Intent intent = new Intent(Dashboard.this, Event.class);
                startActivity(intent);
            });
        }

        if (navPeta != null) {
            navPeta.setOnClickListener(v -> {
                Intent intent = new Intent(Dashboard.this, Peta.class);
                startActivity(intent);
            });
        }

        // Tombol Favorit diarahkan ke Favorit1 sesuai permintaanmu
        if (navFavorit != null) {
            navFavorit.setOnClickListener(v -> {
                Intent intent = new Intent(Dashboard.this, Favorit1.class);
                startActivity(intent);
            });
        }

        if (navProfil != null) {
            navProfil.setOnClickListener(v -> {
                Intent intent = new Intent(Dashboard.this, Profil.class);
                startActivity(intent);
            });
        }
    }

    // Logika Pencarian Event (Mendeteksi Dies Natalis Udayana atau memunculkan pop-up jika tidak ada)
    private void prosesPencarian() {
        String keyword = etSearchEvent.getText().toString().trim().toLowerCase();

        if (keyword.isEmpty()) {
            cardEvent1.setVisibility(CardView.VISIBLE);
            cardEvent2.setVisibility(CardView.VISIBLE);
            return;
        }

        // Jika mencari "dies natalis udayana"
        if (keyword.contains("dies natalis udayana") || keyword.contains("udayana")) {
            cardEvent1.setVisibility(CardView.VISIBLE);
            cardEvent2.setVisibility(CardView.GONE);
            Toast.makeText(this, "Menampilkan hasil untuk: Dies Natalis Udayana", Toast.LENGTH_SHORT).show();
        } else {
            // Jika data tidak ditemukan (misal mencari "konser"), munculkan pop-up
            cardEvent1.setVisibility(CardView.GONE);
            cardEvent2.setVisibility(CardView.GONE);
            Toast.makeText(this, "Event tidak ditemukan!", Toast.LENGTH_LONG).show();
        }
    }
}