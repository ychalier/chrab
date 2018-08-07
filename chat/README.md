# chrab

## useful resources

 - [Anatomy of HTTP Transaction](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/)
 - [Crypto | NodeJS](https://nodejs.org/api/crypto.html#crypto_crypto)
 - [HTTP status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)
 - [HTTP | Node.js](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
 - [HTTPS | Node.js](https://nodejs.org/api/https.html)
 - [Regex101](https://regex101.com)
 - [Postman](https://www.getpostman.com)

## NodeJS packages

See [package-lock.json](package-lock.json) for full details. Two main packages are used and need to be installed:

 - `sqlite3`
 - `mimes-types`

## API documentation

### Summary

method | url | description
--- | --- | ---
GET  | / | Hello, world!
GET | [/retrieve-token](#head)  | Request an access token and a refresh token
GET  | /validate-token  | Check if an access token is valid
GET  | /refresh-token  | Send a new access token
GET  | /logout | Revokes all tokens linked to a user
GET  | /channels  | Retrieve list of channels
GET  | /channel/{channel-name}  | Retrieve messages from a channel
GET  | /ping/{channel-name}  | Leave a connection opened to get notified  
POST  | /register  | Register a new user
POST  | /create-channel  | Create a channel  
POST  | /channel/{channel-name}  | Post a message

**The following description will cover a classical usage scenario** (see [webclient](webclient/) for an example)**.**

### Authentication

#### Might be helpful: response's status code

If a request is successful, it should reply with a 200 (*OK*) or a 201 (*Created*).

code | possible mistake
--- | ---
400  | request needs a body that is missing or incomplete
401  | request needs authorization that is missing
403  | request authorization is invalid (wrong login or password) or token has expired

---
<a name="head"></a>

    POST /register

In POST body, you must send a JSON-like string containing values for `"login"` and `"passwd"`. For example:

    {
      "login": "toto",
      "passwd": "12345"
    }

If registration is successful (valid body and username not taken), response will have status code 201. If an error occurs, code will be 400 and the response body contains error details.

---

    GET /retrieve-token

Use basic HTTP authorization with user's login and password. If everything matches, response code will be 200 and body will contain the token:

    {
        "access_token": "4a7d90d455cc0b483946ea0c96715e38baf1578cb2f0cfb3b7a64f2f1ba14c5c",
        "refresh_token": "63930de6e0a9460588791e6cc5377b893426222fbd7945b18311361e2ef0997b",
        "delivered": "Fri Jun 29 2018 12:37:52 GMT+0200 (Paris, Madrid (heure d’été))",
        "expires_in": 3600
    }

If login or password is incorrect, code will be 403. If no credentials are passed, code will be 401.

The token is valid until it expires (see the field `expires_in`, in seconds). By default, expiration time is set to 1 hour.

Note that requesting a token deletes all previous tokens emitted for the user (access and refresh).

---

    GET /validate-token

Use a Bearer token HTTP authorization with the latest access token you got. If it is valid and did not expire yet, response's code will be 200. Else, you'll get the same codes as token retrieval.

---

    GET /refresh-token

The refresh token never expires. If your access token expires, you may use the refresh token to get a new one. Refreshing a token is possible when the access token is still valid, but it will delete every previous access token for that user.

Use a Bearer token HTTP authorization with your refresh token. You'll receive the following:

    {
        "access_token": "66daa24fd6291096f551558d956379cb49e7f398b1e6c35d0aef5571eea93874",
        "delivered": "Fri Jun 29 2018 12:44:18 GMT+0200 (Paris, Madrid (heure d’été))",
        "expires_in": 3600
    }

---

    GET /logout

Use a Bearer token HTTP authorization with the latest access token you got. Deletes all access tokens and refresh tokens linked to the user.

### Chatting

**From now on, all requests need a bearer authorization header with the access token.**

---

    GET /channels

Returns a list of available channels, in a JSON:

    [
      {
        "name": "default",
		"delay": 86400
      },
      {
        "name": "general",
		"delay": 86400
      }
    ]

The delay is the number of *seconds* before messages get completely removed from the database. By default, this value is set to 24 hours.
	
---

    GET /channel/{channel-name}&limit={timestamp}

List all messages from a given channel. Channel name is the name of the channel as given by the `GET /channels` request. The response is a JSON:

    [
      {
        "t": 1530477363157,
        "username": "alice",
        "content": "hello!"
      },
      {
        "t": 1530477384561,
        "username": "bob",
        "content": "hi! how are you?"
      }
    ]



By default, it returns all messages. But you can use the GET parameter `limit` with a timestamp to get all messages that were posted *after* the given timestamp. Timestamp format is UNIX integer time encoding, and you may re-use the timestamp given by the field `t` in the previous response.

---

    GET /ping/{channel-name}

Get notified when a message is posted on a given channel. The server will leave the connection opened for 2 minutes (after it will timeout, status code 0). If a message gets posted, it will reply before with code 200. That way a client can then fetch new messages with the previous request.

---

    POST /create-channel

Creates a new channel. Parse the channel name in POST body. Channel must not already exists and its name must contain only letters (caps does not matter), figures and dashes (-). If everything is successful, it will reply with exit code 201.

---

    POST /channel/{channel-name}

Post a message to a given channel. Post message content in POST body. If everything is successful, it will reply with exit code 201.
