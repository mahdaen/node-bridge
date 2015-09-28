"use strict";

var express = require('express');

var app = express();

console.log(process.argv);

app.use(function ( req, res ) {
    console.log('Sending answer...');
    res.end('Page loaded');
});

start('James');

function start ( name ) {
    app.listen(8934, function () {
        console.log(`Hello ${name}, your application started on port 8934`);
    });

    app.on('error', function ( err ) {
        console.log(err);
    });
}
