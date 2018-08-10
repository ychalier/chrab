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

import org.json.JSONException;
import org.json.JSONObject;

public class LoginActivity extends AppCompatActivity {

    EditText editUsername;
    EditText editPassword;
    Button buttonLogin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        if (ContextCompat.checkSelfPermission(this,
                Manifest.permission.INTERNET)
                != PackageManager.PERMISSION_GRANTED) {

            // Permission is not granted
            // Should we show an explanation?
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.INTERNET}, 0);
        } else {
            // Permission has already been granted
            Log.i("Login", "Internet permission granted");
        }

        final Context context = this;
        editUsername = findViewById(R.id.textInputEditTextUsername);
        editPassword = findViewById(R.id.textInputEditTextPassword);
        buttonLogin = findViewById(R.id.buttonLogin);
        buttonLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                String username = editUsername.getText().toString();
                String password = editPassword.getText().toString();
                if (!username.isEmpty() && !password.isEmpty()) {
                    editUsername.setText("");
                    editPassword.setText("");
                    Log.i("Login", username + ":" + password);
                    RequestSender.sendRequest(context,
                            "https://srabs.chalier.fr/retrieve-token",
                            RequestSender.basicAuth(username, password),
                            new Response.Listener<String>() {
                                @Override
                                public void onResponse(String response) {
                                    try {
                                        JSONObject token = new JSONObject(response);
                                        InternalStorageManager.write(context,"token.json", response);
                                        gotoMainActivity(token);
                                    } catch (JSONException e) {
                                        e.printStackTrace();
                                    }
                                }
                            });
                }
            }
        });

        String tokenString = InternalStorageManager.read(this, "token.json");
        if (!tokenString.isEmpty()) {
            try {
                final JSONObject token = new JSONObject(tokenString);
                RequestSender.sendRequest(this,
                        "https://srabs.chalier.fr/validate-token",
                        RequestSender.bearerAuthAccess(token),
                        new Response.Listener<String>() {
                            @Override
                            public void onResponse(String response) {
                                gotoMainActivity(token);
                            }
                        });
            } catch (JSONException e) {
                e.printStackTrace();
            }
        }

    }

    private void gotoMainActivity(JSONObject token) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("token", token.toString());
        startActivity(intent);
    }

}
