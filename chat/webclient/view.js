const COLORS = [
  "#D32F2F",  // red
  "#536DFE",  // indigo
  "#388E3C",  // green
  "#E64A19",  // deep orange
  "#5D4037",  // brown
  "#455A64",  // blue grey
  "#0097A7",  // cyan
  "#0288D1",  // light blue
  "#00796B",  // teal
  "#1976D2",  // blue
  "#C2185B",  // pink
  "#7B1FA2",  // purple
  "#512DA8"   // deep purple
];

function colorize(username) {
  const length = COLORS.length;
  let index = 0;
  for (let i = 0; i < username.length; i++) {
    index = (index + (i + 1) * username.charCodeAt(i)) % length;
  }
  return COLORS[index];
}

/****************************/
/***** CONTENT SWAPPING *****/
/****************************/

function storeDisplayProperties() {
  let array = document.querySelectorAll(".state-true, .state-false");
  for (let i = 0; i < array.length; i++) {
    array[i].setAttribute("display",
      window.getComputedStyle(array[i], null).getPropertyValue("display"));
  }
}

function swap(state, parent) {
  /* parent is a DOM element */
  let childs = parent.childNodes;
  for (let i = 0; i < childs.length; i++) {
    let cn = childs[i].className;
    if (cn && cn.includes("state-" + state)) {
      childs[i].style.display = childs[i].getAttribute("display");  // show it
    } else if (cn && cn.includes("state-" + (!state))) {
      childs[i].style.display = "none";  // hide it
    }
  }
}

function swapDisplayedPanels(state) {
  swap(state, document.getElementById("sidebar__account__top"));
  swap(state, document.getElementById("sidebar__account__bottom"));
  swap(state, document.getElementById("sidebar__create-channel"));
}

/***************************/
/***** MODAL UTILITIES *****/
/***************************/

function showModal(element) {
  if (modal) {
    hideModal(modal);
    setTimeout(function() {
      showModal(element);
    }, 10);
    return;
  }
  element.style.display = "flex";
  setTimeout(function() {
    element.style.opacity = 1;
  }, 10);
  modal = element;
}

function hideModal(element=null) {
  if (element == null && modal != null) element = modal;
  element.style.opacity = 0;
  setTimeout(function() {
    element.removeAttribute("style");
  }, 200);
  modal = null;
}

function initModals() {
  let array = document.getElementsByClassName("modal");
  for (let i = 0; i < array.length; i++) {
    array[i].addEventListener("click", function(event) {
      event.stopPropagation();
      hideModal(event.target);
    });
    let childs = array[i].getElementsByTagName("*");
    for (let j = 0; j < childs.length; j++) {
      childs[j].addEventListener("click", function(subEvent) {
        subEvent.stopPropagation();
      })
    }
  }
}

function setModal(buttonId, modalId) {
  document.getElementById(buttonId).addEventListener("click", (event) => {
    showModal(document.getElementById(modalId));
  });
}

/****************************/
/***** CONTENT ADDITION *****/
/****************************/

function addViewChannel(name, delay, isProtected, isOwned,
    nameCallback=null, trashCallback=null) {
  let node = document.getElementById("example__sidebar__channels__wrapper").cloneNode(true);
  let parent = document.getElementById("sidebar__channels");
  node.removeAttribute("style");
  node.removeAttribute("id");
  node.getElementsByClassName("sidebar__channels__wrapper__name")[0].innerHTML = name;
  node.getElementsByClassName("sidebar__channels__wrapper__delay")[0].innerHTML = delay;
  if (!isProtected) {
    node.getElementsByClassName("sidebar__channels__wrapper__lock")[0]
      .setAttribute("style", "display:none");
  }
  if (!isOwned) {
    node.getElementsByClassName("sidebar__channels__wrapper__trash")[0]
      .setAttribute("style", "display:none");
  }
  if (nameCallback) {
    node.getElementsByClassName("sidebar__channels__wrapper__name")[0]
      .addEventListener("click", nameCallback);
  }
  if (trashCallback) {
    node.getElementsByClassName("sidebar__channels__wrapper__trash")[0]
      .addEventListener("click", trashCallback);
  }
  parent.appendChild(node);
  let divider = document.createElement("div");
  divider.className = "divider";
  parent.appendChild(divider);
  return node;
}

