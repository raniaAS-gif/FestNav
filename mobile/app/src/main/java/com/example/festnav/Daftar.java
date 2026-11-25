package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Patterns;
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

    private EditText etUsernameDaftar, etDisplayNameDaftar, etEmailDaftar,
            etTeleponDaftar, etPasswordDaftar, etKonfirmasiPasswordDaftar;
    private Button btnDaftarAksi;
    private TextView btnTabMasuk;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_daftar);

        etUsernameDaftar = findViewById(R.id.etUsernameDaftar);
        etDisplayNameDaftar = findViewById(R.id.etDisplayNameDaftar);
        etEmailDaftar = findViewById(R.id.etEmailDaftar);
        etTeleponDaftar = findViewById(R.id.etTeleponDaftar);
        etPasswordDaftar = findViewById(R.id.etPasswordDaftar);
        etKonfirmasiPasswordDaftar = findViewById(R.id.etKonfirmasiPasswordDaftar);
        btnDaftarAksi = findViewById(R.id.btnDaftarAksi);
        btnTabMasuk = findViewById(R.id.btnTabMasuk);

        btnDaftarAksi.setOnClickListener(v -> prosesDaftar());

        btnTabMasuk.setOnClickListener(v -> {
            Intent intent = new Intent(Daftar.this, Masuk.class);
            startActivity(intent);
            finish();
        });
    }

    private void prosesDaftar() {
        String username = etUsernameDaftar.getText().toString().trim();
        String nama = etDisplayNameDaftar.getText().toString().trim();
        String email = etEmailDaftar.getText().toString().trim();
        String telepon = etTeleponDaftar.getText().toString().trim();
        String password = etPasswordDaftar.getText().toString();
        String konfirmasiPassword = etKonfirmasiPasswordDaftar.getText().toString();

        if (username.length() < 3) {
            etUsernameDaftar.setError("Username minimal 3 karakter");
            etUsernameDaftar.requestFocus();
            return;
        }
        if (nama.length() < 2) {
            etDisplayNameDaftar.setError("Display Name minimal 2 karakter");
            etDisplayNameDaftar.requestFocus();
            return;
        }
        if (TextUtils.isEmpty(email) || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            etEmailDaftar.setError("Format email tidak valid");
            etEmailDaftar.requestFocus();
            return;
        }
        if (password.length() < 6) {
            etPasswordDaftar.setError("Password minimal 6 karakter");
            etPasswordDaftar.requestFocus();
            return;
        }
        if (!password.equals(konfirmasiPassword)) {
            etKonfirmasiPasswordDaftar.setError("Konfirmasi password tidak cocok");
            etKonfirmasiPasswordDaftar.requestFocus();
            return;
        }

        String teleponFinal = TextUtils.isEmpty(telepon) ? null : telepon;

        btnDaftarAksi.setEnabled(false);

        RegisterRequest request = new RegisterRequest(nama, username, email, password, teleponFinal);
        ApiService apiService = ApiClient.getClient().create(ApiService.class);

        apiService.registerEventGoers(request).enqueue(new Callback<EventGoersResponse>() {
            @Override
            public void onResponse(Call<EventGoersResponse> call, Response<EventGoersResponse> response) {
                btnDaftarAksi.setEnabled(true);

                if (response.isSuccessful() && response.body() != null) {
                    EventGoersResponse user = response.body();

                    SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
                    prefs.edit()
                            .putInt("id_event_goers", user.getId_event_goers())
                            .putString("nama", user.getNama())
                            .putString("username", user.getUsername())
                            .putString("email", user.getEmail())
                            .putString("nomor_telepon", user.getNomor_telepon())
                            .apply();

                    Toast.makeText(Daftar.this, "Akun berhasil dibuat!", Toast.LENGTH_SHORT).show();

                    Intent intent = new Intent(Daftar.this, Dashboard.class);
                    startActivity(intent);
                    finish();
                } else if (response.code() == 400) {
                    Toast.makeText(Daftar.this, "Username atau email sudah terdaftar", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(Daftar.this, "Pendaftaran gagal (Kode: " + response.code() + ")", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<EventGoersResponse> call, Throwable t) {
                btnDaftarAksi.setEnabled(true);
                Toast.makeText(Daftar.this, "Koneksi gagal: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}