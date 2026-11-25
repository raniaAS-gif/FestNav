package com.example.festnav;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Patterns;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;

public class LupaSandi extends AppCompatActivity {

    public static final String EXTRA_EMAIL = "extra_email";

    private EditText etEmailLupa;
    private Button btnKirimReset;
    private TextView btnKembali, btnMasukLupa;
    private FirebaseAuth mAuth;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_lupa_sandi);

        mAuth = FirebaseAuth.getInstance();

        etEmailLupa = findViewById(R.id.etEmailLupa);
        btnKirimReset = findViewById(R.id.btnKirimReset);
        btnKembali = findViewById(R.id.btnKembali);
        btnMasukLupa = findViewById(R.id.btnMasukLupa);

        btnKembali.setOnClickListener(v -> finish());

        btnMasukLupa.setOnClickListener(v -> {
            Intent intent = new Intent(LupaSandi.this, Masuk.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
            finish();
        });

        btnKirimReset.setOnClickListener(v -> prosesKirimReset());
    }

    private void prosesKirimReset() {
        String email = etEmailLupa.getText().toString().trim();

        if (TextUtils.isEmpty(email) || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            etEmailLupa.setError("Masukkan alamat email yang valid");
            etEmailLupa.requestFocus();
            return;
        }

        btnKirimReset.setEnabled(false);

        mAuth.sendPasswordResetEmail(email)
                .addOnCompleteListener(task -> {
                    btnKirimReset.setEnabled(true);

                    if (task.isSuccessful()) {
                        Toast.makeText(
                                LupaSandi.this,
                                "Link reset password telah dikirim ke " + email,
                                Toast.LENGTH_LONG
                        ).show();

                        Intent intent = new Intent(LupaSandi.this, EmailSandi.class);
                        intent.putExtra(EXTRA_EMAIL, email);
                        startActivity(intent);
                    } else {
                        String errorMsg = (task.getException() != null && task.getException().getMessage() != null)
                                ? task.getException().getMessage()
                                : "Gagal mengirim email reset password";
                        Toast.makeText(LupaSandi.this, errorMsg, Toast.LENGTH_SHORT).show();
                    }
                });
    }
}