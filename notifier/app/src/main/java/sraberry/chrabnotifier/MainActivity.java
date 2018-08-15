package sraberry.chrabnotifier;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.FragmentTransaction;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.LinearLayout;

import com.android.volley.Response;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {

    public static final String EXTRA_CHANNELS = "channels";

    private ArrayList<ChannelFragment> channelFragments;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Intent intent = getIntent();
        final Context context = this;
        try {
            final JSONObject token =
                    new JSONObject(intent.getStringExtra(LoginActivity.EXTRA_TOKEN));
            RequestSender.sendRequest(this, RequestSender.HOST + "/channels",
                    RequestSender.bearerAuthAccess(token),
                    new Response.Listener<String>() {
                        @Override
                        public void onResponse(String response) {
                            try {
                                JSONArray channels = new JSONArray(response);
                                Log.d("Channels", channels.toString());

                                channelFragments = new ArrayList<>();
                                LinearLayout channelListLayout =
                                        findViewById(R.id.linearLayoutChannelList);

                                for (int i = 0; i < channels.length(); i++) {
                                    JSONObject channelJson = channels.getJSONObject(i);
                                    ChannelFragment fragment = ChannelFragment.newInstance(
                                            context,
                                            channelJson.getString("name"),
                                            channelJson.getBoolean("protected"),
                                            token);
                                    channelFragments.add(fragment);
                                    FragmentTransaction ft =
                                            getSupportFragmentManager().beginTransaction();
                                    ft.add(channelListLayout.getId(), fragment, "fragment");
                                    ft.commit();
                                }

                                findViewById(R.id.buttonStartService)
                                        .setOnClickListener(new View.OnClickListener() {
                                    @Override
                                    public void onClick(View v) {
                                        ArrayList<String> extraChannels = new ArrayList<>();
                                        for (ChannelFragment channelFragment: channelFragments) {
                                            if (channelFragment.isChecked()) {
                                                extraChannels.add(
                                                        channelFragment.getIntentDetails());
                                            }
                                        }
                                        Intent serviceIntent = new Intent(context,
                                                NotificationService.class);
                                        serviceIntent.putExtra(EXTRA_CHANNELS, extraChannels);
                                        serviceIntent.putExtra(LoginActivity.EXTRA_TOKEN,
                                                token.toString());
                                        startService(serviceIntent);
                                    }
                                });


                            } catch (JSONException e) {
                                e.printStackTrace();
                            }
                        }
                    });
        } catch (JSONException e) {
            e.printStackTrace();
        }

    }
}
