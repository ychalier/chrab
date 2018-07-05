const sqlite3 = require('sqlite3').verbose();


function clearOldMessages() {
  //TODO: clear old messages
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
