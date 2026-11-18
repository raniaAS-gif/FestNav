package com.example.festnav;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "FestNav.db";
    private static final int DATABASE_VERSION = 1;

    public static final String TABLE_USER = "users";
    public static final String COL_ID = "id";
    public static final String COL_USERNAME = "username";
    public static final String COL_EMAIL = "email";
    public static final String COL_PASSWORD = "password";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String CREATE_USER_TABLE = "CREATE TABLE " + TABLE_USER + "("
                + COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, "
                + COL_USERNAME + " TEXT, "
                + COL_EMAIL + " TEXT, "
                + COL_PASSWORD + " TEXT)";
        db.execSQL(CREATE_USER_TABLE);

        // Akun bawaan untuk tes login langsung sebelum halaman Daftar selesai
        ContentValues defaultUser = new ContentValues();
        defaultUser.put(COL_USERNAME, "admin");
        defaultUser.put(COL_EMAIL, "admin@festnav.com");
        defaultUser.put(COL_PASSWORD, "12345678");
        db.insert(TABLE_USER, null, defaultUser);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_USER);
        onCreate(db);
    }

    public boolean insertUser(String username, String email, String password) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_USERNAME, username);
        values.put(COL_EMAIL, email);
        values.put(COL_PASSWORD, password);
        long result = db.insert(TABLE_USER, null, values);
        return result != -1;
    }

    // Mengecek kecocokan username ATAU email dengan password
    public boolean checkUser(String usernameOrEmail, String password) {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.query(TABLE_USER, new String[]{COL_ID},
                "(" + COL_USERNAME + "=? OR " + COL_EMAIL + "=?) AND " + COL_PASSWORD + "=?",
                new String[]{usernameOrEmail, usernameOrEmail, password}, null, null, null);
        int count = cursor.getCount();
        cursor.close();
        db.close();
        return count > 0;
    }
}