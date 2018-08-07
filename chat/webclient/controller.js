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
        (event) => {  });  //TODO: delete channel if owned
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
    resetChatView();
    selectedChannel = channelName;
    setJoinedChannelView();
    retrieveMessages();
  }
}

function retrieveMessages() {
  getMessages((messages) => {
    for (let i = 0; i < messages.length; i++) {
      let {username, content, t} = messages[i];
      addViewMessage(login == username, content, datetimeToString(t), username);
      lastMessageTimestamp = t;
    }
  });
}

function successfulLogin() {
  setLoggedInView();
  fetchChannels();
}

function setSubmitEvent(formId, callback, hide=false) {
  document.getElementById(formId).addEventListener("submit", function (event) {
    event.preventDefault();
    callback(event);
    clearForm(document.getElementById(formId));
    if (hide) hideModal();
  });
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
  sendMessage(htmlEscape(event.target.querySelector("input").value),
    retrieveMessages);  //TODO: remove this callback whith pining!
}, false);


resetChatView();
swapDisplayedPanels(false);
loadCookies(successfulLogin);
