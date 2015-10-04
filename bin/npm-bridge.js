#! /usr/bin/env node

'use strict';

/* Loading core modules */
var clis = require('../lib/util-cli'),
    loop = require('../lib/util-looper'),
    core = require('../lib/lib-core'),
    file = require('fs-extra'),
    bash = require('child_process'),
    path = require('path'),
    colr = require('cli-color');

/* Getting Required Variables */
var cwd = process.cwd(),
    nwd = path.resolve(cwd, 'node_modules');

// Create CLI instance.
var cli = new clis.Helper().setup({
    name    : 'NPM Bridge',
    info    : 'The unified dependency management, gaining the power of NPM.',
    version : require('../package.json').version,
    usage   : `${colr.greenBright('npm-bridge')} ${colr.yellow('commands')} [options...]`,
    prefix  : [
        colr.blackBright(`-[]========= >_ ========[]-`),
        `-------- ${colr.greenBright.bold('NPM BRIDGE')} -------`,
        colr.blackBright(`-[]========= >_ ========[]-`),
    ]
})
    // Add commands.
    .add('cmd', {
        name  : 'install',
        alias : 'ins, -i',
        about : 'Install one or more packages, also install by read the package.json',
        usage : `${colr.greenBright('npm-bridge')} ${colr.yellow('install')} [packages...] [options...]`,

        exec : function initInstall ( opt, arg, cfg ) {
            Install.call(this, arg, false, true);
        }
    })
    .add('cmd', {
        name  : 'remove',
        alias : 'rm, -r',
        about : 'Remove one or more packages, also remove by read the package.sjon',
        usage : `${colr.greenBright('npm-bridge')} ${colr.yellow('remove')} [packages...] [options...]`,

        exec : function initRemove ( opt, arg, cfg ) {
            Remove.call(this, arg, true);
        }
    })
    .add('cmd', {
        name  : 'update',
        alias : 'upd, -u',
        about : 'Update one or more packages, also update by read the package.sjon',
        usage : `${colr.greenBright('npm-bridge')} ${colr.yellow('update')} [packages...] [options...]`,

        exec : function initUpdate ( opt, arg, cfg ) {
            Install.call(this, arg, true, true);
        }
    })
    .add('cmd', {
        name  : 'list',
        alias : 'ls, -l',
        about : 'List installed global packages.',
        usage : `${colr.greenBright('npm-bridge')} ${colr.yellow('list')} [packages...]`,

        exec : function initListing ( opt, arg, cfg ) {
            List.call(this, arg, true);
        }
    })
    .add('cmd', {
        name  : 'link',
        alias : 'ln',
        about : 'Link installed global packages to project.',
        usage : `${colr.greenBright('npm-bridge')} ${colr.yellow('link')} [packages...]`,

        exec : function initListing ( opt, arg, cfg ) {
            Link.call(this, arg);
        }
    })
    .add('cmd', {
        name  : 'unlink',
        alias : 'uln',
        about : 'Unlink global packages from project.',
        usage : `${colr.greenBright('npm-bridge')} ${colr.yellow('link')} [packages...]`,

        exec : function initUnlink ( opt, arg, cfg ) {
            Unlink.call(this, arg);
        }
    })

    // Add options
    .add('opt', {
        name  : '--bin',
        alias : '-b',
        about : 'Install packages and add the binary to the executable path.'
    })
    .add('opt', {
        name  : '--save',
        alias : '-s',
        about : 'Save the installed, removed, or updated packages to package.json as dependency.'
    })
    .add('opt', {
        name  : '--save-dev',
        alias : '-sd',
        about : 'Save the installed, removed, or updated packages to package.json as dev-dependency.'
    })
    .add('opt', {
        name  : '--force',
        alias : '-f',
        about : 'Force all operations and ignore any warnings.'
    })
    .add('opt', {
        name  : '--satisfy',
        about : 'List and verify the installed packages from package.json.'
    })

    // Start the CLI initializer.
    .init();

