"use strict";

var Module = require('module'),
    orgreq = Module.prototype.require,
    oses   = require('os'),
    path   = require('path'),
    core   = require('./lib/core.js'),
    assert = require('assert');

// Create NodeBridge root dir path.
var brdir = path.resolve(oses.homedir(), '.node-bridge'),
    mddir = path.resolve(brdir, 'modules');

/* Check verbose */
var verbs = process.argv.indexOf('--verbose') > -1 ? true : false;

/* Bridge Constructor */
var bridge = function ModuleBridge ( mods ) {
    assert(mods, 'missing path');
    assert(typeof mods === 'string', 'path must be a string');

    var error, submod, rfile, foundpkg;

    // Forward to original require if the path is relative.
    if ( /^[\/\.]+/.test(mods) ) {
        if ( verbs ) console.log(`Relative module: ${mods}`);

        return orgreq.call(this, mods);
    }

    // Check does the target path is a single module.
    if ( /node_modules/g.test(mods) ) {
        submod = mods.split('node_modules/');
        submod = path.resolve(mddir, submod[ submod.length - 1 ]);

        // Forward require to brdige modules dir.
        //return require(hasmod);
        if ( verbs ) console.log(`Sub module: ${mods} loaded from ${submod}`);

        return orgreq.call(this, submod);
    }

    // Try get module from core module.
    var result;

    try {
        result = orgreq.call(this, mods);
    }
    catch ( err ) {}

    if ( result ) {
        if ( verbs ) console.log(`Core module: ${mods}`);
        return result;
    }

    /* Get caller filename */
    var fcal = getCallerFile(2, mods),

        fdir,
        mpkg,
        exis;

    if ( fcal ) {
        fdir = path.dirname(fcal);

        /* Get required module version */
        mpkg = getCallerPkg(mods, fdir);

        if ( mpkg ) {
            /* Check does module is installed */
            exis = core.mod(mods, mpkg.dependencies[ mods ], true, true);
        }
    }
    else {
        /* Check does module is installed */
        exis = core.mod(mods, '*', true, true);
    }

    if ( exis ) {
        if ( verbs ) console.log('Bridged module: ' + fcal);

        return orgreq.call(this, exis.path);
    }

    return orgreq.call(this, mods);
}

/* Get caller file name */
function getCallerFile ( lvl, mod ) {
    var error = new Error,
        stack = error.stack.split(/\s+at\s+/).slice(lvl + 2),
        name;

    try {
        name = stack[ 0 ].split('(')[ 1 ].split(':')[ 0 ];
    }
    catch ( err ) {
        name = null;
    }

    return name;
}

/* Get caller required module package */
function getCallerPkg ( mod, from ) {
    var pkg, done, lost;

    while ( !done && !lost ) {
        try {
            pkg = require(path.resolve(from, 'package.json'));

            if ( (pkg.dependencies && pkg.dependencies[ mod ]) || (pkg.devDependencies && pkg.devDependencies[ mod ]) ) {
                done = true;
            }
        }
        catch ( err ) {
            if ( from === oses.homedir() ) lost = true;

            from = path.dirname(from);
        }
    }

    return pkg;
}

/* Export the bridge */
Module.prototype.require = bridge;
