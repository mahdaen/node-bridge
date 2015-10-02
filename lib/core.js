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

/* Get Platform */
var osp = oses.type();

if ( osp.search('Linux') > -1 ) {
    osp = 'linux';
}
else if ( osp.search('Darwin') > -1 ) {
    osp = 'darwin';
}
else if ( osp.search('Windows') > -1 ) {
    osp = 'windows';
}

// Setup the node-bridge path depend on the platform.
var rpath, spath;
if ( osp === 'windows' ) {
    rpath = path.resolve('/program files');
}
else {
    rpath = path.resolve('/usr/local');
}

/* Getting Required Variables */
var cwd = process.cwd(),
    reg = path.resolve(rpath, 'node-bridge'),
    tmp = path.resolve(reg, 'tmp'),
    rgp = path.resolve(reg, 'registry.json'),
    mwd = path.resolve(reg, 'modules');

// Preparing node-bridge path for the first time.
// This step is to ensure administrator privellage only required at first time use.
try {
    spath = file.statSync(reg);

    if ( !spath.isDirectory() ) {
        initRoot();
    }
}
catch ( err ) {
    initRoot();
}

// Makes the node-bridge path has read and write permission.
function initRoot () {
    file.ensureDirSync(reg);
    file.ensureFileSync(rgp);
    file.ensureDirSync(mwd);
    file.ensureDirSync(tmp);

    try {
        bash.spawnSync('chmod', [ '-R', '7777', reg ]);
    }
    catch ( err ) {
        console.log(err.message);
        process.exit();
    }
}

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
function ModuleGetter ( name, version, nolog, nocheck ) {
    var self = this;

    if ( !nolog ) console.log(`Checking package ${colr.greenBright(name)} version ${colr.bold(version)} ...`);

    var npdir = path.resolve(mwd, name);

    if ( name in regis.packages ) {
        var pkgi = regis.packages[ name ], vers;

        loop(Object.keys(pkgi).sort(), function ( nm ) {
            if ( qual(nm, version) ) {
                vers = nm;
            }

            this.next();
        });

        /* Return the requiested package if satified */
        if ( vers ) {
            if ( !nolog ) console.log(`Found installed packege ${colr.greenBright(name)} ${colr.yellow(vers)} which match with ${colr.bold(version)}\r\n`);

            var upd, has, ext = '', res = pkgi[ vers ];

            if ( self.osp === 'windows' ) ext = '.cmd';

            if ( !nocheck ) {
                try {
                    upd = bash.spawnSync(`npm${ext}`, [ 'info', name ], { cwd : tmp });
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
                localusers   : res.localusers,
                dependencies : res.dependencies,
                latest       : upd.version,
                tag          : version,
            }
        }
        else {
            if ( !nolog ) console.log(`Package ${colr.greenBright(name)} is installed, but version ${colr.bold(version)} is not installed.\r\n`);

            return false;
        }
    }
    else {
        if ( !nolog ) console.log(`Package ${colr.greenBright(name)} version ${colr.bold(version)} is not installed.\r\n`);

        return false;
    }
}

/* Package Installer */
function PackageInstaller ( name, version, owner, force ) {
    var self = this;

    console.log(`${colr.green('=>')} Installing package ${colr.greenBright(name)} version ${colr.yellow(version)}`);

    var stdres, insver, result, ext = '';

    if ( this.osp === 'windows' ) ext = '.cmd';

    /* Install pacakge using NPM */
    try {
        stdres = bash.spawnSync(`npm${ext}`, [ 'install', `${name}@${version}` ], { cwd : tmp });
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
                        file.ensureSymlinkSync(trp, srp);
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
        PackageLinker.call(self, lpkg);

        this.next();
    });

    /* Return Result */
    return result;
}

