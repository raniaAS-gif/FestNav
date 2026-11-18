package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class Masuk extends AppCompatActivity {

    EditText etEmail, etPassword;
    View btnMasukAksi; // <-- Diubah dari Button jadi View
    View btnLupaSandi, btnTabDaftar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_masuk);

        etEmail = findViewById(R.id.etEmailMasuk);
        etPassword = findViewById(R.id.etPasswordMasuk);
        btnMasukAksi = findViewById(R.id.btnMasukAksi);
        btnLupaSandi = findViewById(R.id.btnLupaSandi);
        btnTabDaftar = findViewById(R.id.btnTabDaftar);

        // 1. Tombol Masuk Aksi -> Masuk ke Dashboard
        btnMasukAksi.setOnClickListener(v -> {
            String email = etEmail.getText().toString().trim();
            String password = etPassword.getText().toString().trim();

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Email dan Password harus diisi!", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Berhasil Masuk!", Toast.LENGTH_SHORT).show();
                Intent intent = new Intent(Masuk.this, Dashboard.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                finish();
            }
        });

        // 2. Tombol Lupa Sandi -> Membuka LupaSandi
        btnLupaSandi.setOnClickListener(v -> {
            Intent intent = new Intent(Masuk.this, LupaSandi.class);
            startActivity(intent);
        });

        // 3. Tombol Tab Daftar di atas -> Membuka halaman Daftar
        btnTabDaftar.setOnClickListener(v -> {
            Intent intent = new Intent(Masuk.this, Daftar.class);
            startActivity(intent);
            finish();
        });
    }
}