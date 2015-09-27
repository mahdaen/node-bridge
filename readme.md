## **Node Bridge**
**Node Bridge** is a NodeJS Module and NPM Package dependency management. Node Bridge store the packages in one location, and well versioned.

### **Why?**

Currently NPM installs each project packages on the project dir, which will (for me) consume more space on the disk.
For example, when installing Express 4x I got 40 packages installed (incl dependencies). So when I have 10 express app on my 
system, I need to install 400 packages, whereas I can use the installed packages instead to re-install on each project.

Installing SailsJS will install about 304 packages. So when we have 10 SailsJS apps we'll need to install 3,040 packages (hoo crazy).
That's why unified dependency location is might be useful.

With **Node Bridge** we don't need to re-install each project packages, and we don't need to see **`node_modules`** folder on our projects.
The fact, when we do **`npm-bridge install`** on our project folder, Node Bridge will look through the **`package.json`** dependencies and
check does they're installed or not, including the version number. And we don't need to change anything to makes it works.

Doing **`npm-bridge install`** will install the packages (if neccessary) to the one location, and **`node-bridge app.js`** will start
the app, and the **`require`** is just works. Every packages is loaded from the one locations.

So when will we need to use **Node Bridge**?

- When we don't want to re-install packages for every projects.
- When we don't want to see **`node_modules`** folder anymore.
- When we want to do quick update. Update one package, all projects will updated as well since they're using one dependency.
- When we want to load sub-modules without **`pkgname/node_modules/sub-pkg-name`**
- When ...

Doing **`npm install`** still will allow us to install the packages like usual, likewise the **`node app.js`** will work as usual.

***
### **Tested Apps**

- **ExpressJS** apps. **`node app.js`** works fine (with **`npm-bridge link`**), **`node-bridge app.js`** also works (without **`npm-bridge link`**).
- **SailsJS** apps. **`node app.js`** works fine (with **`npm-bridge link`**), **`node-bridge app.js`** also works (with **`npm-bridge link grunt`**).

***
### **Installing Node Bridge**

To install **Node Bridge**, simply run
```bash
$ npm install -g node-bridge
```

and done! Node Bridge is ready to use.

***
### **Installing Packages**

#### **`npm-bridge install[-i, i] [packages...][options...]`**

**Example**
```bash
// Install all project dependencies.
$ npm-bridge install

// Install specific packages.
$ npm-bridge install express
$ npm-bridge install sails@^0.11.0

// Install and save to project.json
$ npm-bridge install --save singclude@^1.0.0

```

Doing **`npm-bridge install`** will check does the packages is using the latest version. If new updates is available, Node Bridge will inform
you to install those packages.

***
### **Updating Packages**

#### **`npm-bridge update[-u, u] [packages...] [options...]`**

To check updates form installed packages, use **`npm-bridge check-updates`**. Will show the availabe updates.

***
### **Removing Packages**

#### **`npm-bridge remove[-r, rm] [packages...] [options...]`**

To remove all packages, use option `all`. To remove the dependencies as well, use option `--auto`.

**Example**
```bash
// Remove all packages from package.json
$ npm-bridge rm --auto --save

// Remove all packages
$ npm-bridge remove --auto

// Remove specific packages
$ npm-bridge remove express@^4.0.0 singclude --auto --save

// Just remove the package (without removing dependencies)
$ npm-bridge remove express@^4.0.0
```

***
### **Listing Packages**

#### **`npm-bridge list[-l, ls] [packages...]`**

**Example**
```bash
// List all installed packages
$ npm-bridge list

// List specific packages
$ npm-bridge ls express singclude
```

***
### **Linking Installed Packages**

#### **`npm-bridge link[ln] [packages...]`**

**Example**
```bash
// Link all dependencies on package.json
$ npm-bridge link

// Link specific packages
$ npm-bridge ln express@^4.0.0 singclude
```

***
### **Unlinking Installed Packages**

#### **`npm-bridge unlink[rln] [packages...]`**

**Example**
```bash
// Unlink all dependencies on package.json
$ npm-bridge unlink

// Unlink specific packages. Don't use version when unlinking.
$ npm-bridge rln express singclude
```

***
### **Running App**

We must use **`node-bridge [app]`** instead **`node [app]`** to run applications, and makes the **`require`** works.

If we want to run the app as background process, we need to have **`PM2`** installed globally.

**Example**
```
// Simply run app
$ node-bridge app.js

// Run with arguments
$ node-bridge app.js --port=8000 --host=localhost --verbose

// Run as daemon
$ node-bridge --daemon app.js --port=8932

// Stop daemon
$ node-bridge stop
```

#### **Notes**

* **Node Bridge** requires NodeJS v4x (or ES6) to works.
* Be carefull when removing packages, since some packages also using that.
* **Node Bridge** still need more work (e.g: performance). So use with your own risk if you want to use the module.