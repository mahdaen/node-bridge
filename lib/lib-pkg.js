"use strict";

var file = require('fs-extra'),
    path = require('path');

/**
 * Pacakge Class
 * Package class represent package informations, including methods to modify and write the package.
 */
class Package {
    constructor ( pkginfo ) {
        for ( var key in pkginfo ) {
            this[ key ] = pkginfo[ key ];
        }

        return this;
    }

    write () {
        try {
            file.writeJsonSync(this.pkgpath, this);
        }
        catch ( err ) {
            console.log(err.message);
            process.exit();
        }
    }
}