/* Remove Package */
function PackageRemover ( name, version, auto, force ) {
    var self = this;

    var pkgs = regis.packages, pkgn, remself = true;

    /* Continue when package is installed */
    if ( pkgs[ name ] ) {
        pkgn = pkgs[ name ];

        /* Using versioned removal */
        if ( version ) {
            console.log(`${auto || ''}${colr.magenta('Removing')} ${colr.greenBright(name)}@${colr.yellow(version)} ...`);

            /* Continue if version is installed */
            if ( pkgn[ version ] ) {
                /* Removing each version */
                var removed = PackageRemoveVersion.call(self, name, version, auto, force);

                /* Removing it self */
                if ( removed ) {
                    PackageRemoveSelf.call(self, name, auto, force);
                }
            }
            else {
                console.log(`${auto || ''}Package ${colr.greenBright(name)}@${colr.yellow(version)} is not installed. Package not removed.\r\n`);
            }
        }

        /* Using unversioned removal */
        else {
            /* Remove each installed versions */
            loop(pkgn, function ( version, defs ) {
                console.log(`${colr.magenta('Removing')} ${colr.greenBright(name)}@${colr.yellow(version)} ...`);

                var removed = PackageRemoveVersion.call(self, name, version, auto, force);

                if ( !removed ) remself = false;

                this.next();
            });

            /* Removing it self */
            if ( remself ) {
                PackageRemoveSelf.call(self, name, auto, force);
            }

            return true;
        }
    }
    else {
        console.log(`${auto || ''}Package ${colr.greenBright(name)} is not installed. Package not removed.`);
    }
}

/* Remove package */
function PackageRemoveSelf ( name, auto, force ) {
    var self = this;

    /* Remove the registry entry */
    delete regis.packages[ name ];

    /* Remove package folder */
    file.removeSync(path.resolve(mwd, name));

    /* Save the registry */
    file.writeJsonSync(rgp, regis);

    console.log(`${auto || ''}Package ${colr.greenBright(name)} sucessfully removed.\r\n`);
}

/* Remove each version */
function PackageRemoveVersion ( name, version, auto, force ) {
    var self = this;

    /* Get the package info */
    var pkgv = regis.packages[ name ][ version ], dorem = true;

    /* Root Package */
    var rpkg, rname, rvers;

    try {
        rpkg = file.readJsonSync(path.resolve(cwd, 'package.json'));

        rname = rpkg.name;
        rvers = rpkg.version;
    }
    catch ( err ) {
        rname = '';
        rvers = '';
    }

    /* Get the package local users */
    var ldep = Object.keys(pkgv.localusers);

    /* Skip root package for checking dependent */
    if ( ldep.indexOf(rname) > -1 ) ldep.splice(ldep.indexOf(rname), 1);

    if ( ldep.length > 0 && !force ) {
        console.log(`${auto || ''}${colr.yellow('Used by projects:')}`);

        loop(pkgv.localusers, function ( dname, dversions ) {
            if ( dname !== rname ) {
                loop(dversions, function ( dver, dval ) {
                    console.log(`${auto || ''} - ${colr.greenBright(dname)}@${colr.yellow(dval.version)} => ${dval.path}`);

                    this.next();
                });
            }

            this.next();
        });

        /* Ask to remove packages */
        dorem = false;
    }

    /* Get the package dependents */
    var rdep = Object.keys(pkgv.dependents);

    if ( rdep.length > 0 && !force ) {
        console.log(`${auto || ''}${colr.yellow('Used by packages:')}`);

        loop(pkgv.dependents, function ( dname, dversions ) {
            loop(dversions, function ( dver, dval ) {
                console.log(`${auto || ''} - ${colr.greenBright(dname)}@${colr.yellow(dval.version)}`);

                this.next();
            });

            this.next();
        });

        /* Ask to remove packages */
        dorem = false;
    }

    if ( !dorem ) {
        /* Ask to remove packages */
        console.log(colr.bold(`${auto || ''}\r\nRemoving this package will causing dependents above stop working.`));
        console.log(`${auto || ''}Please remove the dependents above first, or add "--force" option to force remove it.\r\n`);

        return false;
    }

    /* Remove from dependencies */
    DependentRemover.call(self, name, version, pkgv);

    /* Delete registry entry */
    delete regis.packages[ name ][ version ];

    /* Delete folder */
    file.removeSync(path.resolve(mwd, name, version));

    /* Save the registry */
    file.writeJsonSync(rgp, regis);

    /* Getting Dependencies and Dependent */
    var deps = Object.keys(pkgv.dependencies);

    /* Removing Dependencies */
    if ( deps.length > 0 && 'string' === typeof auto ) {
        auto += '  ';

        loop(pkgv.dependencies, function ( dn, dv ) {
            /* Check does dependency is installed  */
            var sbm = ModuleGetter.call(self, dn, dv, true, true);

            if ( sbm ) {
                console.log(`${auto}Removing ${colr.greenBright(name)} dependency ${colr.yellow(dn)}\r\n`);

                PackageRemover.call(self, dn, sbm.version, auto, force);
            }

            this.next();
        });
    }

    return true;
}

