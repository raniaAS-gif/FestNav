package com.example.festnav;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "FestNav.db";
    private static final int DATABASE_VERSION = 2;

    public static final String TABLE_USER = "users";
    public static final String COL_ID = "id";
    public static final String COL_USERNAME = "username";
    public static final String COL_DISPLAY_NAME = "display_name";
    public static final String COL_EMAIL = "email";
    public static final String COL_TELEPON = "telepon";
    public static final String COL_PASSWORD = "password";

    public static class UserData {
        public String username;
        public String displayName;
        public String email;
        public String telepon;

        public UserData(String username, String displayName, String email, String telepon) {
            this.username = username;
            this.displayName = displayName;
            this.email = email;
            this.telepon = telepon;
        }
    }

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String CREATE_USER_TABLE = "CREATE TABLE " + TABLE_USER + "("
                + COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, "
                + COL_USERNAME + " TEXT, "
                + COL_DISPLAY_NAME + " TEXT, "
                + COL_EMAIL + " TEXT, "
                + COL_TELEPON + " TEXT, "
                + COL_PASSWORD + " TEXT)";
        db.execSQL(CREATE_USER_TABLE);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_USER);
        onCreate(db);
    }

    // Menambah user baru saat pendaftaran
    public boolean insertUser(String username, String displayName, String email, String telepon, String password) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_USERNAME, username);
        values.put(COL_DISPLAY_NAME, displayName.isEmpty() ? username : displayName);
        values.put(COL_EMAIL, email);
        values.put(COL_TELEPON, telepon.isEmpty() ? "-" : telepon);
        values.put(COL_PASSWORD, password);

        long result = db.insert(TABLE_USER, null, values);
        db.close();
        return result != -1;
    }

    // Mengecek apakah akun sudah terdaftar berdasarkan username atau email
    public boolean checkUserExists(String usernameOrEmail) {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.query(TABLE_USER, new String[]{COL_ID},
                COL_USERNAME + "=? OR " + COL_EMAIL + "=?",
                new String[]{usernameOrEmail, usernameOrEmail}, null, null, null);
        boolean exists = (cursor != null && cursor.getCount() > 0);
        if (cursor != null) cursor.close();
        db.close();
        return exists;
    }

    // Mengecek kecocokan username/email DENGAN password
    public boolean checkUser(String usernameOrEmail, String password) {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.query(TABLE_USER, new String[]{COL_ID},
                "(" + COL_USERNAME + "=? OR " + COL_EMAIL + "=?) AND " + COL_PASSWORD + "=?",
                new String[]{usernameOrEmail, usernameOrEmail, password}, null, null, null);
        boolean matched = (cursor != null && cursor.getCount() > 0);
        if (cursor != null) cursor.close();
        db.close();
        return matched;
    }

    // Mengambil data pengguna untuk profil setelah login berhasil
    public UserData getUserData(String usernameOrEmail) {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.query(TABLE_USER,
                new String[]{COL_USERNAME, COL_DISPLAY_NAME, COL_EMAIL, COL_TELEPON},
                COL_USERNAME + "=? OR " + COL_EMAIL + "=?",
                new String[]{usernameOrEmail, usernameOrEmail}, null, null, null);

        UserData userData = null;
        if (cursor != null && cursor.moveToFirst()) {
            String uName = cursor.getString(cursor.getColumnIndexOrThrow(COL_USERNAME));
            String dName = cursor.getString(cursor.getColumnIndexOrThrow(COL_DISPLAY_NAME));
            String mail = cursor.getString(cursor.getColumnIndexOrThrow(COL_EMAIL));
            String telp = cursor.getString(cursor.getColumnIndexOrThrow(COL_TELEPON));
            userData = new UserData(uName, dName, mail, telp);
            cursor.close();
        }
        db.close();
        return userData;
    }
}