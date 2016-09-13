# WebPipe - a slim WebSocket library #

### Overview ###

A socket.io-like JavaScript library for WebSocket communication.

* Almost complete drop-in replacement for socket.io:
```
pipe.on('fromserver', (arg1, arg2) => {
  console.log('server said:', arg1, arg2);
});
pipe.emit('something', 'arg1', 42, (reply) => {
  console.log('got reply:', reply);
});
```
* Reconnects automatically and transparently.
* **SMALL**

### Why another? ###

This pretty much sums up my original motivation:

* socket.io 97 kiB  (1.4.5)
* sockjs 57 kiB (1.1.1)
* webpipe **4.3 kiB**

Above sizes are minified.

Also, WebPipe has NO legacy support, or burden depending on how you wish to look at it.

### Dependencies ###

WebPipe has no javascript dependencies. However, it depends on the web browser to support WebSockets.


### Contacts ###

* bitbucket@0x1.se