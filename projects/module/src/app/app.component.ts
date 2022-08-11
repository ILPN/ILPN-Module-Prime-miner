import {Component} from '@angular/core';
import {APP_BASE_HREF} from '@angular/common';
import {DropFile, FD_LOG, Trace, XesLogParserService} from 'ilpn-components';
import {FormControl} from '@angular/forms';

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

    public fcOracle: FormControl;
    public fcAlphaLookAheadDistance: FormControl;
    public fcAlphaCleanLog: FormControl;
    public fcAlphaDistinguishSameEvents: FormControl;
    public fcAlphaStartStop: FormControl;
    public fcAlphaRemovePrefixes: FormControl;

    public log: Array<Trace> | undefined;

    constructor(private _logParser: XesLogParserService) {
        this.fcOracle = new FormControl('alpha');
        this.fcAlphaLookAheadDistance = new FormControl('1');
        this.fcAlphaCleanLog = new FormControl(true);
        this.fcAlphaDistinguishSameEvents = new FormControl(false);
        this.fcAlphaStartStop = new FormControl(false);
        this.fcAlphaRemovePrefixes = new FormControl(true);
    }

    public processLogUpload(files: Array<DropFile>) {
        this.log = this._logParser.parse(files[0].content);
    }
}
