/* DEV NOTES: Use "$this" to wrap "this", and use "$this$" to wrap "super" */

'use strict';

// Creating Message Constants.
const ERR_ARGUMENT = 'ERARG: Undefined required arguments or invalid argument type.';
const ERR_CPFAILED = 'ERCOP: Copy file/dir failed!';
const ERR_RMFAILED = 'ERREM: Remove file/dir failed!';
const ERR_SMFAILED = 'ERSYM: Symlink file/dir failed!';
const ERR_LBFAILED = 'ERBIN: Symlink binary failed!';
const ERR_UPFAILED = 'ERUPD: Checking update failed!';

// Get required modules.
var file = require('fs-extra'),
    path = require('path'),
    exec = require('child_process'),
    does = require('assert'),
    oses = require('os'),
    colr = require('cli-color'),
    usev = require('semver').satisfies,

    loop = require('./util-looper'),
    coms = require('./util-cli');

/* Creating Shortcuts */
var $path      = path.resolve,

    // Ensure file and folder.
    _ensurefle = file.ensureFileSync,
    _ensuredir = file.ensureDirSync,
    _ensuresym = file.ensureSymlinkSync,

    // Write file and json.
    _writefile = file.writeFileSync,
    _writejson = file.writeJsonSync,

    // Read file and json.
    _readfile  = file.readFileSync,
    _readjson  = file.readJsonSync,

    // Remove file and folder.
    _remfndir  = file.removeSync,
    _copyfdir  = file.copySync,

    // Spawner.
    $exec      = exec.spawnSync,

    $logs      = console.log,
    $exit      = process.exit;

/* Creating Color Shortcuts */
var _blue = colr.blueBright,
    _yell = colr.yellow,
    _reds = colr.redBright,
    _bold = colr.bold,
    _magn = colr.magenta,
    _gren = colr.greenBright;

// Public CLI object.
var cli = new coms.Parser();

/**
 * Bridge Class
 * Bridge class represent the Node Bridge Registry, including related scope and methods.
 *
 * Scope (user and system) is the root directory where the packages will be installed to and loaded from.
 * User scope allow non root/administrator to install packages, but installed packages will not available globally.
 * System scope allow users to install pacakges and makes it available globally, but requires root/admin permission.
 */
class Bridge {
    /**
     * Bridge Constructor.
     * 1. Get and bind the CLI Arguents.
     * 2. Define the user and system scope path by checking the OS type.
     * 3. Create user and sytem scope object that helds paths data and registry data for each scope.
     * 4. Initializing bridged scope.
     *
     * @param usrscope [string] String path as user scope root directory.
     * @param sysscope [string] String path as system scope root directory.
     * @returns {Bridge}
     */
    constructor ( usrscope, sysscope ) {
        var $this = this;

        // Binding CLI Arguments.
        loop(cli, function ( name, value ) {
            $this[ name ] = value;

            this.next();
        });

        // Getting user scope path and command extension, depend on platform.
        if ( $this.osp === 'windows' ) {
            $this.uwd = $path(usrscope || oses.homedir(), 'appdata/roaming/node-bridge');
            $this.swd = $path(sysscope || '/program-files', 'node-bridge');
            $this.ext = '.cmd';
        }
        else {
            $this.uwd = $path(usrscope || oses.homedir(), '.node-bridge');
            $this.swd = $path(sysscope || '/usr/local', 'node-bridge');
            $this.ext = '';
        }

        // Create user scope object.
        $this.usr = {
            cwd : $this.uwd,                     // Bridge root directory location.
            pwd : $path($this.uwd, 'reg.json'),  // Registry file location.
            mwd : $path($this.uwd, 'lib'),       // Modules directory location.
            bwd : $path($this.uwd, 'bin'),       // Binary directory location.
            twd : $path($this.uwd, 'tmp'),       // Temp directory location.
            reg : {}
        };

        // Create user scope object.
        $this.sys = {
            cwd : $this.swd,                     // Bridge root directory location.
            pwd : $path($this.swd, 'reg.json'),  // Registry file location.
            mwd : $path($this.swd, 'lib'),       // Modules directory location.
            bwd : $path($this.swd, 'bin'),       // Binary directory location.
            twd : $path($this.swd, 'tmp'),       // Temp directory location.
            reg : {}
        };

        // Start initialization.
        $this.init('usr');
        $this.init('sys');
    }

