const sqlite3 = require('sqlite3').verbose();
const auth = require('./auth');
const http = require('http');
const purl = require('url');
const fs = require('fs');


const pushettaToken = fs.readFileSync('pushetta.token')
  .toString().substring(0, 40);


var pings = {};
var defaultChannelDelay = 24 * 3600; // in seconds


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
          db.run('INSERT INTO channels(name, delay, creator) VALUES (?, ?, ?)',
          [body, defaultChannelDelay, login], (err) => {
              if (err) { errorReply(res, err); }
              else {
                basicReply(res, 201);
              }
          });
        }
    });

    db.close();
  });
}


function notifyPush(channel, channelId, login) {
  let db = new sqlite3.Database('chat.db', (err) => {
    if (err) { errorReply(res, err); }
  });
  db.all('SELECT t FROM messages WHERE channel=(?) ORDER BY t DESC LIMIT 2',
    [channelId], (err, rows) => {
    if (err) throw err;
    let now = new Date();
    if ((rows.length == 1) || (rows[1].t + 10 * 60 * 1000) < now.getTime()) {
      let options = {
        host: 'api.pushetta.com',
        port: 80,
        path: '/api/pushes/Chrab/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Token ' + pushettaToken
        }
      }
      let request = http.request(options, (res) => {});
      let data = {
        "body": "New message on " + channel + " from " + login,
        "message_type": "text/plain"
      }
      request.write(JSON.stringify(data));
      request.end();
    }
  });
  db.close();
}


function postMessage(req, res, body) {
  auth.checkToken(req, res, (login) => {
    const { headers, method, url } = req;
    const regex = /^\/channel\/([\w-]+)$/gm;
    let radix = url.split("?")[0];
    let channel = regex.exec(radix)[1];
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
                // notify all users
                if (channel in pings) {
                  for (player in pings[channel]) {
                    basicReply(pings[channel][player], 200);
                  }
                  delete pings[channel];
                }
                notifyPush(channel, rows[0].id, login);
                basicReply(res, 201);
              }
          });
        }
    });
    db.close();
  });
}


function listMessages(req, res, body) {
  auth.checkToken(req, res, (login) => {
    const { headers, method, url } = req;
    const regex = /^\/channel\/([\w-]+)$/gm;
    let radix = url.split("?")[0];
    let channel = regex.exec(radix)[1];
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });
    db.all('SELECT * FROM channels WHERE name=(?) LIMIT 1', [channel],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else if (rows.length == 0) {
          basicReply(res, 400, 'Channel does not exists.');
        } else {
          let query = purl.parse(url, true).query;
          let timeLowerLimit = 0;
          if ('limit' in query) {
            timeLowerLimit = parseInt(query.limit);
          }
          db.all('SELECT t, username, content FROM messages '
            +' WHERE channel=(?) AND t>(?) ORDER BY t',
            [rows[0].id, timeLowerLimit], (err, messages) => {
              if (err) { errorReply(res, err); }
              else {
                res.writeHead(200, {
                  'Content-Type': 'application/json'
                });
                res.write(JSON.stringify(messages));
                res.end();
              }
          });
        }
    });
    db.close();
  });
}


function listChannels(req, res, body) {
  auth.checkToken(req, res, (login) => {
    const { headers, method, url } = req;
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });
    db.all('SELECT name, delay, creator FROM channels', [],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else {
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          res.write(JSON.stringify(rows));
          res.end();
        }
    });
    db.close();
  });
}


function deleteChannel(req, res, body) {
  auth.checkToken(req, res, (login) => {
    const { headers, method, url } = req;
    const regex = /^\/channel\/([\w-]+)$/gm;
    let radix = url.split("?")[0];
    let channel = regex.exec(radix)[1];
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });
    db.all('SELECT * FROM channels WHERE name=(?) LIMIT 1', [channel],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else if (rows.length == 0) {
          basicReply(res, 400, 'Channel does not exists.');
        } else if (rows[0].creator != login) {
          basicReply(res, 403, 'You are not the channel creator.');
        } else {
          db.run('DELETE FROM channels WHERE id = (?)', [rows[0].id]);
          db.run('DELETE FROM messages WHERE channel = (?)', [rows[0].id]);
          db.close();
          basicReply(res, 200, 'Channel ' + rows[0].name + ' deleted.');
        }
    });
  });
}


function ping(req, res, body) {
  auth.checkToken(req, res, (login) => {
    const { headers, method, url } = req;
    const regex = /^\/ping\/([\w-]+)$/gm;
    let radix = url.split("?")[0];
    let channel = regex.exec(radix)[1];
    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });
    db.all('SELECT * FROM channels WHERE name=(?) LIMIT 1', [channel],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else if (rows.length == 0) {
          basicReply(res, 400, 'Channel does not exists.');
        } else {
          if (!(channel in pings)) {
            pings[channel] = {};
          }
          pings[channel][login] = res;
        }
    });
    db.close();
  });
}


module.exports = {createChannel, postMessage, listMessages, listChannels, ping,
  deleteChannel};
