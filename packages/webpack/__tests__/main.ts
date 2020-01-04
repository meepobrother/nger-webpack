import { corePlatform, MAIN_PATH, Module } from '@nger/core'
@Module({
    providers: []
})
export class AppModule { }
corePlatform([{
    provide: MAIN_PATH,
    useValue: __filename
}]).bootstrapModule(AppModule).then(res => {
    console.log(`hello12333`)
})
