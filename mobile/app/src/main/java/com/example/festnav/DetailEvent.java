package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.festnav.api.ApiClient;
import com.example.festnav.api.ApiService;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DetailEvent extends AppCompatActivity {

    public static final String EXTRA_EVENT_ID = "extra_event_id";

    private TextView tvJudulEvent, tvNamaEventLabel, tvTanggalEvent, tvLokasiEvent,
            tvJenisEvent, tvOrganizer, tvSumber, tvStatus, tvDeskripsi;
    private Button btnBukaMapDay1, btnBukaMapDay2;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_detail_event);

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

        btnBukaMapDay1.setOnClickListener(v ->
                startActivity(new Intent(DetailEvent.this, Peta.class))
        );
        btnBukaMapDay2.setOnClickListener(v ->
                startActivity(new Intent(DetailEvent.this, Peta.class))
        );

        int idEvent = getIntent().getIntExtra(EXTRA_EVENT_ID, -1);
        if (idEvent <= 0) {
            tvJudulEvent.setText("Detail Event");
            tvStatus.setText("Tanpa ID");
            tvDeskripsi.setText("ID event belum dikirim ke halaman detail.");
            return;
        }

        muatDetailEvent(idEvent);
    }

    private void muatDetailEvent(int idEvent) {
        ApiService apiService = ApiClient.getClient().create(ApiService.class);
        apiService.getEventDetail(idEvent).enqueue(new Callback<EventResponse>() {
            @Override
            public void onResponse(@NonNull Call<EventResponse> call, @NonNull Response<EventResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    tampilkanDetail(response.body());
                } else if (response.code() == 404) {
                    tvJudulEvent.setText("Event tidak ditemukan");
                    tvStatus.setText("404");
                    tvDeskripsi.setText("Data event tidak tersedia atau belum dipublikasikan.");
                } else {
                    tvStatus.setText("Error " + response.code());
                    Toast.makeText(DetailEvent.this, "Gagal memuat detail (Kode: " + response.code() + ")", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<EventResponse> call, @NonNull Throwable t) {
                tvStatus.setText("Offline");
                Toast.makeText(DetailEvent.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void tampilkanDetail(EventResponse ev) {
        String judul = !TextUtils.isEmpty(ev.getNama_event()) ? ev.getNama_event() : "-";
        String tanggal = formatRentangTanggal(ev.getTanggal_mulai(), ev.getTanggal_selesai());
        String lokasi = !TextUtils.isEmpty(ev.getLokasi()) ? ev.getLokasi() : "-";
        String jenis = !TextUtils.isEmpty(ev.getJenis_event()) ? ev.getJenis_event() : "-";
        String organizer = !TextUtils.isEmpty(ev.getNama_organizer()) ? ev.getNama_organizer() : "-";
        String sumber = !TextUtils.isEmpty(ev.getSumber()) ? ev.getSumber() : "-";
        String status = !TextUtils.isEmpty(ev.getStatus_event()) ? ev.getStatus_event() : "-";
        String deskripsi = !TextUtils.isEmpty(ev.getDeskripsi()) ? ev.getDeskripsi() : "Tidak ada deskripsi.";

        tvJudulEvent.setText(judul);
        tvNamaEventLabel.setText("Nama Event:\n" + judul);
        tvTanggalEvent.setText("Tanggal Event:\n" + tanggal);
        tvLokasiEvent.setText("Lokasi Event:\n" + lokasi);
        tvJenisEvent.setText("Jenis Event:\n" + jenis);
        tvOrganizer.setText("Event Organizer: " + organizer);
        tvSumber.setText("Sumber: " + sumber);
        tvStatus.setText(status);
        tvDeskripsi.setText(deskripsi);
    }

    private String formatRentangTanggal(String mulai, String selesai) {
        boolean adaMulai = !TextUtils.isEmpty(mulai);
        boolean adaSelesai = !TextUtils.isEmpty(selesai);
        if (adaMulai && adaSelesai && !mulai.equals(selesai)) {
            return mulai + " s/d " + selesai;
        }
        if (adaMulai) {
            return mulai;
        }
        if (adaSelesai) {
            return selesai;
        }
        return "-";
    }
}