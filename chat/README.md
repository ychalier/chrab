# chrab

![](webclient/assets/favicon.png)

Check it out on [https://srabs.chalier.fr/webclient/](https://srabs.chalier.fr/webclient/)

## NodeJS packages

**Node version _(used for development)_:** v8.9.4

See [package-lock.json](package-lock.json) for full details. Usually, two packages need to be installed:

 - `sqlite3`
 - `mimes-types`

## API documentation

### Routes

*Click a route for more details.*

method | url | description
--- | --- | ---
GET  | / | Hello, world!
GET | [/retrieve-token](#get-retrieve-token)  | Request an access token and a refresh token
GET  | [/validate-token](#get-validate-token)  | Check if an access token is valid
GET  | [/refresh-token](#get-refresh-token)  | Send a new access token
GET  | [/logout](#get-logout) | Revokes all tokens linked to a user
GET  | [/channels](#get-channels)  | Retrieve list of channels
GET  | [/channel/{channel-name}](#get-channel)  | Retrieve messages from a channel
GET  | [/ping/{channel-name}](#get-ping)  | Leave a connection opened to get notified  
POST  | [/register](#post-register)  | Register a new user
POST  | [/create-channel](#post-create-channel)  | Create a channel  
POST  | [/channel/{channel-name}](#post-channel)  | Post a message
DELETE | [/channel/{channel-name}](#del-channel) | Delete a channel

#### Status codes

If a request is successful, it should reply with a 200 (*OK*) or a 201 (*Created*).

code | possible mistake
--- | ---
400  | request needs a body that is missing or incomplete, username/channel name is already taken
401  | request needs authorization that is missing
403  | request authorization is invalid (wrong login or password) or token has expired
404  | misspelled url  

#### Example

You may check this [Postman scenario](https://www.getpostman.com/collections/4db4a8d2670111b9ed78) to have a usage example of those routes.

### Details

*In this paragraph, routes are organized based on a basic usage scenario.*

---

<a name="post-register"></a>

    POST /register

##### description

Register a new user account. Username must be unique, or an error will be raised. Password is hashed before storage.

##### request

 - **headers ─** nothing
 - **body ─** JSON object with fields `login` and `passwd`

##### response

 - **status code ─** 201
 - **response text ─** nothing

---
<a name="get-retrieve-token"></a>

    GET /retrieve-token

##### description

Authenticate a user and generate a pair of access and refresh tokens to grant access to further API's features. This requests uses basic HTTP authorization, so be sure to send it over HTTPS to avoid any leaks.

The returned token pair depends on user's IP address and user agent. If any of those two changes, the token will be invalid. Moreover, the access token is valid until it expires, which is by default set to 1 hour.

Finally, note that requesting a token deletes all previous tokens emitted for the user from the same user agent (different IPs does not matter). And there is a maximum of 3 simultaneous tokens available, so a new request will delete the elder ones.

##### request

 - **headers ─** HTTP Basic Auth, with user's login and password
 - **body ─** nothing

##### response

 - **status code ─** 200
 - **response text ─** JSON object with field `access_token`, `refresh_token`, `delivered` (delivery date in string format) and `expires_in` (in seconds)

---
<a name="get-validate-token"></a>

    GET /validate-token

##### description

Test a provided access token. If the request succeeds, it means that the token is valid in current conditions (good IP, good user agent, and token did not expire yet).

##### request

 - **headers ─** HTTP Bearer Auth with access token
 - **body ─** nothing

##### response

 - **status code ─** 200
 - **response text ─** nothing

Use a Bearer token HTTP authorization with the latest access token you got. If it is valid and did not expire yet, response's code will be 200. Else, you'll get the same codes as token retrieval.

---
<a name="get-refresh-token"></a>

    GET /refresh-token

##### description

When the access token expires, a new one can be generated for the same user without the need to relog (i.e. sending username and password). Use the refresh token you got earlier, *which never expires*, and use it to get a new access token.

Refresh an access token before its expiration deletes it, in favor of the new one.

##### request

 - **headers ─** HTTP Bearer Auth with refresh token
 - **body ─** nothing

##### response

 - **status code ─** 200
 - **response text ─** JSON object with fields `access_token`, `delivered` (delivery date in string format) and `expires_in` (in seconds).

---
<a name="post-create-channel"></a>

    POST /create-channel

##### description

Creates a new channel. Channel must not already exists and its name must contain only letters (caps does not matter), figures and dashes (-).

##### request

 - **headers ─** HTTP Bearer Auth with access token
 - **body ─** JSON object with fields `name`, `delay` (optional, time before message disappearing in seconds) and `password` (optional)

##### response

 - **status code ─** 201
 - **response text ─** nothing



---
<a name="get-channels"></a>

    GET /channels

##### description

Retrieve a list of all channels on the server, with basic information about them.

##### request

 - **headers ─** HTTP Bearer Auth with access token
 - **body ─** nothing

##### response

 - **status code ─** 200
 - **response text ─** JSON array, each object has fields `name`, `delay` (time before messages disappear in seconds), `protected` (boolean whether the channel is password protected or not) and `creator` (the user that created the channel)

---
<a name="get-channel"></a>

    GET /channel/{channel-name}&limit={timestamp}

##### description

Retrieve messages from a given channel.

By default, it returns all messages. But you can use the GET parameter `limit` with a timestamp to get all messages that were posted *after* the given timestamp. Timestamp format is UNIX integer time encoding, and you may re-use the timestamp given by the field `t` in the previous response.

##### request

 - **headers ─** HTTP Bearer Auth with access token, and if the channel is password protected, send the channel password in header *chanpwd*
 - **body ─** nothing

##### response

 - **status code ─** 200
 - **response text ─** JSON array, each object is a message with fields `username`, `content` and `t` (UNIX timestamp)

---
<a name="get-ping"></a>

    GET /ping/{channel-name}

##### description

Get notified when a message is posted on a given channel. The server will leave the connection opened for 2 minutes (after it will timeout, status code 0). If a message gets posted, it will reply before with code 200. That way a client can then fetch new messages with the [previous request](#get-channel).

##### request

 - **headers ─** HTTP Bearer Auth with access token, and if the channel is password protected, send the channel password in header *chanpwd*
 - **body ─** nothing

##### response

 - **status code ─** 200
 - **response text ─** nothing

---
<a name="post-channel"></a>

    POST /channel/{channel-name}

##### description

Post a new message to a given channel.

##### request

 - **headers ─** HTTP Bearer Auth with access token, and if the channel is password protected, send the channel password in header *chanpwd*
 - **body ─** Message content

##### response

 - **status code ─** 201
 - **response text ─** nothing

---
<a name="del-channel"></a>

    DELETE /channel/{channel-name}

##### description

Delete an existing channel. Only the channel creator can delete it.

##### request

 - **headers ─** HTTP Bearer Auth with access token
 - **body ─** nothing

##### response

 - **status code ─** 200
 - **response text ─** nothing

---
<a name="get-logout"></a>

    GET /logout

##### description

When token is no longer needed, it is best to delete it, which this route does. If not done, the access token will remain active until it expires, and the *refresh token will never expire!*. Until new tokens are generated, it will remain in the database.

This route will delete all tokens (both access and refresh) from the logged-in user from this user agent. *Tokens with different user agent are not deleted*.

##### request

 - **headers ─** HTTP Bearer Auth with access token
 - **body ─** nothing

##### response

 - **status code ─** 200
 - **response text ─** nothing

## useful resources

 - [Anatomy of HTTP Transaction](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/)
 - [Crypto | NodeJS](https://nodejs.org/api/crypto.html#crypto_crypto)
 - [HTTP status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)
 - [HTTP | Node.js](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
 - [HTTPS | Node.js](https://nodejs.org/api/https.html)
 - [Regex101](https://regex101.com)
 - [Postman](https://www.getpostman.com)
