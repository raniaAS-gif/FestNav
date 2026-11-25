package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class Profil extends AppCompatActivity {

    private static final String PREFS_NAME = "FestNavPrefs";

    private TextView tvAvatarInisial, tvNamaHeader, tvUsernameHeader;
    private EditText etProfilNamaLengkap, etProfilUsername, etProfilEmail, etProfilTelepon;
    private Button btnEditSimpanProfil, btnKeluar;
    private TextView navEvent, navPeta, navFavorit, navProfil;

    private boolean sedangEdit = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profil);

        tvAvatarInisial = findViewById(R.id.tvAvatarInisial);
        tvNamaHeader = findViewById(R.id.tvNamaHeader);
        tvUsernameHeader = findViewById(R.id.tvUsernameHeader);

        etProfilNamaLengkap = findViewById(R.id.etProfilNamaLengkap);
        etProfilUsername = findViewById(R.id.etProfilUsername);
        etProfilEmail = findViewById(R.id.etProfilEmail);
        etProfilTelepon = findViewById(R.id.etProfilTelepon);

        btnEditSimpanProfil = findViewById(R.id.btnEditSimpanProfil);
        btnKeluar = findViewById(R.id.btnKeluar);

        navEvent = findViewById(R.id.navEvent);
        navPeta = findViewById(R.id.navPeta);
        navFavorit = findViewById(R.id.navFavorit);
        navProfil = findViewById(R.id.navProfil);

        muatDataProfil();
        aturModeEdit(false);
        setupAksiProfil();
        setupNavigasiBawah();
    }

    private void muatDataProfil() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String nama = prefs.getString("nama", "Nama Pengunjung");
        String username = prefs.getString("username", "username");
        String email = prefs.getString("email", "nama@gmail.com");
        String telepon = prefs.getString("nomor_telepon", "08xx xxxx xxxx");

        terapkanKeTampilan(nama, username, email, telepon);
    }

    private void terapkanKeTampilan(String nama, String username, String email, String telepon) {
        String namaAman = !TextUtils.isEmpty(nama) ? nama : "Nama Pengunjung";
        String userAman = !TextUtils.isEmpty(username) ? username.replaceFirst("^@", "") : "username";
        String emailAman = !TextUtils.isEmpty(email) ? email : "-";
        String telpAman = !TextUtils.isEmpty(telepon) ? telepon : "-";

        tvAvatarInisial.setText(buatInisial(namaAman));
        tvNamaHeader.setText(namaAman);
        tvUsernameHeader.setText("@" + userAman);

        etProfilNamaLengkap.setText(namaAman);
        etProfilUsername.setText(userAman);
        etProfilEmail.setText(emailAman);
        etProfilTelepon.setText(telpAman);
    }

    private String buatInisial(String nama) {
        String[] bagian = nama.trim().split("\\s+");
        if (bagian.length >= 2 && !bagian[0].isEmpty() && !bagian[1].isEmpty()) {
            return ("" + bagian[0].charAt(0) + bagian[1].charAt(0)).toUpperCase();
        }
        if (!bagian[0].isEmpty()) {
            return bagian[0].substring(0, Math.min(2, bagian[0].length())).toUpperCase();
        }
        return "FN";
    }

    private void aturModeEdit(boolean aktif) {
        sedangEdit = aktif;
        etProfilNamaLengkap.setEnabled(aktif);
        etProfilUsername.setEnabled(aktif);
        etProfilEmail.setEnabled(aktif);
        etProfilTelepon.setEnabled(aktif);

        btnEditSimpanProfil.setText(aktif ? "Simpan" : "Edit Profil");
    }

    private void setupAksiProfil() {
        btnEditSimpanProfil.setOnClickListener(v -> {
            if (!sedangEdit) {
                aturModeEdit(true);
                etProfilNamaLengkap.requestFocus();
            } else {
                simpanPerubahanProfil();
            }
        });

        btnKeluar.setOnClickListener(v -> keluarAkun());
    }

    private void simpanPerubahanProfil() {
        String namaBaru = etProfilNamaLengkap.getText().toString().trim();
        String usernameBaru = etProfilUsername.getText().toString().trim().replaceFirst("^@", "");
        String emailBaru = etProfilEmail.getText().toString().trim();
        String teleponBaru = etProfilTelepon.getText().toString().trim();

        if (TextUtils.isEmpty(namaBaru)) {
            etProfilNamaLengkap.setError("Nama lengkap wajib diisi");
            etProfilNamaLengkap.requestFocus();
            return;
        }
        if (TextUtils.isEmpty(usernameBaru)) {
            etProfilUsername.setError("Username wajib diisi");
            etProfilUsername.requestFocus();
            return;
        }
        if (TextUtils.isEmpty(emailBaru)) {
            etProfilEmail.setError("Email wajib diisi");
            etProfilEmail.requestFocus();
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit()
                .putString("nama", namaBaru)
                .putString("username", usernameBaru)
                .putString("email", emailBaru)
                .putString("nomor_telepon", teleponBaru)
                .apply();

        // TODO: Kirim perubahan profil ke endpoint backend FastAPI saat tersedia
        terapkanKeTampilan(namaBaru, usernameBaru, emailBaru, teleponBaru);
        aturModeEdit(false);
        Toast.makeText(this, "Profil diperbarui", Toast.LENGTH_SHORT).show();
    }

    private void keluarAkun() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        prefs.edit().clear().apply();

        Toast.makeText(this, "Berhasil keluar", Toast.LENGTH_SHORT).show();

        Intent intent = new Intent(Profil.this, Masuk.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void setupNavigasiBawah() {
        navEvent.setOnClickListener(v ->
                startActivity(new Intent(Profil.this, Event.class))
        );
        navPeta.setOnClickListener(v ->
                startActivity(new Intent(Profil.this, Peta.class))
        );
        navFavorit.setOnClickListener(v ->
                startActivity(new Intent(Profil.this, Favorit1.class))
        );
        navProfil.setOnClickListener(v -> {
            // Sudah di halaman Profil
        });
    }
}