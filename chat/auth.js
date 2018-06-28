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
}

module.exports = {register, requestToken};
