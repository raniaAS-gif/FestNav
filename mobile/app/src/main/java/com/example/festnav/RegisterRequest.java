package com.example.festnav;

import com.google.gson.annotations.SerializedName;

public class RegisterRequest {

    @SerializedName("username")
    private String username;

    @SerializedName("nama")
    private String nama; // Sesuai dengan payload.nama di backend FastAPI

    @SerializedName("email")
    private String email;

    @SerializedName("nomor_telepon")
    private String nomor_telepon; // Sesuai dengan payload.nomor_telepon di backend FastAPI

    @SerializedName("password")
    private String password;

    // Konstruktor
    public RegisterRequest(String username, String nama, String email, String nomor_telepon, String password) {
        this.username = username;
        this.nama = nama;
        this.email = email;
        this.nomor_telepon = nomor_telepon;
        this.password = password;
    }

    // Getter dan Setter
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getNama() {
        return nama;
    }

    public void setNama(String nama) {
        this.nama = nama;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getNomorTelepon() {
        return nomor_telepon;
    }

    public void setNomorTelepon(String nomor_telepon) {
        this.nomor_telepon = nomor_telepon;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}