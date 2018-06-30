var token = null;
var channel = null;
var lastMessage = null;

document.getElementById('form-channel').style.visibility = 'hidden';
document.getElementById('form-post').style.visibility = 'hidden';

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

        // replaces form with a welcome message
        let form = document.getElementById('form-login');
        let newEl = document.createElement('p');
        newEl.innerHTML = 'Hello <b>' + username + '</b>!';
        form.parentNode.replaceChild(newEl, form);

        // fetches channels
        let xhttp2 = new XMLHttpRequest();
        xhttp2.open("GET", "/channels", true);
        xhttp2.setRequestHeader('Authorization',
          'Bearer ' + token['access_token']);
        xhttp2.onreadystatechange = function() {
          if (xhttp2.readyState == 4) {
            if (xhttp2.status == 200) {
              let channels = JSON.parse(xhttp2.responseText);
              let select = document.querySelector('select');
              for (var i = 0; i < channels.length; i++) {
                let option = document.createElement('option');
                option.value = channels[i].name;
                option.innerHTML = channels[i].name;
                select.appendChild(option);
              }
              document.getElementById('form-channel').style.visibility =
                'visible';
            } else {
              alert(xhttp2.status + '\n' + xhttp2.responseText);
            }
          }
        }
        xhttp2.send();
      } else {
        alert(xhttp.responseText);
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
    let select = document.querySelector('#form-channel > select');
    channel = select.options[select.selectedIndex].value;
    update();
    ping();
    document.getElementById('form-post').style.visibility = 'visible';
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
            message.innerHTML = "<b>&lt;" + messages[i].username + "&gt;</b> "
              + messages[i].content + "<br>";
            lastMessage = messages[i].t;
            chat.appendChild(message);
          }
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
