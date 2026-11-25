package com.example.festnav.api;

import com.example.festnav.EventGoersResponse;
import com.example.festnav.EventResponse;
import com.example.festnav.FavoritItemResponse;
import com.example.festnav.FavoritStatusResponse;
import com.example.festnav.LoginRequest;
import com.example.festnav.RegisterRequest;
import com.example.festnav.TokenResponse;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.POST;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface ApiService {

    @POST("api/auth/event-goers/register")
    Call<EventGoersResponse> registerEventGoers(@Body RegisterRequest request);

    @POST("api/auth/event-goers/login")
    Call<TokenResponse> loginEventGoers(@Body LoginRequest request);

    @GET("api/events")
    Call<List<EventResponse>> getEvents(
            @Query("search") String search,
            @Query("jenis_event") String jenisEvent
    );

    @GET("api/events/{id_event}")
    Call<EventResponse> getEventDetail(@Path("id_event") int idEvent);

    @GET("api/favorit")
    Call<List<FavoritItemResponse>> getFavoritList(@Header("Authorization") String bearerToken);

    @GET("api/favorit/{id_event}/status")
    Call<FavoritStatusResponse> getFavoritStatus(
            @Header("Authorization") String bearerToken,
            @Path("id_event") int idEvent
    );

    @POST("api/favorit/{id_event}")
    Call<FavoritStatusResponse> tambahFavorit(
            @Header("Authorization") String bearerToken,
            @Path("id_event") int idEvent
    );

    @DELETE("api/favorit/{id_event}")
    Call<Void> hapusFavorit(
            @Header("Authorization") String bearerToken,
            @Path("id_event") int idEvent
    );
}