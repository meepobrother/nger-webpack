import { Injectable, isDevMode, InjectionToken, Injector, MAIN_PATH, PLATFORM_NAME } from '@nger/core'
import webpack, { Configuration, Compiler, Stats, WatchOptions, HotModuleReplacementPlugin } from 'webpack';
import { dirname, join, relative } from 'path'
export const WEBPACK_CONFIGURATION = new InjectionToken<Configuration>(`WEBPACK_CONFIGURATION`)
export const WEBPACK_WATCHOPTIONS = new InjectionToken<WatchOptions>(`WEBPACK_WATCHOPTIONS`)
import { readdirSync, ensureDirSync, writeFileSync } from 'fs-extra';
const rmdir = require('rmdir');
@Injectable()
export class WebpackService {
    compiler: Compiler;
    options: Configuration;
    watchOptions: WatchOptions;
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
        this.options.entry = [
            'webpack/hot/poll?1000',
            tempMain
        ];
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
        rmdir(dist);
        this.options.output = {
            path: dist,
            filename: `bin.js`
        }
        this.options.module = {
            rules: [{
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }, {
                test: /\.json$/,
                loader: 'json-loader'
            }]
        }
        this.options.plugins = [
            new HotModuleReplacementPlugin()
        ];
        this.options.resolve = {
            extensions: ['.ts', '.js', '.json']
        }
        // this.options.externals = this.getExternals();
        this.compiler = webpack(this.options)
    }

    run() {
        this.compiler.run((err: Error, stats: Stats) => {
            this.handler(err, stats)
        });
    }

    watch() {
        this.compiler.watch(this.watchOptions, (err: Error, stats: Stats) => {
            this.handler(err, stats)
        });
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
        console.info(`build success`)
    }

    private getExternals() {
        const nodeModules = {};
        readdirSync('node_modules')
            .filter((x) => {
                return ['.bin'].indexOf(x) === -1;
            })
            .forEach((mod) => {
                Reflect.set(nodeModules, mod, 'commonjs ${mod}')
            });
        return nodeModules;
    }
}

