package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class Favorit1 extends AppCompatActivity {

    View navEvent, navPeta, navFavorit, navProfil;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_favorit1);

        // Menghubungkan variabel dengan ID di XML
        navEvent = findViewById(R.id.navEvent);
        navPeta = findViewById(R.id.navPeta);
        navFavorit = findViewById(R.id.navFavorit);
        navProfil = findViewById(R.id.navProfil);

        // 1. Menu Navigasi "Event" -> Kembali ke Dashboard
        navEvent.setOnClickListener(v -> {
            Intent intent = new Intent(Favorit1.this, Dashboard.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
            finish();
        });

        // 2. Menu Navigasi "Peta" -> Pindah ke halaman Peta
        navPeta.setOnClickListener(v -> {
            Toast.makeText(this, "Membuka Peta", Toast.LENGTH_SHORT).show();
            // Intent intent = new Intent(Favorit1.this, DenahIndoor.class);
            // startActivity(intent);
        });

        // 3. Menu Navigasi "Favorit" -> Sedang di halaman Favorit1
        navFavorit.setOnClickListener(v -> {
            // Sudah di halaman Favorit
        });

        // 4. Menu Navigasi "Profil" -> Pindah ke halaman Profil
        navProfil.setOnClickListener(v -> {
            Intent intent = new Intent(Favorit1.this, Profil.class);
            startActivity(intent);
        });
    }
}