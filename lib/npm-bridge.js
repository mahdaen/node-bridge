#! /usr/bin/env node

'use strict';

/* Loading core modules */
var loop = require('./looper'),
    core = require('./core'),
    file = require('fs-extra'),
    bash = require('child_process'),
    path = require('path'),
    colr = require('cli-color');

/* Getting Required Variables */
var cwd = process.cwd(),
    nwd = path.resolve(cwd, 'node_modules');

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
            installPackages(nrg, true, true);

            break;

        /* Update Commands */
        case 'check-updates':
            checkUpdates(nrg, true, true);

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

        /* Link Commands */
        case 'link':
        case 'ln':
            linkPackages(nrg);

            break

        /* Link Commands */
        case 'link-bin':
        case 'lb':
            linkBinary(nrg);

            break

        /* Unlink Commands */
        case 'unlink':
        case 'rln':
            unlinkPackages(nrg);

            break

        /* Unnink Binary Commands */
        case 'unlink-bin':
        case 'ulb':
            linkBinary(nrg, true);

            break

        /* Show Help */
        case 'help':
        case '-h':
        case '--help':
            showHelp();

            break;

        /* Invalid Commands */
        default :
            console.log(`${colr.green('npm-bridge')} => ${colr.red('Invalid command:')} ${cmd}`);
            showHelp();

            break;
    }
}
else {
    console.log(`${colr.green('npm-bridge')} => ${colr.red('require at least one argument!')}`);
    showHelp();
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
            showHelp();

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

                if ( pkg && pkg.dependencies[ cnm ] ) {
                    cvr = pkg.dependencies[ cnm ];
                }
                else if ( pkg && pkg.devDependencies[ cnm ] ) {
                    cvr = pkg.devDependencies[ cnm ];
                }
                else {
                    if ( cpkg.length > 1 ) {
                        cvr = cpkg[ 1 ];
                    }
                    else {
                        cvr = 'latest';
                    }
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
            /* Skip updater if package not installed */
            if ( remold ) {
                console.log(`Package ${colr.greenBright(name)}@${colr.yellow(version)} is not installed.`);
                console.log(`Use ${colr.bold('npm-bridge install')} to install that package.`);
            }

            /* Start installer to install new package if package not installed */
            else {
                if ( pkg ) {
                    result = core.ins(name, version, {
                        path    : cwd,
                        name    : pkg.name,
                        version : pkg.version
                    }, force);
                }
                else {
                    result = core.ins(name, version, null, force);
                }
            }
        }

        /* If Pacakge is installed */
        else {
            /* Skip updater if already the latest version */
            if ( exist.version === exist.latest ) {
                console.log(`Package ${colr.greenBright(name)}@${colr.yellow(version)} is installed with version ${colr.yellow(exist.version)}, and the latest version.`);

                /* Just add to dependents */
                if ( pkg ) {
                    core.add({
                        name    : name,
                        version : exist.version
                    }, {
                        name    : pkg.name,
                        version : pkg.version,
                        path    : cwd
                    }, force);
                }

                /* Skip install */
                this.next();

                return;
            }

            /* Not the latest version */
            else {
                /* Install new version */
                if ( remold ) {
                    if ( pkg ) {
                        result = core.ins(name, exist.latest, {
                            path    : cwd,
                            name    : pkg.name,
                            version : pkg.version
                        }, force);
                    }
                    else {
                        result = core.ins(name, exist.latest, null, force);
                    }
                }

                /* Skip installer if installed, and notice for available update */
                else {
                    console.log(`Package ${colr.greenBright(name)}@${colr.yellow(version)} is installed with version ${colr.yellow(exist.version)}, but we found new version ${colr.green(exist.latest)}`);
                    console.log(`Use ${colr.bold('npm-bridge update')} to update the package.`);

                    /* Skip install */
                    this.next();

                    return;
                }
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

/* Package Remover */
function removePackages ( arg, nolog ) {
    var pkg, inslist = {}, dforce, force, dauto, auto, dsave, save, dsdev, sdev;

    /* Check does need to auto remove dependencies */
    dauto = arg.indexOf('--auto');

    if ( dauto > -1 ) {
        auto = '';
        arg.splice(dauto, 1);
    }

    /* Check does need to save package */
    dforce = arg.indexOf('--force');

    if ( dforce < 0 ) dforce = arg.indexOf('-f');
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

    /* Removing from package.json */
    if ( arg.length < 1 ) {
        /* Proceed only if package.json is available */
        if ( pkg ) {
            /* Removing dependencies */
            if ( pkg.dependencies ) {
                console.log(`${colr.green('npm-bridge remove')} => Removing dependencies...`);

                loop(pkg.dependencies, function ( name, version ) {
                    var pkgi = core.mod(name, version, true, true);

                    if ( pkgi ) {
                        core.rem(name, pkgi.version, auto, force);
                    }
                    else {
                        console.log(`${colr.green('npm-bridge remove')} => Package ${name}@${version} not installed. No package removed!`);
                    }

                    /* Remove pacakge from package.json */
                    if ( save ) delete pkg.dependencies[ name ];

                    this.next();
                });
            }

            /* Removing Dev Dependencies */
            if ( pkg.devDependencies ) {
                console.log(`${colr.green('npm-bridge remove')} => Removing dev dependencies...`);

                loop(pkg.devDependencies, function ( name, version ) {
                    var pkgi = core.mod(name, version, true, true);

                    if ( pkgi ) {
                        core.rem(name, pkgi.version, auto, force);
                    }
                    else {
                        console.log(`${colr.green('npm-bridge remove')} => Package ${name}@${version} not installed. No package removed!`);
                    }

                    /* Remove pacakge from package.json */
                    if ( sdev ) delete pkg.devDependencies[ name ];

                    this.next();
                });
            }

            /* Update the package.json file */
            file.writeJsonSync(path.resolve(cwd, 'package.json'), pkg);
        }
        else {
            console.log(`${colr.green('npm-bridge remove')} => ${colr.red('Can not find package.json for batch removal. No packages removed!')}`);
            showHelp();
        }
    }

    /* Removing specific packages */
    else {
        /* Remove all packages */
        if ( arg.length === 1 && arg[ 0 ] === 'all' ) {
            /* Iterate installed packages */
            loop(core.reg.packages, function ( name, versions ) {
                var nstr = name + '\r\n';

                /* Iterate installed package versions */
                loop(versions, function ( vern, defs ) {
                    core.rem(name, vern, auto, force);

                    this.next();
                });

                this.next();
            });
        }

        /* Remove custom packages */
        else {
            /* Iterate each arguments and find the package */
            loop(arg, function ( name ) {
                var cdp = name.split('@'),
                    cdn = cdp[ 0 ];

                /* Remove specific version if defined */
                if ( cdp.length > 1 ) {
                    var exs = core.mod(cdn, cdp[ 1 ], true, true);

                    if ( exs ) {
                        core.rem(cdn, exs.version, auto, force);
                    }
                    else {
                        console.log(`${colr.green('npm-bridge remove')} => Can not remove ${name} or package is not installed.`);
                    }
                }

                /* Remove all version if no version defined */
                else {
                    core.rem(cdn, null, auto, force);
                }

                if ( save && pkg && pkg.dependencies[ name ] ) {
                    delete pkg.dependencies[ name ];
                }

                if ( sdev && pkg && pkg.devDependencies[ name ] ) {
                    delete pkg.devDependencies[ name ];
                }

                if ( pkg ) {
                    file.writeJsonSync(path.resolve(cwd, 'package.json'), pkg);
                }

                this.next();
            });
        }
    }
}

/* Package Listing */
function listPackages ( arg, nolog ) {
    var regs = core.reg, vers, max = 0, list = {};

    /* List all packages */
    if ( arg.length < 1 ) {
        loop(Object.keys(regs.packages).sort(), function ( name ) {
            list[ name ] = regs.packages[ name ];

            this.next();
        });
    }

    /* List specific package(s) */
    else {
        loop(arg.sort(), function ( name ) {
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

        console.log(`↳ ${colr.green(name)} ${makespace(max - name.length)}-- ${colr.yellow(vers)}`);

        this.next();
    });

    console.log(`\r\nFound ${colr.green(Object.keys(list).length)} packages installed.`);
}

/* Package Linker */
function linkPackages ( arg ) {
    var pkgs;

    try {
        pkgs = file.readJsonSync(path.resolve(cwd, 'package.json'));
    }
    catch ( err ) {
        console.log(colr.red(`Can not find package.json. Link creation skipped.`));

        return;
    }

    if ( arg.length < 1 ) {
        if ( pkgs ) {
            pkgs.path = cwd;

            core.sym(pkgs, false, function ( name, version ) {
                console.log(`Created package link: ${colr.greenBright(name)}@${colr.yellow(version)}`);
            });

            /* Register as dependent */
            if ( pkgs.dependencies ) {
                loop(pkgs.dependencies, function ( dname, dvers ) {
                    var dpkg = core.mod(dname, dvers, true, true);

                    if ( dpkg ) {
                        core.add({
                            name    : dname,
                            version : dpkg.version
                        }, {
                            name    : pkgs.name,
                            version : pkgs.version,
                            path    : cwd
                        });
                    }

                    this.next();
                });
            }

            if ( pkgs.devDependencies ) {
                loop(pkgs.devDependencies, function ( dname, dvers ) {
                    var dpkg = core.mod(dname, dvers, true, true);

                    if ( dpkg ) {
                        core.add({
                            name    : dname,
                            version : dpkg.version
                        }, {
                            name    : pkgs.name,
                            version : pkgs.version,
                            path    : cwd
                        });
                    }

                    this.next();
                });
            }
        }
    }
    else {
        var pkgo = {
            path : cwd, dependencies : {}
        }

        loop(arg, function ( name ) {
            pkgo.dependencies[ name.split('@')[ 0 ] ] = name.split('@')[ 1 ] || '*';

            this.next();
        });

        core.sym(pkgo, false, function ( nm, vr ) {
            console.log(`Created package link: ${colr.greenBright(nm)}@${colr.yellow(vr)}`);
        });

        /* Register as dependent */
        loop(pkgo.dependencies, function ( dname, dvers ) {
            var dpkg = core.mod(dname, dvers, true, true);

            if ( dpkg ) {
                core.add({
                    name    : dname,
                    version : dpkg.version
                }, {
                    name    : pkgs.name,
                    version : pkgs.version,
                    path    : cwd
                });
            }

            this.next();
        });
    }
}

// Link Remover.
function unlinkPackages ( arg ) {
    var pkg;

    try {
        pkg = file.readJsonSync(path.resolve(cwd, 'package.json'));
    }
    catch ( err ) {
        console.log(colr.red(`Can not find package.json. Unlink skipped.`));

        return;
    }

    /* Remove from dependent */
    core.rmd(pkg.name, pkg.version, pkg, 'localusers', true);

    if ( arg.length < 1 ) {
        file.removeSync(nwd);
        console.log(`All package links removed.`);
    }
    else {
        loop(arg, function ( name ) {
            file.removeSync(path.resolve(nwd, name));
            console.log(`Package ${colr.greenBright(name)} unlinked.`);
        });
    }
}

// Update checker
function checkUpdates ( arg ) {
    var fupd = [], max = 1, install;

    // Does install the available updates.
    if ( arg.indexOf('--install') > -1 ) install = true;

    loop(Object.keys(core.reg.packages).sort(), function ( name ) {
        loop(core.reg.packages[ name ], function ( ver, val ) {
            ver = `^${ver}`;

            console.log(`Checking updates [#${max}] for: ${colr.greenBright(name)}@${colr.yellow(ver)}`);

            /* Check package */
            var upd = core.mod(name, ver, true);

            if ( upd.version !== upd.latest ) {
                /* Re-check the installed versions */
                var rpd = core.mod(name, `^${upd.latest}`, true, true);

                if ( !rpd ) {
                    console.log(`  ${colr.green('[↳]')} New update available: ${colr.green(upd.latest)}\r\n`);

                    if ( install ) {
                        core.ins(name, upd.latest);

                        fupd.push(`Updated: ${colr.greenBright(name)}@${colr.yellow(ver)} => v${colr.green(upd.latest)}`);
                    }
                    else {
                        fupd.push(`${colr.greenBright(name)}@${colr.yellow(ver)} => v${colr.green(upd.latest)}`);
                    }
                }
                else {
                    console.log(`  [•] No updates found.\r\n`);
                }
            }
            else {
                console.log(`  [•] No updates found.\r\n`);
            }

            this.next();
        });

        this.next();
    });

    console.log(`Found ${colr.green.bold(fupd.length)} available updates:`);
    console.log(fupd.join('\r\n'));
}

/* Space Maker */
function makespace ( count, txt ) {
    var spc = '';

    for ( var i = 0; i < count; ++i ) spc += (txt || '-');

    return spc;
}

/* Binar Linker */
function linkBinary ( arg, rem ) {
    if ( arg.length < 1 ) {
        console.log(colr.redBright('Please specify packages name and version ( name@version ) that will be linked as executable.'));
    }
    else {
        loop(arg, function ( pkg ) {
            pkg = pkg.split('@');

            var name    = pkg[ 0 ],
                version = pkg[ 1 ] || '*',
                result;

            var dpkg = core.mod(name, version, true, true);

            if ( dpkg ) {
                var pkgi;

                try {
                    pkgi = file.readJsonSync(path.resolve(dpkg.path, 'package.json'));
                }
                catch ( err ) {
                    console.log(`${colr.redBright('Can not find')} package.json ${colr.redBright('for')} ${colr.greenBright(name)}@${colr.yellow(dpkg.version)}`);
                }

                if ( !pkgi.bin ) {
                    console.log(`${colr.redBright('Can not find')} ${colr.greenBright('bin')} ${colr.redBright('for')} ${colr.greenBright(name)}@${colr.yellow(dpkg.version)}`);
                }
                else {
                    loop(pkgi.bin, function ( bname, bpath ) {
                        var spath = path.resolve(dpkg.path, bpath),
                            dpath = path.resolve('/usr/local/bin', bname);

                        if ( !rem ) {
                            try {
                                file.ensureSymlinkSync(spath, dpath);
                            }
                            catch ( err ) {
                                throw err;
                            }

                            console.log(`${colr.greenBright(name)}@${colr.yellow(dpkg.version)} binary linked to ${colr.blue(dpath)}`);
                        }
                        else {
                            try {
                                file.removeSync(dpath);
                            }
                            catch ( err ) {
                                throw err;
                            }

                            console.log(`${colr.greenBright(name)}@${colr.yellow(dpkg.version)} binary unlinked ${colr.blue(dpath)}`);
                        }

                        this.next();
                    });
                }
            }

            this.next();
        });
    }
}

/* Show CLI Helper */
function showHelp () {
    var max = 0;

    var helps = [
        {
            cmd : 'install, -i, i',
            txt : 'Install Packages. Accept multiple install, and install from package.json',
            opt : '--save, -s, --save-dev, -sd --force, -f',
            usg : 'npm-bridge install | npm-bridge install --save express@^4.0.0 singclude'
        },
        {
            cmd : 'check-updates',
            txt : 'Check updates for installed packages and install them if --install argument is given.',
            opt : '--install',
            usg : 'npm-bridge check-updates | npm-bridge check-updates --install'
        },
        {
            cmd : 'update, -u, u',
            txt : 'Update Packages. Accept multiple update, and update from package.json',
            opt : '--save, -s, --save-dev, -sd',
            usg : 'npm-bridge update | npm-bridge update --save express@^4.0.0 singclude'
        },
        {
            cmd : 'remove, -r, rm',
            txt : `Remove Packages. Accept multiple removal, and removal from package.json.\r\n\t\t\t\tUse --auto to remove the depencies as well.`,
            opt : '--save, -s, --save-dev, -sd, --auto, --force, --f',
            usg : 'npm-bridge rm | npm-bridge rm --save express@^4.0.0 singclude'
        },
        {
            cmd : 'list, -l, ls',
            txt : 'List installed packages',
            usg : 'npm-bridge ls | npm-bridge ls express singclude'
        },
        {
            cmd : 'link, ln',
            txt : 'Create packages symlink to project node_modules folder',
            usg : 'npm-bridge link | npm-bridge ln express@^4.0.0 singclude'
        },
        {
            cmd : 'link-bin, lb',
            txt : 'Link installed packages binary to /usr/local/bin to makes it executable',
            usg : 'npm-bridge link-bin [packages...] | npm-bridge lb swig@^1.0.0 semver'
        },
        {
            cmd : 'unlink, ln',
            txt : 'Unlink packages symlink from project node_modules folder',
            usg : 'npm-bridge unlink | npm-bridge rln express@^4.0.0 singclude'
        },
        {
            cmd : 'unlink-bin, ulb',
            txt : 'Remove packages binary link from /usr/local to makes it not executable',
            usg : 'npm-bridge unlink-bin [packages...] | npm-bridge ulb swig@^1.0.0 semver'
        },
        {
            cmd : 'help, -h, --help',
            txt : 'Show this help',
        },
    ];

    console.log(`${colr.green('\r\nNPM Bridge')}`);
    console.log(`${require('../package.json').description}`);
    console.log(`v${require('../package.json').version}`);

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