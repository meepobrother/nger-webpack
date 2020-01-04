import { Injectable, Injector } from '@nger/core';

@Injectable()
export class Demo {
    log() {
        console.log(`hello demo`)
        console.log(`hello xiao ming`)
    }
}