    /**
     * Bridge Initializer.
     * 1. Ensure root scope directory is exist.
     * 2. Ensure registry data is exist.
     *
     * @param scope
     * @returns {Bridge}
     */
    init ( scope ) {
        var $this = this;

        if ( !scope || !scope in $this ) scope = 'usr';

        // Ensure bridge directory and files is exist.
        try {
            // Getting file stat of scope cwd.
            var stat = file.statSync($this[ scope ].cwd);

            if ( !stat.isDirectory() ) {
                // If stat success but the file stat is not a directory, (re)do pre-init.
                $this._init(scope);
            }
        }
        catch ( err ) {
            // If getting stat failed (uninitialized), do pre-init.
            $this._init(scope);
        }

        try {
            // Getting registry info, or create new if not exist.
            var reg = require($this[ scope ].pwd);

            // Use returned registry info if defined.
            $this[ scope ].reg = reg;
        }
        catch ( err ) {
            // Create new registry object.
            $this[ scope ].reg = {
                initreqs : {},
                pacakges : {},
            }

            // Save the registry file.
            $this.write(scope);
        }

        return $this;
    }

    /**
     * Pre initializer:
     * 1. Create directory and files for the defined scope (usr or sys).
     * 2. Grant access to scope root directory.
     *
     * @param scope
     * @returns {Bridge}
     */
    _init ( scope ) {
        var $this = this;

        try {
            // Create files and folders if not exist.
            _ensuredir($this[ scope ].cwd);       // Root directory.
            _ensurefle($this[ scope ].pwd);       // Registry object.
            _ensuredir($this[ scope ].mwd);       // Module directory.
            _ensuredir($this[ scope ].bwd);       // Bin directory.
            _ensuredir($this[ scope ].twd);       // Tmp directory.
        }
        catch ( err ) {
            $logs(`${_reds('EACCES: Permission denied!')}`);
            $logs('For first time use, you need to run as root to grant access.');
            $logs('If you are a windows user, you need to always run npm-bridge as administrator.');
            $exit();
        }

        // Try to grant persmission for node-bridge path and childrens.
        try {
            if ( $this.osp === 'windows' ) {
                $exec('icacls', [ $this[ scope ].cwd, '/T', '/inheritance:e', '/grant', 'everyone:F' ]);
            }
            else {
                $exec('chmod', [ '-R', '7777', $this[ scope ].cwd ]);
            }
        }
        catch ( err ) {
            if ( self.optis('debg') ) $logs(_reds(err.message));
            throw err;
        }

        return $this;
    }

    // User scope package finder.
    usrfind ( name, version, check ) {
        var $this = this, mod;

        mod = self.getpkg(name, version, $this.usr.reg);

        if ( !mod && self.optis('debg') )
            return $logs(`Package ${version}@${version} is not installed on "${scope}" scope.`);

        if ( check ) {
            mod.latest = self.getupd(name, version, $this.usr);
        }

        return self.transpkg(mod);
    }

    // System scope pacakge finder.
    sysfind ( name, version, check ) {
        var $this = this, pkg;

        // Get pkg info from registry.
        pkg = self.getpkg(name, version, $this.sys.reg);

        if ( !pkg && self.optis('debg') )
            return $logs(`Package ${version}@${version} is not installed on "${scope}" scope.`);

        if ( check ) {
            pkg.latest = self.getupd(name, version, $this.sys);
        }

        return self.transpkg(name, version, pkg);
    }

    // Registry wirter.
    write () {
        var $this = this;

        try {
            // Write user registry to file.
            _writejson($this.usr.pwd, $this.usr.reg);
        }
        catch ( err ) {
            // Log and throw error when error happended.
            if ( self.optis('debg') ) $logs(_reds(err.message));
            return err;
        }

        try {
            // Write system registry to file.
            _writejson($this.sys.pwd, $this.sys.reg);
        }
        catch ( err ) {
            // Log and throw error when error happended.
            if ( self.optis('debg') ) $logs(_reds(err.message));
            return err;
        }
    }

    /**
     * Create Detailed Package Information from Registry.
     *
     * @param name
     * @param version
     * @param mod
     * @returns {{tag: *, bin: (*|Array|json.bin|{hello}|example_json.bin|{example}), name: *, path: *, latest: *, version: *, dependents: (*|dependents|{}), localusers: (*|localusers|{}), dependencies: *}}
     */
    static transpkg ( name, version, mod ) {
        // Return the package info as result.
        return {
            tag          : version,
            bin          : mod.bin || {},
            name         : name,
            path         : mod.path,
            latest       : mod.latest,
            version      : mod.version,
            dependents   : mod.dependents,
            localusers   : mod.localusers,
            dependencies : mod.dependencies,
        }
    }

