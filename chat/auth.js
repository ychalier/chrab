const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

var expires = 3600;
const maxSimultaneousConn = 3;

function basicReply(res, statusCode, message='') {
  /* Set the response status codes, writes a message if one is given, and
     finally ends communication.
   */
  res.statusCode = statusCode;
  res.write(message);
  res.end();
}


function errorReply(res, err) {
  /* Basic reply for a Internal Server Error. Prints the error in the log.
   */
  console.error(err.message);
  basicReply(res, 500);  // Internal Server Error
}


function readLoginPasswordHash(req) {
  /* Reads login and password from basic HTTP authorization and computes the
     password hash that should match the one stored in database.
     The field 'authorization' is supposed to be present.
   */
  let out = {}

  // String is 'Basic ds8787894', so we need to prune until the space
  let basicAuthorization = req.headers['authorization'].split(' ')[1]

  // Reverse the base64 encoding
  let credentials = new Buffer.from(basicAuthorization, 'base64')
                              .toString()
                              .split(':');

  // Computing hash
  out.login = credentials[0];
  out.hash = crypto.createHmac('sha256', credentials[1])
                   .update(credentials[0])
                   .digest('hex');
  return out;
}


function generateToken(req) {
  /* Generates a token from a random 32 bytes salt and information from the
     request. Tokens thus depends on client's IP and user-agent.
   */
  let out = {};
  let client = req.connection.remoteAddress;
  let agent = req.headers['user-agent'];
  out.salt = crypto.randomBytes(32).toString('hex');
  out.hash = crypto.createHmac('sha256', client + agent)
                   .update(out.salt)
                   .digest('hex');
  return out
}


function readTokenHash(req) {
  /* Reads token from Bearer HTTP authorization and computes the hash that
     should match the one stored in database.
     The field 'authorization' is supposed to be present.
   */
  let token = req.headers['authorization'].split(' ')[1];
  let client = req.connection.remoteAddress;
  let agent = req.headers['user-agent'];
  let hash = crypto.createHmac('sha256', client + agent)
                   .update(token)
                   .digest('hex');
  return hash;
}


function register(req, res, body) {
  const { headers, method, url } = req;

  let credentials = JSON.parse(body);
  if ('login' in credentials && 'passwd' in credentials) {

    // connecting to databse
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });

    let login = credentials['login'];
    let hash =  crypto.createHmac('sha256', credentials['passwd'])
                      .update(login)
                      .digest('hex');

    // check if username is already in database
    db.all('SELECT * FROM users WHERE login=(?) LIMIT 1', [login],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else if (rows.length > 0) {
          basicReply(res, 400, 'Username already taken.');  // Bad Request
        } else {  // this is a new user
          db.run('INSERT INTO users(login, passwd) VALUES (?, ?)',
            [login, hash],
            (err) => {
              if (err) { errorReply(res, err); }
              else {
                db.close((err) => {
                  if (err) { errorReply(res, err); }
                  else {
                    basicReply(res, 201);  // Created
                  }
                });
              }
            });
        }
    });
  } else {
    basicReply(res, 400, 'Missing login or password.');  // Bad Request
  }
}


