package com.example.festnav;

public class RegisterRequest {
    private String nama;
    private String username;
    private String email;
    private String password;
    private String nomor_telepon;

    public RegisterRequest(String nama, String username, String email, String password, String nomor_telepon) {
        this.nama = nama;
        this.username = username;
        this.email = email;
        this.password = password;
        this.nomor_telepon = nomor_telepon;
    }

    public String getNama() { return nama; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getNomor_telepon() { return nomor_telepon; }
}