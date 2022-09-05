import {Component} from '@angular/core';
import {
    AbelOracleService,
    AlgorithmResult,
    AlphaOracleService,
    DropFile,
    FD_LOG,
    LogToPartialOrderTransformerService,
    PetriNet,
    Trace,
    XesLogParserService,
    PrimeMinerResult,
    PrimeMinerService,
    FD_PETRI_NET,
    PetriNetSerialisationService
} from 'ilpn-components';
import {FormControl} from '@angular/forms';
import {Observable, of} from 'rxjs';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {

    public fdLog = FD_LOG;
    public fdPn = FD_PETRI_NET;

    public fcOracle: FormControl;
    public fcAlphaLookAheadDistance: FormControl;
    public fcAlphaCleanLog: FormControl;
    public fcAlphaDistinguishSameEvents: FormControl;
    public fcAlphaStartStop: FormControl;
    public fcAlphaRemovePrefixes: FormControl;

    public fcOneBound: FormControl;
    public fcEmptyRegions: FormControl;

    public log: Array<Trace> | undefined;
    public resultFiles: Array<DropFile> = [];
    public processing = false;

    constructor(private _logParser: XesLogParserService,
                private _αbelOracle: AbelOracleService,
                private _alphaOracle: AlphaOracleService,
                private _logTransformer: LogToPartialOrderTransformerService,
                private _primeMiner: PrimeMinerService,
                private _netSerializer: PetriNetSerialisationService) {
        this.fcOracle = new FormControl('alpha');
        this.fcAlphaLookAheadDistance = new FormControl('1');
        this.fcAlphaCleanLog = new FormControl(true);
        this.fcAlphaDistinguishSameEvents = new FormControl(false);
        this.fcAlphaStartStop = new FormControl(false);
        this.fcAlphaRemovePrefixes = new FormControl(true);

        this.fcOneBound = new FormControl(false);
        this.fcEmptyRegions = new FormControl(false);
    }

    public processLogUpload(files: Array<DropFile>) {
        this.processing = true;
        this.resultFiles = [];

        const algorithmProtocol = new AlgorithmResult("prime miner");
        let totalTraces = 0;

        this.log = this._logParser.parse(files[0].content);
        console.debug(this.log);
        this.convertLogToPOs().subscribe(pos => {
            pos.sort((a, b) => (b?.frequency ?? 0) - (a?.frequency ?? 0));

            let i = 1;
            for (const po of pos) {
                const f = po.frequency ?? 0;
                totalTraces += f;
                algorithmProtocol.addOutputLine(`PO ${i} - ${f} trace${f !== 1 ? 's' : ''}`);
                i++;
            }

            console.debug(pos);
            this._primeMiner.mine(pos, {
                oneBoundRegions: this.fcOneBound.value,
                noOutputPlaces: this.fcEmptyRegions.value
            }).subscribe({
                next: result => {
                    const i = this.resultFiles.length + 1;
                    algorithmProtocol.addOutputLine(this.formatModelReplayabilityReport(result, i, totalTraces, pos));
                    console.debug(result);
                    this.resultFiles.push(new DropFile(`model_${i}.pn`, this._netSerializer.serialise(result.net)));
                },
                complete: () => {
                    this.resultFiles.unshift(new DropFile(`report.txt`, algorithmProtocol.serialise()));
                    this.processing = false;
                    console.debug('done');
                }
            });
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

    private formatModelReplayabilityReport(model: PrimeMinerResult, modelIndex: number, totalTraceCount: number, pos: Array<PetriNet>): string {
        let replayableTraceCount = 0;
        model.supportedPoIndices.forEach(i => {
            replayableTraceCount += pos[i - 1].frequency ?? 0;
        })

        let report = `Model ${modelIndex}`;
        if (totalTraceCount > 0) {
            report += ` ${(replayableTraceCount/totalTraceCount * 100).toFixed(2)}% of traces`;
        }
        report += ` POs ${model.supportedPoIndices.join(', ')}`;

        return report;
    }
}
