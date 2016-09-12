'use strict';

var EventEmitter = function() {
	this._events = {};
};

EventEmitter.prototype = {

	on: function(name, func)
	{
		this._events[name] = this._events[name] || [];
		this._events[name].push(func);
	},

	off: function(name, func)
	{
		if(! (name in this._events))
    		return;

		var idx = this._events[name].indexOf(func);
		this._events[name].splice(idx, 1);
	},

	emit: function(name /*, args... */) 
	{
		if(! (name in this._events))
    		return;

		var eventArgs = Array.prototype.slice.call(arguments, 1);

		var subscribers = this._events[name];
		var L = subscribers.length;

		for(var idx = 0; idx < L; ++idx)
			subscribers[idx].apply(this, eventArgs);
	},
};

module.exports = EventEmitter;
