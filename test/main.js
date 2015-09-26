"use strict";

require('../index');

var express = require('express');

var app = express();

app.use(function ( req, res ) {
    res.end('Page loaded');
});

app.listen(8934, function () {
    console.log(`Application started on port 8934`);
});

app.on('error', function ( err ) {
    console.log(err);
});