/* Pacakge Installer */
function Install ( pkglist, update, nolog ) {
    // Wrapping self objects.
    var self = this, inslist = {}, pkg = this.pkg;

    // Creating temp configs.
    var forc, save, sdev;

    // Check does process should be forced.
    if ( this.opt.indexOf('-f') > -1 || this.opt.indexOf('--force') > -1 )
        forc = true;

    // Check does install shoud be saved as dependencies.
    if ( this.opt.indexOf('-s') > -1 || this.opt.indexOf('--save') > -1 )
        save = true;

    // Check does install should be saved as dev-dependencies.
    if ( this.opt.indexOf('-sd') > -1 || this.opt.indexOf('--save-dev') > -1 )
        sdev = true;

    /* Install all packages */
    if ( pkglist.length < 1 ) {
        if ( !pkg ) {
            // Skip batch install if no project package.json defined.
            return this.help(`${colr.red('No package.json found for batch install!')}`);
        }

        // Get dependencies and dev-dependencies.
        var dep = pkg.dependencies,
            dev = pkg.devDependencies;

        // If dependencies is defined, add to install list.
        if ( 'object' === typeof dep ) {
            inslist = dep;
        }

        // If dev-dependencies is defined, add to install list.
        if ( 'object' === typeof dev ) {
            loop(dev, function ( name, version ) {
                // Add to install list.
                inslist[ name ] = version;

                // Process to the next package.
                this.next();
            });
        }
    }
    else {
        // Format the given package install list.
        loop(pkglist, function ( pkgdef ) {
            // Get package name and version.
            pkgdef = splitVersion.call(self, pkgdef);

            // Add package name and version to install list.
            inslist[ pkgdef.name ] = pkgdef.version;

            // Next package.
            this.next();
        });
    }

    // Processing each install candidate.
    loop(inslist, function ( name, version ) {
        /* Check does package is exist */
        var mod    = core.get.call(self, name, version, nolog),
            result = undefined;

        // If pacakge is not installed, or forced to install.
        if ( !mod || forc ) {
            // If installer is marked as updater, skip updater if pacakge not installed.
            if ( update ) {
                console.log(`Package ${colr.greenBright(name)}@${colr.yellow(version)} is not installed.`);
                console.log(`Use ${colr.bold('npm-bridge install')} to install that package.`);
            }

            // Start installer if not marked as updater.
            else {
                // Install with adding current project as dependent if package.json is defined.
                if ( pkg ) {
                    result = core.ins.call(self, name, version, {
                        path    : cwd,
                        name    : pkg.name,
                        version : pkg.version
                    }, forc);
                }

                // Just install the package if no package.json defined.
                else {
                    result = core.ins.call(self, name, version, null, forc);
                }
            }
        }

        // If package is installed.
        else {
            // Skip installer if already have the latest version.
            if ( mod.version === mod.latest ) {
                console.log(`Package ${colr.greenBright(name)}@${colr.yellow(version)} is installed with version ${colr.yellow(mod.version)}, and the latest version.`);

                if ( pkg ) {
                    // Add current project to package dependent if package.json is defined.
                    core.add.call(self, {
                        name    : name,
                        version : mod.version
                    }, {
                        name    : pkg.name,
                        version : pkg.version,
                        path    : cwd
                    }, forc);
                }

                // Skip installer.
                return this.next();
            }

            // Continue installer if not the latest version.
            else {
                // If installer marked as updater, install the new version.
                if ( update ) {
                    if ( pkg ) {
                        // If package.json is defined, install with adding current project as package dependent.
                        result = core.ins.call(self, name, mod.latest, {
                            path    : cwd,
                            name    : pkg.name,
                            version : pkg.version
                        }, forc);
                    }
                    else {
                        // If no package.json defined, just install the package.
                        result = core.ins.call(this, name, mod.latest, null, forc);
                    }
                }

                // Skip installer is new version available, but installer not marked as updater.
                else {
                    console.log(`Package ${colr.greenBright(name)}@${colr.yellow(version)} is installed with version ${colr.yellow(mod.version)}, but we found new version ${colr.green(mod.latest)}`);
                    console.log(`Use ${colr.bold('npm-bridge update')} to update the package.`);

                    // Skip install.
                    return this.next();
                }
            }
        }

        // Save updated dependency info if marked to save, and package.json is defined.
        if ( save && pkg ) {
            // Create new dependencies holder if not exist.
            if ( !pkg.dependencies ) pkg.dependencies = {};

            // Add installed package to dependencies holder.
            pkg.dependencies[ name ] = `^${result.version}`;

            // Save the package.json to file.
            file.writeJsonSync(path.resolve(cwd, 'package.json'), pkg);
        }

        // Save updated dev-dependency info if marked to save, and package.json is defined.
        if ( sdev && pkg ) {
            // Create new dev-dependencies holder if not exist.
            if ( !pkg.devDependencies ) pkg.devDependencies = {};

            // Add installed package to dev-dependencies holder.
            pkg.devDependencies[ name ] = `^${result.version}`;

            // Save the package.json to file.
            file.writeJsonSync(path.resolve(cwd, 'package.json'), pkg);
        }

        /* Process the next package */
        this.next();
    });
}

