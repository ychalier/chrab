/*var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    document.getElementById("chat").innerHTML = xhttp.responseText;
  }
};
xhttp.open("GET", "http://localhost:8000/", true);
xhttp.send();
*/

var token = null;

document.getElementById('form-login-submit')
        .addEventListener('click', function(event) {
  event.preventDefault();
  let xhttp = new XMLHttpRequest();
  let username =
    document.querySelector('#form-login > input[type="text"]')
            .value;
  let password =
    document.querySelector('#form-login > input[type="password"]')
            .value;
  let hash = btoa(username + ':' + password);
  xhttp.open("GET", "http://localhost:8000/retrieve-token", true);
  xhttp.setRequestHeader('Authorization', 'Basic ' + hash);
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4) {
      if (xhttp.status == 200) {
        token = JSON.parse(xhttp.responseText);
        alert('Connected!');
      } else {
        alert(xhttp.status);
      }
    }
  }
  xhttp.send();
});
