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

    db.run('INSERT INTO users(login, passwd) VALUES (?, ?)', [login, hash],
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

  } else {
    res.statusCode = 400;  // Bad Request
    res.write('Missing login or password.');
    res.end();
  }

}

module.exports = {register};
