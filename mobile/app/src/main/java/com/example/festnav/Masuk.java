package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
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

public class Masuk extends AppCompatActivity {

    private EditText etEmailMasuk, etPasswordMasuk;
    private Button btnMasukAksi;
    private TextView btnTabDaftar, btnLupaSandi;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_masuk); // Pastikan nama file XML-mu sesuai

        // 1. Inisialisasi komponen sesuai ID di XML-mu
        etEmailMasuk = findViewById(R.id.etEmailMasuk);
        etPasswordMasuk = findViewById(R.id.etPasswordMasuk);
        btnMasukAksi = findViewById(R.id.btnMasukAksi);
        btnTabDaftar = findViewById(R.id.btnTabDaftar);
        btnLupaSandi = findViewById(R.id.btnLupaSandi);

        // 2. Aksi ketika tombol Masuk diklik
        btnMasukAksi.setOnClickListener(v -> {
            String email = etEmailMasuk.getText().toString().trim();
            String password = etPasswordMasuk.getText().toString().trim();

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(Masuk.this, "Email dan password tidak boleh kosong!", Toast.LENGTH_SHORT).show();
                return;
            }

            // Panggil proses koneksi API Login
            prosesLogin(email, password);
        });

        // 3. (Opsional) Aksi jika teks "Belum punya akun? Daftar di sini" diklik untuk pindah halaman
        btnTabDaftar.setOnClickListener(v -> {
            startActivity(new Intent(Masuk.this, Daftar.class));
        });
    }

    private void prosesLogin(String email, String password) {
        LoginRequest request = new LoginRequest(email, password);
        ApiService apiService = ApiClient.getClient().create(ApiService.class);

        apiService.loginUser(request).enqueue(new Callback<AuthResponse>() {
            @Override
            public void onResponse(Call<AuthResponse> call, Response<AuthResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Toast.makeText(Masuk.this, "Login Berhasil!", Toast.LENGTH_SHORT).show();

                    // Berhasil masuk, arahkan ke Dashboard
                    startActivity(new Intent(Masuk.this, Dashboard.class));
                    finish();
                } else {
                    Toast.makeText(Masuk.this, "Email atau password salah!", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<AuthResponse> call, Throwable t) {
                Toast.makeText(Masuk.this, "Gagal terhubung ke server: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}