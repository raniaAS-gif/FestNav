package com.example.festnav.api;

import com.example.festnav.AuthResponse;
import com.example.festnav.EventResponse;
import com.example.festnav.LoginRequest;
import com.example.festnav.RegisterRequest;

import java.util.List;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;

public interface ApiService {

    // 1. Tes Koneksi ke Backend FastAPI
    @GET("/")
    Call<Object> testKoneksi();

    // 2. Halaman Masuk (Login)
    @POST("api/auth/event-goers/login")
    Call<AuthResponse> loginUser(@Body LoginRequest request);

    // 3. Halaman Daftar (Register) - Sesuai rute router auth FastAPI
    @POST("api/auth/event-goers/register")
    Call<Object> registerUser(@Body RegisterRequest request);

    // 4. Halaman Detail Event
    @GET("api/event/detail")
    Call<EventResponse> getDetailEvent();

    // 5. Halaman Event (List semua event / daftar event)
    @GET("api/events")
    Call<List<EventResponse>> getAllEvents();

    // 6. Halaman Favorit (Daftar event yang disukai/disimpan)
    @GET("api/favorites")
    Call<List<EventResponse>> getFavoriteEvents();

    // 7. Halaman Profil (Mengambil data akun user yang sedang login)
    @GET("api/profile")
    Call<AuthResponse> getUserProfile();
}