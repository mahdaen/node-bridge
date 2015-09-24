"use strict";

/* Loading core modules */
var glob = require('glob'),
    loop = require('./looper'),
    path = require('path'),
    file = require('fs-extra'),
    oses = require('os'),
    bash = require('child_process'),

    semv = require('semver'),
    qual = semv.satisfies,
    colr = require('cli-color');

/* Getting Required Variables */
var cwd = process.cwd(),
    reg = path.resolve(oses.homedir(), '.node-bridge'),
    tmp = path.resolve(reg, 'tmp'),
    rgp = path.resolve(reg, 'registry.json'),
    mwd = path.resolve(reg, 'modules');

/* Ensure registry file and folder is exist. */
file.ensureFileSync(rgp);
file.ensureDirSync(mwd);
file.ensureDirSync(tmp);

/* Getting Registry */
var regis;

try {
    regis = require(rgp);
}
catch ( err ) {
    regis = {
        requirer : {},
        packages : {}
    }

    file.writeJsonSync(rgp, regis);
}

/* Module Finder */
function ModuleFinder ( name, version, nolog ) {
    if ( !nolog ) console.log(`Checking package ${colr.blue(name)} version ${colr.bold(version)} ...`);

    var npdir = path.resolve(mwd, name),
        exist = (name in regis.packages);

    if ( exist ) {
        var pkgi = regis.packages[ name ], vers;

        for ( var vri in pkgi ) {
            if ( qual(vri, version) ) {
                vers = vri;
            }
        }

        /* Return the requiested package if satified */
        if ( vers ) {
            if ( !nolog ) console.log(`Found installed packege ${colr.blue(name)} ${colr.yellow(vers)} which match with ${colr.bold(version)}\r\n`);

            return {
                name    : name,
                path    : path.resolve(mwd, name, vers),
                version : vers,
                tag     : version,
            }
        }
        else {
            if ( !nolog ) console.log(`Package ${colr.blue(name)} is installed, but version ${colr.bold(version)} is not installed.\r\n`);

            return false;
        }
    }
    else {
        if ( !nolog ) console.log(`Package ${colr.blue(name)} version ${colr.bold(version)} is not installed.\r\n`);

        return false;
    }
}

/* Package (package.json) Finder */
function PackageFinder ( name, from ) {
    console.log(name, from);
}

/* Package Installer */
function PackageInstaller ( name, version, owner, nolog ) {
    console.log(`${colr.green('=>')} Installing package ${colr.blue(name)} version ${colr.yellow(version)}`);

    var stdres, insver;

    /* Install pacakge using NPM */
    try {
        stdres = bash.spawnSync('npm', [ 'install', `${name}@${version}` ], { cwd : tmp });
    }
    catch ( err ) {
        console.log(err.message);

        throw err;
    }

    /* Ensure stdout is not emtpy */
    stdres = stdres.stdout.toString();

    if ( !stdres || stdres.replace(/\s+/g, '') === '' ) {
        stdres = `${name}@${version.match(/[\d\.]+/)[ 0 ]}\r\n`;
    }

    /* Create log string */
    stdres = `${colr.bold('Installed: ')}` + stdres.replace(`node_modules/${name}`, '');

    /* Get installed version */
    insver = (stdres.match(new RegExp(`${name}\\@[\\.\\d]+`))[ 0 ]).split('@')[ 1 ];

    /* Getting modules and sub modules */
    var submod = glob.sync(`${tmp}/**/node_modules/*`);

    /* Moving modules from temporary folder */
    loop(submod, function ( pkgp ) {
        /* Creating package name */
        var base = path.basename(pkgp),

            /* Creating package dirname */
            from = path.dirname(pkgp),

            /* Creating package parent dirname */
            parn = path.dirname(from);

        /* Creating package object */
        var bpkg;

        try {
            bpkg = require(path.resolve(pkgp, 'package.json'));
        }
        catch ( err ) {}

        if ( bpkg ) {
            if ( !bpkg.version ) bpkg.version = '1.0.0';

            /* Copy the package to module dir */
            if ( !regis.packages[ base ] || !regis.packages[ base ][ bpkg.version ] ) {
                var cpdir = path.resolve(mwd, base, bpkg.version);

                /* Copying package */
                file.copySync(pkgp, cpdir);

                /* Removing sub-modules */
                file.removeSync(path.resolve(cpdir, 'node_modules'));
            }

            /* Add package if not exist */
            if ( !regis.packages[ base ] ) regis.packages[ base ] = {};

            /* Add package version */
            if ( !regis.packages[ base ][ bpkg.version ] ) {
                regis.packages[ base ][ bpkg.version ] = {
                    path       : path.resolve(mwd, base, bpkg.version),
                    version    : bpkg.version,
                    dependents : {}
                }
            }

            /* Add parent to package version dependent */
            if ( parn !== tmp ) {
                /* Get parent pacakge */
                var ppkg;

                try {
                    ppkg = require(path.resolve(parn, 'package.json'));

                    /* Add parent to dependent */
                    regis.packages[ base ][ bpkg.version ].dependents[ ppkg.name ] = {
                        path    : path.resolve(mwd, ppkg.name),
                        version : ppkg.version,
                        package : path.resolve(mwd, ppkg.name, ppkg.version, 'package.json')
                    }
                }
                catch ( err ) {}
            }

            /* Add bin symlink */
            if ( bpkg.bin ) {
                loop(bpkg.bin, function ( src, dir ) {
                    var srp = path.resolve(mwd, '.bin', src),
                        trp = path.resolve(mwd, base, bpkg.version, dir);

                    file.ensureLinkSync(trp, srp);

                    this.next();
                });
            }
        }

        this.next();
    });

    /* Create new package on registry if not exist */
    if ( !regis.packages[ name ] ) regis.packages[ name ] = {};

    /* Append new version to package registry */
    if ( !regis.packages[ name ][ insver ] ) regis.packages[ name ][ insver ] = {
        path       : path.resolve(mwd, name, insver),
        version    : insver,
        dependents : {}
    }

    /* Add dependency */
    if ( owner && owner.path && owner.name && owner.version ) {
        regis.packages[ name ][ insver ].dependents[ owner.name ] = {
            path    : owner.path,
            version : owner.version,
            package : path.resolve(owner.path, 'package.json')
        }
    }

    /* Update registry file */
    file.writeJsonSync(rgp, regis);

    /* Cleanup tmp */
    file.removeSync(path.resolve(tmp, 'node_modules'));

    /* Log the result */
    console.log(stdres);

    /* Return Result */
    return regis.packages[ name ][ insver ];
}

/* Adding Dependent */
function DependentAdder ( des, res ) {
    if ( des && des.name && des.version ) {
        if ( res && res.name && res.path && res.version ) {
            regis.packages[ des.name ][ des.version ].dependents[ res.name ] = {
                path    : res.path,
                version : res.version,
                package : path.resolve(res.path, 'package.json')
            }
        }
    }

}

/* Exporting Finder */
module.exports = {
    reg : regis,
    mod : ModuleFinder,
    pkg : PackageFinder,
    ins : PackageInstaller,
    add : DependentAdder,
}