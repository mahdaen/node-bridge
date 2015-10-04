"use strict";

/* Loading core modules */
var glob    = require('glob'),
    loop    = require('./util-looper'),
    path    = require('path'),
    file    = require('fs-extra'),
    oses    = require('os'),
    bash    = require('child_process'),

    semv    = require('semver'),
    satisfy = semv.satisfies,
    colr    = require('cli-color');

/* Creating Main Shortcuts */
var $resolve  = path.resolve,       // Path resolve shortcut.
    $basename = path.basename,      // Path basename shortcut.
    $dirname  = path.dirname;       // Path dirname shortcut.

var $logs = console.log,
    $exec = bash.spawnSync,
    $exit = process.exit,
    $keys = Object.keys;

/* Creating File Shortcuts */
var $writ  = file.writeFileSync,
    $writJ = file.writeJsonSync,
    $read  = file.readSync,
    $readJ = file.readJsonSync,
    $remov = file.removeSync,
    $ensuf = file.ensureFileSync,
    $ensus = file.ensureSymlinkSync,
    $ensud = file.ensureDirSync;

/* Creating Color Shortcuts */
var _blue = colr.blueBright,
    _yell = colr.yellow,
    _reds = colr.redBright,
    _bold = colr.bold,
    _magn = colr.magenta,
    _gren = colr.greenBright;

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
var nbrpath, nbrstat;

if ( osp === 'windows' ) {
    nbrpath = $resolve(oses.homedir(), 'appdata/roaming');
}
else {
    nbrpath = $resolve('/usr/local');
}

// Creating main paths.
var cwd = process.cwd(),                        // Working directory.
    reg = $resolve(nbrpath, 'node-bridge'),     // Node Bridge path.
    tmp = $resolve(reg, 'tmp'),                 // Node Bridge tmp path.
    bin = $resolve(reg, 'bin'),                 // Node Bridge bin path.
    rgp = $resolve(reg, 'registry.json'),       // Node Bridge registry path.
    mwd = $resolve(reg, 'modules');             // Node Bridge modules path.

// Preparing node-bridge path for the first time.
// This step is to ensure administrator privellage only required at first time use.
try {
    // Check does node-bridge path is exist.
    nbrstat = file.statSync(reg);

    // If path is not a directory, run init.
    if ( !nbrstat.isDirectory() ) {
        initRoot();
    }
}
catch ( err ) {
    // If not exist, run init.
    initRoot();
}

// Makes the node-bridge path has read and write permission.
function initRoot () {
    // Write all required files and folders.
    try {
        $ensud(reg);    // Ensure node-bridge path.
        $ensuf(rgp);    // Ensure node-bridge/registry.json path
        $ensud(mwd);    // Ensure module working path.
        $ensud(tmp);    // Ensure module tmp.
        $ensud(bin);    // Ensure binary path.
    }
    catch ( err ) {
        $logs(`${_reds('EACCES: Permission denied!')}`);
        $logs('If this is the first time you use npm-bridge, you need to run as root to grant access.');
        $logs('If you are a windows user, you need to always run npm-bridge as administrator.');
        $exit();
    }

    // Try to grant persmission for node-bridge path and childrens.
    try {
        if ( osp === 'windows' ) {
            $exec('icacls', [ reg, '/T', '/inheritance:e', '/grant', 'everyone:F' ]);
        }
        else {
            $exec('chmod', [ '-R', '7777', reg ]);
        }
    }
    catch ( err ) {
        $logs(err.message);
        $exit();
    }
}

/* Getting Registry */
var regis;

// Try getting registry object.
try {
    regis = require(rgp);
}
catch ( err ) {
    // Create new registry object if not exist.
    regis = {
        initreqs : {},
        packages : {}
    }

    // Write registry to file.
    $writJ(rgp, regis);
}

// Create optional shortcuts.
var $package = regis.packages;     // Registry package list.

