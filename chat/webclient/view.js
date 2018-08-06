var modalShown;  // null if none is shown

var accountPanelState = false;  // true when logged in
function setAccountPanelState(state) {
  accountPanelState = state;
  displayElementsFromState(state,
    document.getElementById("account-panel-top"));
  displayElementsFromState(state,
    document.getElementById("account-panel-bottom"));
  displayElementsFromState(state,
    document.getElementById("create-channel-panel"));
}

function displayElementsFromState(state, parent) {
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

function storeDisplayProperties() {
  let array = document.querySelectorAll(".state-true, .state-false");
  for (let i = 0; i < array.length; i++) {
    array[i].setAttribute("display",
      window.getComputedStyle(array[i], null).getPropertyValue("display"));
  }
}

function appendChannel(name, delay, isProtected, isOwned,
    nameCallback=null, trashCallback=null) {
  let node = document.getElementById("channel-wrapper-example").cloneNode(true);
  let parent = document.getElementById("channel-list-panel");
  node.removeAttribute("style");
  node.removeAttribute("id");
  node.getElementsByClassName("channel-name")[0].innerHTML = name;
  node.getElementsByClassName("channel-delay")[0].innerHTML = delay;
  if (!isProtected) {
    node.getElementsByClassName("channel-lock")[0]
      .setAttribute("style", "display:none");
  }
  if (!isOwned) {
    node.getElementsByClassName("channel-trash")[0]
      .setAttribute("style", "display:none");
  }
  if (nameCallback) {
    node.getElementsByClassName("channel-name")[0]
      .addEventListener("click", nameCallback);
  }
  if (trashCallback) {
    node.getElementsByClassName("channel-trash")[0]
      .addEventListener("click", trashCallback);
  }
  parent.appendChild(node);
  let divider = document.createElement("div");
  divider.className = "divider";
  parent.appendChild(divider);
}

function showModal(element) {
  if (modalShown) {
    hideModal(modalShown);
    setTimeout(function() {
      showModal(element);
    }, 10);
    return;
  }
  element.style.display = "flex";
  setTimeout(function() {
    element.style.opacity = 1;
  }, 10);
  modalShown = element;
}

function hideModal(element=null) {
  if (element == null && modalShown != null) element = modalShown;
  element.style.opacity = 0;
  setTimeout(function() {
    element.removeAttribute("style");
  }, 200);
  modalShown = null;
}

function setupModalWindows() {
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

var lastAuthor;
function appendMessage(self, body, time, author) {
  let parent = document.getElementById("message-panel");
  if (lastAuthor && author && lastAuthor == author) {
    parent.lastChild.className = parent.lastChild.className + " message-center";
  } else if (lastAuthor && author && !self) {
    let authorNode = document.getElementById("message-author-example")
                      .cloneNode(true);
    authorNode.removeAttribute("style");
    authorNode.removeAttribute("id");
    authorNode.innerHTML = author;
    parent.appendChild(authorNode);
  }
  let node;
  if (self) {
    node = document.getElementById("message-wrapper-right-example")
            .cloneNode(true);
  } else {
    node = document.getElementById("message-wrapper-left-example")
            .cloneNode(true);
  }
  node.removeAttribute("style");
  node.removeAttribute("id");
  node.getElementsByClassName("message-time")[0].innerHTML = time;
  node.getElementsByClassName("message-body")[0].innerHTML = body;
  parent.appendChild(node);
  parent.scrollTop = parent.scrollHeight;
  lastAuthor = author;
}

storeDisplayProperties();
setAccountPanelState(true);
setupModalWindows();

window.addEventListener("keyup", function(event) {
  let keyCode = event.keyCode;
  if (keyCode == 27 && modalShown != null) {  // ESCAPE
    hideModal();
  }
}, false);

document.getElementById("button-login").addEventListener("click",
(event) => {
  showModal(document.getElementById("login-form"));
});

document.getElementById("button-register").addEventListener("click",
(event) => {
  showModal(document.getElementById("register-form"));
});

document.getElementById("button-create-channel").addEventListener("click",
(event) => {
  showModal(document.getElementById("create-channel-form"));
});
