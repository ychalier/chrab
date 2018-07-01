# webclient

This is a simple HTML/JS client that is supposed to work with the [Node server](../) from this repo. All scripts are well commented in [script.js](script.js), so you can get inspiration for your own client from that. In a nutshell, here is how it works:

 1. **Login phase:** retrieves a token from a username and a password
 2. **Channel fetch:** when a token is retrieved, let the user choose from all channels available on the server
 3. **Channel choice:** the user selects a channel, and all its messages are pulled and displayed. A ping request is sent to get notified when a new message will be posted.
 4. **Message posting:** then message posting becomes available. User sends text, and it is treated by the server. The ping notification gets a reply, so it fetches the so sent message and resend a new ping.

Some points that are worth noting:

 - Usernames and message contents are HTML escaped to prevent injection.
 - If a request gets a 403 response, the client first tries to refresh the token. If it succeeds, it retries the request. Else, it asks for a re-log.
 - Beware of pings handling when switching channels! You do not want to get notified for a channel you are not listening anymore (at least in this single-threaded example).

Finally, note that the webclient is hosted by the node server itself (see the route `'^/webclient/'` in [server.js](../server.js)). This is to prevent browsers from blocking XMLHttpRequest across different domains.
