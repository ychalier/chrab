var debug = true;  //TODO: set to false before merging!

/***** MODEL *****/
var token;  // JSON with access_token and refresh_token
var login;  // string with user's login when logged in
var selectedChannel;
var selectedChannelPwd;
var lastMessageTimestamp;

/***** VIEWS *****/
var modal;  // currently displayed modal window
var lastAuthor;  // author of lastly displayed message
