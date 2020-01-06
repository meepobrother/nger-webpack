import { Injectable, isDevMode, InjectionToken, Injector, MAIN_PATH, PLATFORM_NAME } from '@nger/core'
import webpack, {
    Configuration, Compiler, Stats,
    WatchOptions, HotModuleReplacementPlugin,
    DefinePlugin, ProgressPlugin, WatchIgnorePlugin
} from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import Dotenv from 'dotenv-webpack'
import { dirname, join, relative } from 'path'
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
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
    root: string;
    dist: string;
    constructor(private injector: Injector) {
        this.options = this.injector.get(WEBPACK_CONFIGURATION, {})
        this.watchOptions = this.injector.get(WEBPACK_WATCHOPTIONS, {})
        this.options.mode = isDevMode() ? 'development' : 'production';
        const mainFile = this.injector.get<string>(MAIN_PATH);
        const dist = join(dirname(mainFile), '.publish')
        this.root = dirname(dist);
        const temp = join(dirname(mainFile), '.temp');
        ensureDirSync(temp)
        const tempMain = join(temp, 'main.ts');
        const hotFile = relative(temp, mainFile).replace('.ts', '')
        writeFileSync(join(temp, 'main.ts'), `
require('${hotFile}');
if ((module as any).hot) {
    (module as any).hot.accept('${hotFile}', () => {
        require('${hotFile}');
    });
}`)
        const entry = [];
        if (isDevMode()) {
            entry.push(`webpack/hot/poll?1000`)
            entry.push(`@babel/polyfill`)
            entry.push(tempMain)
        } else {
            entry.push(`@babel/polyfill`)
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
            setImmediate: true,
            fs: true
        }
        this.options.stats = this.options.stats || 'errors-warnings';
        this.options.name = this.injector.get<string>(PLATFORM_NAME)
        this.options.output = {
            path: dist,
            filename: `bin.js`,
            chunkFilename: `[name].chunk.js`,
            libraryTarget: 'commonjs2',
        }
        // this.options.cache = {
        //     type: 'filesystem'
        // }
        this.options.module = {
            rules: [
                {
                    test: /\.(txt|md|loc|png|jpg|jpeg|svg|gif|xml)$/,
                    use: [{
                        loader: 'file-loader',
                        options: {
                            name: `assets/[name].[ext]`,
                        }
                    }]
                },
                {
                    test: /\.m?js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env', {
                                "targets": {
                                    "node": "current"
                                }
                            }],
                            plugins: [
                                '@babel/plugin-transform-runtime',
                                '@babel/plugin-syntax-dynamic-import',
                                '@babel/plugin-proposal-object-rest-spread',
                                '@babel/plugin-transform-arrow-functions',
                                '@babel/plugin-transform-modules-commonjs',
                                "@babel/plugin-transform-async-to-generator",
                                '@babel/plugin-proposal-async-generator-functions',
                                '@babel/plugin-proposal-export-default-from'
                            ]
                        }
                    }
                }, {
                    test: /\.tsx?$/,
                    use: [{
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true
                        }
                    }]
                }, {
                    test: /\.node$/,
                    use: 'node-loader'
                }]
        }
        this.options.plugins = [];
        if (isDevMode()) {
            this.options.plugins.push(
                new HotModuleReplacementPlugin()
            )
            this.options.plugins.push(
                new BundleAnalyzerPlugin()
            )
        }
        this.options.plugins.push(
            new DefinePlugin({})
        )
        this.options.plugins.push(
            new Dotenv({
                path: getFile(this.root, '.env')
            })
        )
        this.options.plugins.push(
            new ProgressPlugin()
        )
        this.options.plugins.push(
            new WatchIgnorePlugin([/\.js$/, /\.d\.ts$/])
        )
        this.options.optimization = {
            noEmitOnErrors: true,
            nodeEnv: false,
            minimize: false,
            moduleIds: 'hashed',
            chunkIds: 'named'
        }
        const configFile = getFile(this.root, 'tsconfig.json')
        this.options.resolve = {
            extensions: ['.js', '.json', '.node', '.mjs', '.ts', '.tsx'],
            mainFields: ["main"],
            plugins: [
                new TsconfigPathsPlugin({
                    configFile
                })
            ]
        }
        this.options.externals = [];
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
        console.log({
            execPath
        })
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
}


function getFile(dir: string, name: string): string {
    const dist = join(dir, name)
    const pkg = join(dir, 'package.json')
    if (existsSync(dist) || existsSync(pkg)) {
        return dist;
    }
    return getFile(join(dir, '..'), name)
}