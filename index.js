"use strict";

var Module = require('module'),
    orgreq = Module.prototype.require,

    core   = require('./lib/core.js'),
    oses   = require('os'),
    path   = require('path'),
    file   = require('fs-extra'),
    assert = require('assert');

// Create NodeBridge root dir path.
var brdir = path.resolve(oses.homedir(), '.node-bridge'),
    mddir = path.resolve(brdir, 'modules'),
    modwd = process.cwd();

/* Check verbose */
var verbs = process.argv.indexOf('--debug') > -1 ? true : false;

/* Bridge Constructor */
var bridge = function ModuleBridge ( mods ) {
    assert(mods, 'missing path');
    assert(typeof mods === 'string', 'path must be a string');

    var error, submod, rfile, foundpkg, result;

    // Forward to original require if the path is relative.
    if ( /^[\/\.]+/.test(mods) ) {
        // Call the module.
        return bridgerun.call(this, 'relative', mods, mods);
    }

    // Check does the target path is a single module.
    if ( /node_modules/g.test(mods) ) {
        submod = mods.split('node_modules/');
        submod = path.resolve(mddir, submod[ submod.length - 1 ]);

        // Call the module.
        return bridgerun.call(this, 'relative', mods, mods);
    }

    // Always try to load as core module.
    try {
        // Load module.
        result = orgreq.call(this, mods);
    }
    catch ( err ) {
        // Check does required module is installed.
        result = bridgemod(mods);
    }

    // Return the result.
    return result;
}

/* Bridged Module Finder */
function bridgemod ( mods ) {
    // Create result variable and module group.
    var result, modcore, error;

    /* Create variables. */
    var callfile, // Caller file
        callpath, // Caller dir
        callname, // Module name
        callsubs, // Sub module
        callpkgs, // Caller package
        callvers, // Caller require version
        callermd; // Caller installed module.

    // Get caller filename
    callfile = callerfile();

    // Splitting module name.
    modcore = mods.split('/');

    // Get module name.
    callname = modcore[ 0 ];

    // Remove name from splitted module name.
    modcore.splice(0, 1);

    // Get submodule.
    callsubs = modcore.length > 0 ? modcore.join('/') : '';

    // Get caller path
    callpath = callfile ? path.dirname(callfile) : modwd;

    // Get caller packages.
    callpkgs = callerpkgs(callname, callpath);

    // Get Caller required version.
    callvers = callpkgs ? callpkgs.dependencies[ callname ] : '*';

    // Check does package is installed.
    callermd = core.mod(callname, callvers, true, true);

    // If package found do require.
    if ( callermd ) {
        if ( modcore.length > 0 ) {
            return bridgerun('bridged sub-module', mods, path.resolve(callermd.path, callsubs));
        }
        else {
            return bridgerun('bridged sub-module', mods, callermd.path);
        }
    }

    // If no package found, trow error.
    else {
        // Create new error.
        error = new Error(`Bridged Module Error: Cannot find module '${mods}'`);

        // Throw the error.
        throw error;

        // Return nothing.
        return;
    }
}

/* Require loader */
function bridgerun ( type, name, path ) {
    if ( verbs ) console.log(`Require ${type} module: ${name}`);

    // Create result.
    var result;

    try {
        // Try to load the module.
        result = orgreq.call(this, path);
    }
    catch ( err ) {
        throw err;
    }

    return result;
}

/* Get caller file name */
function callerfile ( lvl ) {
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
function callerpkgs ( mod, from ) {
    var pkg, done, lost;

    while ( !done && !lost ) {
        try {
            pkg = file.readJsonSync(path.resolve(from, 'package.json'));

            if ( pkg ) {
                if ( (pkg.dependencies && pkg.dependencies[ mod ]) || (pkg.devDependencies && pkg.devDependencies[ mod ]) ) {
                    done = true;
                }
                else {
                    return false;
                }
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
