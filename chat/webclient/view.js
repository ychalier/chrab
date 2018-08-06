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

storeDisplayProperties();
setAccountPanelState(true);
