#! /usr/bin/env node

'use strict';

/* Loading core modules */
var loop = require('./looper'),
    exec = require('child_process').spawn,
    file = require('fs-extra'),
    path = require('path'),
    colr = require('cli-color');

/* Getting Required Variables */
var cwd = __dirname;

/* Getting CLI Agruments */
var cliarg = process.argv.slice(2);

/* Show help */
if ( cliarg.indexOf('-h') > -1 ) {
    showHelp();
    process.exit();
}

/* Check does app need run as background */
var daemon;
if ( cliarg.indexOf('--daemon') > -1 ) {
    daemon = true;
    cliarg.splice(cliarg.indexOf('--daemon'), 1);
}

/* Show help if no argument defined */
if ( cliarg.length < 1 ) {
    showHelp();
    process.exit();
}

/* Stop Daemon */
if ( cliarg.indexOf('stop') > -1 ) {

    /* Starting spawn */
    var cmd = exec('pm2', [ 'stop', '.nb-daemon.js' ], {
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

    file.removeSync(path.resolve(process.cwd(), '.nb-daemon.js'));
}

/* Try starting app */
else {
    var awd = process.cwd(), fname;

    if ( daemon ) {
        var dmstr = file.readFileSync(path.resolve(cwd, 'bridge'), 'utf8');

        /* Get filename */
        fname = cliarg[ 0 ];

        /* Modifying Process Arguments */
        process.argv[ 1 ] = path.resolve(awd, fname);
        process.argv.splice(2, 1);
        process.argv.splice(process.argv.indexOf('--daemon', 1));

        dmstr = dmstr.replace('BRIDGE_PATH', path.resolve(cwd, '../index.js'));
        dmstr = dmstr.replace('BRIDGE_APP', `./${fname}`);
        dmstr = dmstr.replace('BRIDGE_ARGV', JSON.stringify(process.argv));

        file.ensureFileSync(path.resolve(awd, '.nb-daemon.js'));
        file.writeFileSync(path.resolve(awd, '.nb-daemon.js'), dmstr, 'utf8');

        /* Starting spawn */
        var command = exec('pm2', [ 'start', '.nb-daemon.js' ], {
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