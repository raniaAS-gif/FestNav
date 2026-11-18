package com.example.festnav;

import com.google.gson.annotations.SerializedName;

public class EventResponse {

    @SerializedName("nama_event")
    private String namaEvent;

    @SerializedName("tanggal")
    private String tanggal;

    @SerializedName("lokasi")
    private String lokasi;

    @SerializedName("jenis")
    private String jenis;

    @SerializedName("organizer")
    private String organizer;

    @SerializedName("sumber")
    private String sumber;

    @SerializedName("status")
    private String status;

    @SerializedName("deskripsi")
    private String deskripsi;

    // Getter methods
    public String getNamaEvent() {
        return namaEvent;
    }

    public String getTanggal() {
        return tanggal;
    }

    public String getLokasi() {
        return lokasi;
    }

    public String getJenis() {
        return jenis;
    }

    public String getOrganizer() {
        return organizer;
    }

    public String getSumber() {
        return sumber;
    }

    public String getStatus() {
        return status;
    }

    public String getDeskripsi() {
        return deskripsi;
    }
}