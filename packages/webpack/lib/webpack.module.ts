import { Module } from '@nger/core';
import { WebpackService } from './webpack.service';
@Module({
    providers: [
        WebpackService
    ]
})
export class WebpackModule { }
