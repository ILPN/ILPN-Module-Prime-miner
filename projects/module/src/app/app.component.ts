import {Component} from '@angular/core';
import {APP_BASE_HREF} from '@angular/common';
import {
    AbelOracleService, AlphaOracleService, DropFile, FD_LOG,
    LogToPartialOrderTransformerService, PetriNet, Trace, XesLogParserService
} from 'ilpn-components';
import {FormControl} from '@angular/forms';
import {Observable, of} from 'rxjs';

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

    constructor(private _logParser: XesLogParserService,
                private _αbelOracle: AbelOracleService,
                private _alphaOracle: AlphaOracleService,
                private _logTransformer: LogToPartialOrderTransformerService) {
        this.fcOracle = new FormControl('alpha');
        this.fcAlphaLookAheadDistance = new FormControl('1');
        this.fcAlphaCleanLog = new FormControl(true);
        this.fcAlphaDistinguishSameEvents = new FormControl(false);
        this.fcAlphaStartStop = new FormControl(false);
        this.fcAlphaRemovePrefixes = new FormControl(true);
    }

    public processLogUpload(files: Array<DropFile>) {
        this.log = this._logParser.parse(files[0].content);
        this.convertLogToPOs().subscribe(pos => {
            console.debug(pos);
        });
    }

    private convertLogToPOs(): Observable<Array<PetriNet>> {
        if (this.fcOracle.value === 'alpha') {
            const concurrency = this._alphaOracle.determineConcurrency(this.log!, {
                distinguishSameLabels: this.fcAlphaDistinguishSameEvents.value,
                lookAheadDistance: this.fcAlphaLookAheadDistance.value === '*' ? Number.POSITIVE_INFINITY : Number.parseInt(this.fcAlphaLookAheadDistance.value),
            });
            const pos = this._logTransformer.transformToPartialOrders(this.log!, concurrency, {
                cleanLog: this.fcAlphaCleanLog.value,
                discardPrefixes: this.fcAlphaRemovePrefixes.value,
                addStartStopEvent: this.fcAlphaStartStop.value
            });
            return of(pos);
        } else {
            // αbel
            return this._αbelOracle.determineConcurrency(this.log!);
        }
    }
}
