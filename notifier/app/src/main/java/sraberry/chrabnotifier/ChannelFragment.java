package sraberry.chrabnotifier;


import android.content.Context;
import android.content.DialogInterface;
import android.os.Bundle;
import android.app.Fragment;
import android.text.InputType;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.TextView;

import com.android.volley.RequestQueue;
import com.android.volley.Response;

import org.json.JSONObject;

import java.util.concurrent.Callable;

import androidx.appcompat.app.AlertDialog;


public class ChannelFragment extends androidx.fragment.app.Fragment {

    private JSONObject token;
    private String channelName;
    private String password;
    private boolean isProtected;

    private void setChannelName(String channelName) {
        this.channelName = channelName;
    }

    private void setProtected(boolean aProtected) {
        isProtected = aProtected;
    }

    private void setPassword(String password) {
        this.password = password;
    }

    private void setToken(JSONObject token) {
        this.token = token;
    }

    public ChannelFragment() {
        // Required empty public constructor
    }

    static ChannelFragment newInstance(Context context, String channelName, boolean isProtected,
                                       JSONObject token) {
        ChannelFragment f = new ChannelFragment();
        f.setChannelName(channelName);
        f.setProtected(isProtected);
        f.setToken(token);

        if (isProtected) {
            String password = InternalStorageManager.read(context, channelName + ".pwd");
            if (!password.isEmpty()) {
                f.setPassword(password);
            }
        }

        return f;
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        final View rootView = inflater.inflate(R.layout.fragment_channel, container, false);

        TextView textView = rootView.findViewById(R.id.textViewChannelName);
        textView.setText(channelName);

        CheckBox checkBox = rootView.findViewById(R.id.checkbox);
        checkBox.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (isProtected && password == null) {
                    AlertDialog.Builder builder = new AlertDialog.Builder(rootView.getContext());
                    builder.setTitle("Channel is protected. Enter password.");
                    final EditText input = new EditText(rootView.getContext());
                    input.setInputType(InputType.TYPE_CLASS_TEXT
                            | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                    builder.setView(input);

                    builder.setPositiveButton("OK", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            password = input.getText().toString();
                            InternalStorageManager.write(rootView.getContext(), channelName + ".pwd", password);
                        }
                    });
                    builder.setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            dialog.cancel();
                        }
                    });

                    builder.show();
                }
            }
        });

        checkBox.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean b) {
                if (b) {
                    RequestSender.ping(rootView.getContext(), token, channelName, password,
                            new Response.Listener<String>() {
                        @Override
                        public void onResponse(String response) {
                            Log.i("Ping", "New message on " + channelName);
                        }
                    });
                }
            }
        });

        return rootView;
    }

}