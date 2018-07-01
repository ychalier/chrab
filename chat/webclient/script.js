var token = null;
var channel = null;
var lastMessage = null;
var currentPing = null;


function setVisibility(query, state) {
  let list = document.querySelectorAll(query);
  for (var i = 0; i < list.length; i++) {
    list[i].style.visibility = state;
  }
}


setVisibility('.show-on-login, .show-on-join', 'hidden');


document.getElementById('form-login-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  let xhttp = new XMLHttpRequest();
  let inputLogin = document.querySelector(
    '#form-login > input[type="text"]');
  let inputPasswd = document.querySelector(
    '#form-login > input[type="password"]');
  let username = inputLogin.value;
  let password = inputPasswd.value;
  inputLogin.value = "";
  inputPasswd.value = "";
  let hash = btoa(username + ':' + password);
  xhttp.open("GET", "/retrieve-token", true);
  xhttp.setRequestHeader('Authorization', 'Basic ' + hash);
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4) {
      if (xhttp.status == 200) {
        // stores token in global var
        token = JSON.parse(xhttp.responseText);
        document.getElementById('username').innerHTML = htmlEscape(username);
        fetchChannels();
      } else {
        alert(xhttp.responseText);
      }
    }
  }
  xhttp.send();
});


function fetchChannels() {
  // fetches channels
  let xhttp = new XMLHttpRequest();
  xhttp.open("GET", "/channels", true);
  xhttp.setRequestHeader('Authorization',
    'Bearer ' + token['access_token']);
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4) {
      if (xhttp.status == 200) {
        let channels = JSON.parse(xhttp.responseText);
        let select = document.querySelector('select');
        select.innerHTML = "";
        for (var i = 0; i < channels.length; i++) {
          let option = document.createElement('option');
          option.value = channels[i].name;
          option.innerHTML = channels[i].name;
          select.appendChild(option);
        }
        setVisibility('.show-on-login', 'visible');
        document.getElementById('form-login').innerHTML = "";
      } else {
        alert(xhttp.status + '\n' + xhttp.responseText);
      }
    }
  }
  xhttp.send();
}


document.getElementById('form-channel-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  if (token != null) {
    let xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/channels", true);
    xhttp.setRequestHeader('Authorization', 'Bearer ' + token['access_token']);
    let select = document.querySelector('#form-channel > select');
    channel = select.options[select.selectedIndex].value;
    document.getElementById('chat').innerHTML = "";
    if (currentPing != null) {
      currentPing.onreadystatechange = function () {};
    }
    lastMessage = 0;
    update();
    ping();
    setVisibility('.show-on-join', 'visible');
  } else {
    alert('You must log-in before.');
  }
});


document.getElementById('form-post-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  if (token != null && channel != null) {
    let content = document.querySelector('#form-post > input').value;
    document.querySelector('#form-post > input').value = "";
    if (content != "") {
      let xhttp = new XMLHttpRequest();
      xhttp.open("POST", "/channel/" + channel, true);
      xhttp.setRequestHeader('Authorization',
                             'Bearer ' + token['access_token']);
      xhttp.setRequestHeader('Content-type','text/plain; charset=utf-8');
      xhttp.send(content);
    }
  } else {
    alert('You must log-in and select a channel before!');
  }
});


function htmlEscape(string) {
  return string.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


function update() {
  if (token != null && channel != null) {
    let xhttp = new XMLHttpRequest();
    let getParameters = "";
    if (lastMessage != null) {
      getParameters += "?limit=" + (lastMessage + 1);
    }
    xhttp.open("GET", "/channel/" + channel + getParameters, true);
    xhttp.setRequestHeader('Authorization', 'Bearer ' + token['access_token']);
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState == 4) {
        if (xhttp.status == 200) {
          let messages = JSON.parse(xhttp.responseText);
          let chat = document.getElementById('chat');
          for (var i = 0; i < messages.length; i++) {
            let message = document.createElement('p');
            message.innerHTML = "<b>&lt;" + htmlEscape(messages[i].username)
                              + "&gt;</b> " + htmlEscape(messages[i].content)
                              + "<br>";
            lastMessage = messages[i].t;
            chat.appendChild(message);
            chat.scrollTop = chat.scrollHeight;
          }
        } else {
          alert(xhttp.status);
        }
      }
    }
    xhttp.send();
  }
}


document.getElementById('form-create-channel-submit').addEventListener('click',
function(event) {
  event.preventDefault();
  if (token != null) {
    let channelInput = document.querySelector('#form-create-channel > input');
    let channel = channelInput.value;
    channelInput.value = "";
    let xhttp = new XMLHttpRequest();
    xhttp.open('POST', '/create-channel', true);
    xhttp.setRequestHeader('Authorization', 'Bearer ' + token['access_token']);
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState == 4) {
        if (xhttp.status == 201) {
          alert('Successfully created!');
          fetchChannels();
        } else {
          alert(xhttp.status + '\n' + xhttp.responseText);
        }
      }
    }
    xhttp.send(channel);
  } else {
    alert('You must log-in before!');
  }
});


function ping() {
  if (token != null && channel != null) {
    let xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/ping/" + channel, true);
    xhttp.setRequestHeader('Authorization', 'Bearer ' + token['access_token']);
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState == 4) {
        if (xhttp.status == 200) {
          update();
          ping();
        } else if (xhttp.status == 0) {
          ping();
        } else {
          alert(xhttp.status + '\n' + xhttp.responseText);
        }
      }
    }
    currentPing = xhttp;
    xhttp.send();
  } else {
    alert('You need to log-in and join a channel!');
  }
}
