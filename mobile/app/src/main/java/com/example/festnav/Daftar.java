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
import com.google.firebase.auth.UserProfileChangeRequest;

public class Daftar extends AppCompatActivity {

    private EditText etUsernameDaftar, etDisplayNameDaftar, etEmailDaftar, etTeleponDaftar, etPasswordDaftar, etKonfirmasiPasswordDaftar;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_daftar);

        // Inisialisasi Firebase Auth
        mAuth = FirebaseAuth.getInstance();

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

                if (password.length() < 6) {
                    Toast.makeText(this, "Password minimal harus 6 karakter!", Toast.LENGTH_SHORT).show();
                    return;
                }

                // Daftarkan akun baru langsung ke server Firebase Auth
                mAuth.createUserWithEmailAndPassword(email, password)
                        .addOnCompleteListener(this, task -> {
                            if (task.isSuccessful()) {
                                // Registrasi Berhasil di Firebase, ambil user yang baru dibuat
                                FirebaseUser user = mAuth.getCurrentUser();

                                if (user != null) {
                                    // Update Display Name di profil Firebase
                                    UserProfileChangeRequest profileUpdates = new UserProfileChangeRequest.Builder()
                                            .setDisplayName(displayName)
                                            .build();
                                    user.updateProfile(profileUpdates);
                                }

                                // Simpan data ke SharedPreferences lokal untuk preferensi tampilan
                                SharedPreferences.Editor editor = getSharedPreferences("FestNavPrefs", MODE_PRIVATE).edit();
                                editor.putString("display_name", displayName);
                                editor.putString("username", username);
                                editor.putString("email", email);
                                editor.putString("telepon", telepon);
                                editor.apply();

                                Toast.makeText(this, "Pendaftaran Berhasil!", Toast.LENGTH_SHORT).show();

                                // Pindah ke halaman Masuk
                                Intent intent = new Intent(Daftar.this, Masuk.class);
                                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(intent);
                                finish();
                            } else {
                                // Jika gagal (misal email sudah terdaftar di server atau format salah)
                                String errorMsg = task.getException() != null ? task.getException().getMessage() : "Pendaftaran Gagal";
                                Toast.makeText(this, "Gagal: " + errorMsg, Toast.LENGTH_LONG).show();
                            }
                        });
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