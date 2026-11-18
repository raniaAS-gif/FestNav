package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class Daftar extends AppCompatActivity {

    EditText etUsername, etDisplayName, etEmail, etTelepon, etPassword, etConfirmPassword;
    Button btnDaftarAksi;
    View btnTabMasuk, btnBawahMasuk;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_daftar);

        // Menghubungkan variabel dengan ID di XML
        etUsername = findViewById(R.id.etUsernameDaftar);
        etDisplayName = findViewById(R.id.etDisplayNameDaftar);
        etEmail = findViewById(R.id.etEmailDaftar);
        etTelepon = findViewById(R.id.etTeleponDaftar);
        etPassword = findViewById(R.id.etPasswordDaftar);
        etConfirmPassword = findViewById(R.id.etConfirmPasswordDaftar);

        btnDaftarAksi = findViewById(R.id.btnDaftarAksi);
        btnTabMasuk = findViewById(R.id.btnTabMasuk);
        btnBawahMasuk = findViewById(R.id.btnBawahMasuk);

        // 1. Tombol Daftar Aksi diklik
        btnDaftarAksi.setOnClickListener(v -> {
            String user = etUsername.getText().toString().trim();
            String displayName = etDisplayName.getText().toString().trim();
            String email = etEmail.getText().toString().trim();
            String telepon = etTelepon.getText().toString().trim();
            String pass = etPassword.getText().toString().trim();
            String confirmPass = etConfirmPassword.getText().toString().trim();

            // Validasi Input Kosong
            if (user.isEmpty() || email.isEmpty() || pass.isEmpty()) {
                Toast.makeText(this, "Mohon lengkapi data pendaftaran utama!", Toast.LENGTH_SHORT).show();
            } else if (!pass.equals(confirmPass)) {
                Toast.makeText(this, "Password dan Konfirmasi Password tidak sama!", Toast.LENGTH_SHORT).show();
            } else {
                // SIMPAN DATA KE SharedPreferences agar bisa tampil di halaman Profil
                SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString("username", user);
                editor.putString("display_name", displayName.isEmpty() ? user : displayName);
                editor.putString("email", email);
                editor.putString("telepon", telepon.isEmpty() ? "-" : telepon);
                editor.apply();

                Toast.makeText(this, "Registrasi Berhasil!", Toast.LENGTH_SHORT).show();

                // Pindah ke halaman Dashboard dan bersihkan history activity sebelumnya
                Intent intent = new Intent(Daftar.this, Dashboard.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                finish();
            }
        });

        // 2. Tombol Pindah ke Halaman Masuk
        View.OnClickListener pindahMasuk = v -> {
            Intent intent = new Intent(Daftar.this, Masuk.class);
            startActivity(intent);
            finish();
        };

        btnTabMasuk.setOnClickListener(pindahMasuk);
        btnBawahMasuk.setOnClickListener(pindahMasuk);
    }
}