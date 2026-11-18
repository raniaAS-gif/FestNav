package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.firebase.auth.FirebaseAuth;

public class LupaSandi extends AppCompatActivity {

    private FirebaseAuth auth;
    private EditText inputEmail;
    private Button btnKirim;
    private View btnKembaliMasuk, btnKembali;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_lupa_sandi);

        // Inisialisasi Firebase Auth
        auth = FirebaseAuth.getInstance();

        // Menghubungkan variabel dengan ID yang ada di XML kamu
        inputEmail = findViewById(R.id.etEmailLupaSandi);
        btnKirim = findViewById(R.id.btnKirimReset);
        btnKembaliMasuk = findViewById(R.id.btnKembaliMasuk);
        btnKembali = findViewById(R.id.btnKembali);

        // Aksi ketika tombol "Kirim tautan reset" diklik
        btnKirim.setOnClickListener(v -> {
            String email = inputEmail.getText().toString().trim();

            if (email.isEmpty()) {
                inputEmail.setError("Email tidak boleh kosong!");
                inputEmail.requestFocus();
                return;
            }

            // Kirim email reset password via Firebase
            auth.sendPasswordResetEmail(email)
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful()) {
                            Toast.makeText(
                                    LupaSandi.this,
                                    "Instruksi reset sandi telah dikirim ke email Anda. Cek kotak masuk atau spam.",
                                    Toast.LENGTH_LONG
                            ).show();
                            finish(); // Kembali ke halaman sebelumnya
                        } else {
                            Toast.makeText(
                                    LupaSandi.this,
                                    "Gagal mengirim email: " + (task.getException() != null ? task.getException().getMessage() : ""),
                                    Toast.LENGTH_LONG
                            ).show();
                        }
                    });
        });

        // Aksi tambahan untuk tombol kembali/masuk jika ingin diarahkan manual
        View.OnClickListener kembaliListener = v -> finish();
        btnKembali.setOnClickListener(kembaliListener);
        btnKembaliMasuk.setOnClickListener(kembaliListener);
    }
}