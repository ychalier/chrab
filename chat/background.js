const sqlite3 = require('sqlite3').verbose();


function clearOldMessages() {
  let db = new sqlite3.Database('chat.db', (err) => {
    if (err) { console.error(err); }
  });
  db.all('SELECT * FROM channels', [],
    (err, channels) => {
      if (err) { console.error(err); }
      else {
        let now = new Date().getTime();
        for (var i = 0; i < channels.length; i++) {
          let deleteBefore = now - channels[i].delay * 1000;
          db.run('DELETE FROM messages WHERE t < (?) AND channel = (?)',
            [deleteBefore, channels[i].id]);
        }
      }
  });
  db.close();
}

var refresh_rate = 1 * 60 * 1000;  // 1 minute
var scheduler_state = 0;
var tasks = [
  {
    'modulo': 10,
    'method': clearOldMessages
  }
]

function scheduler() {
  scheduler_state += 1;
  for (var i = 0; i < tasks.length; i++) {
    if (scheduler_state % tasks[i]['modulo'] == 0) {
      tasks[i]['method']();
    }
  }
}

var bg_interval = setInterval(scheduler, refresh_rate);

module.exports = {};
