var debug = true;

var token;  // JSON with access_token and refresh_token
var login;  // string with user's login when logged in

/*********************/
/***** UTILITIES *****/
/*********************/

function sendRequest(method, url, headers, callbacks,
  body="", refreshIfUnauthorized=false) {
  /* Sends a request; authorization goes in headers; callbacks is a dictionnary
     whom keys are status code returned by the server.
   */
  let xhttp = new XMLHttpRequest();
  xhttp.open(method, url, true);
  for (let header in headers) {
    xhttp.setRequestHeader(header, headers[header]);
  }
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4) {
      if (xhttp.status in callbacks) {
        callbacks[xhttp.status](xhttp.responseText);
      } else if (xhttp.status == 403 && refreshIfUnauthorized) {
        refresh(() => {
          headers["Authorization"] = "Bearer " + token.access_token;
          sendRequest(method, url, headers, callbacks, body, false);
        });
      } else if (xhttp.status == 403) {
        resetToken();
      } else if (debug) {
        throw xhttp.status + "\t" + xhttp.responseText;
      }
    }
  }
  if (body.length > 0) {
    xhttp.send(body);
  } else {
    xhttp.send();
  }
  return xhttp;  // returns handler to store pending requests later
}

function deleteAllCookies() {
    var cookies = document.cookie.split(";");

    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        var eqPos = cookie.indexOf("=");
        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
}

/**************************/
/***** TOKEN HANDLING *****/
/**************************/

function basicAuthorizationHeader(username, password) {
  /*
   * Returns headers for a basic HTTP authentication
   */
  return {
    "Authorization": "Basic " + btoa(username + ":" + password)
  }
}

function bearerAuthorizationHeader() {
  /*
   * Returns headers for a bearer HTTP authentication
   * (using global access token)
   */
  if (token && "access_token" in token) {
    return {
      "Authorization": "Bearer " + token.access_token
    }
  } else if (debug) {
    throw "Wrong token.";
  }
}

function resetToken() {
  token = null;
  deleteAllCookies();
}

function sendLoginRequest(username, password, callback=null) {
  /* Given a username and a password, tries
   */
  sendRequest("GET", "/retrieve-token",
              basicAuthorizationHeader(username, password), {
    200: (response) => {
      token = JSON.parse(response);
      login = username;
      document.cookie = "username=" + username;
      document.cookie = "access=" + token["access_token"];
      document.cookie = "refresh=" + token["refresh_token"];
      if (callback) callback();
    }
  });
}

function sendLogoutRequest(callback=null) {
  /* Logout procedure
   */
  sendRequest('GET', '/logout', bearerAuthorizationHeader(), {
    200: (response) => {
      resetToken();
      if (callback) callback();
    }
  }, "", true);
}

function validateToken(callback=null) {
  sendRequest('GET', '/validate-token', bearerAuthorizationHeader(), {
    200: (response) => {
      if (callback) callback();
    }
  })
}

function refresh(callback) {
  /* Token refreshing procedure; callback is used to retry the request that was
     unauthorized.
   */
  if ('refresh_token' in token) {
    sendRequest('GET', '/refresh-token',
                {'Authorization': 'Bearer ' + token.refresh_token}, {
      200: (response) => {
        let newToken = JSON.parse(response);
        for (var newValue in newToken) {
          token[newValue] = newToken[newValue];
        }
        document.cookie = "access=" + token['access_token'];
        callback();
      },
      403 : (response) => {  // token is just invalid, need to re-log
        if (debug) throw "Invalid token.";
        resetToken();
      }
    });
  } else if (debug) {
    throw "No refresh token found.";
  }
}

function loadCookies(callback=null) {
  if (document.cookie) {
    let tmp = document.cookie.split(';');
    let cookies = {}
    for (var i = 0; i < tmp.length; i++) {
      let tmp2 = tmp[i].replace(/ /g, '').split('=');
      cookies[tmp2[0]] = tmp2[1];
    }
    if ('username' in cookies && 'access' in cookies && 'refresh' in cookies) {
      token = {
        'access_token': cookies['access'],
        'refresh_token': cookies['refresh']
      }
      login = cookies['username'];
      validateToken(callback);
    }
  }
}

/******************************/
/***** EXECUTE AT LOADING *****/
/******************************/

loadCookies();
