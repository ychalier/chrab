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

storeDisplayProperties();
setAccountPanelState(true);
