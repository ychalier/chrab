var accountPanelState = false;  // true when logged in
function setAccountPanelState(state) {
  accountPanelState = state;
  displayElementsFromState(state,
    document.getElementById("account-panel-top"));
  displayElementsFromState(state,
    document.getElementById("account-panel-bottom"));
}

function displayElementsFromState(state, parent) {
  /* parent is an (DOM) element */
  let childs = parent.childNodes;
  for (let i = 0; i < childs.length; i++) {
    let cn = childs[i].className;
    if (cn && cn.includes("state-" + state)) {  // show it
      if (childs[i].hasAttribute("display")) {
        childs[i].style.display = childs[i].getAttribute("display");
      } else if (childs[i].style.display == "none") {
        childs[i].style.display = "block";
      }
    } else if (cn && cn.includes("state-" + (!state))) {  // hide it
      childs[i].setAttribute("display", childs[i].style.display);
      childs[i].style.display = "none";
    }
  }
}

setAccountPanelState(false);
