package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class Peta extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_peta);

        // Inisialisasi 4 Tombol Navigasi Bawah
        TextView navEvent = findViewById(R.id.navEvent);
        TextView navPeta = findViewById(R.id.navPeta);
        TextView navFavorit = findViewById(R.id.navFavorit);
        TextView navProfil = findViewById(R.id.navProfil);

        // Logika Navigasi Bawah
        if (navEvent != null) {
            navEvent.setOnClickListener(v -> {
                startActivity(new Intent(Peta.this, Event.class));
                finish();
            });
        }
        if (navPeta != null) {
            navPeta.setOnClickListener(v -> {
                Toast.makeText(this, "Anda sudah berada di halaman Peta", Toast.LENGTH_SHORT).show();
            });
        }
        if (navFavorit != null) {
            navFavorit.setOnClickListener(v -> {
                startActivity(new Intent(Peta.this, Favorit1.class));
                finish();
            });
        }
        if (navProfil != null) {
            navProfil.setOnClickListener(v -> {
                startActivity(new Intent(Peta.this, Profil.class));
                finish();
            });
        }
    }
}