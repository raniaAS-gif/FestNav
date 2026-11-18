package com.example.festnav;

import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.FirebaseAuth;

public class LupaSandi extends AppCompatActivity {

    private static final String TAG = "DEBUG_FESTNAV";

    private EditText etEmailLupa;
    private Button btnKirimReset;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_lupa_sandi);

        // Inisialisasi Firebase Auth
        mAuth = FirebaseAuth.getInstance();

        // Hubungkan komponen UI dengan ID di XML (pastikan ID di XML sesuai)
        etEmailLupa = findViewById(R.id.etEmailLupa);
        btnKirimReset = findViewById(R.id.btnKirimReset);

        // Aksi ketika tombol kirim reset sandi diklik
        btnKirimReset.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String email = etEmailLupa.getText().toString().trim();

                // Validasi input email tidak boleh kosong
                if (TextUtils.isEmpty(email)) {
                    etEmailLupa.setError("Email tidak boleh kosong!");
                    etEmailLupa.requestFocus();
                    return;
                }

                Log.d(TAG, "Mencoba mengirim email reset sandi ke: " + email);

                // Eksekusi fungsi pengiriman email dari Firebase Auth
                mAuth.sendPasswordResetEmail(email)
                        .addOnCompleteListener(new OnCompleteListener<Void>() {
                            @Override
                            public void onComplete(@NonNull Task<Void> task) {
                                if (task.isSuccessful()) {
                                    Log.d(TAG, "Email reset sandi BERHASIL dikirim oleh server Firebase.");
                                    Toast.makeText(LupaSandi.this,
                                            "Instruksi pemulihan sandi telah dikirim ke email. Cek Kotak Masuk / Spam!",
                                            Toast.LENGTH_LONG).show();
                                } else {
                                    Log.e(TAG, "GAGAL mengirim email reset: ", task.getException());
                                    String errorMessage = task.getException() != null ?
                                            task.getException().getMessage() : "Terjadi kesalahan.";
                                    Toast.makeText(LupaSandi.this,
                                            "Gagal mengirim: " + errorMessage,
                                            Toast.LENGTH_LONG).show();
                                }
                            }
                        });
            }
        });
    }
}