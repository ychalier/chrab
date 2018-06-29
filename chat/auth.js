const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');


function basicReply(res, statusCode, message='') {
  res.statusCode = statusCode;
  res.write(message);
  res.end();
}


function errorReply(res, err) {
  console.error(err.message);
  basicReply(res, 500);  // Internal Server Error
}


function readLoginPasswordHash(req) {
  let out = {}
  let basicAuthorization = req.headers['authorization'].split(' ')[1]
  let credentials = new Buffer.from(basicAuthorization, 'base64')
                              .toString()
                              .split(':');
  out.login = credentials[0];
  out.hash = crypto.createHmac('sha256', credentials[1])
                   .update(credentials[0])
                   .digest('hex');
  return out;
}


function generateToken(req) {
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

    db.all('SELECT * FROM users WHERE login=(?) LIMIT 1', [login],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else if (rows.length > 0) {
          basicReply(res, 400, 'Username already taken.');  // Bad Request
        } else {
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
  const { headers, method, url } = req;

  if ('authorization' in headers) {
    // connecting to databse
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });

    let { login, hash } = readLoginPasswordHash(req);

    db.all('SELECT * FROM users WHERE login=(?) AND passwd=(?)', [login, hash],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else {
          if (rows.length == 0) {
            basicReply(res, 403, 'Invalid login or password.');
          } else {
            // Token generation
            let access = generateToken(req);
            let refresh = generateToken(req);
            let now = new Date();

            db.run('DELETE FROM tokens WHERE username=(?)', [rows[0].login],
            (err) => {
              if (err) { errorReply(res, err); }
              else {
                db.run('INSERT INTO tokens(type, hash, expires, username, t) '
                  + 'VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)',
                  ['access', access.hash, 3600, rows[0].login, now.getTime(),
                  'refresh', refresh.hash, 0, rows[0].login, now.getTime()],
                  (err) => {
                    if (err) { errorReply(res, err); }
                    else {
                      let json = {
                        'access_token': access.salt,
                        'refresh_token': refresh.salt,
                        'delivered': now.toString(),
                        'expires_in': 3600
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
            db.run('DELETE FROM tokens WHERE type="access" AND username=(?)',
              [rows[0].username], (err) => {
                if (err) { errorReply(res, err); }
                else {
                  db.run('INSERT INTO tokens(type, hash, expires, username, t)'
                    + ' VALUES (?, ?, ?, ?, ?)',
                    ['access', hash, 3600, rows[0].username, now.getTime()],
                    (err) => {
                      if (err) { errorReply(res, err); } else {
                        let json = {
                          'access_token': salt,
                          'delivered': now.toString(),
                          'expires_in': 3600
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


module.exports = {register, requestToken, validateToken, refreshToken};