function addViewMessage(self, body, time, author) {
  let parent = document.getElementById("chat__messages");
  if (lastAuthor && author && lastAuthor == author
      && !parent.lastChild.hasAttribute("id")) {
    parent.lastChild.className = parent.lastChild.className + "--mid";
  } else if ((lastAuthor == null && !self)
    || (lastAuthor != null && lastAuthor != author && !self)) {
    let authorNode = document.getElementById("example__chat__messages__author")
                      .cloneNode(true);
    authorNode.removeAttribute("style");
    authorNode.removeAttribute("id");
    authorNode.innerHTML = author;
    parent.appendChild(authorNode);
  }
  let node;
  if (self) {
    node = document.getElementById("example__chat__messages__wrapper--right")
            .cloneNode(true);
  } else {
    node = document.getElementById("example__chat__messages__wrapper--left")
            .cloneNode(true);
  }
  node.removeAttribute("style");
  node.removeAttribute("id");
  node.querySelector(".chat__messages__wrapper__time").innerHTML = time;
  node.querySelector(".chat__messages__wrapper__body").innerHTML = body;
  if (!self) {
    node.querySelector(".chat__messages__wrapper__body")
      .style.backgroundColor = colorize(author);
  }
  parent.appendChild(node);
  parent.scrollTop = parent.scrollHeight;
  lastAuthor = author;
}

function setLoggedInView() {
  document.getElementById("sidebar__account__identity__username").innerHTML
    = login;
  swapDisplayedPanels(true);
}

function setJoinedChannelView() {
  document.getElementById("chat__info__channel").innerHTML = selectedChannel;
  unlockChatView();
}

function addViewSessions(timestamp, agent) {
  let parent = document.querySelector("#modal__sessions table");
  let node = document.createElement("tr");
  let deliveredOn = document.createElement("td");
  let userAgent = document.createElement("td");
  node.className = "table__row--session";
  deliveredOn.innerHTML = (new Date(timestamp)).toString();
  userAgent.innerHTML = htmlEscape(agent);
  node.appendChild(deliveredOn);
  node.appendChild(userAgent);
  parent.appendChild(node);
}

/********************/
/***** CLEANING *****/
/********************/

function removeUnidentifiedChildren(parent) {
  let childs = parent.childNodes;
  let toDelete = [];
  for (let i = 0; i < childs.length; i++) {
    if (!("hasAttribute" in childs[i] && childs[i].hasAttribute("id"))) {
      toDelete.push(childs[i]);
    }
  }
  for (let i = 0; i < toDelete.length; i++) {
    parent.removeChild(toDelete[i]);
  }
}

function clearForm(form) {
  let inputs = form.getElementsByTagName("input");
  for (let i = 0; i < inputs.length; i++) {
    inputs[i].value = "";
  }
}

function clearChannelsListView() {
  removeUnidentifiedChildren(document.getElementById("sidebar__channels"));
}

function clearChatView() {
  removeUnidentifiedChildren(document.getElementById("chat__messages"));
}

function resetChatView() {
  clearChatView();
  lockChatView();
  document.getElementById("chat__info__channel").innerHTML = "Ø";
}

function lockChatView() {
  let form = document.getElementById("chat__form");
  form.getElementsByTagName("input")[0].setAttribute("disabled", "");
  form.getElementsByTagName("button")[0].setAttribute("disabled", "");
  clearForm(form);
}

function unlockChatView() {
  let form = document.getElementById("chat__form");
  form.getElementsByTagName("input")[0].removeAttribute("disabled");
  form.getElementsByTagName("button")[0].removeAttribute("disabled");
}

function setConnectionStatusColor(status) {
  let color;
  if (status.startsWith("2")) {
    color = "green";
  } else if (status.startsWith("4")) {
    color = "orange";
  } else {
    color = "red";
  }
  document.getElementById("sidebar__account__identity__details__connection").style.backgroundColor = color;
}

function clearSessions() {
  let parent = document.querySelector("#modal__sessions table");
  let nodes = document.getElementsByClassName("table__row--session");
  for (let i = 0; i < nodes.length; i++) {
    parent.removeChild(nodes[i]);
  }
}

function setupVideo() {
  const videoCountInPlaylist = 12;
  let videoIndex = Math.floor((Math.random() * videoCountInPlaylist) + 1);

  document.querySelector("iframe").setAttribute("src",
    "https://www.youtube.com/embed/videoseries"
    + "?list=PL2ecHtEW1_x-Ah8O5Cv8vR8euOZXncoGA&frameborder=0&autoplay=1"
    + "&controls=0&disablekb=1&color=white&cc_load_policy=0&fs=0&mute=1"
    + "&iv_load_policy=3&loop=1&modestbranding=1&rel=0&showinfo=0"
    + "&index=" + videoIndex);
}

/***************************/
/***** EVENT LISTENERS *****/
/***************************/

window.addEventListener("keyup", function(event) {
  let keyCode = event.keyCode;
  if (keyCode == 27 && modal != null) {  // ESCAPE
    hideModal();
  } else if (keyCode == 69 && event.ctrlKey) {
    setupVideo();
  }
}, false);



setModal("sidebar__account__login", "form__login");
setModal("sidebar__account__register", "form__register");
setModal("sidebar__create-channel__button", "form__create-channel");
setModal("sidebar__account__identity__details__sessions", "modal__sessions");

/**************************/
/***** INITIALISATION *****/
/**************************/

storeDisplayProperties();
initModals();
