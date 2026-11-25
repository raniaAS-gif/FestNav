package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class EmailSandi extends AppCompatActivity {

    private TextView tvKeteranganEmail;
    private Button btnKembaliKeMasuk;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_email_sandi);

        tvKeteranganEmail = findViewById(R.id.tvKeteranganEmail);
        btnKembaliKeMasuk = findViewById(R.id.btnKembaliKeMasuk);

        String email = getIntent().getStringExtra(LupaSandi.EXTRA_EMAIL);
        if (email != null && !email.isEmpty()) {
            tvKeteranganEmail.setText("Kami telah mengirimkan instruksi pemulihan kata sandi ke " + email + ".");
        }

        btnKembaliKeMasuk.setOnClickListener(v -> {
            Intent intent = new Intent(EmailSandi.this, Masuk.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
        });
    }
}