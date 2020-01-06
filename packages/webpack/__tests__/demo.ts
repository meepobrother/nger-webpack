import { Injectable } from '@nger/core';
import { readFileSync } from 'fs-extra';
import { join } from 'path'
@Injectable()
export class Demo {
    log() {
        const meepoLoc = readFileSync(join(__dirname, 'meepo.loc')).toString('utf8')
        console.log(`hello demo`)
        console.log(`hello xiao ming`)
    }
}