/* Adding Dependent */
function DependentAdder ( des, res, force ) {
    var self = this;

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
            file.writeJsonSync(rgp, regis);
        }
    }

}

/* Dependent Remover */
function DependentRemover ( name, version, pkg, target, save ) {
    var self = this;

    target = target || 'dependents';

    if ( pkg.dependencies ) {
        loop(pkg.dependencies, function ( dname, dvers ) {
            var dpkg = ModuleGetter.call(self, dname, dvers, true, true);

            if ( dpkg ) {
                if ( name in dpkg[ target ] && version in dpkg[ target ][ name ] ) {
                    delete regis.packages[ dname ][ dpkg.version ][ target ][ name ][ version ];

                    if ( Object.keys(regis.packages[ dname ][ dpkg.version ][ target ][ name ]).length < 1 )
                        delete regis.packages[ dname ][ dpkg.version ][ target ][ name ];
                }
            }

            this.next();
        });
    }

    if ( pkg.devDependencies ) {
        loop(pkg.devDependencies, function ( dname, dvers ) {
            var dpkg = ModuleGetter.call(self, dname, dvers, true, true);

            if ( dpkg ) {
                if ( name in dpkg[ target ] && version in dpkg[ target ][ name ] ) {
                    delete regis.packages[ dname ][ dpkg.version ][ target ][ name ][ version ];

                    if ( Object.keys(regis.packages[ dname ][ dpkg.version ][ target ][ name ]).length < 1 )
                        delete regis.packages[ dname ][ dpkg.version ][ target ][ name ];
                }
            }

            this.next();
        });
    }

    if ( save ) {
        file.writeJsonSync(rgp, regis);
    }
}

/* Create Links */
function PackageLinker ( pkgdef, deep, fn ) {
    var self = this;

    /* Create node_modules folder */
    var nmpath = path.resolve(pkgdef.path, 'node_modules');

    /* Link the dependencies */
    if ( pkgdef.dependencies ) {
        loop(pkgdef.dependencies, function ( name, version ) {
            // Skip non standard version number.
            if ( version.match(/[a-zA-Z\/]+/g) ) version = '*';

            // Get the dependencies.
            var dpkg = ModuleGetter.call(self, name, version, true, true);

            if ( dpkg ) {
                if ( 'function' === typeof fn ) fn(name, version);

                /* Add bin symlink */
                if ( dpkg.bin ) {
                    loop(dpkg.bin, function ( des, src ) {
                        file.ensureSymlinkSync(path.resolve(dpkg.path, src), path.resolve(nmpath, '.bin', des));
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
            var dpkg = ModuleGetter.call(self, name, version, true, true);

            if ( dpkg ) {
                // Call logger if required.
                if ( 'function' === typeof fn ) fn(name, version);

                /* Add bin symlink */
                if ( dpkg.bin ) {
                    loop(dpkg.bin, function ( des, src ) {
                        file.ensureSymlinkSync(path.resolve(dpkg.path, src), path.resolve(nmpath, '.bin', des));
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
    get : ModuleGetter,
    ins : PackageInstaller,
    add : DependentAdder,
    rem : PackageRemover,
    sym : PackageLinker,
    rmd : DependentRemover
}