'use strict';

// requires jQuery

$(document).ready(function() {

    $('body').append('' +
        '<label for="message">Message:</label>' +
        '<input id="message" size="20"><button id="send">Send</button>' +
        '<div>' +
        ' <span>Connection status:</span> <span id="status" />' +
        '</div>');

    $('#status').html('Closed');

	// by default connects to the page's location + '/webpipe'
    const pipe = new WebPipe();

    pipe.on('opened', function() {
        $('#status').html('Open');
    });
    pipe.on('closed', function() {
        $('#status').html('Closed');
    });

    $('#send').click(function() {
        const msg = $('input').val();
        $('input').select();

        pipe.emit('message', msg, function(reply) {
            console.log('got reply:', reply);
        });
        console.log('sent message:', msg);
    });
});
