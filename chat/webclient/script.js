var token = null;  // JSON with access_token and refresh_token
var channel = null;  // string with channel name that was joined
var username_ = null;  // string with user's login when logged in
var lastMessage = null;  // int timestamp of last fetched message
var currentPing = null;  // XMLHttpRequest object of last ping request
var notificationInterval = null;
var isActive = true;

var catchedEvent = null;

function deleteAllCookies() {
    var cookies = document.cookie.split(";");

    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        var eqPos = cookie.indexOf("=");
        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
}

function setDisplay(query, state) {
  /* Alter the 'visible' CSS property of a set of elements given by a selector.
   * This function mimics jQuery utilities.
   */
  let list = document.querySelectorAll(query);
  for (var i = 0; i < list.length; i++) {
    list[i].style.display = state;
  }
}

function timeToString(time) {
  time = parseInt(time / 1000);
  let now = parseInt(new Date().getTime() / 1000);
  let dif = now - time;
  if (dif < 60) {
    return dif + "s";
  } else if (dif < 3600) {
    return parseInt(dif / 60) + "m";
  } else if (dif < 24 * 3600) {
    return parseInt(dif / 3600) + "h";
  } else {
    return parseInt(dif / (24 * 3600)) + "j";
  }
}

function displayTimes() {
  let list = document.querySelectorAll('.time');
  let times = new Set([]);
  for (var i = 0; i < list.length; i++) {
    let timeStr = timeToString(parseInt(list[i].getAttribute('time')));
    if (timeStr && !times.has(timeStr)) {
      list[i].innerHTML = "•" + timeStr + "•";
    }
    times.add(timeStr);
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
      } else if (xhttp.status == 403) {  // Unauthorized access: we refresh the
        if ('Authorization' in headers   // token and retry the request
            && headers['Authorization'].startsWith('Bearer')) {
          refresh(() => {
            headers['Authorization'] = 'Bearer ' + token['access_token'];
            let xhttp = sendRequest(method, url, headers, callbacks, body);
            if (url.startsWith('/ping/')) {
              currentPing = xhttp;
            }
          });
        }
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
      username_ = username;
      // setting up username in the span of #form-logout
      document.getElementById('username').innerHTML = htmlEscape(username);
      // collecting channels and setting up #form-channel
      document.cookie = "username=" + username;
      document.cookie = "access=" + token['access_token'];
      document.cookie = "refresh=" + token['refresh_token'];
      fetchChannels();
    }
  });
}

function logout() {
  /* Logout procedure
   */
  sendRequest('GET', '/logout', bearerAuthorization(), {
    200: (response) => {
      // resetting elements' visibility
      setDisplay('.show-on-login', 'none');
      setDisplay('.hide-on-login', 'flex');
      // resetting all global variables
      if (currentPing) {
        currentPing.onreadystatechange = function() {};
      }
      document.getElementById('chat').innerHTML = "";
      currentPing = null;
      lastMessage = 0;
      channel = null;
      deleteAllCookies();
      alert('Successfully logged out!');
    }
  });
}

function refresh(callback) {
  /* Token refreshing procedure; callback is used to retry the request that was
     unauthorized.
   */
  if ('refresh_token' in token) {
    sendRequest('GET', '/refresh-token',
                {'Authorization': 'Bearer ' + token['refresh_token']}, {
    200: (response) => {
      let newToken = JSON.parse(response);
      for (var newValue in newToken) {
        token[newValue] = newToken[newValue];
      }
      document.cookie = "access=" + token['access_token'];
      callback();
    },
    403 : (response) => {  // token is just invalid, need to re-log
      alert('Invalid token. Need to re-log!');
      // resetting elements' visibility
      setDisplay('.show-on-login', 'none');
      setDisplay('.hide-on-login', 'flex');
      // resetting all global variables
      token = null;
      if (currentPing) {
        currentPing.onreadystatechange = function() {};
      }
      currentPing = null;
      lastMessage = 0;
      channel = null;
    }
  });
  } else {
    console.error('Trying to refresh but no refresh token found.');
  }
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
      setDisplay('.show-on-login', 'flex');
      setDisplay('.hide-on-login', 'none');
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
  // setDisplay('.show-on-join', 'inline-block');
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
          let message = document.createElement('div');
          message.className = "msg";
          if (messages[i].username == username_) {
            message.className = message.className + " own";
          }
          let user = document.createElement('span');
          user.innerHTML = htmlEscape(messages[i].username);
          user.className = "user";
          let time = document.createElement('span');
          time.setAttribute("time", messages[i].t);
          time.className = "time";
          let content = document.createElement('span');
          content.innerHTML = htmlEscape(messages[i].content);
          content.className = "content";
          message.appendChild(user);
          message.append(time);
          message.appendChild(content);
          chat.appendChild(message);
          chat.scrollTop = chat.scrollHeight;  // scrolling to the bottom
          lastMessage = messages[i].t;  // remembering the last timestamp (posts
        }                               // from severs are already ordered)
        displayTimes();
      }
    });
  } else {
    console.error('Trying to update while no channel is joined!');
  }
}

function ping() {
  /* Ping procedure
   */
  var callTime = new Date().getTime();
  if (channel) {
    currentPing = sendRequest('GET', '/ping/'+channel, bearerAuthorization(), {
      200: (response) => {  // a new message has been posted, so we update and
        update();           // re-send a ping for the next message(s)
        ping();
        notify();
      },
      0: (response) => {  // connection was interrupted
        let timeBeforeError = (new Date().getTime() - callTime) / 1000;
        // here we try to detect if the server timed out; as it should take
        // about 2 minutes (120s), we check a window of 3 seconds around that
        // value (120 +- 3 seconds).
        if (Math.abs(timeBeforeError - 120) < 3) {  // server timed out
          ping();
        }
      }
    });
  } else {
    console.error('Trying to ping while no channel is joined!');
  }
}

function blink() {
  document.title = "*new message*";
  setTimeout(function() {
    document.title = "chrab";
  }, 1000);
}

function setAttributes(element, attributes) {
  for (a in attributes) {
    element.setAttribute(a, attributes[a]);
  }
}

function playSound(filename, playerDivId) {
  var audio = new Audio(filename);
  audio.play();
}

function notify() {
  if (!isActive) {
    playSound('ahbus.mp3', 'audio')
    blink();
    notificationInterval = setInterval(blink, 2100);
  } else {
    // alert('tried to notify');
  }
}

window.onblur = function(event) {
  isActive = false;
}

window.onfocus = function(event) {
  isActive = true;
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
    document.title = "chrab";
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

// linking logout procedure to #form-logout
document.getElementById('form-logout-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  logout();
});

setInterval(displayTimes, 10 * 1000);

setDisplay('.show-on-login', 'none');

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
    username_ = cookies['username'];
    document.getElementById('username').innerHTML =
      htmlEscape(cookies['username']);
    setDisplay('.show-on-login', 'flex');
    setDisplay('.hide-on-login', 'none');
    fetchChannels();
  }
}
