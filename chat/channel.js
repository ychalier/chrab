const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
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
    let json;
    try {
      json = JSON.parse(body);
    } catch (e) {
      basicReply(res, 400, 'Invalid JSON');
      return;
    }
    if (!('name' in json)) {
      basicReply(res, 400, 'Invalid JSON: missing "name" field.');
      return;
    }

    let regex = /^([\w-]+)$/gm;

    let db = new sqlite3.Database('chat.db', (err) => {
      if (err) { errorReply(res, err); }
    });
    db.all('SELECT * FROM channels WHERE name=(?) LIMIT 1', [json['name']],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else if (rows.length > 0) {
          basicReply(res, 400, 'Channel already exists.');
        } else if (!regex.exec(json['name'])){
          basicReply(res, 400, 'Invalid channel name.');
        } else {
          let delay = defaultChannelDelay;
          if ("delay" in json) {
            delay = parseInt(json["delay"]);
          }
          if ('passwd' in json) {
            let hash = crypto.createHmac('sha256', json['passwd'])
                             .digest('hex');
            db.run('INSERT INTO channels(name, delay, creator, passwd) VALUES '
              + '(?, ?, ?, ?)', [json['name'], delay, login,
              hash], (err) => {
                if (err) { errorReply(res, err); }
                else {
                  basicReply(res, 201);
                }
              });
          } else {
            db.run('INSERT INTO channels(name, delay, creator) VALUES '
             + '(?, ?, ?)', [json['name'], delay, login],
             (err) => {
                if (err) { errorReply(res, err); }
                else {
                  basicReply(res, 201);
                }
            });
          }
        }
    });

    db.close();
  });
}


function notifyPush(db, channel, channelId, login) {
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
          let isChannelProtected = rows[0].passwd != null;
          if (isChannelProtected && ('chanpwd' in headers)) {
            let hash = crypto.createHmac('sha256', headers['chanpwd'])
                             .digest('hex');
            if (rows[0].passwd != hash) {
              basicReply(res, 403, "Wrong channel password");
              return;
            }
          } else if (isChannelProtected) {
            basicReply(res, 401, "This channel is protected.");
            return;
          }
          let now = new Date();
          db.run('INSERT INTO messages(content, channel, username, t) '
            + 'VALUES (?, ?, ?, ?)', [body, rows[0].id, login, now.getTime()],
            (err) => {
              if (err) { errorReply(res, err); }
              else {
                // notify all users
                if (channel in pings) {
                  for (player in pings[channel]) {
                    basicReply(pings[channel][player], 200, login);
                  }
                  delete pings[channel];
                }
                notifyPush(db, channel, rows[0].id, login);
                basicReply(res, 201);
              }
          });
          handleMembership(db, login, rows[0].id);
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
          let isChannelProtected = rows[0].passwd != null;
          if (isChannelProtected && ('chanpwd' in headers)) {
            let hash = crypto.createHmac('sha256', headers['chanpwd'])
                             .digest('hex');
            if (rows[0].passwd != hash) {
              basicReply(res, 403, "Wrong channel password");
              return;
            }
          } else if (isChannelProtected) {
            basicReply(res, 401, "This channel is protected.");
            return;
          }
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
    db.all('SELECT name, delay, creator, passwd FROM channels', [],
      (err, rows) => {
        if (err) { errorReply(res, err); }
        else {
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          for (let i = 0; i < rows.length; i++) {
            rows[i]['protected'] = rows[i]['passwd'] != null;
            delete rows[i].passwd;
          }
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
          let isChannelProtected = rows[0].passwd != null;
          if (isChannelProtected && ('chanpwd' in headers)) {
            let hash = crypto.createHmac('sha256', headers['chanpwd'])
                             .digest('hex');
            if (rows[0].passwd != hash) {
              basicReply(res, 403, "Wrong channel password");
              return;
            }
          } else if (isChannelProtected) {
            basicReply(res, 401, "This channel is protected.");
            return;
          }
          if (!(channel in pings)) {
            pings[channel] = {};
          }
          pings[channel][login] = res;
        }
    });
    db.close();
  });
}


function handleMembership(db, username, channelId) {
  db.all('SELECT * FROM membership WHERE username=(?) AND channelId=(?)',
    [username, channelId], (err, rows) => {
      if (err) throw err;
      let now = new Date();
      if (rows.length == 0) {  // a new membership
        db.run('INSERT INTO membership(username, channelId, lastop) '
          + 'VALUES (?, ?, ?)', [username, channelId, now.getTime()]);
      } else {  // membership renewal
        db.run('UPDATE membership SET lastop=(?) WHERE id=(?)',
          [now.getTime(), rows[0].id]);
      }
    });
}


module.exports = {createChannel, postMessage, listMessages, listChannels, ping,
  deleteChannel};