function requestToken(req, res, body) {
  /* Generates an access token and a refresh token. The salt is sent to the
     client. The hash of the salt, user-agent and remote address is stored in
     database.
   */
  const { headers, method, url } = req;

  if ('authorization' in headers) {
    // connecting to databse
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });

    let { login, hash } = readLoginPasswordHash(req);

    // checking is login and password match
    db.all('SELECT * FROM users WHERE login=(?) AND passwd=(?)', [login, hash],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else {
          if (rows.length == 0) {
            basicReply(res, 403, 'Invalid login or password.');
          } else {
            // token generation
            let access = generateToken(req);
            let refresh = generateToken(req);
            let now = new Date();

            // delete previous tokens from same agent
            db.run('DELETE FROM tokens WHERE username=(?) AND agent=(?)',
            [rows[0].login, req.headers['user-agent']],
            (err) => {
              if (err) { errorReply(res, err); }
              else {

                // insert new ones
                db.run('INSERT INTO tokens(type, hash, expires, username, t, '
                  + 'agent) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)',
                  ['access', access.hash, expires, rows[0].login, now.getTime(),
                  req.headers['user-agent'], 'refresh', refresh.hash, 0,
                  rows[0].login, now.getTime(), req.headers['user-agent']],
                  (err) => {
                    if (err) { errorReply(res, err); }
                    else {

                      // replying to the user
                      let json = {
                        'access_token': access.salt,
                        'refresh_token': refresh.salt,
                        'delivered': now.toString(),
                        'expires_in': expires
                      };
                      res.writeHead(200, {
                        'Content-Type': 'application/json'
                      });
                      res.write(JSON.stringify(json));
                      res.end();

                      // delete old tokens
                      db.all('SELECT * FROM tokens WHERE username=(?) AND '
                        + 'type="access" ORDER BY t', [rows[0].login],
                        (err, tokens) => {
                          if (err) throw err;
                          for (let i = 0 ; i <
                            tokens.length - maxSimultaneousConn; i++) {
                            db.run('DELETE FROM tokens WHERE username=(?) AND '
                            + 'agent=(?)', [rows[0].login, tokens[i].agent]);  
                          }
                      })

                    }
                });
              }
            });
          }
        }
    });
  } else {
    basicReply(res, 401);  // Unauthorized
  }
}


function checkToken(req, res, callback) {
  const { headers, method, url } = req;

  if ('authorization' in headers) {
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });

    let hash = readTokenHash(req);

    db.all('SELECT * FROM tokens WHERE hash=(?)', [hash],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else {
          let valid = rows.length > 0 && rows[0].type == 'access' &&
            (new Date().getTime() - rows[0].t < 1000 * (rows[0].expires));
          if (valid) {
            db.close();
            callback(rows[0].username);
          } else {
            basicReply(res, 403, 'Invalid token');  // Forbidden
          }
        }
    });
  } else {
    basicReply(res, 401);  // Unauthorized
  }
}


function validateToken(req, res, body) {
  checkToken(req, res, (login) => {
    res.statusCode = 200;
    res.end();
  });
}


function refreshToken(req, res, body) {
  const { headers, method, url } = req;

  if ('authorization' in headers) {
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });

    let hash = readTokenHash(req);

    db.all('SELECT * FROM tokens WHERE hash=(?)', [hash],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else {
          if (rows.length > 0 && rows[0].type == 'refresh') {
            // generate new token and delete old ones
            let { salt, hash } = generateToken(req);
            let now = new Date();
            db.run('DELETE FROM tokens WHERE type="access" AND username=(?) '
             + 'AND agent=(?)',
              [rows[0].username, req.headers['user-agent']], (err) => {
                if (err) { errorReply(res, err); }
                else {
                  db.run('INSERT INTO tokens(type, hash, expires, username, t, '
                    + 'agent) VALUES (?, ?, ?, ?, ?, ?)',
                    ['access', hash, expires, rows[0].username, now.getTime(),
                    req.headers['user-agent']],
                    (err) => {
                      if (err) { errorReply(res, err); } else {
                        let json = {
                          'access_token': salt,
                          'delivered': now.toString(),
                          'expires_in': expires
                        };
                        res.writeHead(200, {
                          'Content-Type': 'application/json'
                        });
                        res.write(JSON.stringify(json));
                        res.end();
                      }
                  });
                }
              });
          } else {
            basicReply(res, 403, 'Invalid token');  // Forbidden
          }
        }
    });
  } else {
    basicReply(res, 401);  // Unauthorized
  }
}


function logout(req, res, body) {
  checkToken(req, res, (login) => {
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });
    db.run('DELETE FROM tokens WHERE username=(?) AND agent=(?)',
      [login, req.headers['user-agent']], (err) => {
      if (err) { errorReply(res, err); }
      else {
        basicReply(res, 200);
      }
    });
  });
}


module.exports = {register, requestToken, checkToken, validateToken,
  refreshToken, logout};
