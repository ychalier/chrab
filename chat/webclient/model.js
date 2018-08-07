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
  login = null;
  deleteAllCookies();
  resetChatView();
  resetChannelList();
  swapDisplayedPanels(false);
  if (modal) hideModal();
}

function retrieveToken(username, password, callback=null) {
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

function logout(callback=null) {
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

function refreshToken(callback) {
  /* Token refreshing procedure; callback is used to retry the request that was
     unauthorized.
   */
  if ('refresh_token' in token) {
    console.log(token.refresh_token);
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

/***************************/
/***** CHANNEL ACTIONS *****/
/***************************/

function channelHeader() {
  /* Provides a Bearer Authorization Header with, if available, a header for a
   * password protected channel access.
   */
  let headers = bearerAuthorizationHeader();
  if (selectedChannelPwd != null) {
    headers["chanpwd"] = selectedChannelPwd;
  }
  return headers;
}

function getChannels(callback) {
  sendRequest("GET", "/channels", bearerAuthorizationHeader(), {
    200: (response) => { callback(JSON.parse(response)); }
  }, "", true);
}

function getMessages(callback) {
  let getParameters = "";
  if (lastMessageTimestamp != null) {
    getParameters += "?limit=" + (lastMessageTimestamp + 1);
  }
  let headers = channelHeader();
  sendRequest("GET", "/channel/" + selectedChannel + getParameters, headers, {
    200: (response) => { callback(JSON.parse(response)); }
  }, "", true);
}

function sendMessage(content, callback=null) {
  sendRequest("POST", "/channel/" + selectedChannel, channelHeader(), {
    201: (response) => { if (callback) callback(); }
  }, content);
}

function postChannel(name, delay, passwd, callback=null) {
  let json = { "name": name };
  if (delay > 0) json["delay"] = delay;
  if (passwd != "") json["passwd"] = passwd;
  sendRequest("POST", "/create-channel", bearerAuthorizationHeader(), {
    201: (response) => { if (callback) callback(); }
  }, JSON.stringify(json), true);
}

function deleteChannel(name, callback=null) {
  sendRequest("DELETE", "/channel/" + name, bearerAuthorizationHeader(), {
    200: (response) => { if (callback) callback(); }
  }, "", true);
}
