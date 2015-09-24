"use strict";

var Module = require('module'),
    orgreq = Module.prototype.require,
    system = require('os'),
    path   = require('path'),
    assert = require('assert');

// Create NodeBridge root dir path.
var brdir = path.resolve(system.homedir(), '.node-bridge'),
    bdpkg = path.resolve(brdir, 'modules');

/* Bridge Constructor */
var bridge = function ModuleBridge ( mods ) {
    assert(mods, 'missing path');
    assert(typeof mods === 'string', 'path must be a string');

    var error, submod, rfile, foundpkg;

    // Forward to original require if the path is relative.
    if ( /^[\/\.]+/.test(mods) ) {
        console.log(`Relative module: ${mods}`);

        return orgreq.call(this, mods);
    }

    // Check does the target path is a single module.
    if ( /node_modules/g.test(mods) ) {
        submod = mods.split('node_modules/');
        submod = path.resolve(bdpkg, submod[ submod.length - 1 ]);

        // Forward require to brdige modules dir.
        //return require(hasmod);
        console.log(`Sub module: ${mods} loaded from ${submod}`);

        return orgreq.call(this, submod);
    }

    // Try get module from core module.
    var result;

    try {
        result = orgreq.call(this, mods);
    }
    catch ( err ) {}

    if ( result ) {
        console.log(`Core module: ${mods}`);
        return result;
    }

    return orgreq.call(this, mods);
}

Module.prototype.require = bridge;
