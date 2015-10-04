"use strict";

var assert = require('assert'),
    bridge = require('../lib/lib-bridge');

var tmpscope = bridge.resolve('../tmp');
var usrscope = bridge.resolve(tmpscope, 'usr');
var sysscope = bridge.resolve(tmpscope, 'sys');

var util = bridge.util;

util.file.ensureDirSync(usrscope);
util.file.ensureDirSync(sysscope);

// Cleanup test dir.
bridge.rmdir([ bridge.resolve(usrscope, '.node-bridge'), bridge.resolve(sysscope, 'node-bridge') ]);

//var test = new bridge(usrscope, sysscope);

// Main Bridge Test.
describe('Bridge [ class ]', function () {
    /* Link Bin Test */
    describe('\r\n    ' + bridge.colorize([ 'yellow', 'static' ], [ 'green', 'linkbin()' ], [ 'cyan', 'Create executable file for package binary.' ]), function () {

        it('Should throw error if no argument defined.', function ( done ) {
            try {
                bridge.linkbin();
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error for invalid argument type.', function ( done ) {
            try {
                bridge.linkbin('foo');
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error if first argument is object, but do not contains valid properties.', function ( done ) {
            try {
                bridge.linkbin({
                    foo : '',
                    bar : ''
                });
            }
            catch ( err ) {
                done();
            }
        });
        it('Should create executable file.', function ( done ) {
            bridge.linkbin({
                name    : 'semver',
                version : '^2.1.0',
                bin     : {
                    semver : './bin/semver',
                    versem : './bin/versem'
                }
            }, bridge.resolve(usrscope, 'bin'));

            done();
        });
        it('Should remove executable file.', function ( done ) {
            bridge.linkbin({
                name    : 'semver',
                version : '^2.1.0',
                bin     : {
                    semver : './bin/semver',
                    versem : './bin/versem'
                }
            }, bridge.resolve(usrscope, 'bin'), true);

            done();

            bridge.rmdir(bridge.resolve(usrscope, 'bin'));
        });
    });

    /* Link Dir Test */
    describe('\r\n    ' + bridge.colorize([ 'yellow', 'static' ], [ 'green', 'linkdir()' ], [ 'cyan', 'Create symlink for file/dir.' ]), function () {
        // Create new file and folder for removal test.
        util.file.ensureDirSync(bridge.resolve(tmpscope, 'lndtest1'));
        util.file.ensureDirSync(bridge.resolve(tmpscope, 'lndtest2'));
        util.file.ensureFileSync(bridge.resolve(tmpscope, 'lndtest1.json'));
        util.file.ensureFileSync(bridge.resolve(tmpscope, 'lndtest2.json'));

        it('Should throw error if no argument defined.', function ( done ) {
            try {
                bridge.linkdir();
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error for invalid argument type.', function ( done ) {
            try {
                bridge.linkdir([]);
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error for multiple link but with invalid path.', function ( done ) {
            try {
                bridge.linkdir({ c : {}, d : null });
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error if source file/dir not exist.', function ( done ) {
            try {
                bridge.linkdir(bridge.resolve(tmpscope, 'nullex'), bridge.resolve(tmpscope, 'etarget'));
            }
            catch ( err ) {
                done();
            }
        });
        it('Should link directory.', function ( done ) {
            bridge.linkdir(bridge.resolve(tmpscope, 'lndtest1'), bridge.resolve(tmpscope, 'lndget1'));
            done();
        });
        it('Should link file.', function ( done ) {
            bridge.linkdir(bridge.resolve(tmpscope, 'lndtest1.json'), bridge.resolve(tmpscope, 'lndget1.json'));
            done();
        });
        it('Shoud link multiple directory.', function ( done ) {
            let obj = {};

            obj[ bridge.resolve(tmpscope, 'lndtest1') ] = bridge.resolve(tmpscope, 'lndml1');
            obj[ bridge.resolve(tmpscope, 'lndtest2') ] = bridge.resolve(tmpscope, 'lndml2');

            bridge.linkdir(obj);

            done();
        });
        it('Shoud link multiple file.', function ( done ) {
            let obj = {};

            obj[ bridge.resolve(tmpscope, 'lndtest1.json') ] = bridge.resolve(tmpscope, 'lndml1.json');
            obj[ bridge.resolve(tmpscope, 'lndtest2.json') ] = bridge.resolve(tmpscope, 'lndml2.json');

            bridge.linkdir(obj);

            done();

            // Cleanup files and dirs for last test.
            bridge.rmdir(bridge.resolve(tmpscope, 'lnd*'));
        });
    });

    /* Remove File/Folder Test */
    describe('\r\n    ' + bridge.colorize([ 'yellow', 'static' ], [ 'green', 'cpdir()' ], [ 'cyan', 'Copy file/directory.' ]), function () {
        // Create new file and folder for removal test.
        util.file.ensureDirSync(bridge.resolve(tmpscope, 'cptest1'));
        util.file.ensureDirSync(bridge.resolve(tmpscope, 'cptest2'));
        util.file.ensureFileSync(bridge.resolve(tmpscope, 'cptest1.json'));
        util.file.ensureFileSync(bridge.resolve(tmpscope, 'cptest2.json'));

        it('Should throw error if no argument defined.', function ( done ) {
            try {
                bridge.cpdir();
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error for invalid argument type.', function ( done ) {
            try {
                bridge.cpdir([]);
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error for multiple copy but with invalid path.', function ( done ) {
            try {
                bridge.cpdir({ c : {}, d : null });
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error if source file/dir not exist.', function ( done ) {
            try {
                bridge.cpdir(bridge.resolve(tmpscope, 'nullex'), bridge.resolve(tmpscope, 'etarget'));
            }
            catch ( err ) {
                done();
            }
        });
        it('Should copy directory.', function ( done ) {
            bridge.cpdir(bridge.resolve(tmpscope, 'cptest1'), bridge.resolve(tmpscope, 'cpget1'));
            done();
        });
        it('Should copy file.', function ( done ) {
            bridge.cpdir(bridge.resolve(tmpscope, 'cptest1.json'), bridge.resolve(tmpscope, 'cpget1.json'));
            done();
        });
        it('Shoud copy multiple directory.', function ( done ) {
            let obj = {};

            obj[ bridge.resolve(tmpscope, 'cptest1') ] = bridge.resolve(tmpscope, 'cpml1');
            obj[ bridge.resolve(tmpscope, 'cptest2') ] = bridge.resolve(tmpscope, 'cpml2');

            bridge.cpdir(obj);

            done();
        });
        it('Shoud copy multiple file.', function ( done ) {
            let obj = {};

            obj[ bridge.resolve(tmpscope, 'cptest1.json') ] = bridge.resolve(tmpscope, 'cpml1.json');
            obj[ bridge.resolve(tmpscope, 'cptest2.json') ] = bridge.resolve(tmpscope, 'cpml2.json');

            bridge.cpdir(obj);

            done();

            // Cleanup files and dirs for last test.
            bridge.rmdir(bridge.resolve(tmpscope, 'cp*'));
        });
    });

    /* Remove File/Folder Test */
    describe('\r\n    ' + bridge.colorize([ 'yellow', 'static' ], [ 'green', 'rmdir()' ], [ 'cyan', 'Remove file/directory.' ]), function () {
        // Create new file and folder for removal test.
        util.file.ensureDirSync(bridge.resolve(tmpscope, 'rmtest'));
        util.file.ensureDirSync(bridge.resolve(tmpscope, 'rmtest1'));
        util.file.ensureDirSync(bridge.resolve(tmpscope, 'rmtest2'));
        util.file.ensureFileSync(bridge.resolve(tmpscope, 'rmtest.json'));
        util.file.ensureFileSync(bridge.resolve(tmpscope, 'rmtest1.json'));
        util.file.ensureFileSync(bridge.resolve(tmpscope, 'rmtest2.json'));

        it('Should throw error if no argument defined.', function ( done ) {
            try {
                bridge.rmdir();
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error for invalid argument type.', function ( done ) {
            try {
                bridge.rmdir({});
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error for multiple remove but with invalid path.', function ( done ) {
            try {
                bridge.rmdir([ 20, {} ]);
            }
            catch ( err ) {
                done();
            }
        });
        it('Should remove directory.', function ( done ) {
            bridge.rmdir(bridge.resolve(tmpscope, 'rmtest'));

            try {
                let stat = util.file.statSync(bridge.resolve(tmpscope, 'rmtest'));
            }
            catch ( err ) {
                done();
            }
        });
        it('Should remove file.', function ( done ) {
            bridge.rmdir(bridge.resolve(tmpscope, 'rmtest.json'));

            try {
                let stat = util.file.statSync(bridge.resolve(tmpscope, 'rmtest.json'));
            }
            catch ( err ) {
                done();
            }
        });
        it('Should remove multiple directory.', function ( done ) {
            bridge.rmdir([ bridge.resolve(tmpscope, 'rmtest1'), bridge.resolve(tmpscope, 'rmtest2') ]);

            try {
                let stat = util.file.statSync(bridge.resolve(tmpscope, 'rmtest1'));
            }
            catch ( err ) {
                try {
                    let stat = util.file.statSync(bridge.resolve(tmpscope, 'rmtest2'));
                }
                catch ( err ) {
                    done();
                }
            }
        });
        it('Should remove multiple file.', function ( done ) {
            bridge.rmdir([ bridge.resolve(tmpscope, 'rmtest1.json'), bridge.resolve(tmpscope, 'rmtest2.json') ]);

            try {
                let stat = util.file.statSync(bridge.resolve(tmpscope, 'rmtest1.json'));
            }
            catch ( err ) {
                try {
                    let stat = util.file.statSync(bridge.resolve(tmpscope, 'rmtest2.json'));
                }
                catch ( err ) {
                    done();
                }
            }
        });
    });

    /* Version Matcher Test */
    describe('\r\n    ' + bridge.colorize([ 'yellow', 'static' ], [ 'green', 'matchvr()' ], [ 'cyan', 'Match the satisfied version from registry.' ]), function () {
        it('Should throw an error if no arguments defined.', function ( done ) {
            try {
                bridge.matchvr();
            }
            catch ( err ) {
                done();
            }
        });

        it('Should throw an error if the given arguments is invalid type.', function ( done ) {
            try {
                bridge.matchvr(20, [], '');
            }
            catch ( err ) {
                done();
            }
        });

        it('Request native-js@v^1.0.0 should return 1.3.0 from { native-js [ 1.0.0, 1.3.0, 2.3.1 ] }.', function ( done ) {
            var ver = bridge.matchvr('native-js', '^1.0.0', {
                'native-js' : {
                    '1.0.0' : {},
                    '1.3.0' : {},
                    '2.3.1' : {}
                }
            });

            if ( ver === '1.3.0' ) {
                done();
            }
        });

        it('Request native-js@v^3.5.0 should return nothing from { native-js [ 1.0.0, 1.3.0, 2.3.1 ] }.', function ( done ) {
            var ver = bridge.matchvr('native-js', '^3.5.0', {
                'native-js' : {
                    '1.0.0' : {},
                    '1.3.0' : {},
                    '2.3.1' : {}
                }
            });

            if ( !ver ) {
                done();
            }
        });
    });

    /* Version Splitter Test */
    describe('\r\n    ' + bridge.colorize([ 'yellow', 'static' ], [ 'green', 'splitvr()' ], [ 'cyan', 'Split package name to { name, version }' ]), function () {
        it('Should throw an error if no name given.', function ( done ) {
            try {
                bridge.splitvr();
            }
            catch ( err ) {
                done();
            }
        });

        it('Should return { name: "native-js", version: "^1.3.0" } from native-js@^1.3.0', function ( done ) {
            var res = bridge.splitvr('native-js@^1.3.0');

            if (
                res.name === 'native-js' &&
                res.version === '^1.3.0'
            ) {
                done();
            }
        });

        it('Should return { name: "native-js", version: "^1.3.0" } from package.json, from native-js', function ( done ) {
            var res = bridge.splitvr('native-js', {
                dependencies : {
                    'native-js' : '^1.3.0'
                }
            });

            if (
                res.name === 'native-js' &&
                res.version === '^1.3.0'
            ) {
                done();
            }
        });
    });

    /* Spawn Tester */
    describe('\r\n    ' + bridge.colorize([ 'yellow', 'static' ], [ 'green', 'spawn()' ], [ 'cyan', 'Run node apps using spawnSync.' ]), function () {
        it('Should throw error when no argument given.', function ( done ) {
            try {
                bridge.spawn();
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error when first argument is not string or array.', function ( done ) {
            try {
                bridge.spawn({});
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error when first argument is string but second argument not array', function ( done ) {
            try {
                bridge.spawn('mocha', '--version');
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error when first argument is array, but the items contains non object type.', function ( done ) {
            try {
                bridge.spawn([ { cmd : 'mocha', args : [ '--version' ] }, 'foo' ]);
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error when command failed.', function ( done ) {
            try {
                bridge.spawn('foo', [ '--v' ]);
            }
            catch ( err ) {
                done();
            }
        });
        it('Should return string as result for valid command.', function ( done ) {
            let rsl = bridge.spawn('mocha', [ '--version' ]);

            if ( 'string' === typeof rsl ) {
                done();
            }
        });
    });

    /* Coloring Test */
    describe('\r\n    ' + bridge.colorize([ 'yellow', 'static' ], [ 'green', 'colorize()' ], [ 'cyan', 'Coloring single or multiple string for CLI purpose.' ]), function () {
        it('Should throw error when the given argument for single coloring is invalid type.', function ( done ) {
            try {
                bridge.colorize(true, {});
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error when the given argument for multiple coloring contains invalid type.', function ( done ) {
            try {
                bridge.colorize([ 'blue', 'Lorem' ], 'foo', [ 'bar' ]);
            }
            catch ( err ) {
                done();
            }
        });
        it('Should throw error when the requested color varian is not exist.', function ( done ) {
            try {
                bridge.colorize('orange', 'foo');
            }
            catch ( err ) {
                done();
            }
        });
        it('Should return green bright colored string.', function ( done ) {
            done();
            console.log('\t' + bridge.colorize('greenBright', 'Lorem ipsum dolor sit amet.'));
        });

        it('Should return multiple colored string.', function ( done ) {
            done();
            console.log('\t' + bridge.colorize([ 'red', 'Red colored string' ], [ 'cyan', 'followed by' ], [ 'yellow', 'yellow string.' ]));
        });
    });
});