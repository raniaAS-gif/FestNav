package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class Profil extends AppCompatActivity {

    private TextView tvAvatarInisial, tvNamaHeader, tvUsernameHeader;
    private EditText etNamaLengkap, etUsername, etEmail, etTelepon;
    private Button btnEditSimpanProfil, btnKeluar;
    private boolean isEditing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profil);

        // Inisialisasi Views
        tvAvatarInisial = findViewById(R.id.tvAvatarInisial);
        tvNamaHeader = findViewById(R.id.tvNamaHeader);
        tvUsernameHeader = findViewById(R.id.tvUsernameHeader);

        etNamaLengkap = findViewById(R.id.etProfilNamaLengkap);
        etUsername = findViewById(R.id.etProfilUsername);
        etEmail = findViewById(R.id.etProfilEmail);
        etTelepon = findViewById(R.id.etProfilTelepon);

        btnEditSimpanProfil = findViewById(R.id.btnEditSimpanProfil);
        btnKeluar = findViewById(R.id.btnKeluar);

        TextView navEvent = findViewById(R.id.navEvent);
        TextView navPeta = findViewById(R.id.navPeta);
        TextView navFavorit = findViewById(R.id.navFavorit);
        TextView navProfil = findViewById(R.id.navProfil);

        // Load data user dari SharedPreferences
        loadUserData();

        // 1. Tombol Edit / Simpan Profil
        btnEditSimpanProfil.setOnClickListener(v -> {
            if (!isEditing) {
                // Masuk ke mode Edit (kolom bisa diketik)
                isEditing = true;
                setFormEnabled(true);
                btnEditSimpanProfil.setText("Simpan Profil");
                Toast.makeText(this, "Silakan ubah data profil Anda", Toast.LENGTH_SHORT).show();
            } else {
                // Simpan perubahan data ke SharedPreferences
                saveUserData();
                isEditing = false;
                setFormEnabled(false);
                btnEditSimpanProfil.setText("Edit Profil");
                Toast.makeText(this, "Profil berhasil diperbarui!", Toast.LENGTH_SHORT).show();
            }
        });

        // 2. Tombol Keluar (Log Out) -> Hapus sesi & kembali ke halaman Masuk
        btnKeluar.setOnClickListener(v -> {
            SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.clear(); // Hapus sesi login lokal
            editor.apply();

            Intent intent = new Intent(Profil.this, Masuk.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
        });

        // 3. Navigasi 4 Tombol Bawah (Tombol Event diarahkan ke Event.class)
        if (navEvent != null) {
            navEvent.setOnClickListener(v -> {
                Intent intent = new Intent(Profil.this, Event.class);
                startActivity(intent);
                finish();
            });
        }

        if (navPeta != null) {
            navPeta.setOnClickListener(v -> {
                Intent intent = new Intent(Profil.this, Peta.class);
                startActivity(intent);
            });
        }

        if (navFavorit != null) {
            navFavorit.setOnClickListener(v -> {
                Intent intent = new Intent(Profil.this, Favorit1.class);
                startActivity(intent);
            });
        }

        if (navProfil != null) {
            navProfil.setOnClickListener(v -> {
                Toast.makeText(this, "Anda sudah berada di halaman Profil", Toast.LENGTH_SHORT).show();
            });
        }
    }

    // Mengambil data dari SharedPreferences untuk ditampilkan di Profil
    private void loadUserData() {
        SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
        String name = prefs.getString("display_name", "Nama Pengunjung");
        String username = prefs.getString("username", "username");
        String email = prefs.getString("email", "nama@gmail.com");
        String telepon = prefs.getString("telepon", "08xx xxxx xxxx");

        // Set ke Header & Form EditText
        tvNamaHeader.setText(name);
        tvUsernameHeader.setText("@" + username);

        etNamaLengkap.setText(name);
        etUsername.setText(username);
        etEmail.setText(email);
        etTelepon.setText(telepon);

        // Otomatis buat inisial avatar dari 2 huruf depan nama
        if (name.length() >= 2) {
            tvAvatarInisial.setText(name.substring(0, 2).toUpperCase());
        } else if (!name.isEmpty()) {
            tvAvatarInisial.setText(name.substring(0, 1).toUpperCase());
        }
    }

    // Menyimpan pembaruan data profil ke SharedPreferences
    private void saveUserData() {
        String newName = etNamaLengkap.getText().toString().trim();
        String newUsername = etUsername.getText().toString().trim();
        String newEmail = etEmail.getText().toString().trim();
        String newTelepon = etTelepon.getText().toString().trim();

        SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("display_name", newName);
        editor.putString("username", newUsername);
        editor.putString("email", newEmail);
        editor.putString("telepon", newTelepon);
        editor.apply();

        // Refresh tampilan header
        loadUserData();
    }

    // Mengatur status aktif/non-aktif EditText saat mode edit
    private void setFormEnabled(boolean enabled) {
        etNamaLengkap.setEnabled(enabled);
        etUsername.setEnabled(enabled);
        etEmail.setEnabled(enabled);
        etTelepon.setEnabled(enabled);
    }
}