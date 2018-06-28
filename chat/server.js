const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const auth = require('./auth');

var port = 8000;

var routes = {
  'GET': {

    '^/$': function (req, res, body) {
      console.log("Using hello world!");
      res.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      res.write('Hello, World!');
      res.end();
    },

    '^/token$': auth.requestToken

  },
  'POST': {

    '^/register$': auth.register

  }
}

function exitWithErrorCode(res, statusCode) {
  res.statusCode = statusCode;
  res.end();
}

function handleRequest(req, res) {

  // Log entring request
  const { headers, method, url } = req;
  console.log(req.connection.remoteAddress + "\t" + method + "\t" + url);

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
        let regex = new RegExp(route, 'i');  // regex match case insensitive
        if (regex.exec(radix)) {  // .exec() returns 'null' if it fails
          found = true;
          routes[method][route](req, res, body);
          break;
        }
      }
    }

    if (!found) {
      exitWithErrorCode(res, 404);  // Not Found
    }

  });
}

function load_database() {
  let filename = './chat.db';
  let db = new sqlite3.Database(filename, (err) => {
    if (err) {
      console.error(err.message);
    }
  });
  db.run('CREATE TABLE IF NOT EXISTS users '
    + '(id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT, passwd TEXT)');
  return db;
}

// making sure database exists and contains the righ tables
load_database().close((err) => {
  if (err) {
    console.error(err.message);
  }
});

console.log("Starting server on port " + port + "...");
http.createServer(handleRequest).listen(port);
