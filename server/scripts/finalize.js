'use strict';
const path = require('path');
const fs = require('fs-extra');

const appDirectory = fs.realpathSync(process.cwd());
const resolve = relativePath => path.resolve(appDirectory, relativePath);

const finalize = (buildDir, outputDir) => {
    fs.mkdir(path.resolve(outputDir, "server/config"));
    fs.mkdir(path.resolve(outputDir, "server/data"));
    fs.copySync(resolve("client/build"), path.resolve(outputDir, "client"), { dereference: true });
    fs.copyFileSync(resolve("server/config/keys.json"), path.resolve(outputDir, "server/config/keys.json"));
    fs.copySync(resolve("server/data"), path.resolve(outputDir, "server/data"));
    fs.copyFileSync(resolve("server/start.bat"), path.resolve(buildDir, "start.bat"));
};

module.exports = {
    finalize
};