package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class Dashboard extends AppCompatActivity {

    EditText etSearchDashboard;
    View btnKunjungiFavorit, btnJelajahiEvent;
    View navEvent, navPeta, navFavorit, navProfil;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        // Menghubungkan variabel dengan ID di XML
        etSearchDashboard = findViewById(R.id.etSearchDashboard);
        btnKunjungiFavorit = findViewById(R.id.btnKunjungiFavorit);
        btnJelajahiEvent = findViewById(R.id.btnJelajahiEvent);

        navEvent = findViewById(R.id.navEvent);
        navPeta = findViewById(R.id.navPeta);
        navFavorit = findViewById(R.id.navFavorit);
        navProfil = findViewById(R.id.navProfil);

        // 1. Kolom Pencarian (bisa diketik & merespons pencarian)
        etSearchDashboard.setOnEditorActionListener((v, actionId, event) -> {
            String keyword = etSearchDashboard.getText().toString().trim();
            if (!keyword.isEmpty()) {
                Toast.makeText(this, "Mencari event: " + keyword, Toast.LENGTH_SHORT).show();
            }
            return true;
        });

        // 2. Tombol Kartu Pertama: "Kunjungi event favoritmu" -> Membuka DetailEvent
        btnKunjungiFavorit.setOnClickListener(v -> {
            Intent intent = new Intent(Dashboard.this, DetailEvent.class);
            startActivity(intent);
        });

        // 3. Tombol Kartu Kedua: "Jelajahi event disekitarmu"
        btnJelajahiEvent.setOnClickListener(v -> {
            Toast.makeText(this, "Menjelajahi Event Sekitar", Toast.LENGTH_SHORT).show();
        });

        // 4. Navigasi Bawah
        navEvent.setOnClickListener(v -> {
            Toast.makeText(this, "Menu Event Aktif", Toast.LENGTH_SHORT).show();
        });

        navPeta.setOnClickListener(v -> {
            Toast.makeText(this, "Membuka Peta / Denah Indoor", Toast.LENGTH_SHORT).show();
        });

        navFavorit.setOnClickListener(v -> {
            // Membuka halaman Favorit1
            Intent intent = new Intent(Dashboard.this, Favorit1.class);
            startActivity(intent);
        });

        navProfil.setOnClickListener(v -> {
            // Membuka halaman Profil
            Intent intent = new Intent(Dashboard.this, Profil.class);
            startActivity(intent);
        });
    }
}