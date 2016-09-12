# WebPipe - a slim WebSocket library #

A socket.io-like JavaScript library for WebSocket communication.

### Why another? ###

This pretty much sums up my original motivation:

* socket.io 97 kiB  (1.4.5)
* sockjs 57 kiB (1.1.1)
* webpipe **3.7 kiB**

Above sizes are minified.

Also, WebPipe has NO legacy support, or burden depending on how you wish to look at it.

### Dependencies ###

WebPipe has only a single dependency: 

* An "event emitter" class with standard methods: `.on()`, `.off()` and `.emit()`.
  [MicroEmitter](http://notes.jetienne.com/2011/03/22/microeventjs.html) works just fine.


### Contacts ###

* bitbucket@0x1.se