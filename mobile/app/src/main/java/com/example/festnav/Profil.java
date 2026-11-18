package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class Profil extends AppCompatActivity {

    TextView tvNamaHeader, tvUsernameHeader, tvNamaLengkapVal, tvUsernameVal, tvEmailVal, tvTeleponVal;
    View btnKeluar;
    View navEvent, navPeta, navFavorit, navProfil;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profil);

        // Menghubungkan TextView dan View dengan ID di XML
        tvNamaHeader = findViewById(R.id.tvNamaHeader);
        tvUsernameHeader = findViewById(R.id.tvUsernameHeader);
        tvNamaLengkapVal = findViewById(R.id.tvNamaLengkapVal);
        tvUsernameVal = findViewById(R.id.tvUsernameVal);
        tvEmailVal = findViewById(R.id.tvEmailVal);
        tvTeleponVal = findViewById(R.id.tvTeleponVal);

        btnKeluar = findViewById(R.id.btnKeluar);
        navEvent = findViewById(R.id.navEvent);
        navPeta = findViewById(R.id.navPeta);
        navFavorit = findViewById(R.id.navFavorit);
        navProfil = findViewById(R.id.navProfil);

        // Memuat Data Pengguna yang disimpan saat registrasi (Daftar)
        SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
        String savedUsername = prefs.getString("username", "@username");
        String savedDisplayName = prefs.getString("display_name", "Nama Pengunjung");
        String savedEmail = prefs.getString("email", "nama@gmail.com");
        String savedTelepon = prefs.getString("telepon", "08xxxxxxxxxx");

        // Menampilkan data ke TextView Profil
        tvNamaHeader.setText(savedDisplayName);
        tvUsernameHeader.setText("@" + savedUsername);
        tvNamaLengkapVal.setText(savedDisplayName);
        tvUsernameVal.setText(savedUsername);
        tvEmailVal.setText(savedEmail);
        tvTeleponVal.setText(savedTelepon);

        // Tombol Keluar (Logout) -> Kembali ke halaman Masuk
        btnKeluar.setOnClickListener(v -> {
            Toast.makeText(this, "Keluar dari akun", Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(Profil.this, Masuk.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });

        // Navigasi Bawah
        navEvent.setOnClickListener(v -> {
            Intent intent = new Intent(Profil.this, Dashboard.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
        });

        navPeta.setOnClickListener(v -> {
            Toast.makeText(this, "Membuka Peta", Toast.LENGTH_SHORT).show();
        });

        navFavorit.setOnClickListener(v -> {
            Intent intent = new Intent(Profil.this, Favorit1.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
        });

        navProfil.setOnClickListener(v -> {
            // Sedang di halaman Profil
        });
    }
}