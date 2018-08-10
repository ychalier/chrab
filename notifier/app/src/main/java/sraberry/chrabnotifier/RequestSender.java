package sraberry.chrabnotifier;

import android.content.Context;
import android.util.Base64;
import android.util.Log;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.RetryPolicy;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Callable;

public final class RequestSender {

    static void sendRequest(Context context, final String url,
                                   final String authorization,
                                   Response.Listener<String> onResponse,
                                   Response.ErrorListener onError) {
        RequestQueue queue = Volley.newRequestQueue(context);
        StringRequest stringRequest =
                new StringRequest(Request.Method.GET, url, onResponse, onError) {
                    @Override
                    public Map<String, String> getHeaders() {
                        HashMap<String, String> params = new HashMap<>();
                        params.put("Authorization", authorization);
                        return params;
                    }
                };
        queue.add(stringRequest);
    }

    static void sendRequest(Context context, final String url, final String authorization,
                                   Response.Listener<String> onResponse) {
        sendRequest(context, url, authorization, onResponse, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.e("Request", error.toString());
            }
        });
    }

    static String basicAuth(final String username, final String password) {
        return "Basic " + Base64.encodeToString(
                String.format("%s:%s", username, password).getBytes(),
                Base64.DEFAULT);
    }

    static String bearerAuthAccess(final JSONObject token) {
        try {
            return "Bearer " + token.getString("access_token");
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return "";
    }

    public static String bearerAuthRefresh(final JSONObject token) {
        try {
            return "Bearer " + token.getString("refresh_token");
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return "";
    }

    public static void ping(Context context, final JSONObject token, String channel,
                            final String password, Response.Listener<String> onResponse) {
        RequestQueue queue = Volley.newRequestQueue(context);
        StringRequest stringRequest =
                new StringRequest(Request.Method.GET,
                        "https://srabs.chalier.fr/ping/" + channel, onResponse,
                        new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        Log.e("Ping", error.toString());
                    }
                }) {
                    @Override
                    public Map<String, String> getHeaders() {
                        HashMap<String, String> params = new HashMap<>();
                        params.put("Authorization", bearerAuthAccess(token));
                        if (password != null) {
                            params.put("chanpwd", password);
                        }
                        return params;
                    }
                };
        stringRequest.setRetryPolicy(new DefaultRetryPolicy(
                1000 * 30 * 3,
                Integer.MAX_VALUE,
                1));
        queue.add(stringRequest);
    }

}