/* Module Finder */
function ModuleGetter ( name, version, nolog, nocheck ) {
    // Wrapping self object.
    var self = this;

    if ( !nolog ) $logs(`Checking package ${_gren(name)} version ${_bold(version)} ...`);

    // Check does pacakge is exist on registry.
    if ( name in $package ) {
        // Get package infos.
        var mod = $package[ name ];

        // Version number.
        var modver;

        // Get the satisfied version from registry by iterating each versions.
        loop($keys(mod).sort(), function ( nm ) {
            if ( satisfy(nm, version) ) {
                // If current version is satisfying the required version, use it.
                // The last satisfying version will be used as result.
                modver = nm;
            }

            this.next();
        });

        // Return the requested pacakge info if package version satisfied.
        if ( modver ) {
            if ( !nolog ) $logs(`Found installed packege ${_gren(name)} ${_yell(modver)} which match with ${_bold(version)}\r\n`);

            var upd,                    // Update info holder.
                ext = '',               // NPM command extension for windows.
                res = mod[ modver ];    // The package infos.

            // Change extension for windows.
            if ( self.osp === 'windows' ) ext = '.cmd';

            // Check for updates if required.
            if ( !nocheck ) {
                try {
                    // Try run "npm info" to get the latest version.
                    upd = $exec(`npm${ext}`, [ 'info', name ], { cwd : tmp });
                }
                catch ( err ) {
                    // If error during fetching info, exit and log the error message.
                    $logs(err.message);
                    $exit();
                }

                // If status code is more than 0, then mark as error by logging the error message and exit the process.
                if ( upd.status > 0 ) {
                    $logs(upd.stderr.toString());
                    $exit();
                }

                // Convert the stdout string to object.
                eval('upd = ' + upd.stdout.toString());
            }

            // If no need to check update, use current satisfied version as result.
            else {
                upd = { version : modver };
            }

            // Return the package informations.
            return {
                tag          : version,             // Package version pattern.
                bin          : res.bin || {},       // Package binary list.
                name         : name,                // Package name.
                path         : res.resolve,            // Package location absolute path.
                latest       : upd.version,         // Package latest version.
                version      : res.version,         // Package version.
                lastused     : res.lastused,        // Last used date.
                dependents   : res.dependents,      // Global dependents (used by global packages).
                localusers   : res.localusers,      // Local dependents (used by local projects).
                dependencies : res.dependencies,    // Package dependencies.
            }
        }
        else {
            if ( !nolog )
                return $logs(`Package ${_gren(name)} is installed, but version ${_bold(version)} is not installed.\r\n`);
        }
    }
    else {
        if ( !nolog )
            return $logs(`Package ${_gren(name)} version ${_bold(version)} is not installed.\r\n`);
    }
}

