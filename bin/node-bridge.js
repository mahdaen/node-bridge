#! /usr/bin/env node

'use strict';

console.log(process.argv);

/* Loading core modules */
var loop = require('../lib/util-looper'),
    exec = require('child_process').spawn,
    oses = require('os'),
    file = require('fs-extra'),
    path = require('path'),
    colr = require('cli-color');

/* Get Platform */
var osp = oses.type(), ext = '';

if ( osp.search('Linux') > -1 ) {
    osp = 'linux';
}
else if ( osp.search('Darwin') > -1 ) {
    osp = 'darwin';
}
else if ( osp.search('Windows') > -1 ) {
    osp = 'windows';
}

if ( osp == 'windows' ) ext = '.cmd';

/* Getting Required Variables */
var nbwd = __dirname;

/* Getting CLI Agruments */
var cliarg = process.argv.slice(2);

/* Show help */
if ( cliarg.indexOf('-h') > -1 ) {
    showHelp();
    process.exit();
}

/* Show help if no argument defined */
if ( cliarg.length < 1 ) {
    showHelp();
    process.exit();
}

/* Check does app need run as background */
var daemon;
if ( cliarg.indexOf('--daemon') > -1 ) {
    daemon = true;
    cliarg.splice(cliarg.indexOf('--daemon'), 1);
}

var awd = process.cwd(), fname, pmargs;

/* Stop Daemon */
if ( cliarg.indexOf('stop') > -1 ) {
    if ( cliarg.length < 2 ) {
        console.log('Please specify the filename that want to be stopped.');
        showHelp();
        process.exit();
    }

    cliarg.splice(cliarg.indexOf('stop'), 1);

    fname = cliarg[ 0 ];

    /* Starting spawn */
    var cmd = exec(`pm2${ext}`, [ 'stop', fname ], {
        cwd   : process.cwd(),
        env   : process.env,
        stdio : 'pipe',
    });

    /* Handle spwan data */
    cmd.stdout.on('data', function ( data ) {
        console.log(data.toString().replace(/[\r\n]$/, ''));
    });

    /* Handle error data */
    cmd.stderr.on('data', function ( error ) {
        console.log(error.toString().replace(/[\r\n]$/, ''));
    });

    /* Handle spwan closed */
    cmd.on('close', function () {
        process.exit();
    });
}

/* Try starting app */
else {
    if ( daemon ) {
        fname = cliarg[ 0 ];

        cliarg.splice(0, 1);

        pmargs = [ 'start', fname ];

        pmargs.push('--');

        pmargs = pmargs.concat(cliarg);

        pmargs.push(`--node-args="--require ${path.resolve(nbwd, '../index.js')}"`);

        /* Starting spawn */
        var command = exec(`pm2${ext}`, pmargs, {
            cwd   : awd,
            env   : process.env,
            stdio : 'pipe',
        });

        /* Handle spwan data */
        command.stdout.on('data', function ( data ) {
            console.log(data.toString().replace(/[\r\n]$/, ''));
        });

        /* Handle error data */
        command.stderr.on('data', function ( error ) {
            console.log(error.toString().replace(/[\r\n]$/, ''));
        });

        /* Handle spwan closed */
        command.on('close', function () {
            process.exit();
        });
    }
    else {
        /* Load the require patch */
        require('../index');

        /* Create file name */
        fname = path.resolve(awd, cliarg[ 0 ]);

        /* Modifying Process Arguments */
        process.argv[ 1 ] = fname;
        process.argv.splice(2, 1);

        /* Load the app */
        require(fname);
    }

    return;
}

/* Space Maker */
function makespace ( count, txt ) {
    var spc = '';

    for ( var i = 0; i < count; ++i ) spc += (txt || '-');

    return spc;
}

/* Show CLI Helper */
function showHelp () {
    var max = 0;

    var helps = [
        {
            cmd : 'stop',
            txt : 'Stop the background process.',
        },
        {
            cmd : '--daemon',
            txt : 'Run app as background process (using PM2).',
        },
    ];

    console.log(`${colr.green('\r\nNode Bridge')}`);
    console.log(`${require('../package.json').description}`);
    console.log(`v${require('../package.json').version}`);
    console.log(`\r\nUsage:\t\t\t${colr.green('node-bridge')} [--daemon] [path-to-file]`);

    loop(helps, function ( htp ) {
        if ( htp.cmd.length > max ) max = htp.cmd.length;

        this.next();
    });

    loop(helps, function ( htp ) {
        console.log(`\r\n${colr.green(htp.cmd)}${makespace(max - htp.cmd.length, ' ')}\t\t${htp.txt}`);

        if ( htp.opt ) {
            console.log(`${makespace(max, ' ')}\t\tOptions: ${colr.yellow(htp.opt)}`);
        }
        if ( htp.usg ) {
            console.log(`${makespace(max, ' ')}\t\tExample: ${colr.green(htp.usg)}`);
        }

        this.next();
    });

    console.log('\r\n');
}