    static getpkg ( name, version, scope ) {
        var $this = this;

        // Check does requested version is installed.
        var insver = matchvr(name, version, scope);

        if ( insver ) {
            return scope[ name ][ insver ];
        }
    }

    // Update checker.
    static getupd ( name, scope ) {
        if ( 'string' === typeof name && 'object' === typeof scope ) {
            try {
                // Check for updates by getting package info via npm.
                let pkg = self.spawn('npm', [ 'info', name ], scope.twd);

                // Convert NPM result to object.
                eval('pkg = ' + pkg);

                // Return the new version.
                return pkg.version;
            }
            catch ( err ) {
                if ( self.optis('debg') ) $logs(ERR_UPFAILED);
                throw err;
            }
        }
        else {
            throw new Error(ERR_ARGUMENT);
        }
    }

    /* Creating Utilities */

    /**
     * Check CLI Argument Options.
     *
     * @param opt
     * @returns {boolean}
     */
    static optis ( opt ) {
        // Creates option shortcut.
        var option = {
            save : [ '--save', '-s' ],
            sdev : [ '--save-dev', '-sd' ],
            sbin : [ '--bin', '-b' ],
            forc : [ '--force', '-f' ],
            glob : [ '--global', '-g' ],

            debg : [ '--verbose' ],
            fine : [ '--satisfy' ],
            verb : [ '--verbose' ],
        }

        // Ensure requested option shortcut is exist.
        if ( !opt in option ) return false;

        // Check does one of the option is available on "this.opt" to return as tru.
        for ( var i = 0, l = option[ opt ].length; i < l; ++i ) {
            if ( cli.opt.indexOf(option[ opt ][ i ]) > -1 ) return true;
        }

        return false;
    }

    // Match the satisfied version.
    /**
     * Match satisfied version from registry.
     *
     * @param name
     * @param version
     * @param scope
     * @returns {*}
     */
    static matchvr ( name, version, scope ) {
        if ( 'string' !== typeof name || 'string' !== typeof version || 'object' !== typeof scope )
            throw new Error('Package name and version must be a string, and scope should be registry object.');

        // Create the used version holder.
        var used;

        // Ensure package name exist on the scope.
        if ( name in scope ) {
            // Iterate each versions to match with requested version.
            loop(scope[ name ], function ( iver ) {
                // If satisfied, use as used version.
                if ( usev(iver, version) ) used = iver;

                this.next();
            });
        }

        // Return the used version. Undefined result is meant to not installed.
        return used;
    }

    /**
     * Name and Version splitter.
     * Split name@version format to get package name and version pattern.
     *
     * 1. Single name will use "*" as version.
     *    some-module => { name: 'some-module', version: '*' }
     * 2. Single name will find version on package info if given.
     *    some-module => { name: 'some-module', version: '^1.0.0' }
     * 3. Full name will use the its version.
     *    some-module@^1.0.0    => { name: 'some-module', version: '^1.0.0' }
     *
     * @param name  (required) Pakcage name (with/without version)
     * @param pkg   [optional] Package info (from package.json)
     * @returns {{name: *, version: *}}
     */
    static splitvr ( name, pkg ) {
        if ( 'string' !== typeof name )
            throw new Error('Package name must be a string.');

        // Split name with @ to get module name and version.
        name = name.split('@');

        // Create new name and version.
        var cname = name[ 0 ], cvers = name[ 1 ];

        // If version not found on specified name, try check from package.json if defined.
        if ( !cvers ) {
            if ( pkg ) {
                // Look from pacakge dependencies.
                if ( pkg.dependencies && pkg.dependencies[ name ] ) {
                    cvers = pkg.dependencies[ name ];
                }

                // Look from pacakge dev-dependencies.
                else if ( pkg.devDependencies && pkg.devDependencies[ name ] ) {
                    cvers = pkg.devDependencies[ name ];
                }

                // Use * if not found at all.
                else {
                    cvers = '*';
                }
            }

            // Use * if not found, and no package.json defined.
            else {
                cvers = '*';
            }
        }

        // Return the splitted name and version.
        return {
            name    : cname,
            version : cvers
        }
    }