/* Package Installer */
function PackageInstaller ( name, version, owner, force ) {
    // Wrap self object.
    var self = this;

    $logs(`${_gren('=>')} Installing package ${_gren(name)} version ${_yell(version)}`);

    // Add initial install as initreqs for migration or fixing purpose.
    if ( !regis.initreqs[ name ] ) regis.initreqs[ name ] = {};
    if ( !regis.initreqs[ name ][ version ] ) regis.initreqs[ name ][ version ] = owner;

    var stdres,         // Spawn result holder.
        nversion,       // New installed verion holder.
        result,         // Result holder.
        ext = '';       // Command extension holder for windows.

    // Bind npm command extesnion on windows machine.
    if ( osp === 'windows' ) ext = '.cmd';

    // Preparing install.
    try {
        // Install should be handled by NPM to ensure no mistakes.
        stdres = $exec(`npm${ext}`, [ 'install', `${name}@${version}` ], { cwd : tmp });
    }
    catch ( err ) {
        // Exit the process if NPM install failed, and log the error message.
        $logs(err.message);
        $exit();
    }

    // Ensure npm result is not an error ( status > 0 ).
    // If result is error, then exit the process and log the error message.
    if ( stdres.status > 0 ) {
        $logs(stdres.stderr.toString());
        $exit();
    }

    // Convert npm result to string.
    stdres = stdres.stdout.toString();

    // Create install message if not defined by NPM, by combining requested name and version.
    if ( !stdres || stdres.replace(/\s+/g, '') === '' ) {
        stdres = `${name}@${version.match(/[\d\.]+/)[ 0 ]}\r\n`;
    }

    // Create install message for logging.
    stdres = `${_bold('Installed: ')}` + stdres.replace(`node_modules/${name}`, '');

    // Getting installed version from install message.
    nversion = (stdres.match(new RegExp(`${name}\\@[\\.\\d]+`))[ 0 ]).split('@')[ 1 ];

    // Create installed pacakge list.
    var installed = [];

    // Getting main and sub packages for moving to modules path.
    var submod = glob.sync(`${tmp}/**/node_modules/*`);

    // Moving packages from temporary path.
    loop(submod, function ( pkgp ) {
        // Create package name from package path.
        var base = $basename(pkgp),

            // Create package dirname from package path.
            from = $dirname(pkgp),

            // Create package parent dirname from package path.
            parn = $dirname(from);

        // Create current package.json holder
        var pkg;

        // Getting package.json content.
        try {
            pkg = require($resolve(pkgp, 'package.json'));
        }
        catch ( err ) {
            $logs(err.message);
        }

        // Continue operation only if package.json is exist.
        if ( pkg ) {
            // Create version if no version info on package.json
            if ( !pkg.version ) pkg.version = '1.0.0';

            // Copy package to modules dir if not already installed, or forced to copy.
            if ( !$package[ base ] || !$package[ base ][ pkg.version ] || force ) {
                var cpdir = $resolve(mwd, base, pkg.version);

                // Always use try-catch for sync operations.
                try {
                    // Copy package to modules dir.
                    file.copySync(pkgp, cpdir);
                }
                catch ( err ) {
                    $logs(err.message);
                }

                // Always use try-catch for sync operations.
                try {
                    // Removing node_modules from installed pacakge.
                    $remov($resolve(cpdir, 'node_modules'));
                }
                catch ( err ) {
                    $logs(err.message);
                }
            }

            // Add package to registry if not exist.
            if ( !$package[ base ] ) $package[ base ] = {};

            // Add package version to registry if not exist, or forced to install.
            if ( !$package[ base ][ pkg.version ] || force ) {
                $package[ base ][ pkg.version ] = {
                    bin          : pkg.bin || {},                           // Bin info list.
                    path         : $resolve(mwd, base, pkg.version),    // Absolute path.
                    version      : pkg.version,                             // Version number.
                    lastused     : new Date,                                // Lastused date.
                    dependents   : {},                                      // Global dependents list.
                    localusers   : {},                                      // Local dependents list.
                    dependencies : pkg.dependencies || {}                   // Dependencies
                }
            }

            // Add perent information as dependent to current package if parn path is not an initial install.
            if ( parn !== tmp ) {
                // Create parent package.json holder.
                var ppkg;

                try {
                    // Getting parent package.json.
                    ppkg = require($resolve(parn, 'package.json'));

                    // Add parent name to package dependent list if not exist
                    if ( !$package[ base ][ pkg.version ].dependents[ ppkg.name ] )
                        $package[ base ][ pkg.version ].dependents[ ppkg.name ] = {};

                    // Add parent version to package dependent list.
                    $package[ base ][ pkg.version ].dependents[ ppkg.name ][ ppkg.version ] = {
                        path    : $resolve(mwd, ppkg.name),
                        version : ppkg.version,
                        package : $resolve(mwd, ppkg.name, ppkg.version, 'package.json')
                    }
                }
                catch ( err ) {}
            }

            /* Add bin symlink */
            if ( pkg.bin ) {
                loop(pkg.bin, function ( bnam, bsrc ) {
                    var srcpath = $resolve(mwd, base, pkg.version, bsrc),
                        despath = $resolve(mwd, '.bin', bnam);

                    try {
                        WriteBin(despath, srcpath);
                    }
                    catch ( err ) {
                        $logs(err.message);
                    }

                    this.next();
                });
            }

            /* Add intalled package to the list */
            installed.push($package[ base ][ pkg.version ]);
        }

        this.next();
    });

    /* Add Current Project as Dependent */
    if ( owner && owner.resolve && owner.name && owner.version ) {
        /* Ensure dependent name is exist */
        if ( !$package[ name ][ nversion ].localusers[ owner.name ] )
            $package[ name ][ nversion ].localusers[ owner.name ] = {};

        /* Add version to dependent name */
        $package[ name ][ nversion ].localusers[ owner.name ][ owner.version ] = {
            path    : owner.resolve,
            version : owner.version,
            package : $resolve(owner.resolve, 'package.json')
        }
    }

    /* Update registry file */
    $writJ(rgp, regis);

    /* Cleanup tmp */
    $remov($resolve(tmp, 'node_modules'));

    /* Log the result */
    $logs(stdres);

    /* Creating Result */
    result = $package[ name ][ nversion ];

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

    var pkgs = $package, pkgn, remself = true;

    /* Continue when package is installed */
    if ( pkgs[ name ] ) {
        pkgn = pkgs[ name ];

        /* Using versioned removal */
        if ( version ) {
            $logs(`${auto || ''}${_magn('Removing')} ${_gren(name)}@${_yell(version)} ...`);

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
                $logs(`${auto || ''}Package ${_gren(name)}@${_yell(version)} is not installed. Package not removed.\r\n`);
            }
        }

        /* Using unversioned removal */
        else {
            /* Remove each installed versions */
            loop(pkgn, function ( version, defs ) {
                $logs(`${_magn('Removing')} ${_gren(name)}@${_yell(version)} ...`);

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
        $logs(`${auto || ''}Package ${_gren(name)} is not installed. Package not removed.`);
    }
}

/* Remove package */
function PackageRemoveSelf ( name, auto, force ) {
    var self = this;

    /* Remove the registry entry */
    delete $package[ name ];

    /* Remove package folder */
    $remov($resolve(mwd, name));

    /* Save the registry */
    $writJ(rgp, regis);

    $logs(`${auto || ''}Package ${_gren(name)} sucessfully removed.\r\n`);
}

/* Remove each version */
function PackageRemoveVersion ( name, version, auto, force ) {
    var self = this;

    /* Get the package info */
    var pkgv = $package[ name ][ version ], dorem = true;

    /* Root Package */
    var rpkg, rname, rvers;

    try {
        rpkg = $readJ($resolve(cwd, 'package.json'));

        rname = rpkg.name;
        rvers = rpkg.version;
    }
    catch ( err ) {
        rname = '';
        rvers = '';
    }

    /* Get the package local users */
    var ldep = $keys(pkgv.localusers);

    /* Skip root package for checking dependent */
    if ( ldep.indexOf(rname) > -1 ) ldep.splice(ldep.indexOf(rname), 1);

    if ( ldep.length > 0 && !force ) {
        $logs(`${auto || ''}${_yell('Used by projects:')}`);

        loop(pkgv.localusers, function ( dname, dversions ) {
            if ( dname !== rname ) {
                loop(dversions, function ( dver, dval ) {
                    $logs(`${auto || ''} - ${_gren(dname)}@${_yell(dval.version)} => ${dval.resolve}`);

                    this.next();
                });
            }

            this.next();
        });

        /* Ask to remove packages */
        dorem = false;
    }

    /* Get the package dependents */
    var rdep = $keys(pkgv.dependents);

    if ( rdep.length > 0 && !force ) {
        $logs(`${auto || ''}${_yell('Used by packages:')}`);

        loop(pkgv.dependents, function ( dname, dversions ) {
            loop(dversions, function ( dver, dval ) {
                $logs(`${auto || ''} - ${_gren(dname)}@${_yell(dval.version)}`);

                this.next();
            });

            this.next();
        });

        /* Ask to remove packages */
        dorem = false;
    }

    if ( !dorem ) {
        /* Ask to remove packages */
        $logs(_bold(`${auto || ''}\r\nRemoving this package will causing dependents above stop working.`));
        $logs(`${auto || ''}Please remove the dependents above first, or add "--force" option to force remove it.\r\n`);

        return false;
    }

    /* Remove from dependencies */
    DependentRemover.call(self, name, version, pkgv);

    /* Delete registry entry */
    delete $package[ name ][ version ];

    /* Delete folder */
    $remov($resolve(mwd, name, version));

    /* Save the registry */
    $writJ(rgp, regis);

    /* Getting Dependencies and Dependent */
    var deps = $keys(pkgv.dependencies);

    /* Removing Dependencies */
    if ( deps.length > 0 && 'string' === typeof auto ) {
        auto += '  ';

        loop(pkgv.dependencies, function ( dn, dv ) {
            /* Check does dependency is installed  */
            var sbm = ModuleGetter.call(self, dn, dv, true, true);

            if ( sbm ) {
                $logs(`${auto}Removing ${_gren(name)} dependency ${_yell(dn)}\r\n`);

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
        if ( res && res.name && res.resolve && res.version ) {
            /* Ensure dependent name is exist */
            if ( !$package[ des.name ][ des.version ].localusers[ res.name ] )
                $package[ des.name ][ des.version ].localusers[ res.name ] = {};

            /* Add version to dependent name */
            $package[ des.name ][ des.version ].localusers[ res.name ][ res.version ] = {
                path    : res.resolve,
                version : res.version,
                package : $resolve(res.resolve, 'package.json')
            }

            /* Save the registry */
            $writJ(rgp, regis);
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
                    delete $package[ dname ][ dpkg.version ][ target ][ name ][ version ];

                    if ( $keys($package[ dname ][ dpkg.version ][ target ][ name ]).length < 1 )
                        delete $package[ dname ][ dpkg.version ][ target ][ name ];
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
                    delete $package[ dname ][ dpkg.version ][ target ][ name ][ version ];

                    if ( $keys($package[ dname ][ dpkg.version ][ target ][ name ]).length < 1 )
                        delete $package[ dname ][ dpkg.version ][ target ][ name ];
                }
            }

            this.next();
        });
    }

    if ( save ) {
        $writJ(rgp, regis);
    }
}

/* Create Links */
function PackageLinker ( pkgdef, deep, fn ) {
    var self = this;

    /* Create node_modules folder */
    var nmpath = $resolve(pkgdef.resolve, 'node_modules');

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
                        WriteBin($resolve(nmpath, '.bin', des), $resolve(dpkg.path, src));
                    });
                }

                // Create the link.
                MakeSymlink(dpkg.path, $resolve(nmpath, dpkg.name));
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
                        WriteBin($resolve(nmpath, '.bin', des), $resolve(dpkg.path, src));
                    });
                }

                // Create the link.
                MakeSymlink(dpkg.path, $resolve(nmpath, dpkg.name));
            }

            this.next();
        });
    }
}

