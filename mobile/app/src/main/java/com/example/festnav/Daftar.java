package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class Daftar extends AppCompatActivity {

    private EditText etUsernameDaftar, etDisplayNameDaftar, etEmailDaftar, etTeleponDaftar, etPasswordDaftar, etKonfirmasiPasswordDaftar;
    private DatabaseHelper dbHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_daftar);

        dbHelper = new DatabaseHelper(this);

        etUsernameDaftar = findViewById(R.id.etUsernameDaftar);
        etDisplayNameDaftar = findViewById(R.id.etDisplayNameDaftar);
        etEmailDaftar = findViewById(R.id.etEmailDaftar);
        etTeleponDaftar = findViewById(R.id.etTeleponDaftar);
        etPasswordDaftar = findViewById(R.id.etPasswordDaftar);
        etKonfirmasiPasswordDaftar = findViewById(R.id.etKonfirmasiPasswordDaftar);

        Button btnDaftarAksi = findViewById(R.id.btnDaftarAksi);
        TextView btnTabMasuk = findViewById(R.id.btnTabMasuk);

        if (btnDaftarAksi != null) {
            btnDaftarAksi.setOnClickListener(v -> {
                String username = etUsernameDaftar.getText().toString().trim();
                String displayName = etDisplayNameDaftar.getText().toString().trim();
                String email = etEmailDaftar.getText().toString().trim();
                String telepon = etTeleponDaftar.getText().toString().trim();
                String password = etPasswordDaftar.getText().toString().trim();
                String konfirmasiPassword = etKonfirmasiPasswordDaftar.getText().toString().trim();

                if (username.isEmpty() || displayName.isEmpty() || email.isEmpty() || telepon.isEmpty() || password.isEmpty() || konfirmasiPassword.isEmpty()) {
                    Toast.makeText(this, "Semua kolom harus diisi!", Toast.LENGTH_SHORT).show();
                    return;
                }

                if (!password.equals(konfirmasiPassword)) {
                    Toast.makeText(this, "Konfirmasi kata sandi tidak cocok!", Toast.LENGTH_SHORT).show();
                    return;
                }

                if (dbHelper.checkUserExists(username) || dbHelper.checkUserExists(email)) {
                    Toast.makeText(this, "Username atau Email sudah terdaftar!", Toast.LENGTH_SHORT).show();
                    return;
                }

                // Menggunakan method insertUser sesuai DatabaseHelper
                boolean insertSuccess = dbHelper.insertUser(username, displayName, email, telepon, password);

                if (insertSuccess) {
                    SharedPreferences.Editor editor = getSharedPreferences("FestNavPrefs", MODE_PRIVATE).edit();
                    editor.putString("display_name", displayName);
                    editor.putString("username", username);
                    editor.putString("email", email);
                    editor.putString("telepon", telepon);
                    editor.apply();

                    Toast.makeText(this, "Pendaftaran Berhasil!", Toast.LENGTH_SHORT).show();

                    Intent intent = new Intent(Daftar.this, Masuk.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    finish();
                } else {
                    Toast.makeText(this, "Pendaftaran Gagal!", Toast.LENGTH_SHORT).show();
                }
            });
        }

        if (btnTabMasuk != null) {
            btnTabMasuk.setOnClickListener(v -> {
                Intent intent = new Intent(Daftar.this, Masuk.class);
                startActivity(intent);
                finish();
            });
        }
    }
}