    /**
     * Copy Directory/Files
     * This static method using file.copySync() from fs-extra.
     *
     * 1. Giving (string) src and (string) des will use single copy.
     * 2. Giving (object) src will use multiple copy.
     *
     * @param src    (string/object)  - Source Path/path list.
     * @param des    (string/object)  - Destination Path/scope.
     * @returns {*}  Undefined for success, error object if some error happened.
     */
    static cpdir ( src, des ) {
        if ( 'string' === typeof src && 'string' === typeof des ) {
            try {
                _copyfdir(src, des);
            }
            catch ( err ) {
                if ( self.optis('debg') ) $logs(ERR_CPFAILED);

                throw err;
            }
        }
        else if ( 'object' === typeof src && !Array.isArray(src) ) {
            var err;

            loop(src, function ( left, right ) {
                if ( 'string' === typeof right ) {
                    err = self.cpdir(left, right, des);

                    if ( !err ) this.next();
                }
                else {
                    throw new Error(ERR_ARGUMENT);
                }
            });

            return err;
        }
        else {
            throw new Error(ERR_ARGUMENT);
        }
    }

    /**
     * Remove Directory/Files
     * This static method using file.removeSync() from fs-extra.
     *
     * @param dirs  - (string/array) - Paths to remove.
     * @returns {*} - Undefined for success, error object if some error happened.
     */
    static rmdir ( dirs ) {
        if ( 'string' === typeof dirs ) {
            try {
                _remfndir(dirs);
            }
            catch ( err ) {
                if ( self.optis('debg') ) $logs(ERR_RMFAILED);

                throw err;
            }
        }
        else if ( Array.isArray(dirs) ) {
            var err;

            loop(dirs, function ( dir ) {
                if ( 'string' === typeof dir ) {
                    err = self.rmdir(dir);

                    if ( !err ) this.next();
                }
                else {
                    throw new Error(ERR_ARGUMENT);
                }
            });

            return err;
        }
        else {
            throw new Error(ERR_ARGUMENT);
        }
    }

    /**
     * Directory Linker
     * This static method using file.ensureSymlinkSync from fs-extra.
     *
     * @param src
     * @param des
     * @returns {*} - Undefined for success, error object if some error happened.
     */
    static linkdir ( src, des ) {
        if ( 'string' === typeof src && 'string' === typeof des ) {
            try {
                if ( cli.osp === 'windows' ) {
                    let stat = file.statSync(src);

                    if ( stat.isFile() ) {
                        _ensuresym(src, des, 'file');
                    }
                    else if ( stat.isDirectory() ) {
                        _ensuresym(src, des, 'dir');
                    }
                }
                else {
                    _ensuresym(src, des);
                }
            }
            catch ( err ) {
                if ( self.optis('debg') ) $logs(ERR_SMFAILED);

                throw err;
            }
        }
        else if ( 'object' === typeof src && !Array.isArray(src) ) {
            loop(src, function ( left, right ) {
                if ( 'string' === typeof right ) {
                    self.linkdir(left, right);

                    this.next();
                }
                else {
                    throw new Error(ERR_ARGUMENT);
                }
            });
        }
        else {
            throw new Error(ERR_ARGUMENT);
        }
    }

    /**
     * Create executable file for packages binary.
     *
     * 1. Create file that contains small script to call the required binary.
     * 2. Create multiple files to call the required binary on windows platform.
     *
     * @param pkg (object/array) Pacakge information or array package list.
     * @param des [string] Destination path, or remove mark if pkg is array.
     * @param rem [string] Remove mark if pkg is object.
     */
    static linkbin ( pkg, des, rem ) {
        if ( 'object' === typeof pkg && !Array.isArray(pkg) && 'string' === typeof des ) {
            if ( 'name' in pkg && 'version' in pkg && 'bin' in pkg ) {
                try {
                    loop(pkg.bin, function ( name, binpath ) {
                        let despath = $path(des, name);

                        if ( rem ) {
                            self.rmdir(despath);
                            self.rmdir(`${despath}.jsb`);
                            self.rmdir(`${despath}.cmd`);
                        }
                        else {
                            let bin = _readfile($path(__dirname, '../tpl/bin-jsb'), 'utf8');

                            bin = bin
                                .replace(new RegExp('%%BRIDGEPATH%%'), $path(__dirname, '../index.js'))
                                .replace(new RegExp('%%NAME%%'), pkg.name)
                                .replace(new RegExp('%%VERSION%%'), pkg.version)
                                .replace(new RegExp('%%BINPATH%%'), binpath);

                            if ( cli.osp === 'windows' ) {
                                let cmd = _readfile($path(__dirname, '../tpl/bin-cmd'), 'utf8'),
                                    jse = _readfile($path(__dirname, '../tpl/bin-jse'), 'utf8');

                                cmd = cmd.replace(new RegExp('%%BINPATH%%', 'g'), `${despath}.jsb`);
                                jse = jse.replace(new RegExp('%%BINPATH%%', 'g'), `${despath}.jsb`);

                                _ensurefle(`${despath}.jsb`);
                                _writefile(`${despath}.jsb`, bin);

                                _writefile(`${despath}.cmd`, cmd);
                                _writefile(despath, jse);
                            }
                            else {
                                _ensurefle(despath);
                                _writefile(despath, bin);

                                self.spawn('chmod', [ '+x', name ], des);
                            }
                        }

                        this.next();
                    });
                }
                catch ( err ) {
                    if ( self.optis('debg') ) $logs(ERR_LBFAILED);

                    throw err;
                }
            }
            else {
                throw new Error(ERR_ARGUMENT);
            }
        }
        else if ( Array.isArray(pkg) ) {
            loop(pkg, function ( opkg ) {
                if ( 'pkg' in opkg && 'object' === typeof opkg.pkg && 'des' in opkg && 'string' === typeof opkg.des ) {
                    self.linkbin(opkg.pkg, opkg.des, des);
                }
                else {
                    throw new Error(ERR_ARGUMENT);
                }
            });
        }
        else {
            throw new Error(ERR_ARGUMENT);
        }
    }

