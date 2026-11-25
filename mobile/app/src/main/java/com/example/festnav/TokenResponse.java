package com.example.festnav;

public class TokenResponse {
    private String access_token;
    private String token_type;
    private String user_type;
    private String peran;
    private EventGoersResponse user;

    public String getAccess_token() {
        return access_token;
    }

    public String getToken_type() {
        return token_type;
    }

    public String getUser_type() {
        return user_type;
    }

    public String getPeran() {
        return peran;
    }

    public EventGoersResponse getUser() {
        return user;
    }
}