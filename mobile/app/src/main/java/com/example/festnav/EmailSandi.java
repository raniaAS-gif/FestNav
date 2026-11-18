package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class EmailSandi extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_email_sandi);

        // Menyesuaikan ID dengan XML (tvKeteranganEmail)
        TextView tvKeteranganEmail = findViewById(R.id.tvKeteranganEmail);
        Button btnKembaliKeMasuk = findViewById(R.id.btnKembaliKeMasuk);

        // Ambil email yang dikirim dari halaman LupaSandi (jika ada)
        String emailTujuan = getIntent().getStringExtra("EMAIL_TUJUAN");
        if (emailTujuan != null && !emailTujuan.isEmpty()) {
            tvKeteranganEmail.setText("Kami telah mengirimkan instruksi pemulihan kata sandi ke email:\n" + emailTujuan);
        }

        // Tombol kembali ke halaman Masuk
        if (btnKembaliKeMasuk != null) {
            btnKembaliKeMasuk.setOnClickListener(v -> {
                Intent intent = new Intent(EmailSandi.this, Masuk.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(intent);
                finish();
            });
        }
    }
}