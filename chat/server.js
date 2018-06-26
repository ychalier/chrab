const http = require('http');

var port = 8000;

var routes = {
  'GET': {

    '^/$': function (req, res) {
      res.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      res.write('Hello, World!');
      res.end();
    }

  },
  'POST': {

    '^/$': function (req, res) {
      res.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      res.write(req.body);
      res.end();
    }

  }
}

function exitWithErrorCode(res, statusCode) {
  res.statusCode = statusCode;
  res.end();
}

function handleRequest(req, res) {

  // Log entring request
  const { headers, method, url } = req;
  console.log(headers.host + "\t" + method + "\t" + url);

  let body = [];  // If appropriate, will store POST body (else is kept empty)
  req.on('error', (err) => {
    console.error(err);
    exitWithErrorCode(res, 400);  // Bad Request
  }).on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    req.body = body;

    res.on('error', (err) => {
      console.error(err);
      exitWithErrorCode(res, 500);  // Internal Server Error
    });

    // routing operations: match method and then route
    var found = false;
    var radix = req.url.split("?")[0];  // remove GET arguments for matching
    if (method in routes) {
      for (route in routes[method]) {
        let regex = new RegExp(route[1], 'i');  // regex match case insensitive
        if (regex.exec(radix)) {  // 'null' if exec fails
          found = true;
          routes[method][route](req, res);
          break;
        }
      }
    }

    if (!found) {
      exitWithErrorCode(res, 404);  // Not Found
    }

  });
}

console.log("Starting server on port " + port + "...");
http.createServer(handleRequest).listen(port);
