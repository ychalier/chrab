var url = require('url');
var http = require('http');

var port = 80;

// a map of all views offered by the server
var routes = {};

routes["/"] = function (query, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello, World!');
  res.end();
}

function router(req, res) {

  // logging incoming requests
  console.log(req.headers.host + "\t" + req.method + "\t" + req.url);

  var target = req.url.split("?")[0];  // the proper URL, a.k.a. the route
  var query = url.parse(req.url, true).query;  // GET parameters

  if (req.method === "GET") {
    if (target in routes) {
      routes[target](query, res);
    }
  }
}

console.log("Starting server on port " + port + "...");
http.createServer(router).listen(port);
