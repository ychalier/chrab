const sqlite3 = require('sqlite3').verbose();
const auth = require('./auth');


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


function createChannel(req, res, body) {
  auth.checkToken(req, res, (login) => {
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });

    let regex = /^([\w-]+)$/gm;
    db.all('SELECT * FROM channels WHERE name=(?) LIMIT 1', [body],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else if (rows.length > 0) {
          basicReply(res, 400, 'Channel already exists.');
        } else if (!regex.exec(body)){
          basicReply(res, 400, 'Invalid channel name.');
        } else {
          db.run('INSERT INTO channels(name) VALUES (?)', [body],
            (err) => {
              if (err) { errorReply(res, err); }
              else {
                basicReply(res, 201);
              }
          });
        }
    });
  });
}

function postMessage(req, res, body) {
  auth.checkToken(req, res, (login) => {
    const { headers, method, url } = req;
    const regex = /^\/channel\/([\w-]+)$/gm;
    let channel = regex.exec(url)[1];
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });
    db.all('SELECT * FROM channels WHERE name=(?) LIMIT 1', [channel],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else if (rows.length == 0) {
          basicReply(res, 400, 'Channel does not exists.');
        } else {
          let now = new Date();
          db.run('INSERT INTO messages(content, channel, username, t) '
            + 'VALUES (?, ?, ?, ?)', [body, rows[0].id, login, now.getTime()],
            (err) => {
              if (err) { errorReply(res, err); }
              else {
                basicReply(res, 201);
              }
          });
        }
    });
  });
}

function listMessages(req, res, body) {
  auth.checkToken(req, res, (login) => {
    const { headers, method, url } = req;
    const regex = /^\/channel\/([\w-]+)$/gm;
    let channel = regex.exec(url)[1];
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });
    db.all('SELECT * FROM channels WHERE name=(?) LIMIT 1', [channel],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else if (rows.length == 0) {
          basicReply(res, 400, 'Channel does not exists.');
        } else {
          db.all('SELECT t, username, content FROM messages WHERE channel=(?) ORDER BY t',
            [rows[0].id], (err, messages) => {
              if (err) { errorReply(res, err); }
              else {
                res.statusCode = 200;
                res.write(JSON.stringify(messages));
                res.end();
              }
          });
        }
    });
  });
}

function listChannels(req, res, body) {
  auth.checkToken(req, res, (login) => {
    const { headers, method, url } = req;
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });
    db.all('SELECT name FROM channels', [],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else {
          res.statusCode = 200;
          res.write(JSON.stringify(rows));
          res.end();
        }
    });
  });
}

module.exports = {createChannel, postMessage, listMessages, listChannels};
