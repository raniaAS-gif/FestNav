package com.example.festnav;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class Dashboard extends AppCompatActivity {

    public static final String EXTRA_SEARCH_QUERY = "extra_search_query";

    private TextView tvWelcomeDashboard, tvCardTitle1, tvCardDesc1;
    private EditText etSearchEvent;
    private Button btnKunjungiFavorit, btnJelajahiSekitar;
    private TextView navEvent, navPeta, navFavorit, navProfil;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        tvWelcomeDashboard = findViewById(R.id.tvWelcomeDashboard);
        tvCardTitle1 = findViewById(R.id.tvCardTitle1);
        tvCardDesc1 = findViewById(R.id.tvCardDesc1);
        etSearchEvent = findViewById(R.id.etSearchEvent);
        btnKunjungiFavorit = findViewById(R.id.btnKunjungiFavorit);
        btnJelajahiSekitar = findViewById(R.id.btnJelajahiSekitar);

        navEvent = findViewById(R.id.navEvent);
        navPeta = findViewById(R.id.navPeta);
        navFavorit = findViewById(R.id.navFavorit);
        navProfil = findViewById(R.id.navProfil);

        tampilkanSapaanUser();
        setupAksiKonten();
        setupNavigasiBawah();
    }

    private void tampilkanSapaanUser() {
        SharedPreferences prefs = getSharedPreferences("FestNavPrefs", MODE_PRIVATE);
        String nama = prefs.getString("nama", "");
        String username = prefs.getString("username", "");

        if (!TextUtils.isEmpty(nama)) {
            tvWelcomeDashboard.setText("Selamat datang\n" + nama);
        } else if (!TextUtils.isEmpty(username)) {
            tvWelcomeDashboard.setText("Selamat datang\n@" + username);
        } else {
            tvWelcomeDashboard.setText("Selamat datang\nPengunjung");
        }
    }

    private void setupAksiKonten() {
        etSearchEvent.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH || actionId == EditorInfo.IME_ACTION_DONE) {
                String kataKunci = etSearchEvent.getText().toString().trim();
                Intent intent = new Intent(Dashboard.this, Event.class);
                intent.putExtra(EXTRA_SEARCH_QUERY, kataKunci);
                startActivity(intent);
                return true;
            }
            return false;
        });

        // Diarahkan ke Event sesuai kebutuhan alur map
        btnKunjungiFavorit.setOnClickListener(v ->
                startActivity(new Intent(Dashboard.this, Event.class))
        );

        btnJelajahiSekitar.setOnClickListener(v ->
                startActivity(new Intent(Dashboard.this, Peta.class))
        );

        tvCardTitle1.setOnClickListener(v ->
                Toast.makeText(this, tvCardTitle1.getText().toString(), Toast.LENGTH_SHORT).show()
        );
    }

    private void setupNavigasiBawah() {
        navEvent.setOnClickListener(v ->
                startActivity(new Intent(Dashboard.this, Event.class))
        );

        navPeta.setOnClickListener(v ->
                startActivity(new Intent(Dashboard.this, Peta.class))
        );

        navFavorit.setOnClickListener(v ->
                startActivity(new Intent(Dashboard.this, Favorit1.class))
        );

        navProfil.setOnClickListener(v ->
                startActivity(new Intent(Dashboard.this, Profil.class))
        );
    }
}