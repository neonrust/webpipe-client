'use strict';

function WebPipe(options)
{
	this.CLOSE_NORMAL = 1000;
	this.ATTEMPTS_MAX = 100;
    this.BACKOFF_MAX = 1200;  // *500 = 10 minutes between attempts

    this.HANDSHAKE = 'WEBPIPE1';

    /*
     options:             TYPE     DEFAULT
       path:               string   '/webpipe'
       host:               string   <current page's host name>
       port:               integer  <current page's port || 80
       name:               string   'noname'
       closePurgesQueued:  bool     true
       openAttemptsMax:    int      ATTEMPTS_MAX
       backoffMax:         int      BACKOFF_MAX
	   handshakeTimeout:   int      2000ms
	 }
    */


    if(! this)
        throw new Error('Must use "new" to create WebPipe instance.');

	// if 'options' is a string, assume it's the url path
	if(options === undefined)
	    options = {};
	else if(typeof options === 'string' || options.search !== undefined)
		options = { path: options };

    this._options = {};
	const ops = options || {};
	for(const key in ops)
		this._options[key] = ops[key];

    this._options.openAttemptsMax = this._options.openAttemptsMax || this.ATTEMPTS_MAX;
    this._options.backoffMax = this._options.backoffMax || this.BACKOFF_MAX;
	this._options.handshakeTimeout = this._options.handshakeTimeout || 2000;
	this._options.closePurgesQueued = this._options.closePurgesQueued || true;

	// levels: 0: none, 1: errors, 2: warnings, 3: normal, 10+: debug
	this._logLevel = this._options.logLevel || (window.localStorage? localStorage.get('webpipe.log'): 0) || 0;

    this.name = this._options.name || 'noname';

    const events = new EventEmitter();
    this._events = events;
    this._replyEvents = new EventEmitter();
    this._outgoing = [];

    this.on = events.on.bind(events);
    this.off = events.off.bind(events);


    const loc = window.location;
    const baseUrl = 'ws://' + (this._options.host || loc.hostname) + ':' + (this._options.port || loc.port || 80) + '/';
    let path = this._options.path || 'webpipe';
    if(path[0] === '/')
        path = path.substring(1);

    this._url = baseUrl + path;

    let pipe = this._open();
    if(! pipe)
        return null;

    this._pipe = pipe;
};

WebPipe.prototype.is_open = function()
{
    return this._state === 10;
};

WebPipe.prototype.open = function()
{
    if(this.is_open())
        return true;

    this._backoff = 0;
    this._openAttempt = 0;

    this._pipe = this._open();

    if(! this._pipe)
        this._openFailed();

    return !!this._pipe;
};

WebPipe.prototype._open = function()
{
    this._state = 1; // opening

    let pipe = null;
    try
    {
        pipe = new WebSocket(this._url);
    }
    catch(err)
    {
        if(this._logLevel >= 1)
			console.error('WebSocket ctor FAIL:', err);

        this._handleRetries();
        return false;
    }

    if(pipe)
        this._bindEvents(pipe);

    return pipe
};

WebPipe.prototype._openFailed = function()
{
    this._events.emit('openfailed');
};

WebPipe.prototype._handleRetries = function()
{
    const atMax = this._options.openAttemptsMax;
    if(this._openAttempt > atMax)
    {
        this._openFailed();
        return;
    }
    else
        ++this._openAttempt;

    // backoff; delay between open attempts
    const boMax = this._options.backoffMax;
    if(this._backoff > boMax)
        this._backoff = boMax;
    else
        ++this._backoff;

    const delay = 500 + this._backoff*500;

    if(this._logLevel >= 10)
		console.log('retry in', (delay/1000), 'seconds');

    const self = this;
    setTimeout(function() {
        self._pipe = self._open();
    }, delay);
};


WebPipe.prototype._bindEvents = function(pipe)
{
    const self = this;

    pipe.onerror = function(evt) {
        self._events.emit('error', event);

        if(self._state === 1)  // error during open phase
        {
            self.close();
            self._handleRetries();
        }
    };

    pipe.onopen = function() {
        self._state = 10;
        self._backoff = 0;
        self._openAttempt = 0;

        pipe.onclose = function(close) {
            self._state = 0;
            self._pipe = null;

            // re-open
            const reopen = close.code !== self.CLOSE_NORMAL || !close.wasClean;

            self._events.emit('closed', close.code, reopen);

            if(reopen)
            {
				if(this._logLevel >= 10)
					console.error('re-opening in 1 second...');

                setTimeout(function() {
                    self.open();
                }, 1000);
            }
        };

        function onMessage(event) // installed after handshake is complete
        {
            const msg = JSON.parse(event.data);

			if('replyTo' in msg)  // this is a reply to a message, handler in emit()
			    self._replyEvents.emit(msg.replyTo, msg);
			else
				self._events.emit(msg.n, msg.args || []);
        }

        // we expect the server to first send a handshake after opened
        let handShakeTimer = setTimeout(function() {
            throw new Error('WebPipe: No handshake received!');
        }, self._options.handshakeTimeout);

        pipe.onmessage = function handShaker(event) {
            if(event.data !== self.HANDSHAKE)
            {
                pipe.close();
                throw new Error('Invalid handshake received: ' + event.data);
            }
			if(self._logLevel >= 3)
				console.log('WebPipe: handshake OK');

			// install the real onmessage handler
            pipe.onmessage = onMessage;

            clearTimeout(handShakeTimer);
            handShakeTimer = null;

            // send handshake "ack" (just the same string back)
            pipe.send(self.HANDSHAKE);

            self._sendOutgoing();

            self._events.emit('opened');
        };
    };
}

WebPipe.prototype._sendOutgoing = function()
{
    // use a temp in case the websocket closes during sending (messages will then be enqueued again)
    const out = this._outgoing;
    this._outgoing = [];

    const send = this._pipe.send.bind(this._pipe);
    const L = out.length;

    for(let idx = 0; idx < L; ++idx)
        send(out[idx]);
};

WebPipe.prototype.close = function()
{
    if(this._pipe)
        this._pipe.close(this.CLOSE_NORMAL, 'WebPipe.close()');

    this._pipe = null;
    this._state = 0;

    if(this._options.closePurgesQueued)
		this._outgoing = [];
};

WebPipe.prototype.emit = function(name /*, args...*/)
{
    const nargs = arguments.length;
    if(nargs === 0)
        return false;

    const message = {
        n: name,
    };

    if(nargs > 1)  // including 'name'
	{
		const lastArg = arguments[arguments.length - 1];
		let endIdx = arguments.length;

		// if last argument is a callback, we expect a reply
		if(typeof lastArg === 'function')
		{
			message.requestId = ('' + Math.random()).substring(2);
			const callback = lastArg;
			--endIdx;

			const self = this;

			// install reply handler
			function onReply(reply)
			{
				self._replyEvents.off(message.requestId, onReply); // remove handler
				callback.apply(undefined, reply.args || []);
			}
			this._replyEvents.on(message.requestId, onReply);
		}

		message.args = Array.prototype.slice.call(arguments, 1, endIdx);
	}

    const messageData = JSON.stringify(message);

    if(this.is_open())
        this._pipe.send(messageData);
    else
        this._outgoing.push(messageData);
};
