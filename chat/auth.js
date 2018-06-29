const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');


function register(req, res, body) {
  const { headers, method, url } = req;

  let credentials = JSON.parse(body);
  if ('login' in credentials && 'passwd' in credentials) {

    // connecting to databse
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    let login = credentials['login'];
    let hash =  crypto.createHmac('sha256', credentials['passwd'])
                      .update(login)
                      .digest('hex');

    db.all('SELECT * FROM users WHERE login=(?) LIMIT 1', [login],
      (err, rows) => {
        if (err) {
          console.error(err.message);
          res.statusCode = 500;  // Internal Server Error
          res.end();
        } else if (rows.length > 0) {
          res.statusCode = 400;  // Bad Request
          res.write('Username already taken.');
          res.end();
        } else {
          db.run('INSERT INTO users(login, passwd) VALUES (?, ?)',
            [login, hash],
            (err) => {
              if (err) {
                console.error(err.message);
                res.statusCode = 500;  // Internal Server Error
                res.end();
              } else {
                db.close((err) => {
                  if (err) {
                    console.error(err.message);
                    res.statusCode = 500;  // Internal Server Error
                    res.end();
                  } else {
                    res.statusCode = 201;  // Created
                    res.end();
                  }
                });
              }
            });
        }
    });
  } else {
    res.statusCode = 400;  // Bad Request
    res.write('Missing login or password.');
    res.end();
  }

}


function requestToken(req, res, body) {
  const { headers, method, url } = req;

  if ('authorization' in headers) {
    // connecting to databse
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    let basicAuthorization = headers['authorization'].split(' ')[1]
    let credentials = new Buffer.from(basicAuthorization, 'base64')
                                .toString()
                                .split(':');
    let login = credentials[0];
    let hash = crypto.createHmac('sha256', credentials[1])
                     .update(login)
                     .digest('hex');

    db.all('SELECT * FROM users WHERE login=(?) AND passwd=(?)', [login, hash],
      (err, rows) => {
        if (err) {
          console.error(err.message);
          res.statusCode = 500;
          res.end();
        } else {
          if (rows.length == 0) {
            res.statusCode = 403;
            res.write('Invalid login or password.');
            res.end();
          } else {

            // Token generation
            //TODO: use int column to store new Date().getTime()
            let client = req.connection.remoteAddress;
            let agent = headers['user-agent'];
            let salt_access = crypto.randomBytes(16).toString('hex');
            let hash_access = crypto.createHmac('sha256', client + agent)
                                    .update(salt_access)
                                    .digest('hex');
            let salt_refresh = crypto.randomBytes(16).toString('hex');
            let hash_refresh = crypto.createHmac('sha256', client + agent)
                                     .update(salt_refresh)
                                     .digest('hex');

            db.run('INSERT INTO tokens(type, hash, expires, username) '
              + 'VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
              ['access', hash_access, 3600, rows[0].login, 'refresh',
              hash_refresh, 0, rows[0].login],
              (err) => {

                if (err) {
                  console.error(err.message);
                  res.statusCode = 500;
                  res.end();

                } else {
                  let json = {
                    'access_token': salt_access,
                    'refresh_token': salt_refresh,
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
        }

    });
  } else {
    res.statusCode = 401;
    res.end();
  }
}


function checkToken(req, res, callback) {
  const { headers, method, url } = req;
  if ('authorization' in headers) {

    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) {
        console.error(err.message);
      }
    });
    let token = headers['authorization'].split(' ')[1];
    let client = req.connection.remoteAddress;
    let agent = headers['user-agent'];
    let hash = crypto.createHmac('sha256', client + agent)
                     .update(token)
                     .digest('hex');
    db.all('SELECT * FROM tokens WHERE hash=(?)', [hash],
      (err, rows) => {
        if (err) {
          console.error(err.message);
          res.statusCode = 500;
          res.end();
        } else {
          let valid = rows.length > 0 && rows[0].type == 'access' &&
            (new Date().getTime() - new Date(rows[0].t).getTime()
            < 1000 * (rows[0].expires + 7200));
          if (valid) {
            callback(rows[0].username);
          } else {
            res.statusCode = 403;
            res.write('Invalid token');
            res.end();
          }
        }
    });
  } else {
    res.statusCode = 401;
    res.end();
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
      if (err) {
        console.error(err.message);
      }
    });
    let token = headers['authorization'].split(' ')[1];
    let client = req.connection.remoteAddress;
    let agent = headers['user-agent'];
    let hash = crypto.createHmac('sha256', client + agent)
                     .update(token)
                     .digest('hex');
    db.all('SELECT * FROM tokens WHERE hash=(?)', [hash],
      (err, rows) => {
        if (err) {
          console.error(err.message);
          res.statusCode = 500;
          res.end();
        } else {
          let valid = rows.length > 0 && rows[0].type == 'refresh';
          if (valid) {
            // generate new token and delete old ones
            //TODO: delete old ones
            let client = req.connection.remoteAddress;
            let agent = headers['user-agent'];
            let salt = crypto.randomBytes(16).toString('hex');
            let hash = crypto.createHmac('sha256', client + agent)
                             .update(salt)
                             .digest('hex');

            db.run('INSERT INTO tokens(type, hash, expires, username) '
              + 'VALUES (?, ?, ?, ?)',
              ['access', hash, 3600, rows[0].login],
              (err) => {
                if (err) {
                  console.error(err.message);
                  res.statusCode = 500;
                  res.end();
                } else {
                  let json = {
                    'access_token': salt,
                    'expires_in': 3600
                  };
                  res.writeHead(200, {
                    'Content-Type': 'application/json'
                  });
                  res.write(JSON.stringify(json));
                  res.end();
                }
            });

          } else {
            res.statusCode = 403;
            res.write('Invalid token');
            res.end();
          }
        }
    });
  } else {
    res.statusCode = 401;
    res.end();
  }
}


module.exports = {register, requestToken, validateToken, refreshToken};
