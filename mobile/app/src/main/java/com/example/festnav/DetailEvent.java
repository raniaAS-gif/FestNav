package com.example.festnav;

import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class DetailEvent extends AppCompatActivity {

    private TextView tvJudulEvent, tvNamaEventLabel, tvTanggalEvent, tvLokasiEvent, tvJenisEvent, tvOrganizer, tvSumber, tvStatus, tvDeskripsi;
    private Button btnBukaMapDay1, btnBukaMapDay2;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_detail_event); // Pastikan nama file XML-mu sesuai

        // 1. Inisialisasi komponen View dari XML
        tvJudulEvent = findViewById(R.id.tvJudulEvent);
        tvNamaEventLabel = findViewById(R.id.tvNamaEventLabel);
        tvTanggalEvent = findViewById(R.id.tvTanggalEvent);
        tvLokasiEvent = findViewById(R.id.tvLokasiEvent);
        tvJenisEvent = findViewById(R.id.tvJenisEvent);
        tvOrganizer = findViewById(R.id.tvOrganizer);
        tvSumber = findViewById(R.id.tvSumber);
        tvStatus = findViewById(R.id.tvStatus);
        tvDeskripsi = findViewById(R.id.tvDeskripsi);

        btnBukaMapDay1 = findViewById(R.id.btnBukaMapDay1);
        btnBukaMapDay2 = findViewById(R.id.btnBukaMapDay2);

        // 2. Tangkap data yang dikirim dari Dashboard (melalui Intent)
        String namaEvent = getIntent().getStringExtra("EXTRA_NAMA_EVENT");
        String tanggal = getIntent().getStringExtra("EXTRA_TANGGAL");
        String lokasi = getIntent().getStringExtra("EXTRA_LOKASI");
        String jenis = getIntent().getStringExtra("EXTRA_JENIS");
        String organizer = getIntent().getStringExtra("EXTRA_ORGANIZER");
        String sumber = getIntent().getStringExtra("EXTRA_SUMBER");
        String status = getIntent().getStringExtra("EXTRA_STATUS");
        String deskripsi = getIntent().getStringExtra("EXTRA_DESKRIPSI");

        // 3. Tampilkan data ke layar jika datanya ada dari backend
        if (namaEvent != null) {
            tvJudulEvent.setText(namaEvent);
            tvNamaEventLabel.setText("Nama Event:\n" + namaEvent);
        }
        if (tanggal != null) {
            tvTanggalEvent.setText("Tanggal Event:\n" + tanggal);
        }
        if (lokasi != null) {
            tvLokasiEvent.setText("Lokasi Event:\n" + lokasi);
        }
        if (jenis != null) {
            tvJenisEvent.setText("Jenis Event:\n" + jenis);
        }
        if (organizer != null) {
            tvOrganizer.setText("Event Organizer: " + organizer);
        }
        if (sumber != null) {
            tvSumber.setText("Sumber: " + sumber);
        }
        if (status != null) {
            tvStatus.setText(status);
        }
        if (deskripsi != null) {
            tvDeskripsi.setText(deskripsi);
        }

        // 4. Aksi Tombol Peta (Bisa diarahkan ke Activity Map / Google Maps nantinya)
        btnBukaMapDay1.setOnClickListener(v -> {
            Toast.makeText(DetailEvent.this, "Membuka Peta Day 1 (Outdoor)", Toast.LENGTH_SHORT).show();
        });

        btnBukaMapDay2.setOnClickListener(v -> {
            Toast.makeText(DetailEvent.this, "Membuka Peta Day 2 (Indoor)", Toast.LENGTH_SHORT).show();
        });
    }
}