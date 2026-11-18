package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

public class Masuk extends AppCompatActivity {

    private EditText etEmailMasuk, etPasswordMasuk;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_masuk);

        // Inisialisasi Firebase Auth
        mAuth = FirebaseAuth.getInstance();

        // Menyesuaikan ID dengan XML layout activity_masuk.xml
        etEmailMasuk = findViewById(R.id.etEmailMasuk);
        etPasswordMasuk = findViewById(R.id.etPasswordMasuk);
        TextView btnLupaSandi = findViewById(R.id.btnLupaSandi);
        Button btnMasukAksi = findViewById(R.id.btnMasukAksi);
        TextView btnTabDaftar = findViewById(R.id.btnTabDaftar);

        // Tombol Masuk diklik
        if (btnMasukAksi != null) {
            btnMasukAksi.setOnClickListener(v -> {
                String emailInput = etEmailMasuk.getText().toString().trim();
                String passwordInput = etPasswordMasuk.getText().toString().trim();

                if (emailInput.isEmpty() || passwordInput.isEmpty()) {
                    Toast.makeText(this, "Email dan Password harus diisi!", Toast.LENGTH_SHORT).show();
                    return;
                }

                // Autentikasi langsung ke server online Firebase Auth
                mAuth.signInWithEmailAndPassword(emailInput, passwordInput)
                        .addOnCompleteListener(this, task -> {
                            if (task.isSuccessful()) {
                                // Ambil data user yang sedang login dari Firebase
                                FirebaseUser currentUser = mAuth.getCurrentUser();
                                if (currentUser != null) {
                                    String userEmail = currentUser.getEmail();
                                    String displayName = currentUser.getDisplayName();
                                    if (displayName == null || displayName.isEmpty()) {
                                        displayName = "Pengunjung";
                                    }

                                    // Simpan ke SharedPreferences lokal untuk ditampilkan di profil/dashboard
                                    SharedPreferences.Editor editor = getSharedPreferences("FestNavPrefs", MODE_PRIVATE).edit();
                                    editor.putString("display_name", displayName);
                                    editor.putString("email", userEmail);
                                    editor.apply();
                                }

                                Toast.makeText(this, "Login Berhasil!", Toast.LENGTH_SHORT).show();

                                // Pindah ke Dashboard dan bersihkan stack activity
                                Intent intent = new Intent(Masuk.this, Dashboard.class);
                                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                                startActivity(intent);
                                finish();
                            } else {
                                // Jika password salah atau gagal login
                                String errorMsg = task.getException() != null ? task.getException().getMessage() : "Gagal masuk";
                                Toast.makeText(this, "Login Gagal: " + errorMsg, Toast.LENGTH_LONG).show();
                            }
                        });
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