/* Package Remover */
function Remove ( pkglist, nolog ) {
    // Wrapping self object.
    var self = this, pkg = this.pkg, inslist = {};

    // Creating temporary configs.
    var forc, auto, save, sdev;

    // Check does process should be forced.
    if ( this.opt.indexOf('-f') > -1 || this.opt.indexOf('--force') > -1 )
        forc = true;

    // Check does removal shoud be saved as dependencies.
    if ( this.opt.indexOf('-s') > -1 || this.opt.indexOf('--save') > -1 )
        save = true;

    // Check does removal should be saved as dev-dependencies.
    if ( this.opt.indexOf('-sd') > -1 || this.opt.indexOf('--save-dev') > -1 )
        sdev = true;

    // Check does removal should autoremove dependencies.
    // auto also used as space to separate log level.
    if ( this.opt.indexOf('-a') > -1 || this.opt.indexOf('--auto') > -1 )
        auto = '';

    // If pacakge list length < 1, then mark as batch removal.
    if ( pkglist.length < 1 ) {
        // Proceed only if package.json is defined.
        if ( pkg ) {
            // Remove dependencies if found on package.json
            if ( pkg.dependencies ) {
                console.log(`Removing dependencies...`);

                loop(pkg.dependencies, function ( name, version ) {
                    // Get package info from registry.
                    var mod = core.get.call(self, name, version, true, true);

                    // If package exist, remove it.
                    if ( mod ) {
                        core.rem.call(self, name, mod.version, auto, forc);
                    }

                    // If not exist, skip and tell user.
                    else {
                        console.log(`Package ${name}@${version} not installed. No package removed!`);
                    }

                    // Remove package from package.json dependencies if marked to save.
                    if ( save ) delete pkg.dependencies[ name ];

                    // Next pacakge.
                    this.next();
                });
            }

            // Removing dev-dependencies if found on package.json
            if ( pkg.devDependencies ) {
                console.log(`Removing dev dependencies...`);

                loop(pkg.devDependencies, function ( name, version ) {
                    // Get package infos from registry.
                    var mod = core.get.call(self, name, version, true, true);

                    // If package exist, remove it.
                    if ( mod ) {
                        core.rem.call(self, name, mod.version, auto, forc);
                    }

                    // If not exist, skip and tell user.
                    else {
                        console.log(`Package ${name}@${version} not installed. No package removed!`);
                    }

                    // Remove package from package.json dev-dependencies.
                    if ( sdev ) delete pkg.devDependencies[ name ];

                    this.next();
                });
            }

            // Save package.json to file.
            file.writeJsonSync(path.resolve(cwd, 'package.json'), pkg);
        }

        // If no package.json defined, skip batch removal.
        else {
            return self.help(`${colr.red('Can not find package.json for batch removal. No packages removed!')}`);
        }
    }

    // If package list length more than 0, then mark as specific packages removal.
    else {
        // If package list is only contains one name, and the name is all, then mark as super batch removal.
        // This process will remove all installed global packages.
        if ( pkglist.length === 1 && pkglist[ 0 ] === 'all' ) {
            // Iterate pacakge names.
            loop(core.reg.packages, function ( name, versions ) {
                // Iterate package versions.
                loop(versions, function ( vern, defs ) {
                    // Remove the pacakge version.
                    core.rem(name, vern, auto, forc);

                    this.next();
                });

                this.next();
            });
        }

        // If more than 1, then mark as specific removal.
        else {
            // Iterate each packages and find the package from registry.
            loop(pkglist, function ( name ) {
                var cdp = name.split('@'),
                    cdn = cdp[ 0 ];

                // Remove specific version if defined.
                if ( cdp.length > 1 ) {
                    // Get package info from registry.
                    var mod = core.get.call(self, cdn, cdp[ 1 ], true, true);

                    // If exist, remove it.
                    if ( mod ) {
                        core.rem.call(self, cdn, mod.version, auto, forc);
                    }

                    // If not exit, skip and tell the user.
                    else {
                        console.log(`Can not remove ${name} or package is not installed.`);
                    }
                }

                // Remove all version if no version defined.
                else {
                    core.rem.call(self, cdn, null, auto, forc);
                }

                // Remove from package.json dependencies if marked to save, and package.json is defined.
                if ( save && pkg && pkg.dependencies[ name ] ) {
                    delete pkg.dependencies[ name ];

                    // Save updated package.json to file.
                    file.writeJsonSync(path.resolve(cwd, 'package.json'), pkg);
                }

                // Remove from package.json dev-dependencies if marked to save, and package.json is defined.
                if ( sdev && pkg && pkg.devDependencies[ name ] ) {
                    delete pkg.devDependencies[ name ];

                    // Save updated package.json to file.
                    file.writeJsonSync(path.resolve(cwd, 'package.json'), pkg);
                }

                this.next();
            });
        }
    }
}

