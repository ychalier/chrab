# chat

## useful resources

 - [Anatomy of HTTP Transaction](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/)
 - [Crypto | NodeJS](https://nodejs.org/api/crypto.html#crypto_crypto)
 - [HTTP status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)
 - [HTTP | Node.js](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
 - [HTTPS | Node.js](https://nodejs.org/api/https.html)
 - [Regex101](https://regex101.com)
 - [Postman](https://www.getpostman.com)

## NodeJS packages

See [package-lock.json](package-lock.json) for full details. Three main packages are used and need to be installed:

 - `http`
 - `sqlite3`
 - `crypto`

## API documentation

### Summary

method | url | description
--- | --- | ---
GET  | / | Hello, world!
GET | /retrieve-token  | Request an access token and a refresh token
GET  | /validate-token  | Check if an access token is valid
GET  | /refresh-token  | Send a new access token
GET  | /logout | Revokes all tokens linked to a user
POST  | /register  | Register a new user

### Authentication

**The following will cover a classical usage scenario.**

#### Response's status code

If a request is successful, it should reply with a 200 or a 201.

code | possible mistake
--- | ---
400  | request needs a body that is missing or incomplete
401  | request needs authorization that is missing
403  | request authorization is invalid (wrong login or password) or token has expired 

---

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
