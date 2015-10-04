'use strict';

var Bridge = require('./lib-bridge');

class Getter extends Bridge {
    setup ( options ) {
        return this;
    }

    get ( name, version ) {

    }
}

module.exports = Getter;