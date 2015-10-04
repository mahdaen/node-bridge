"use strict";

var Bridge = require('./lib-bridge');

/* Package Installer Class */
class Installer extends Bridge {
    // Installer
    install ( pkgs, scope ) {

    }

    // Pre-Install
    _install ( pkg, scope ) {

    }

    // Post Install
    install_ ( pkg, scope ) {

    }

    // Register
    register ( pkg, scope ) {

    }

    /**
     * NPM Install
     * Run NPM install to install package and its dependencies.
     *
     * @param name      - Package Name
     * @param version   - Package Version
     * @param scope     - The Bridge Object.
     */
    static npminstall ( name, version, scope ) {

    }
}

module.exports = Installer;
