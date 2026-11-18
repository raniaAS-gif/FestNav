package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class Favorit1 extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_favorit1);

        TextView navEvent = findViewById(R.id.navEvent);
        TextView navPeta = findViewById(R.id.navPeta);
        TextView navFavorit = findViewById(R.id.navFavorit);
        TextView navProfil = findViewById(R.id.navProfil);

        // 1. Tombol Event -> Diarahkan langsung ke Event.class
        if (navEvent != null) {
            navEvent.setOnClickListener(v -> {
                Intent intent = new Intent(Favorit1.this, Event.class);
                startActivity(intent);
                finish();
            });
        }

        // 2. Tombol Peta -> Pindah ke Peta
        if (navPeta != null) {
            navPeta.setOnClickListener(v -> {
                Intent intent = new Intent(Favorit1.this, Peta.class);
                startActivity(intent);
            });
        }

        // 3. Tombol Favorit -> Diam di tempat karena sudah di halaman Favorit
        if (navFavorit != null) {
            navFavorit.setOnClickListener(v -> {
                Toast.makeText(this, "Anda sudah berada di halaman Favorit", Toast.LENGTH_SHORT).show();
            });
        }

        // 4. Tombol Profil -> Pindah ke Profil
        if (navProfil != null) {
            navProfil.setOnClickListener(v -> {
                Intent intent = new Intent(Favorit1.this, Profil.class);
                startActivity(intent);
            });
        }
    }
}