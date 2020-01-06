import { corePlatform, MAIN_PATH, Module } from '@nger/core'
import { Demo } from './demo'
@Module({
    providers: [
        Demo
    ]
})
export class AppModule { }
corePlatform([{
    provide: MAIN_PATH,
    useValue: __filename
}]).bootstrapModule(AppModule).then(res => {
    const demo = res.get(Demo)
    demo.log();
    console.log(`app module `)
});
