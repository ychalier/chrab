var token = null;
var channel = null;

document.getElementById('form-login-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  let xhttp = new XMLHttpRequest();
  let username =
    document.querySelector('#form-login > input[type="text"]')
            .value;
  let password =
    document.querySelector('#form-login > input[type="password"]')
            .value;
  let hash = btoa(username + ':' + password);
  xhttp.open("GET", "/retrieve-token", true);
  xhttp.setRequestHeader('Authorization', 'Basic ' + hash);
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4) {
      if (xhttp.status == 200) {
        token = JSON.parse(xhttp.responseText);
        alert('Connected!');
      } else {
        alert(xhttp.status);
      }
    }
  }
  xhttp.send();
});

document.getElementById('form-channel-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  if (token != null) {
    let xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/channels", true);
    xhttp.setRequestHeader('Authorization', 'Bearer ' + token['access_token']);
    channel = document.querySelector('#form-channel > input').value;
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState == 4) {
        if (xhttp.status == 200) {
          let channels = JSON.parse(xhttp.responseText);
          let found = false;
          for (var i = 0; i < channels.length; i++) {
            if (channels[i].name == channel) {
              found = true;
              break;
            }
          }
          if (!found) {
            // channel = null;
            document.querySelector('#form-channel > input').value = "";
            alert('Channels does not exist!');
          }
        } else {
          alert(xhttp.status);
        }
      }
    }
    xhttp.send();
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

function update() {
  if (token != null && channel != null) {
    let xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/channel/" + channel, true);
    xhttp.setRequestHeader('Authorization', 'Bearer ' + token['access_token']);
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState == 4) {
        if (xhttp.status == 200) {
          let messages = JSON.parse(xhttp.responseText);
          let string = "";
          for (var i = 0; i < messages.length; i++) {
            string += "<b>&lt;" + messages[i].username + "&gt;</b> "
                      + messages[i].content + "<br>";
          }
          document.getElementById('chat').innerHTML = string;
        } else {
          alert(xhttp.status);
        }
      }
    }
    xhttp.send();
  }
}

// setInterval(update, 1000);

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
        } else {
          alert(xhttp.status);
        }
      }
    }
    xhttp.send();
  } else {
    alert('You need to log-in and join a channel!');
  }
}
