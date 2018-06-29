var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    document.getElementById("chat").innerHTML = xhttp.responseText;
  }
};
xhttp.open("GET", "http://localhost:8000/", true);
xhttp.send();
