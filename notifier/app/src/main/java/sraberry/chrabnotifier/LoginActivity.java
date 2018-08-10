package sraberry.chrabnotifier;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;

import com.android.volley.Response;
import com.android.volley.VolleyError;

import org.json.JSONException;
import org.json.JSONObject;

public class LoginActivity extends AppCompatActivity {

    public static final String EXTRA_TOKEN = "token";
    public static final String EXTRA_USERNAME = "username";
    public static final String FILE_TOKEN = "token.json";
    public static final String FILE_CREDENTIALS = "credentials.json";

    EditText editUsername;
    EditText editPassword;
    Button buttonLogin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        checkForInternetPermission();

        tryExistingToken();

        editUsername = findViewById(R.id.textInputEditTextUsername);
        editPassword = findViewById(R.id.textInputEditTextPassword);
        buttonLogin = findViewById(R.id.buttonLogin);
        buttonLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                String username = editUsername.getText().toString();
                String password = editPassword.getText().toString();
                sendLoginRequest(username, password);
                editUsername.setText("");
                editPassword.setText("");
            }
        });

    }

    private void checkForInternetPermission() {
        if (ContextCompat.checkSelfPermission(this,
                Manifest.permission.INTERNET)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.INTERNET}, 0);
        } else {
            // Permission has already been granted
            Log.i("Login", "Internet permission granted");
        }
    }

    private void gotoMainActivity(JSONObject token, String username) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra(EXTRA_TOKEN, token.toString());
        intent.putExtra(EXTRA_USERNAME, username);
        startActivity(intent);
    }

    private void tryExistingToken() {
        String string = InternalStorageManager.read(this, FILE_TOKEN);
        if (!string.isEmpty()) {
            try {
                final JSONObject token = new JSONObject(string);
                final Context context = this;
                RequestSender.sendRequest(this,
                        RequestSender.HOST + "/validate-token",
                        RequestSender.bearerAuthAccess(token),
                        new Response.Listener<String>() {
                            @Override
                            public void onResponse(String response) {
                                try {
                                    gotoMainActivity(token, token.getString("username"));
                                } catch (JSONException e) {
                                    e.printStackTrace();
                                }
                            }
                        }, new Response.ErrorListener() {
                            @Override
                            public void onErrorResponse(VolleyError error) {
                                InternalStorageManager.deleteFile(context, FILE_TOKEN);
                                tryExistingCredentials();
                            }
                        });
            } catch (JSONException e) {
                e.printStackTrace();
                InternalStorageManager.deleteFile(this, FILE_TOKEN);
            }
        }
    }

    private void tryExistingCredentials() {
        String string = InternalStorageManager.read(this, FILE_CREDENTIALS);
        if (!string.isEmpty()) {
            try {
                final JSONObject credentials = new JSONObject(string);
                sendLoginRequest(
                        credentials.getString("username"),
                        credentials.getString("password"));
            } catch (JSONException e) {
                e.printStackTrace();
                InternalStorageManager.deleteFile(this, FILE_CREDENTIALS);
            }
        }
    }

    private void sendLoginRequest(final String username, String password) {
        final Context context = this;
        Log.i("Login", username + ":" + password);

        if (!username.isEmpty() && !password.isEmpty()) {

            JSONObject credentials = new JSONObject();
            try {
                credentials.put("username", username);
                credentials.put("password", password);
            } catch (JSONException e) {
                e.printStackTrace();
            }
            InternalStorageManager.write(context, FILE_CREDENTIALS, credentials.toString());

            RequestSender.sendRequest(context,
                    RequestSender.HOST + "/retrieve-token",
                    RequestSender.basicAuth(username, password),
                    new Response.Listener<String>() {
                        @Override
                        public void onResponse(String response) {
                            try {
                                JSONObject token = new JSONObject(response);
                                token.put("username", username);
                                InternalStorageManager.write(context, FILE_TOKEN, response);
                                gotoMainActivity(token, username);
                            } catch (JSONException e) {
                                e.printStackTrace();
                            }
                        }
                    }, new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            InternalStorageManager.deleteFile(context, FILE_CREDENTIALS);
                        }
                    });
        }
    }

}
