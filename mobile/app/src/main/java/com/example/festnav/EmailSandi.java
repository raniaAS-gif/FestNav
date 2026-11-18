package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import androidx.appcompat.app.AppCompatActivity;

public class EmailSandi extends AppCompatActivity {

    View btnKembaliEmailSandi, btnKembaliKeMasuk;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_email_sandi);

        // Menghubungkan variabel dengan ID di XML
        btnKembaliEmailSandi = findViewById(R.id.btnKembaliEmailSandi);
        btnKembaliKeMasuk = findViewById(R.id.btnKembaliKeMasuk);

        // 1. Tombol Panah Kembali (<) diklik -> Kembali ke halaman Lupa Sandi sebelumnya
        btnKembaliEmailSandi.setOnClickListener(v -> {
            finish();
        });

        // 2. Tombol "Kembali ke Masuk" diklik -> Langsung melompat ke halaman Masuk
        btnKembaliKeMasuk.setOnClickListener(v -> {
            // Pastikan "Masuk.class" sesuai dengan nama Activity halaman login kamu
            Intent intent = new Intent(EmailSandi.this, Masuk.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });
    }
}