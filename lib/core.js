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
function ModuleFinder ( name, version, nolog, nocheck ) {
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

            var upd, has,

                // Result
                res = pkgi[ vers ];

            if ( !nocheck ) {
                try {
                    upd = bash.spawnSync('npm', [ 'info', name ], { cwd : tmp });
                }
                catch ( err ) {
                    console.log(err.message);
                    process.exit();
                }

                if ( upd.status > 0 ) {
                    console.log(upd.stderr.toString());
                    process.exit();
                }

                eval('upd = ' + upd.stdout.toString());
            }
            else {
                upd = {
                    version : vers
                }
            }

            return {
                name         : name,
                path         : res.path,
                bin          : res.bin || {},
                version      : res.version,
                lastused     : res.lastused,
                dependents   : res.dependents,
                dependencies : res.dependencies,
                latest       : upd.version,
                tag          : version,
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

/* Package Installer */
function PackageInstaller ( name, version, owner, force ) {
    console.log(`${colr.green('=>')} Installing package ${colr.blue(name)} version ${colr.yellow(version)}`);

    var stdres, insver, result;

    /* Install pacakge using NPM */
    try {
        stdres = bash.spawnSync('npm', [ 'install', `${name}@${version}` ], { cwd : tmp });
    }
    catch ( err ) {
        console.log(err.message);
        process.exit();
    }

    /* Ensure stdout is not emtpy */
    if ( stdres.status > 0 ) {
        console.log(stdres.stderr.toString());
        process.exit();
    }

    stdres = stdres.stdout.toString();

    if ( !stdres || stdres.replace(/\s+/g, '') === '' ) {
        stdres = `${name}@${version.match(/[\d\.]+/)[ 0 ]}\r\n`;
    }

    /* Create log string */
    stdres = `${colr.bold('Installed: ')}` + stdres.replace(`node_modules/${name}`, '');

    /* Get installed version */
    insver = (stdres.match(new RegExp(`${name}\\@[\\.\\d]+`))[ 0 ]).split('@')[ 1 ];

    /* Installed Packages List */
    var installed = [];

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
            if ( !regis.packages[ base ] || !regis.packages[ base ][ bpkg.version ] || force ) {
                var cpdir = path.resolve(mwd, base, bpkg.version);

                /* Copying package */
                try {
                    file.copySync(pkgp, cpdir);
                }
                catch ( err ) {}

                /* Removing sub-modules */
                try {
                    file.removeSync(path.resolve(cpdir, 'node_modules'));
                }
                catch ( err ) {}
            }

            /* Add package if not exist */
            if ( !regis.packages[ base ] ) regis.packages[ base ] = {};

            /* Add package version */
            if ( !regis.packages[ base ][ bpkg.version ] || force ) {
                regis.packages[ base ][ bpkg.version ] = {
                    path         : path.resolve(mwd, base, bpkg.version),
                    bin          : bpkg.bin || {},
                    version      : bpkg.version,
                    lastused     : new Date,
                    dependents   : {},
                    localusers   : {},
                    dependencies : bpkg.dependencies || {}
                }
            }

            /* Add parent to package version dependent */
            if ( parn !== tmp ) {
                /* Get parent pacakge */
                var ppkg;

                try {
                    /* Getting Dependent Package */
                    ppkg = require(path.resolve(parn, 'package.json'));

                    /* Add dependent name if not exist */
                    if ( !regis.packages[ base ][ bpkg.version ].dependents[ ppkg.name ] )
                        regis.packages[ base ][ bpkg.version ].dependents[ ppkg.name ] = {};

                    /* Add parent to dependent */
                    regis.packages[ base ][ bpkg.version ].dependents[ ppkg.name ][ ppkg.version ] = {
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

                    try {
                        file.ensureLinkSync(trp, srp);
                    }
                    catch ( err ) {}

                    this.next();
                });
            }

            /* Add intalled package to the list */
            installed.push(regis.packages[ base ][ bpkg.version ]);
        }

        this.next();
    });

    /* Add Current Project as Dependent */
    if ( owner && owner.path && owner.name && owner.version ) {
        /* Ensure dependent name is exist */
        if ( !regis.packages[ name ][ insver ].localusers[ owner.name ] )
            regis.packages[ name ][ insver ].localusers[ owner.name ] = {};

        /* Add version to dependent name */
        regis.packages[ name ][ insver ].localusers[ owner.name ][ owner.version ] = {
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

    /* Creating Result */
    result = regis.packages[ name ][ insver ];

    /* Linking Sub Modules */
    loop(installed, function ( lpkg ) {
        PackageLinker(lpkg);

        this.next();
    });

    /* Return Result */
    return result;
}

/* Adding Dependent */
function PackageDependentAdder ( des, res, force ) {
    if ( des && des.name && des.version ) {
        if ( res && res.name && res.path && res.version ) {
            /* Ensure dependent name is exist */
            if ( !regis.packages[ des.name ][ des.version ].localusers[ res.name ] )
                regis.packages[ des.name ][ des.version ].localusers[ res.name ] = {};

            /* Add version to dependent name */
            regis.packages[ des.name ][ des.version ].localusers[ res.name ][ res.version ] = {
                path    : res.path,
                version : res.version,
                package : path.resolve(res.path, 'package.json')
            }

            /* Save the registry */
            file.writeJsonSync(path.resolve(reg, 'registry.json'), regis);
        }
    }

}

/* Remove Package */
function PackageRemover ( name, version, auto ) {
    var pkgs = regis.packages, pkgn;

    /* Continue when package is installed */
    if ( pkgs[ name ] ) {
        pkgn = pkgs[ name ];

        /* Using versioned removal */
        if ( version ) {
            console.log(`${auto || ''}Removing ${name}@${version}`);

            /* Continue if version is installed */
            if ( pkgn[ version ] ) {
                /* Removing each version */
                PackageRemoveVersion(name, version, auto);

                /* Removing it self */
                PackageRemoveSelf(name, auto);
            }
            else {
                console.log(`${auto || ''}Package ${colr.blue(name)}@${colr.yellow(version)} is not installed. Package not removed.\r\n`);
            }
        }

        /* Using unversioned removal */
        else {
            /* Remove each installed versions */
            loop(pkgn, function ( version, defs ) {
                console.log(`Removing ${name}@${version}`);

                PackageRemoveVersion(name, version, auto);

                this.next();
            });

            /* Removing it self */
            PackageRemoveSelf(name, auto);

            return true;
        }
    }
    else {
        console.log(`${auto || ''}Package ${colr.blue(name)} is not installed. Package not removed.`);
    }
}

/* Remove package */
function PackageRemoveSelf ( name, auto ) {
    /* Remove the registry entry */
    delete regis.packages[ name ];

    /* Remove package folder */
    file.removeSync(path.resolve(mwd, name));

    /* Save the registry */
    file.writeJsonSync(path.resolve(reg, 'registry.json'), regis);

    console.log(`${auto || ''}Package ${colr.blue(name)} sucessfully removed.\r\n`);
}

/* Remove each version */
function PackageRemoveVersion ( name, version, auto ) {
    var pkgv = regis.packages[ name ][ version ];

    /* Getting Dependencies and Dependent */
    var deps = Object.keys(pkgv.dependencies);

    /* Delete registry entry */
    delete regis.packages[ name ][ version ];

    /* Delete folder */
    file.removeSync(path.resolve(mwd, name, version));

    /* Save the registry */
    file.writeJsonSync(path.resolve(reg, 'registry.json'), regis);

    /* Removing Dependencies */
    if ( deps.length > 0 && 'string' === typeof auto ) {
        auto += '  ';

        loop(pkgv.dependencies, function ( dn, dv ) {
            /* Check does dependency is installed  */
            var sbm = ModuleFinder(dn, dv, true, true);

            if ( sbm ) {
                console.log(`${auto}Removing ${colr.blue(name)} dependency ${colr.yellow(dn)}\r\n`);

                PackageRemover(dn, sbm.version, auto);
            }

            this.next();
        });
    }

    return true;
}

/* Create Links */
function PackageLinker ( pkgdef, deep, fn ) {
    /* Create node_modules folder */
    var nmpath = path.resolve(pkgdef.path, 'node_modules');

    /* Link the dependencies */
    if ( pkgdef.dependencies ) {
        loop(pkgdef.dependencies, function ( name, version ) {
            // Skip non standard version number.
            if ( version.match(/[a-zA-Z\/]+/g) ) version = '*';

            // Get the dependencies.
            var dpkg = ModuleFinder(name, version, true, true);

            if ( dpkg ) {
                if ( 'function' === typeof fn ) fn(name, version);

                /* Add bin symlink */
                if ( dpkg.bin ) {
                    loop(dpkg.bin, function ( des, src ) {
                        file.ensureLinkSync(path.resolve(dpkg.path, src), path.resolve(nmpath, '.bin', des));
                    });
                }

                // Create the link.
                file.ensureSymlinkSync(dpkg.path, path.resolve(nmpath, dpkg.name));
            }

            this.next();
        });
    }

    // Dev Dependencies only linked on dev install.
    if ( !deep && pkgdef.devDependencies ) {
        loop(pkgdef.devDependencies, function ( name, version ) {
            // Skip non standard version number.
            if ( version.match(/[a-zA-Z\/]+/g) ) version = '*';

            // Get the dependencies.
            var dpkg = ModuleFinder(name, version, true, true);

            if ( dpkg ) {
                // Call logger if required.
                if ( 'function' === typeof fn ) fn(name, version);

                /* Add bin symlink */
                if ( dpkg.bin ) {
                    loop(dpkg.bin, function ( des, src ) {
                        file.ensureLinkSync(path.resolve(dpkg.path, src), path.resolve(nmpath, '.bin', des));
                    });
                }

                // Create the link.
                file.ensureSymlinkSync(dpkg.path, path.resolve(nmpath, dpkg.name));
            }

            this.next();
        });
    }
}

/* Exporting Finder */
module.exports = {
    reg : regis,
    mod : ModuleFinder,
    ins : PackageInstaller,
    add : PackageDependentAdder,
    rem : PackageRemover,
    sym : PackageLinker
}