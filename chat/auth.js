const sqlite3 = require('sqlite3').verbose();

function register(req, res, body) {
  const { headers, method, url } = req;
  console.log("Registration!");

  let credentials = JSON.parse(body);
  console.log(credentials);
  if ('login' in credentials && 'passwd' in credentials) {

    // connecting to databse
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    let login = credentials['login']; //TODO: escape (beware of injections!)
    let hash = credentials['passwd']; //TODO: use proper hash function

    db.run('INSERT INTO users(login, passwd) VALUES ("'
      + login + '","' + hash + '")', (err) => {
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
