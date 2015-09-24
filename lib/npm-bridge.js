#! /usr/bin/env node

'use strict';

/* Loading core modules */
var loop = require('./looper'),
    core = require('./core'),
    file = require('fs-extra'),
    exec = require('child_process').spawn,
    path = require('path'),
    colr = require('cli-color');

/* Getting Required Variables */
var cwd = process.cwd();

/* Getting CLI Agruments */
var arg = process.argv.slice(2);

if ( arg.length > 0 ) {
    var cmd = arg[ 0 ],
        nrg = arg.slice(1);

    switch ( cmd ) {
        /* Install Commands */
        case 'install':
        case '-i':
        case 'i':
            installPackages(nrg, false, true);

            break;

        /* Update Commands */
        case 'update':
        case '-u':
        case 'u':
            updatePackages(nrg, false, true);

            break;

        /* Remove Commands */
        case 'remove':
        case '-r':
        case 'rm':
            removePackages(nrg);

            break;

        /* Listing Commands */
        case 'list':
        case '-l':
        case 'ls':
            listPackages(nrg);

            break

        /* Invalid Commands */
        default :
            console.log(`${colr.green('npm-bridge')} => ${colr.red('Invalid command:')} ${cmd}`);

            break;
    }
}
else {
    console.log(`${colr.green('npm-bridge')} => ${colr.red('require at least one argument!')}`);
}

/* Pacakge Installer */
function installPackages ( arg, remold, nolog ) {
    var pkg, inslist = {}, dforce, force, dsave, save, dsdev, sdev;

    /* Check does need to force install */
    dforce = arg.indexOf('-f');

    if ( dforce < 0 ) dforce = arg.indexOf('--force');
    if ( dforce > -1 ) {
        force = true;
        arg.splice(dforce, 1);
    }

    /* Check does need to save package */
    dsave = arg.indexOf('--save');

    if ( dsave < 0 ) dsave = arg.indexOf('-s');
    if ( dsave > -1 ) {
        save = true;
        arg.splice(dsave, 1);
    }

    /* Check does need to save-dev package */
    dsdev = arg.indexOf('--save-dev');

    if ( dsdev < 0 ) dsdev = arg.indexOf('-sd');
    if ( dsdev > -1 ) {
        sdev = true;
        arg.splice(dsdev, 1);
    }

    try {
        pkg = require(path.resolve(cwd, 'package.json'));
    }
    catch ( err ) {}

    /* Install all packages */
    if ( arg.length < 1 ) {
        if ( !pkg ) {
            console.log(`${colr.green('npm-bridge')} => ${colr.red('No package.json found for batch install!')}`);

            return;
        }

        /* Getting Dependencies */
        var dep = pkg.dependencies,
            dev = pkg.devDependencies;

        if ( 'object' === typeof dep ) {
            /* Add package to list */
            inslist = dep;
        }
        if ( 'object' === typeof dev ) {
            loop(dev, function ( name, version ) {
                /* Add package to list */
                inslist[ name ] = version;

                /* Process the next package */
                this.next();
            });
        }
    }
    else {
        inslist = {};

        loop(arg, function ( pkgn ) {
            if ( pkgn[ 0 ] !== '-' ) {
                var cpkg = pkgn.split('@');

                var cnm = cpkg[ 0 ], cvr;

                if ( cpkg.length > 1 ) {
                    cvr = cpkg[ 1 ];
                }
                else {
                    cvr = 'latest';
                }

                inslist[ cnm ] = cvr;
            }

            this.next();
        });
    }

    loop(inslist, function ( name, version ) {
        /* Check does package is exist */
        var exist = core.mod(name, version, nolog), result;

        /* Install Package if not exist */
        if ( !exist || force ) {
            if ( pkg ) {
                result = core.ins(name, version, {
                    path    : cwd,
                    name    : pkg.name,
                    version : pkg.version
                });
            }
            else {
                result = core.ins(name, version);
            }
        }

        /* Save dependencies */
        if ( save && pkg ) {
            if ( !pkg.dependencies ) pkg.dependencies = {};

            pkg.dependencies[ name ] = `^${result.version}`;

            file.writeJsonSync(path.resolve(cwd, 'package.json'), pkg);
        }

        /* Save deev dependencies */
        if ( sdev && pkg ) {
            if ( !pkg.devDependencies ) pkg.devDependencies = {};

            pkg.devDependencies[ name ] = `^${result.version}`;

            file.writeJsonSync(path.resolve(cwd, 'package.json'), pkg);
        }

        /* Process the next package */
        this.next();
    });
}

/* Package Updater */
function updatePackages ( arg, origin, nolog ) {
    var pkg, inslist = {}, dforce, force, dsave, save, dsdev, sdev;

    /* Check does need to force install */
    dforce = arg.indexOf('-f');

    if ( dforce < 0 ) dforce = arg.indexOf('--force');
    if ( dforce > -1 ) {
        force = true;
        arg.splice(dforce, 1);
    }

    /* Check does need to save package */
    dsave = arg.indexOf('--save');

    if ( dsave < 0 ) dsave = arg.indexOf('-s');
    if ( dsave > -1 ) {
        save = true;
        arg.splice(dsave, 1);
    }

    /* Check does need to save-dev package */
    dsdev = arg.indexOf('--save-dev');

    if ( dsdev < 0 ) dsdev = arg.indexOf('-sd');
    if ( dsdev > -1 ) {
        sdev = true;
        arg.splice(dsdev, 1);
    }

    try {
        pkg = require(path.resolve(cwd, 'package.json'));
    }
    catch ( err ) {}

    /* Update all packages */
    if ( arg.length < 1 ) {

    }

    /* Update custom package */
    else {

    }
}

/* Package Remover */
function removePackages ( arg, nolog ) {

}

/* Package Listing */
function listPackages ( arg, nolog ) {
    var regs = core.reg, vers, max = 0, list;

    /* List all packages */
    if ( arg.length < 1 ) {
        list = regs.packages;
    }

    /* List specific package(s) */
    else {
        list = {};

        loop(arg, function ( name ) {
            if ( name in regs.packages ) {
                list[ name ] = regs.packages[ name ];
            }

            this.next();
        });
    }

    /* Get the higher length */
    loop(list, function ( name ) {
        if ( name.length > max ) max = name.length;

        this.next();
    });

    /* Print each package including versions */
    loop(list, function ( name, versions ) {
        vers = `[ v${Object.keys(versions).join(' ] - [ v')} ]`;

        console.log(`↳ ${colr.green(name)} ${makespace(max - name.length) + '--'} ${colr.yellow(vers)}`);

        this.next();
    });

    console.log(`\r\nFound ${colr.green(Object.keys(list).length)} packages installed.`);
}

/* Space Maker */
function makespace ( count ) {
    var spc = '';

    for ( var i = 0; i < count; ++i ) spc += '-';

    return spc;
}
