package com.example.festnav;

import com.google.gson.annotations.SerializedName;

public class LoginRequest {

    @SerializedName("identifier")
    private String identifier; // Mengubah "email" menjadi "identifier"

    @SerializedName("password")
    private String password;

    public LoginRequest(String identifier, String password) {
        this.identifier = identifier;
        this.password = password;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}