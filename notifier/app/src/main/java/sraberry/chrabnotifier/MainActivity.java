package sraberry.chrabnotifier;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.FragmentTransaction;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.Toast;

import com.android.volley.Response;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

public class MainActivity extends AppCompatActivity implements Response.Listener<String> {

    public static final String EXTRA_CHANNELS = "channels";

    private ArrayList<ChannelFragment> channelFragments;
    private JSONObject token;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Intent intent = getIntent();

        try {
            token = new JSONObject(intent.getStringExtra(LoginActivity.EXTRA_TOKEN));
            RequestSender.sendRequest(this, RequestSender.HOST + "/channels",
                    RequestSender.bearerAuthAccess(token), this);
        } catch (JSONException e) {
            e.printStackTrace();
        }

    }

    @Override
    public void onResponse(String response) {
        final Context context = this;
        try {
            JSONArray channels = new JSONArray(response);
            Log.d("Channels", channels.toString());

            channelFragments = new ArrayList<>();
            LinearLayout channelListLayout = findViewById(R.id.layout_channel_list);

            for (int i = 0; i < channels.length(); i++) {
                JSONObject channelJson = channels.getJSONObject(i);
                ChannelFragment fragment = ChannelFragment.newInstance(
                        context,
                        channelJson.getString("name"),
                        channelJson.getBoolean("protected"),
                        token);
                channelFragments.add(fragment);
                FragmentTransaction ft = getSupportFragmentManager().beginTransaction();
                ft.add(channelListLayout.getId(), fragment, "fragment");
                ft.commit();
            }

            findViewById(R.id.button_start_service)
                    .setOnClickListener(new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            if (isServiceRunning(NotificationService.class)) {
                                showToast("Service is already started!");
                                return;
                            }
                            ArrayList<String> extraChannels = new ArrayList<>();
                            for (ChannelFragment channelFragment: channelFragments) {
                                if (channelFragment.isChecked()) {
                                    extraChannels.add(
                                            channelFragment.getIntentDetails());
                                }
                            }
                            Intent intent = new Intent(context, NotificationService.class);
                            intent.putExtra(EXTRA_CHANNELS, extraChannels);
                            intent.putExtra(LoginActivity.EXTRA_TOKEN, token.toString());
                            startService(intent);
                            showToast("Service started.");
                        }
                    });

            findViewById(R.id.button_stop_service)
                    .setOnClickListener(new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            if (!isServiceRunning(NotificationService.class)) {
                                showToast("Service is not running!");
                                return;
                            }
                            stopService(new Intent(context, NotificationService.class));
                            showToast("Service stopped.");
                        }
                    });

        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    private void showToast(CharSequence text) {
        Toast.makeText(this, text, Toast.LENGTH_SHORT).show();
    }

    private boolean isServiceRunning(Class<?> serviceClass) {
        ActivityManager manager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningServiceInfo service :
                manager.getRunningServices(Integer.MAX_VALUE)) {
            if (serviceClass.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }
}
