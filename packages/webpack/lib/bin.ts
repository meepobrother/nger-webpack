#!/usr/bin/env node
import { corePlatform, MAIN_PATH } from '@nger/core';
import { WebpackModule } from '../lib/webpack.module';
import { WebpackService } from '../lib/webpack.service';
import { join } from 'path';
import program from 'commander';
const pkg = require('../package.json')
const colors = require('colors');
const root = process.cwd();
program
    .version(pkg.version)
    .command(`build [source]`)
    .description(`build a project`)
    .option('-w, --watch', 'watch the file change')
    .action((source, command) => {
        corePlatform([{
            provide: MAIN_PATH,
            useValue: join(root, source || 'main.ts')
        }]).bootstrapModule(WebpackModule).then(res => {
            const webpack = res.get(WebpackService)
            if (command.watch) {
                webpack.watch();
            } else {
                webpack.run();
            }
        })
    });


program.parse(process.argv);


if (!process.argv.slice(2).length) {
    program.outputHelp(make_red);
}

function make_red(txt: string) {
    return colors.red(txt); //display the help text in red on the console
}