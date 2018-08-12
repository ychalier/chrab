function htmlEscape(string) {
  /* Encodes '>' and '<' so that an HTML does not detect nodes when parsing
   */
  return string.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function durationToString(time) {
  /* Express a duration (in seconds) into text format
   */
  if (time < 60) {
    return time + "s";
  } else if (time < 3600) {
    return parseInt(time / 60) + "m";
  } else if (time < 24 * 3600) {
    return parseInt(time / 3600) + "h";
  } else {
    return parseInt(time / (24 * 3600)) + "j";
  }
}

function datetimeToString(time) {
  /* Format:
   *  - if 'time' is today: HH:MM
   *  - else:  DAY. D ─ HH:MM
   */
  let days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  let date = new Date(time);
  let now = new Date();
  let string = "";
  if (now.getTime() - time > 24 * 3600000 || now.getDate() != date.getDate()) {
    string = days[date.getDay()] + ". " + date.getDate() + " ─ ";
  }
  return string + (date.getHours() < 10 ? "0": "") + date.getHours() + ":"
    + (date.getMinutes() < 10 ? "0": "") + date.getMinutes();
}


function sendRequest(method, url, headers, callbacks,
  body="", refreshIfUnauthorized=false) {
  /* Sends a request; authorization goes in headers; callbacks is a dictionnary
     whom keys are status code returned by the server.
   */
  if (debug) {
    console.log("Send request:\t" + method + "\t" + url);
  }
  let xhttp = new XMLHttpRequest();
  xhttp.open(method, url, true);
  for (let header in headers) {
    xhttp.setRequestHeader(header, headers[header]);
  }
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4) {
      setConnectionStatusColor(xhttp.status.toString());
      if (xhttp.status in callbacks) {
        callbacks[xhttp.status](xhttp.responseText);
      } else if (xhttp.status == 403 && refreshIfUnauthorized
        && !xhttp.responseText.startsWith("Wrong channel password")) {
        refreshToken(() => {
          headers["Authorization"] = "Bearer " + token.refresh_token;
          let xhttp = sendRequest(method, url, headers, callbacks, body, false);
          if (url.startsWith("/ping/")) {
            currentPing = xhttp;
          }
        });
      } else if (xhttp.status == 403
        && !xhttp.responseText.startsWith("Wrong channel password")) {
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
  let cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    let pos = cookie.indexOf("=");
    let name = pos > -1 ? cookie.substr(0, pos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}
