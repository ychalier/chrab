var token = null;  // JSON with access_token and refresh_token
var channel = null;  // string with channel name that was joined
var lastMessage = null;  // int timestamp of last fetched message
var currentPing = null;  // XMLHttpRequest object of last ping request

function setVisibility(query, state) {
  /* Alter the 'visible' CSS property of a set of elements given by a selector.
   * This function mimics jQuery utilities.
   */
  let list = document.querySelectorAll(query);
  for (var i = 0; i < list.length; i++) {
    list[i].style.visibility = state;
  }
}

function basicAuthorization(username, password) {
  /* Returns headers for a basic HTTP authentication
   */
  let hash = btoa(username + ':' + password);
  return {
    'Authorization': 'Basic ' + hash
  }
}

function bearerAuthorization() {
  /* Returns headers for a bearer HTTP authentication
   * (using global access token)
   */
  if (token) {
    return {
      'Authorization': 'Bearer ' + token['access_token']
    }
  } else {
    return 'You must log in before that!';
  }
}

function sendRequest(method, url, headers, callbacks, body='') {
  /* Sends a request; authorization goes in headers; callbacks is a dictionnary
     whom keys are status code returned by the server.
   */
  var xhttp = new XMLHttpRequest();
  xhttp.open(method, url, true);
  for (var header in headers) {
    xhttp.setRequestHeader(header, headers[header]);
  }
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4) {
      if (xhttp.status in callbacks) {
        callbacks[xhttp.status](xhttp.responseText);
      } else {
        console.error(xhttp.status + '\t' + xhttp.responseText);
        alert(xhttp.status + '\t' + xhttp.responseText);
      }
    }
  }
  if (body.length > 0) {
    xhttp.send(body);
  } else {
    xhttp.send();
  }
  return xhttp;
}

function htmlEscape(string) {
  /* Encodes '>' and '<' so that an HTML does not detect nodes when parsing
   */
  return string.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function login(username, password) {
  /* Login procedure
   */
  sendRequest('GET', '/retrieve-token',
              basicAuthorization(username, password), {
    200: (response) => {
      // storing token in global variable
      token = JSON.parse(response);
      // setting up username in the span of #form-logout
      document.getElementById('username').innerHTML = htmlEscape(username);
      // collecting channels and setting up #form-channel
      fetchChannels();
    }
  });
}

function fetchChannels() {
  /* Channel list update procedure
   */
  sendRequest('GET', '/channels', bearerAuthorization(), {
    200: (response) => {
      let channels = JSON.parse(response);
      let select = document.querySelector('select');
      select.innerHTML = "";  // clearing old options (order)
      for (var i = 0; i < channels.length; i++) {
        let option = document.createElement('option');
        option.value = channels[i].name;
        option.innerHTML = channels[i].name;
        select.appendChild(option);
      }
      setVisibility('.show-on-login', 'visible');
      document.getElementById('form-login').style.display = "none";
    }
  });
}

function joinChannel(selectedChannel) {
  /* Channel joinning procedure
   */
  if (currentPing) {
    // if we were pinging a channel, we do not need to get notified anymore.
    // so when the connection will timeout on the server-side (about 2mins),
    // no update will be made and also no more pings for this channel.
    currentPing.onreadystatechange = function() {};
  }
  channel = selectedChannel;
  document.getElementById('chat').innerHTML = "";
  lastMessage = 0;  // resetting the last message so we get all of them at first
  update();
  ping();
  setVisibility('.show-on-join', 'visible');
}

function createChannel(selectedChannel) {
  /* Channel creation procedure
   */
  sendRequest('POST', '/create-channel', bearerAuthorization(), {
    201: (response) => {
      alert('Successfully created!');
      fetchChannels();  // creates new options in 'select' now that there is
    }                   // a new channel that can be joined
  }, selectedChannel);
}

function sendMessage(message) {
  /* Message posting procedure
   */
  if (channel) {
    let headers = bearerAuthorization();
    headers['Content-type'] = 'text/plain; charset=utf-8';
    sendRequest('POST', '/channel/' + channel, headers,
                {201: (response) => {}}, message);
  } else {
    alert('You must select a channel before that!');
  }
}

function update() {
  /* Messages reading procedure
   */
  if (channel) {

    // if we already have some messages from a channel, we only need the new
    // ones, so we use the lastMessage global variable and pass it through a
    // basic GET parameter in the URL
    let getParameters = "";
    if (lastMessage != null) {
      getParameters += "?limit=" + (lastMessage + 1);
    }

    sendRequest('GET', '/channel/' + channel + getParameters,
      bearerAuthorization(), {
      200: (response) => {
        let messages = JSON.parse(response);
        let chat = document.getElementById('chat');
        // adding messages to the chat (only appending, as there are new ones)
        for (var i = 0; i < messages.length; i++) {
          let message = document.createElement('p');
          message.innerHTML = "<b>&lt;" + htmlEscape(messages[i].username)
                            + "&gt;</b> " + htmlEscape(messages[i].content)
                            + "<br>";
          chat.appendChild(message);
          chat.scrollTop = chat.scrollHeight;  // scrolling to the bottom
          lastMessage = messages[i].t;  // remembering the last timestamp (posts
        }                               // from severs are already ordered)
      }
    });
  } else {
    console.error('Trying to update while no channel is joined!');
  }
}

function ping() {
  /* Ping procedure
   */
  if (channel) {
    let xhttp = new XMLHttpRequest();
    currentPing = sendRequest('GET', '/ping/'+channel, bearerAuthorization(), {
      200: (response) => {  // a new message has been posted, so we update and
        update();           // re-send a ping for the next message(s)
        ping();
      },
      0: (response) => {    // the server has timed-out (2mins), no new message,
        ping();             // so we re-send a ping.
      }
    });
  } else {
    console.error('Trying to ping while no channel is joined!');
  }
}

// linking login procedure to #form-login
document.getElementById('form-login-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  let inputLogin = document.querySelector('#form-login > input:nth-of-type(1)');
  let inputPassw = document.querySelector('#form-login > input:nth-of-type(2)');
  login(inputLogin.value, inputPassw.value);
  // clear inputs so that retyping is easier
  inputLogin.value = "";
  inputPassw.value = "";
});

// linking channel creation to #form-create-channel
document.getElementById('form-create-channel-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  let channelInput = document.querySelector('#form-create-channel > input');
  createChannel(channelInput.value);
  channelInput.value = "";
});

// linking channel joining procedure to #form-channel
document.getElementById('form-channel-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  let select = document.querySelector('#form-channel > select');
  joinChannel(select.options[select.selectedIndex].value);
});

// linking message posting to #form-post
document.getElementById('form-post-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  sendMessage(document.querySelector('#form-post > input').value);
  document.querySelector('#form-post > input').value = "";
});

setVisibility('.show-on-login, .show-on-join', 'hidden');
