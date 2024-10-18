/* ---------------------------------------------------------------------------------- *\
|                                                                                      |
|  Copyright (c) 2021, NVIDIA CORPORATION. All rights reserved.                        |
|                                                                                      |
|  The contents of this file are licensed under the Eclipse Public License 2.0.        |
|  The full terms of the license are available at https://eclipse.org/legal/epl-2.0/   |
|                                                                                      |
|  SPDX-License-Identifier: EPL-2.0                                                    |
|                                                                                      |
\* ---------------------------------------------------------------------------------- */

//@ts-check

'use strict';

// The following configuration is from https://aka.ms/vscode-bundle-extension

const path = require('path');
const glob = require('glob');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

    entry: glob.sync('./src/**/*.ts').reduce((acc, filePath) => {
        const entry = filePath.replace(/^\.\/src\//, '').replace(/\.ts$/, '');
        acc[entry] = filePath;
        return acc;
    }, {}), // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
        // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    },
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js'],
        modules: [
            path.resolve(__dirname, 'node_modules'), // Resolve from the main project's node_modules first
            'node_modules' // Fallback to the default node_modules resolution
        ]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.json'
                        }
                    }
                ]
            },
            {
                test: /\.node$/,
                loader: 'node-loader'
            },
            {
                test: /\.js$/,
                enforce: 'pre',
                use: ['source-map-loader'], // Enable source map processing for external dependencies
                include: [
                    path.resolve(__dirname, '../cdt-gdb-adapter-0.0.19/dist')  // Include the external project's dist folder
                ]
            }
        ]
    }
};
module.exports = config;
