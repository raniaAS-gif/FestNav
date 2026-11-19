package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

import com.example.festnav.api.ApiClient;
import com.example.festnav.api.ApiService;

import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Dashboard extends AppCompatActivity {

    private TextView tvCardTitle1, tvCardDesc1;
    private EventResponse eventPertamaGlobal;
    private String namaUserGlobal = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        // 1. Inisialisasi View
        TextView tvWelcomeDashboard = findViewById(R.id.tvWelcomeDashboard);
        Button btnKunjungiFavorit = findViewById(R.id.btnKunjungiFavorit);
        Button btnJelajahiSekitar = findViewById(R.id.btnJelajahiSekitar);

        TextView navEvent = findViewById(R.id.navEvent);
        TextView navPeta = findViewById(R.id.navPeta);
        TextView navFavorit = findViewById(R.id.navFavorit);
        TextView navProfil = findViewById(R.id.navProfil);

        tvCardTitle1 = findViewById(R.id.tvCardTitle1);
        tvCardDesc1 = findViewById(R.id.tvCardDesc1);

        // 2. Tangkap Username yang dikirim dari Login/Register
        namaUserGlobal = getIntent().getStringExtra("EXTRA_USERNAME");
        if (namaUserGlobal == null || namaUserGlobal.isEmpty()) {
            namaUserGlobal = getIntent().getStringExtra("EXTRA_NAME");
        }

        if (namaUserGlobal != null && !namaUserGlobal.isEmpty()) {
            tvWelcomeDashboard.setText("Selamat datang\n@" + namaUserGlobal);
        } else {
            tvWelcomeDashboard.setText("Selamat datang\n@festnav_user");
        }

        // 3. Ambil data event dari backend FastAPI
        ambilDataEventDariServer();

        // 4. Aksi Tombol Card Event (Mengarahkan ke DetailEvent dengan membawa data dari backend)
        btnKunjungiFavorit.setOnClickListener(v -> {
            if (eventPertamaGlobal != null) {
                Intent intent = new Intent(Dashboard.this, DetailEvent.class);
                intent.putExtra("EXTRA_NAMA_EVENT", eventPertamaGlobal.getNamaEvent());
                intent.putExtra("EXTRA_TANGGAL", eventPertamaGlobal.getTanggal());
                intent.putExtra("EXTRA_LOKASI", eventPertamaGlobal.getLokasi());
                intent.putExtra("EXTRA_JENIS", eventPertamaGlobal.getJenis());
                intent.putExtra("EXTRA_ORGANIZER", eventPertamaGlobal.getOrganizer());
                intent.putExtra("EXTRA_SUMBER", eventPertamaGlobal.getSumber());
                intent.putExtra("EXTRA_STATUS", eventPertamaGlobal.getStatus());
                intent.putExtra("EXTRA_DESKRIPSI", eventPertamaGlobal.getDeskripsi());
                startActivity(intent);
            } else {
                Toast.makeText(Dashboard.this, "Data event belum dimuat dari server", Toast.LENGTH_SHORT).show();
            }
        });

        btnJelajahiSekitar.setOnClickListener(v -> {
            if (eventPertamaGlobal != null) {
                Intent intent = new Intent(Dashboard.this, DetailEvent.class);
                intent.putExtra("EXTRA_NAMA_EVENT", eventPertamaGlobal.getNamaEvent());
                intent.putExtra("EXTRA_TANGGAL", eventPertamaGlobal.getTanggal());
                intent.putExtra("EXTRA_LOKASI", eventPertamaGlobal.getLokasi());
                intent.putExtra("EXTRA_JENIS", eventPertamaGlobal.getJenis());
                intent.putExtra("EXTRA_ORGANIZER", eventPertamaGlobal.getOrganizer());
                intent.putExtra("EXTRA_SUMBER", eventPertamaGlobal.getSumber());
                intent.putExtra("EXTRA_STATUS", eventPertamaGlobal.getStatus());
                intent.putExtra("EXTRA_DESKRIPSI", eventPertamaGlobal.getDeskripsi());
                startActivity(intent);
            } else {
                Toast.makeText(Dashboard.this, "Data event belum dimuat dari server", Toast.LENGTH_SHORT).show();
            }
        });

        // 5. Navigasi Bawah (Di-link ke class: Event, Peta, Favorit1, Profil)
        navEvent.setOnClickListener(v -> {
            Intent intent = new Intent(Dashboard.this, Event.class);
            startActivity(intent);
        });

        navPeta.setOnClickListener(v -> {
            Intent intent = new Intent(Dashboard.this, Peta.class);
            startActivity(intent);
        });

        navFavorit.setOnClickListener(v -> {
            Intent intent = new Intent(Dashboard.this, Favorit1.class);
            startActivity(intent);
        });

        navProfil.setOnClickListener(v -> {
            Intent intent = new Intent(Dashboard.this, Profil.class);
            intent.putExtra("EXTRA_USERNAME", namaUserGlobal);
            startActivity(intent);
        });
    }

    private void ambilDataEventDariServer() {
        ApiService apiService = ApiClient.getClient().create(ApiService.class);

        apiService.getAllEvents().enqueue(new Callback<List<EventResponse>>() {
            @Override
            public void onResponse(Call<List<EventResponse>> call, Response<List<EventResponse>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    List<EventResponse> listEvent = response.body();
                    if (!listEvent.isEmpty()) {
                        eventPertamaGlobal = listEvent.get(0);

                        String nama = eventPertamaGlobal.getNamaEvent();
                        String deskripsi = eventPertamaGlobal.getDeskripsi();

                        if (tvCardTitle1 != null && nama != null) {
                            tvCardTitle1.setText(nama);
                        }
                        if (tvCardDesc1 != null && deskripsi != null) {
                            tvCardDesc1.setText(deskripsi);
                        }

                        Log.d("API_EVENT", "Berhasil memuat event: " + nama);
                    }
                } else {
                    Log.e("API_EVENT", "Gagal memuat event. Kode: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<List<EventResponse>> call, Throwable t) {
                Log.e("API_EVENT", "Koneksi Error: " + t.getMessage());
            }
        });
    }
}