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

function resetChannelList() {
  selectedChannelPwd = null;
  selectedChannel = null;
  lastMessageTimestamp = null;
  clearChannelsListView();
  resetChatView();
}

function fetchChannels() {
  getChannels((channels) => {
    resetChannelList();
    for (let i = 0; i < channels.length; i++) {
      let {name, delay, protected, creator} = channels[i];
      addViewChannel(name, durationToString(delay), protected, login == creator,
        (event) => { joinChannel(name, protected) },
        (event) => { deleteChannel(name, fetchChannels) });
    }
  });
}

function joinChannel(channelName, isProtected) {
  lastMessageTimestamp = null;
  if (isProtected) {
    selectedChannelPwd = null;
    let form = document.getElementById("form__join-channel");
    form.setAttribute("channel", channelName);
    showModal(form);
  } else {
    selectedChannel = channelName;
    retrieveMessagesFirst();
  }
}

function retrieveMessagesFirst() {
  getMessages((messages) => {
    resetChatView();
    setJoinedChannelView();
    for (let i = 0; i < messages.length; i++) {
      let {username, content, t} = messages[i];
      addViewMessage(login == username, content, datetimeToString(t), username);
      lastMessageTimestamp = t;
    }
    if (currentPing) {
      // if we were pinging a channel, we do not need to get notified anymore.
      // so when the connection will timeout on the server-side (about 2mins),
      // no update will be made and also no more pings for this channel.
      currentPing.onreadystatechange = function() {};
    }
    ping();
  });
}

function retrieveMessages() {
  getMessages((messages) => {
    for (let i = 0; i < messages.length; i++) {
      let {username, content, t} = messages[i];
      addViewMessage(login == username, content, datetimeToString(t), username);
      lastMessageTimestamp = t;
    }
    ping();
  });
}

function successfulLogin() {
  setLoggedInView();
  fetchChannels();
}

function updateSessions() {
  getSessions((sessions) => {
    clearSessions();
    for (let i = 0; i < sessions.length; i++) {
      let {t, agent} = sessions[i];
      addViewSessions(t, agent);
    }
    document.getElementById("sidebar__account__identity__details__sessions")
      .innerHTML = sessions.length.toString();
  });
}

function setSubmitEvent(formId, callback, hide=false) {
  document.getElementById(formId).addEventListener("submit", function (event) {
    event.preventDefault();
    callback(event);
    clearForm(document.getElementById(formId));
    if (hide) hideModal();
  });
}

function ping() {
  var callTime = new Date().getTime();
  if (selectedChannel) {
    currentPing = sendRequest("GET", "/ping/" + selectedChannel,
      channelHeader(), {
      200: (response) => {  // a new message has been posted, so we update and
        retrieveMessages(); // re-send a ping for the next message(s)
        ping();
        // notify(); TODO: uncomment that when ready
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
    }, "", true);
  } else if (debug) {
    throw 'Trying to ping while no channel is joined!';
  }
}

setSubmitEvent("form__login", (event) => {
  retrieveToken(
    event.target.querySelector("input:nth-of-type(1)").value,
    event.target.querySelector("input:nth-of-type(2)").value,
    successfulLogin);
}, true);

setSubmitEvent("form__join-channel", (event) => {
  selectedChannelPwd = event.target.querySelector("input").value;
  joinChannel(event.target.getAttribute("channel"), false);
}, true);

setSubmitEvent("chat__form", (event) => {
  sendMessage(htmlEscape(event.target.querySelector("input").value));
}, false);

setSubmitEvent("form__create-channel", (event) => {
  postChannel(
    htmlEscape(event.target.querySelector("input:nth-of-type(1)").value),
    parseInt(event.target.querySelector("input:nth-of-type(2)").value),
    event.target.querySelector("input:nth-of-type(3)").value,
    fetchChannels
  );
}, true);

setSubmitEvent("form__register", (event) => {
  let u = htmlEscape(event.target.querySelector("input:nth-of-type(1)").value);
  let p = event.target.querySelector("input:nth-of-type(2)").value;
  register(u, p, () => {
    retrieveToken(u, p, successfulLogin);
  });
}, true);

document.getElementById("sidebar__account__logout").addEventListener("click",
  function(event) {
    logout();
  });

resetChatView();
swapDisplayedPanels(false);
loadCookies(successfulLogin);
setTimeout(updateSessions, 1000 * 3);
setInterval(updateSessions, 1000 * 60 * 5);
