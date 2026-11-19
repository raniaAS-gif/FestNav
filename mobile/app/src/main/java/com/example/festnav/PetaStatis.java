package com.example.festnav;

import android.app.Dialog;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.AppCompatButton;

import com.bumptech.glide.Glide;

import java.util.ArrayList;
import java.util.List;

public class PetaStatis extends AppCompatActivity {

    private static class LokasiDenahItem {
        String nama;
        String keterangan;
        String imageUrl;
        int accentColor;

        LokasiDenahItem(String nama, String keterangan, String imageUrl, int accentColor) {
            this.nama = nama;
            this.keterangan = keterangan;
            this.imageUrl = imageUrl;
            this.accentColor = accentColor;
        }
    }

    private final String MAIN_DENAH_URL = "https://res.cloudinary.com/demo/image/upload/v1/festnav_denah_utama.png";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.peta_statis);

        TextView tvEventTitle = findViewById(R.id.tvDirektoriEventTitle);
        ImageView ivMainDenah = findViewById(R.id.ivMainDenahStatis);
        AppCompatButton btnBukaGambarUtama = findViewById(R.id.btnBukaGambarUtama);
        LinearLayout containerLokasi = findViewById(R.id.containerLokasiDenah);

        setupBottomNavbar();

        if (getIntent() != null && getIntent().getStringExtra("NAMA_EVENT") != null && tvEventTitle != null) {
            tvEventTitle.setText(getIntent().getStringExtra("NAMA_EVENT"));
        }

        Bitmap mainFallback = createPlaceholderBanner("Denah Utama Gedung Pameran", Color.parseColor("#4F46E5"));
        ivMainDenah.setImageBitmap(mainFallback);
        Glide.with(this)
                .load(MAIN_DENAH_URL)
                .placeholder(new android.graphics.drawable.BitmapDrawable(getResources(), mainFallback))
                .error(new android.graphics.drawable.BitmapDrawable(getResources(), mainFallback))
                .into(ivMainDenah);

        btnBukaGambarUtama.setOnClickListener(v ->
                showImagePreviewDialog("Denah Utama Gedung Pameran", MAIN_DENAH_URL, mainFallback)
        );

        List<LokasiDenahItem> daftarLokasi = new ArrayList<>();
        daftarLokasi.add(new LokasiDenahItem("Hall Utama", "Area Panggung & Pertunjukan Utama",
                "https://res.cloudinary.com/demo/image/upload/v1/hall_utama.png", Color.parseColor("#9333EA")));
        daftarLokasi.add(new LokasiDenahItem("Toilet Umum", "Koridor Utara Dekat Hall Utama",
                "https://res.cloudinary.com/demo/image/upload/v1/toilet_umum.png", Color.parseColor("#0D9488")));
        daftarLokasi.add(new LokasiDenahItem("VIP Room", "Sayap Timur Lantai 2",
                "https://res.cloudinary.com/demo/image/upload/v1/vip_room.png", Color.parseColor("#B45309")));
        daftarLokasi.add(new LokasiDenahItem("Bazar dan Pameran", "Zona Booth & Tenant Kuliner",
                "https://res.cloudinary.com/demo/image/upload/v1/bazar_pameran.png", Color.parseColor("#16A34A")));
        daftarLokasi.add(new LokasiDenahItem("Registrasi", "Meja Check-in Pengunjung",
                "https://res.cloudinary.com/demo/image/upload/v1/registrasi.png", Color.parseColor("#B91C1C")));

        for (LokasiDenahItem item : daftarLokasi) {
            addLokasiCard(containerLokasi, item);
        }
    }

    private void setupBottomNavbar() {
        View tabEvent = findViewById(R.id.navTabEvent);
        if (tabEvent != null) {
            tabEvent.setOnClickListener(v -> {
                Intent intent = new Intent(this, Event.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(intent);
                finish();
            });
        }

        View tabPeta = findViewById(R.id.navTabPeta);
        if (tabPeta != null) {
            tabPeta.setOnClickListener(v -> {
                startActivity(new Intent(this, PetaDinamis.class));
                finish();
            });
        }

        View tabProfil = findViewById(R.id.navTabProfil);
        if (tabProfil != null) {
            tabProfil.setOnClickListener(v -> {
                startActivity(new Intent(this, Profil.class));
                finish();
            });
        }
    }

    private void addLokasiCard(LinearLayout parent, LokasiDenahItem item) {
        int dp12 = dpToPx(12);
        int dp14 = dpToPx(14);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card_rounded);
        card.setPadding(dp14, dp14, dp14, dp14);

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        cardParams.bottomMargin = dp14;
        card.setLayoutParams(cardParams);

        TextView tvNama = new TextView(this);
        tvNama.setText(item.nama);
        tvNama.setTextColor(Color.parseColor("#111827"));
        tvNama.setTextSize(15f);
        tvNama.setTypeface(Typeface.DEFAULT_BOLD);
        card.addView(tvNama);

        TextView tvKet = new TextView(this);
        tvKet.setText(item.keterangan);
        tvKet.setTextColor(Color.parseColor("#6B7280"));
        tvKet.setTextSize(12f);
        card.addView(tvKet);

        ImageView ivFoto = new ImageView(this);
        LinearLayout.LayoutParams imgParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dpToPx(130)
        );
        imgParams.topMargin = dp12;
        ivFoto.setLayoutParams(imgParams);
        ivFoto.setScaleType(ImageView.ScaleType.CENTER_CROP);

        Bitmap fallback = createPlaceholderBanner(item.nama, item.accentColor);
        ivFoto.setImageBitmap(fallback);
        Glide.with(this)
                .load(item.imageUrl)
                .placeholder(new android.graphics.drawable.BitmapDrawable(getResources(), fallback))
                .error(new android.graphics.drawable.BitmapDrawable(getResources(), fallback))
                .into(ivFoto);
        card.addView(ivFoto);

        AppCompatButton btnBuka = new AppCompatButton(this);
        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dpToPx(42)
        );
        btnParams.topMargin = dp12;
        btnBuka.setLayoutParams(btnParams);
        btnBuka.setBackgroundResource(R.drawable.bg_pill_indigo);
        btnBuka.setText("Buka Gambar");
        btnBuka.setAllCaps(false);
        btnBuka.setTextColor(Color.WHITE);
        btnBuka.setTextSize(14f);
        btnBuka.setTypeface(Typeface.DEFAULT_BOLD);
        btnBuka.setOnClickListener(v -> showImagePreviewDialog(item.nama, item.imageUrl, fallback));
        card.addView(btnBuka);

        parent.addView(card);
    }

    private void showImagePreviewDialog(String title, String imageUrl, Bitmap fallback) {
        Dialog dialog = new Dialog(this);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

        LinearLayout wrapper = new LinearLayout(this);
        wrapper.setOrientation(LinearLayout.VERTICAL);
        wrapper.setBackgroundResource(R.drawable.bg_card_rounded);
        wrapper.setPadding(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(16));
        wrapper.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextColor(Color.parseColor("#111827"));
        tvTitle.setTextSize(17f);
        tvTitle.setTypeface(Typeface.DEFAULT_BOLD);
        wrapper.addView(tvTitle);

        ImageView ivPreview = new ImageView(this);
        LinearLayout.LayoutParams imgParams = new LinearLayout.LayoutParams(dpToPx(300), dpToPx(300));
        imgParams.topMargin = dpToPx(14);
        ivPreview.setLayoutParams(imgParams);
        ivPreview.setScaleType(ImageView.ScaleType.FIT_CENTER);
        ivPreview.setImageBitmap(fallback);

        Glide.with(this)
                .load(imageUrl)
                .placeholder(new android.graphics.drawable.BitmapDrawable(getResources(), fallback))
                .error(new android.graphics.drawable.BitmapDrawable(getResources(), fallback))
                .into(ivPreview);
        wrapper.addView(ivPreview);

        AppCompatButton btnTutup = new AppCompatButton(this);
        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dpToPx(42)
        );
        btnParams.topMargin = dpToPx(16);
        btnTutup.setLayoutParams(btnParams);
        btnTutup.setBackgroundResource(R.drawable.bg_pill_indigo);
        btnTutup.setText("Tutup");
        btnTutup.setAllCaps(false);
        btnTutup.setTextColor(Color.WHITE);
        btnTutup.setOnClickListener(v -> dialog.dismiss());
        wrapper.addView(btnTutup);

        dialog.setContentView(wrapper);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        }
        dialog.show();
    }

    private Bitmap createPlaceholderBanner(String label, int color) {
        int w = 800, h = 420;
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);

        Paint bg = new Paint();
        bg.setColor(Color.parseColor("#EEF2FF"));
        c.drawRect(0, 0, w, h, bg);

        Paint accent = new Paint(Paint.ANTI_ALIAS_FLAG);
        accent.setColor(color);
        c.drawCircle(w / 2f, h / 2f - 24f, 44f, accent);

        Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);
        text.setColor(Color.parseColor("#1F2937"));
        text.setTextSize(34f);
        text.setTypeface(Typeface.DEFAULT_BOLD);
        text.setTextAlign(Paint.Align.CENTER);
        c.drawText(label, w / 2f, h / 2f + 65f, text);

        return bmp;
    }

    private int dpToPx(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }
}