/* Package Listing */
function List ( pkglist, nolog ) {
    var self = this, pkg = this.pkg;

    // Get registry
    var regs = core.reg, vers, max = 0, list = {}, satisfy;

    // Check for installed packages from package.json.
    if ( self.opt.indexOf('--satisfy') > -1 ) satisfy = true;

    // Listing satisfied packages for current project.
    if ( satisfy ) {
        if ( pkglist.length < 1 ) {
            if ( pkg && pkg.dependencies ) {
                loop(pkg.dependencies, function ( name, version ) {
                    var mod = core.get.call(self, name, version, true, true);

                    if ( mod ) {
                        list[ name ]                = {};
                        list[ name ][ mod.version ] = {};
                    }
                    else {
                        console.log(`${colr.redBright('Unsatisfied Dependencies     ')}: Package ${colr.greenBright(name)}@${colr.yellow(version)} is not installed.`);
                    }

                    this.next();
                });
            }

            if ( pkg && pkg.devDependencies ) {
                loop(pkg.devDependencies, function ( name, version ) {
                    var mod = core.get.call(self, name, version, true, true);

                    if ( mod ) {
                        list[ name ]                = {};
                        list[ name ][ mod.version ] = {};
                    }
                    else {
                        console.log(`${colr.redBright('Unsatisfied Dev Dependencies ')}: Package ${colr.greenBright(name)}@${colr.yellow(version)} is not installed.`);
                    }

                    this.next();
                });
            }
        }
    }

    // Listing global packages.
    else {
        // Add all packages name to the lsit if package list is less than 1.
        if ( pkglist.length < 1 ) {
            loop(Object.keys(regs.packages).sort(), function ( name ) {
                list[ name ] = regs.packages[ name ];

                this.next();
            });
        }

        // Add specific packages if package list is more than 0.
        else {
            loop(pkglist.sort(), function ( name ) {
                if ( name in regs.packages ) {
                    list[ name ] = regs.packages[ name ];
                }

                this.next();
            });
        }
    }

    // Get the longest name length to make column.
    loop(list, function ( name ) {
        if ( name.length > max ) max = name.length;

        this.next();
    });

    // Print packages on the list including the versions.
    console.log('');
    loop(list, function ( name, versions ) {
        vers = `[ v${Object.keys(versions).sort().join(' ] - [ v')} ]`;

        console.log(`↳ ${colr.green(name)} ${makespace(max - name.length)}-- ${colr.yellow(vers)}`);

        this.next();
    });

    console.log(`\r\nFound ${colr.green(Object.keys(list).length)} packages installed.`);
}

