package sraberry.chrabnotifier;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import com.android.volley.Response;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Date;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class NotificationService extends Service {

    private JSONObject token;
    private int notificationId = 0;
    private ArrayList<Channel> channels;

    public NotificationService() {
    }

    @Override
    public IBinder onBind(Intent intent) {
        // TODO: Return the communication channel to the service.
        throw new UnsupportedOperationException("Not yet implemented");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int foo = super.onStartCommand(intent, flags, startId);
        channels = new ArrayList<>();
        createNotificationChannel();
        try {
            token = new JSONObject(intent.getStringExtra(LoginActivity.EXTRA_TOKEN));
        } catch (JSONException e) {
            e.printStackTrace();
        }
        for (String channelString: intent.getStringArrayListExtra(MainActivity.EXTRA_CHANNELS)) {
            String[] split = channelString.split("\t");
            if (split.length == 1) {
                channels.add(new Channel(split[0], ""));
            } else if (split.length == 2 ) {
                channels.add(new Channel(split[0], split[1]));
            } //TODO: else log it (error or warning)
        }
        for (Channel channel: channels) {
            channel.ping(this, token);
        }
        return foo;

    }

    private void createNotificationChannel() {
        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is new and not in the support library
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "chrab";
            String description = "chrab notifier";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel("0", name, importance);
            channel.setDescription(description);
            // Register the channel with the system; you can't change the importance
            // or other notification behaviors after this
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }


    private void sendNotification(String channel, String author) {
        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(this, "0")
                .setContentTitle(channel)
                .setContentText("New message from " + author)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setPriority(NotificationCompat.PRIORITY_MAX);
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        notificationManager.notify(notificationId, mBuilder.build());
        notificationId++;
    }

    private class Channel {
        private String name;
        private String password;
        private long lastMessage;  // in milliseconds

        private Channel(String name, String password) {
            this.name = name;
            this.password = password;
            this.lastMessage = 0;
        }

        private void ping(final Context context, final JSONObject token) {
            RequestSender.ping(context, token, name, password,
                    new Response.Listener<String>() {
                        @Override
                        public void onResponse(String response) {
                            Log.i("Ping", "New message on "
                                    + name + " from " + response);
                            long now = (new Date()).getTime();
                            try {

                                if (!token.getString("username").equals(response) &&
                                        (lastMessage == 0 || (now - lastMessage) > 1000)) {
                                    sendNotification(name, response);
                                }
                            } catch (JSONException e) {
                                e.printStackTrace();
                            }
                            lastMessage = now;
                            ping(context, token);
                        }
                    });
        }

    }

}
