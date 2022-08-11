import {Component} from '@angular/core';
import {APP_BASE_HREF} from '@angular/common';
import {DropFile, FD_LOG, Trace, XesLogParserService} from 'ilpn-components';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    providers: [
        // TODO base href
        {provide: APP_BASE_HREF, useValue: '/ilovepetrinets/'}
    ]
})
export class AppComponent {

    public fdLog = FD_LOG;

    private _log: Array<Trace> | undefined;

    constructor(private _logParser: XesLogParserService) {
    }

    public processLogUpload(files: Array<DropFile>) {
        this._log = this._logParser.parse(files[0].content);
    }
}