/* Package Linker */
function Link ( pkglist ) {
    var self = this, pkg = this.pkg, save, sdev;

    // Skip if no package.json found on the project scope.
    if ( !pkg ) return self.help(`Can not find package.json to create links.`);

    // Check does linked packages need to be saved as dependencies on pacakge.json
    if ( self.opt.indexOf('-s') > -1 || self.opt.indexOf('--save') > -1 )
        save = true;

    // Check does linked packages need to be saved as dev-dependencies on pacakge.json
    if ( self.opt.indexOf('-sd') > -1 || self.opt.indexOf('--save-dev') > -1 )
        sdev = true;

    // Set path to pacakge list.
    pkg.path = cwd;

    // If package list less than 1, mark as batch link.
    if ( pkglist.length < 1 ) {
        core.sym.call(self, pkg, false, function ( name, version ) {
            console.log(`Created package link: ${colr.greenBright(name)}@${colr.yellow(version)}`);
        });

        // Register current project as packages dependent from dependencies.
        if ( pkg.dependencies ) {
            loop(pkg.dependencies, function ( dname, dvers ) {
                // Get package infos from registry.
                var mod = core.get.call(self, dname, dvers, true, true);

                if ( mod ) {
                    core.add.call(self, {
                        name    : dname,
                        version : mod.version
                    }, {
                        name    : pkg.name,
                        version : pkg.version,
                        path    : cwd
                    });
                }

                this.next();
            });
        }

        // Register current project as package dependent from dev-dependencies.
        if ( pkg.devDependencies ) {
            loop(pkg.devDependencies, function ( dname, dvers ) {
                var mod = core.get.call(self, dname, dvers, true, true);

                if ( mod ) {
                    core.add.call(self, {
                        name    : dname,
                        version : mod.version
                    }, {
                        name    : pkg.name,
                        version : pkg.version,
                        path    : cwd
                    });
                }

                this.next();
            });
        }
    }

    // If package list more than 0, mark as specific link.
    else {
        // Create linking list.
        var pkgo = {
            path : cwd, dependencies : {}
        }

        loop(pkglist, function ( name ) {
            pkgo.dependencies[ name.split('@')[ 0 ] ] = name.split('@')[ 1 ] || '*';

            this.next();
        });

        core.sym.call(self, pkgo, false, function ( nm, vr ) {
            console.log(`Created package link: ${colr.greenBright(nm)}@${colr.yellow(vr)}`);
        });

        // Register as dependent.
        loop(pkgo.dependencies, function ( dname, dvers ) {
            var mod = core.get.call(self, dname, dvers, true, true);

            if ( mod ) {
                core.add.call(self, {
                    name    : dname,
                    version : mod.version
                }, {
                    name    : pkg.name,
                    version : pkg.version,
                    path    : cwd
                });
            }
            else {
                console.log(`Not Found: Package ${colr.greenBright(dname)}@${colr.yellow(dvers)} is not installed.`);
            }

            this.next();
        });
    }
}

// Link Remover.
function Unlink ( arg ) {
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
            var upd = core.get(name, ver, true);

            if ( upd.version !== upd.latest ) {
                /* Re-check the installed versions */
                var rpd = core.get(name, `^${upd.latest}`, true, true);

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

            var dpkg = core.get(name, version, true, true);

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

// Package version getter
function splitVersion ( name ) {
    if ( !'string' === typeof name ) throw new Error('Package name should be a string.');

    // Split the name and version.
    name = name.split('@');

    // Create name and version.
    var cname = name[ 0 ], cvers;

    // Take version from splitted name if exist
    if ( name[ 1 ] ) {
        cvers = name[ 1 ];
    }

    // If not exist, try to look from 'package.json'.
    else {
        // Try to find version from dependencies.
        if ( this.pkg && this.pkg.dependencies && this.pkg.dependencies[ cname ] ) {
            cvers = this.pkg.dependencies[ cname ]
        }

        // Try to find version from dev-dependencies.
        else if ( this.pkg && this.pkg.devDependencies && this.pkg.devDependencies[ cname ] ) {
            cvers = this.pkg.devDependencies[ cname ]

        }

        // Replace with latest if not version found in both given name and package.json
        else {
            cvers = 'latest';
        }
    }

    return {
        name    : cname,
        version : cvers
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