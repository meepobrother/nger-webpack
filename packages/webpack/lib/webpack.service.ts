import { Injectable, isDevMode, InjectionToken, Injector, MAIN_PATH, PLATFORM_NAME } from '@nger/core'
import webpack, { Configuration, Compiler, Stats, WatchOptions, HotModuleReplacementPlugin } from 'webpack';
import { dirname, join, relative } from 'path'
export const WEBPACK_CONFIGURATION = new InjectionToken<Configuration>(`WEBPACK_CONFIGURATION`)
export const WEBPACK_WATCHOPTIONS = new InjectionToken<WatchOptions>(`WEBPACK_WATCHOPTIONS`)
import { readdirSync, ensureDirSync, writeFileSync, existsSync } from 'fs-extra';
const rmdir = require('rmdir');
import { exec, ExecException } from 'child_process'
@Injectable()
export class WebpackService {
    compiler: Compiler;
    options: Configuration;
    watchOptions: WatchOptions;
    dist: string;
    constructor(private injector: Injector) {
        this.options = this.injector.get(WEBPACK_CONFIGURATION, {})
        this.watchOptions = this.injector.get(WEBPACK_WATCHOPTIONS, {})
        this.options.mode = isDevMode() ? 'development' : 'production';
        const mainFile = this.injector.get<string>(MAIN_PATH);
        const dist = join(dirname(mainFile), '../publish')
        const temp = join(dirname(mainFile), '.temp');
        ensureDirSync(temp)
        const tempMain = join(temp, 'main.ts');
        const hotFile = relative(temp, mainFile).replace('.ts', '')
        writeFileSync(join(temp, 'main.ts'), `require('${hotFile}');
if ((module as any).hot) {
    (module as any).hot.accept('${hotFile}', () => {
        require('${hotFile}');
    });
}`)
        const entry = [];
        if (isDevMode()) {
            entry.push(`webpack/hot/poll?1000`)
            entry.push(tempMain)
        } else {
            entry.push(mainFile)
        }
        this.options.entry = entry;
        this.options.devtool = isDevMode() ? 'source-map' : false;
        this.options.target = this.options.target || 'node';
        this.options.node = {
            console: true,
            process: true,
            global: true,
            __dirname: true,
            __filename: true,
            Buffer: true,
            setImmediate: true
        }
        this.options.stats = this.options.stats || 'errors-warnings';
        this.options.name = this.injector.get<string>(PLATFORM_NAME)
        this.options.output = {
            path: dist,
            filename: `bin.js`
        }
        this.options.module = {
            rules: [{
                test: /\.js$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'babel-loader',
                    options: {
                        presets: ['es2015', 'stage-3'] //兼容es6，并添加.babelrc
                    }
                }]
            }, {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'ts-loader', options: {
                        transpileOnly: true
                    }
                }]
            }, {
                test: /\.json$/,
                loader: 'json-loader'
            }, {
                test: /\.graphql$/,
                use: [{ loader: 'graphql-import-loader' }]
            }]
        }
        this.options.plugins = [];
        if (isDevMode()) {
            this.options.plugins.push(
                new HotModuleReplacementPlugin()
            )
        }
        this.options.resolve = {
            extensions: ['.ts', '.js', '.json']
        }
        this.options.externals = isDevMode() ? this.getExternals() : [];
        this.compiler = webpack(this.options)
        this.dist = dist;
    }

    run() {
        rmdir(this.dist, () => {
            this.compiler.run((err: Error, stats: Stats) => {
                this.handler(err, stats)
            });
        });
    }

    watch() {
        rmdir(this.dist, () => {
            this.compiler.watch(this.watchOptions, (err: Error, stats: Stats) => {
                this.handler(err, stats)
                this.start();
            });
        })
    }

    started: boolean = false;
    start() {
        if (this.started) return;
        this.started = true;
        const execPath = relative(process.cwd(), join(this.dist, 'bin.js'));
        const child = exec(`node ${execPath}`, {
            cwd: process.cwd()
        }, (error: ExecException | null, stdout: string, stderr: string) => {
            if (error) console.error(error);
            if (stdout) console.info(stdout)
            if (stderr) console.error(stderr)
        });
        child.on('message', () => { })
        if (child.stdout) {
            child.stdout.on('data', (chunk) => {
                console.log(chunk)
            })
        }
    }

    private handler(err: Error, stats: Stats) {
        if (err) console.log(err.message)
        if (stats.hasErrors()) {
            stats.toJson().errors.map(err => {
                console.error(err, '\n')
            })
        }
        if (stats.hasWarnings()) {
            stats.toJson().warnings.map(wa => {
                console.warn(wa, '\n')
            })
        }
    }

    private getNodeModulesPath(dir: string = process.cwd()): string {
        if (existsSync(join(dir, 'node_modules'))) {
            return dir;
        }
        return this.getNodeModulesPath(join(dir, '..'))
    }

    private getExternals() {
        const nodeModules = {};
        readdirSync(this.getNodeModulesPath())
            .filter((x) => {
                return ['.bin'].indexOf(x) === -1;
            })
            .forEach((mod) => {
                Reflect.set(nodeModules, mod, 'commonjs ${mod}')
            });
        return nodeModules;
    }
}

