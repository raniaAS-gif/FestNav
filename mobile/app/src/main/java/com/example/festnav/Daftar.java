package com.example.festnav;

import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

import com.example.festnav.api.ApiClient;
import com.example.festnav.api.ApiService;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Daftar extends AppCompatActivity {

    private EditText etUsernameDaftar, etDisplayNameDaftar, etEmailDaftar, etTeleponDaftar, etPasswordDaftar, etKonfirmasiPasswordDaftar;
    private Button btnDaftarAksi;
    private TextView btnTabMasuk;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_daftar);

        // 1. Inisialisasi komponen berdasarkan ID di XML
        etUsernameDaftar = findViewById(R.id.etUsernameDaftar);
        etDisplayNameDaftar = findViewById(R.id.etDisplayNameDaftar);
        etEmailDaftar = findViewById(R.id.etEmailDaftar);
        etTeleponDaftar = findViewById(R.id.etTeleponDaftar);
        etPasswordDaftar = findViewById(R.id.etPasswordDaftar);
        etKonfirmasiPasswordDaftar = findViewById(R.id.etKonfirmasiPasswordDaftar);
        btnDaftarAksi = findViewById(R.id.btnDaftarAksi);
        btnTabMasuk = findViewById(R.id.btnTabMasuk);

        // 2. Aksi ketika tombol Daftar diklik
        btnDaftarAksi.setOnClickListener(v -> {
            String username = etUsernameDaftar.getText().toString().trim();
            String displayName = etDisplayNameDaftar.getText().toString().trim();
            String email = etEmailDaftar.getText().toString().trim();
            String telepon = etTeleponDaftar.getText().toString().trim();
            String password = etPasswordDaftar.getText().toString().trim();
            String konfirmasiPassword = etKonfirmasiPasswordDaftar.getText().toString().trim();

            // Validasi agar tidak ada kolom yang kosong
            if (username.isEmpty() || displayName.isEmpty() || email.isEmpty() || telepon.isEmpty() || password.isEmpty() || konfirmasiPassword.isEmpty()) {
                Toast.makeText(Daftar.this, "Semua kolom harus diisi!", Toast.LENGTH_SHORT).show();
                return;
            }

            // Validasi kecocokan password
            if (!password.equals(konfirmasiPassword)) {
                Toast.makeText(Daftar.this, "Password dan Konfirmasi Password tidak sama!", Toast.LENGTH_SHORT).show();
                return;
            }

            // Panggil proses API Register
            prosesRegister(username, displayName, email, telepon, password);
        });

        // 3. Aksi kembali ke halaman Masuk
        if (btnTabMasuk != null) {
            btnTabMasuk.setOnClickListener(v -> {
                finish();
            });
        }
    }

    private void prosesRegister(String username, String displayName, String email, String telepon, String password) {
        RegisterRequest request = new RegisterRequest(username, displayName, email, telepon, password);
        ApiService apiService = ApiClient.getClient().create(ApiService.class);

        // Menggunakan Callback<Object> agar selaras dengan ApiService.java
        apiService.registerUser(request).enqueue(new Callback<Object>() {
            @Override
            public void onResponse(Call<Object> call, Response<Object> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Toast.makeText(Daftar.this, "Registrasi Berhasil! Silakan Masuk.", Toast.LENGTH_LONG).show();
                    finish();
                } else {
                    // Menangkap pesan error mentah dari server FastAPI
                    try {
                        String errorBody = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
                        Log.e("API_DAFTAR", "Gagal Register | Kode: " + response.code() + " | Pesan: " + errorBody);
                        Toast.makeText(Daftar.this, "Gagal (Kode " + response.code() + "). Cek Logcat!", Toast.LENGTH_LONG).show();
                    } catch (Exception e) {
                        e.printStackTrace();
                        Toast.makeText(Daftar.this, "Pendaftaran gagal.", Toast.LENGTH_SHORT).show();
                    }
                }
            }

            @Override
            public void onFailure(Call<Object> call, Throwable t) {
                Log.e("API_DAFTAR", "Koneksi Error: " + t.getMessage());
                Toast.makeText(Daftar.this, "Gagal terhubung ke server: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}