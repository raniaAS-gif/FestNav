package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Patterns;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

public class Masuk extends AppCompatActivity {

    private EditText etEmailMasuk, etPasswordMasuk;
    private Button btnMasukAksi;
    private TextView btnLupaSandi, btnTabDaftar;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_masuk);

        mAuth = FirebaseAuth.getInstance();

        etEmailMasuk = findViewById(R.id.etEmailMasuk);
        etPasswordMasuk = findViewById(R.id.etPasswordMasuk);
        btnMasukAksi = findViewById(R.id.btnMasukAksi);
        btnLupaSandi = findViewById(R.id.btnLupaSandi);
        btnTabDaftar = findViewById(R.id.btnTabDaftar);

        btnMasukAksi.setOnClickListener(v -> prosesMasuk());

        btnTabDaftar.setOnClickListener(v -> {
            startActivity(new Intent(Masuk.this, Daftar.class));
            finish();
        });

        btnLupaSandi.setOnClickListener(v ->
                startActivity(new Intent(Masuk.this, LupaSandi.class))
        );
    }

    private void prosesMasuk() {
        String email = etEmailMasuk.getText().toString().trim();
        String password = etPasswordMasuk.getText().toString();

        if (TextUtils.isEmpty(email) || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            etEmailMasuk.setError("Masukkan alamat email yang valid");
            etEmailMasuk.requestFocus();
            return;
        }
        if (TextUtils.isEmpty(password)) {
            etPasswordMasuk.setError("Password wajib diisi");
            etPasswordMasuk.requestFocus();
            return;
        }

        btnMasukAksi.setEnabled(false);

        mAuth.signInWithEmailAndPassword(email, password)
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        FirebaseUser firebaseUser = mAuth.getCurrentUser();
                        if (firebaseUser != null) {
                            firebaseUser.getIdToken(true)
                                    .addOnCompleteListener(tokenTask -> {
                                        btnMasukAksi.setEnabled(true);

                                        SharedPreferences.Editor editor = getSharedPreferences("FestNavPrefs", MODE_PRIVATE).edit();
                                        editor.putString("email", firebaseUser.getEmail() != null ? firebaseUser.getEmail() : email);
                                        editor.putString("firebase_uid", firebaseUser.getUid());

                                        if (tokenTask.isSuccessful() && tokenTask.getResult() != null) {
                                            editor.putString("access_token", tokenTask.getResult().getToken());
                                            editor.putString("token_type", "bearer");
                                        }
                                        editor.apply();

                                        Toast.makeText(Masuk.this, "Berhasil masuk!", Toast.LENGTH_SHORT).show();

                                        Intent intent = new Intent(Masuk.this, Dashboard.class);
                                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                                        startActivity(intent);
                                        finish();
                                    });
                        } else {
                            btnMasukAksi.setEnabled(true);
                            Toast.makeText(Masuk.this, "Data pengguna Firebase tidak ditemukan", Toast.LENGTH_SHORT).show();
                        }
                    } else {
                        btnMasukAksi.setEnabled(true);
                        String errorMsg = (task.getException() != null && task.getException().getMessage() != null)
                                ? task.getException().getMessage()
                                : "Email atau password salah";
                        Toast.makeText(Masuk.this, "Gagal masuk: " + errorMsg, Toast.LENGTH_SHORT).show();
                    }
                });
    }
}