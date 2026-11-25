package com.example.festnav;

public class EventResponse {
    private int id_event;
    private Integer id_organizer;
    private String nama_organizer;
    private String nama_event;
    private String deskripsi;
    private String tanggal_mulai;
    private String tanggal_selesai;
    private String lokasi;
    private Double garis_lintang;
    private Double garis_bujur;
    private String jenis_event;
    private String tipe_lokasi;
    private String mode_event;
    private String sumber;
    private String status_event;
    private String poster_url;

    public int getId_event() {
        return id_event;
    }

    public String getNama_organizer() {
        return nama_organizer;
    }

    public String getNama_event() {
        return nama_event;
    }

    public String getDeskripsi() {
        return deskripsi;
    }

    public String getTanggal_mulai() {
        return tanggal_mulai;
    }

    public String getTanggal_selesai() {
        return tanggal_selesai;
    }

    public String getLokasi() {
        return lokasi;
    }

    public Double getGaris_lintang() {
        return garis_lintang;
    }

    public Double getGaris_bujur() {
        return garis_bujur;
    }

    public String getJenis_event() {
        return jenis_event;
    }

    public String getMode_event() {
        return mode_event;
    }

    public String getSumber() {
        return sumber;
    }

    public String getStatus_event() {
        return status_event;
    }

    public String getPoster_url() {
        return poster_url;
    }
}