    /**
     * Node App Runner
     * Automatically run executable node apps using child_process.spawnSync().
     *
     * 1. On unix platform, just spawn command as is.
     * 2. On windows platform, add ".cmd" to command name.
     * 3. Convert stdout result to string if single command success, and return object { status, error } if error.
     * 4. Return undefined if multiple command success, and return object { status, error } if error, and break the loop.
     *
     * @param cmd
     * @param args
     * @param cwd
     * @returns {*}
     */
    static spawn ( cmd, args, cwd ) {
        var result;

        if ( 'string' === typeof cmd && Array.isArray(args) ) {
            if ( 'string' !== typeof cwd ) cwd = process.cwd();

            try {
                if ( cli.osp === 'windows' ) {
                    result = $exec(`${cmd}.cmd`, args, { cwd : cwd });
                }
                else {
                    result = $exec(cmd, args, { cwd : cwd });
                }

                // Error Handling
                if ( result.status ) throw new Error(result.stderr.toString());
                if ( result.error ) throw result.error;

                return result.stdout.toString();
            }
            catch ( err ) {
                if ( self.optis('debg') ) $logs('Error: bridge.spawn() failed!');

                throw err;
            }
        }
        else if ( Array.isArray(cmd) ) {
            loop(cmd, function ( cmdo ) {
                if ( 'object' === typeof cmdo && 'cmd' in cmdo && 'string' === typeof cmdo.cmd && 'args' in cmdo && Array.isArray(cmdo.args) ) {
                    self.spawn(cmdo.cmd, cmdo.args, cwd);

                    this.next();
                }
                else {
                    throw new Error(ERR_ARGUMENT);
                }
            });

            return result;
        }
        else {
            throw new Error(ERR_ARGUMENT);
        }
    }

    /**
     * Create colorized string.
     *
     * @param color (string/array) Color name or array contains object { color, value }
     * @param value [string] String to be colored.
     * @returns {*} Colored string.
     */
    static colorize ( color, value ) {
        if ( 'string' === typeof color && 'string' === typeof value ) {
            if ( color in colr ) {
                return colr[ color ](value);
            }
            else {
                throw new Error('The given color varian is invalid.');
            }
        }
        else if ( Array.isArray(color) ) {
            var result = '';

            loop(arguments, function ( i, obj ) {
                if ( !Array.isArray(obj) || obj.length < 2 ) {
                    throw new Error('Each argument for multiple coloring should be array, and the array length should be 2.');
                }

                result += self.colorize(obj[ 0 ], obj[ 1 ]) + ' ';

                this.next();
            });

            return result.replace(/\s$/, '');
        }
        else {
            throw new Error('Color variant is required, should be string or array. Value is required when color is string.');
        }
    }

    /**
     * Bridge Utility.
     * @returns {{file: (fse|exports|module.exports), path: (posix|exports|module.exports), exec: (exports|module.exports), loop: (*|exports|module.exports), ccli: (*|exports|module.exports)}}
     */
    static get util () {
        return {
            does : does,
            file : file,
            path : path,
            exec : exec,
            loop : loop,
            ccli : coms
        }
    }

    // path.resolve() wrapper.
    static get resolve () {
        return $path;
    }
}

// Wrap class a $this for static uses.
var self = Bridge;

// Exporting class.
module.exports = Bridge;