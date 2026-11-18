package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class Masuk extends AppCompatActivity {

    private EditText etEmailMasuk, etPasswordMasuk;
    private DatabaseHelper dbHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_masuk);

        dbHelper = new DatabaseHelper(this);

        // Menyesuaikan ID dengan XML layout activity_masuk.xml
        etEmailMasuk = findViewById(R.id.etEmailMasuk);
        etPasswordMasuk = findViewById(R.id.etPasswordMasuk);
        TextView btnLupaSandi = findViewById(R.id.btnLupaSandi);
        Button btnMasukAksi = findViewById(R.id.btnMasukAksi);
        TextView btnTabDaftar = findViewById(R.id.btnTabDaftar);

        // Tombol Masuk diklik
        if (btnMasukAksi != null) {
            btnMasukAksi.setOnClickListener(v -> {
                String inputUser = etEmailMasuk.getText().toString().trim();
                String passwordInput = etPasswordMasuk.getText().toString().trim();

                if (inputUser.isEmpty() || passwordInput.isEmpty()) {
                    Toast.makeText(this, "Email/Username dan Password harus diisi!", Toast.LENGTH_SHORT).show();
                    return;
                }

                // Cek kredensial menggunakan method checkUser di DatabaseHelper
                boolean isValid = dbHelper.checkUser(inputUser, passwordInput);

                if (isValid) {
                    // Ambil data lengkap user menggunakan getUserData untuk SharedPreferences
                    DatabaseHelper.UserData userData = dbHelper.getUserData(inputUser);

                    if (userData != null) {
                        SharedPreferences.Editor editor = getSharedPreferences("FestNavPrefs", MODE_PRIVATE).edit();
                        editor.putString("display_name", userData.displayName);
                        editor.putString("username", userData.username);
                        editor.putString("email", userData.email);
                        editor.putString("telepon", userData.telepon);
                        editor.apply();
                    }

                    Toast.makeText(this, "Login Berhasil!", Toast.LENGTH_SHORT).show();

                    // Pindah ke Dashboard dan bersihkan stack activity
                    Intent intent = new Intent(Masuk.this, Dashboard.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                    finish();
                } else {
                    Toast.makeText(this, "Email/Username atau Kata Sandi salah!", Toast.LENGTH_SHORT).show();
                }
            });
        }

        // Tombol Lupa Sandi diklik
        if (btnLupaSandi != null) {
            btnLupaSandi.setOnClickListener(v -> {
                Intent intent = new Intent(Masuk.this, LupaSandi.class);
                startActivity(intent);
            });
        }

        // Tombol Pindah ke Daftar diklik
        if (btnTabDaftar != null) {
            btnTabDaftar.setOnClickListener(v -> {
                Intent intent = new Intent(Masuk.this, Daftar.class);
                startActivity(intent);
            });
        }
    }
}