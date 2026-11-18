package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class DetailEvent extends AppCompatActivity {

    View btnKembaliDetail, btnBukaMap1, btnBukaMap2;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_detail_event);

        // Menghubungkan variabel dengan ID di XML
        btnKembaliDetail = findViewById(R.id.btnKembaliDetail);
        btnBukaMap1 = findViewById(R.id.btnBukaMap1);
        btnBukaMap2 = findViewById(R.id.btnBukaMap2);

        // 1. Tombol Panah Kembali (<) diklik -> Kembali ke halaman sebelumnya (Dashboard)
        btnKembaliDetail.setOnClickListener(v -> {
            finish();
        });

        // 2. Tombol "Buka Map" Hari 1 diklik
        btnBukaMap1.setOnClickListener(v -> {
            Toast.makeText(this, "Membuka Peta Lokasi Day 1", Toast.LENGTH_SHORT).show();
            // Jika ingin mengarahkan ke activity peta:
            // Intent intent = new Intent(DetailEvent.this, DenahIndoor.class);
            // startActivity(intent);
        });

        // 3. Tombol "Buka Map" Hari 2 diklik
        btnBukaMap2.setOnClickListener(v -> {
            Toast.makeText(this, "Membuka Peta Lokasi Day 2", Toast.LENGTH_SHORT).show();
        });
    }
}