// Symlink Maker.
function MakeSymlink ( src, des ) {
    try {
        $ensus(src, des);
    }
    catch ( err ) {
        $logs(`${_reds('EPERM: Symlink operation not permitted!')}`);

        $logs('SRC:' + src);
        $logs('DES:' + des);

        $logs('If you\'re a windows user, you need to always run npm-bridge as administrator.');

        $exit();
    }
}

// Binary Writer
function WriteBin ( des, src ) {
    var cmd = file.readFileSync($resolve(__dirname, '../tpl/bin-cmd'), 'utf8'),
        jse = file.readFileSync($resolve(__dirname, '../tpl/bin-jse'), 'utf8');

    if ( osp === 'windows' ) {
        cmd = cmd.replace(new RegExp('%%BINPATH%%', 'g'), src);
        jse = jse.replace(new RegExp('%%BINPATH%%', 'g'), src);

        $writ(des, jse);
        $writ(`${des}.cmd`, cmd);
    }
    else {
        MakeSymlink(src, des);
    }
}

// Binary Remover
function RemoveBin ( name ) {
    if ( osp === 'windows' ) {
        try {
            // Remove bash script.
            $remov($resolve(bin, name));
            $remov($resolve(mwd, '.bin', name));

            // Remove cmd script.
            $remov($resolve(bin, name + '.cmd'));
            $remov($resolve(mwd, '.bin', name + '.cmd'));
        }
        catch ( e ) {
            $logs(e.message);
        }
    }
    else {
        // Remove Symlinks.
        try {
            $remov($resolve(bin, name));
            $remov($resolve(mwd, '.bin', name));
        }
        catch ( e ) {
            $logs(e.message);
        }
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