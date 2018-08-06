var channelPassword;
var channelSelected;
var lastMessageTimestamp;

function htmlEscape(string) {
  return string.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function durationToString(time) {
  // time is in seconds
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

function dateTimeToString(time) {
  let days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  let date = new Date(time);
  let now = new Date();
  let string = "";
  if (now.getTime() - time > 24 * 3600000 || now.getDate() != date.getDate()) {
    string = days[date.getDay()] + ". " + date.getDate() + " ─ ";
  }
  return string + date.getHours() + ":" + date.getMinutes();
}

function resetChannels() {
  channelPassword = null;
  channelSelected = null;
  lastMessageTimestamp = null;
  document.getElementById("channel-name").innerHTML = "Ø";
  resetChannelsViews();
}

function fetchChannels() {
  sendRequest('GET', '/channels', bearerAuthorizationHeader(), {
    200: (response) => {
      let json = JSON.parse(response);
      resetChannels();
      for (let i = 0; i < json.length; i++) {
        appendChannel(json[i]["name"], durationToString(json[i]["delay"] ),
          json[i]["protected"], login == json[i]["creator"],
          (event) => { joinChannel(json[i]["name"], json[i]["protected"]) },
          (event) => {  });
      }
    }
  }, "", true);
}

function joinChannel(channelName, isProtected) {
  lastMessageTimestamp = null;
  if (isProtected) {
    channelPassword = null;
    let form = document.getElementById("join-channel-form");
    form.setAttribute("channel", channelName);
    showModal(form);
  } else {
    resetChat();
    channelSelected = channelName;
    document.getElementById("channel-name").innerHTML = channelSelected;
    retrieveMessages();
  }
}

function retrieveMessages() {
  if (channelSelected) {
    let getParameters = "";
    if (lastMessageTimestamp != null) {
      getParameters += "?limit=" + (lastMessageTimestamp + 1);
    }
    let headers = bearerAuthorizationHeader();
    if (channelPassword != null) {
      headers["chanpwd"] = channelPassword;
    }
    sendRequest("GET", "/channel/" + channelSelected + getParameters, headers, {
      200: (response) => {
        let json = JSON.parse(response);
        for (let i = 0; i < json.length; i++) {
          appendMessage(login == json[i].username, json[i].content,
            dateTimeToString(json[i].t), json[i].username);
          lastMessageTimestamp = json[i].t;
        }
      }
    }, "", true);
  }
}

function successfulLogin() {
  document.getElementById("username").innerHTML = login;
  setAccountPanelState(true);
  document.querySelector("#message-form > input").removeAttribute("disabled");
  fetchChannels();
}

document.querySelector("#login-form").addEventListener("submit",
function(event) {
  event.preventDefault();
  sendLoginRequest(
    document.querySelector("#login-form input:nth-of-type(1)").value,
    document.querySelector("#login-form input:nth-of-type(2)").value,
    successfulLogin);
  cleanForm(document.getElementById("login-form"));
  hideModal();
});

document.querySelector("#join-channel-form").addEventListener("submit",
function (event) {
  event.preventDefault();
  channelPassword = document.querySelector("#join-channel-form input").value;
  joinChannel(
    document.querySelector("#join-channel-form").getAttribute("channel"),
    false);
  cleanForm(document.getElementById("join-channel-form"));
  hideModal();
});

resetView();
loadCookies(successfulLogin);
