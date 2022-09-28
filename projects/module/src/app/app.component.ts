import {Component} from '@angular/core';
import {
    AlgorithmResult,
    AlphaOracleService,
    DropFile,
    FD_LOG,
    LogToPartialOrderTransformerService,
    PetriNet,
    TimestampOracleService,
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

    public log: Array<Trace> | undefined;
    public resultFiles: Array<DropFile> = [];
    public processing = false;

    constructor(private _logParser: XesLogParserService,
                private _alphaOracle: AlphaOracleService,
                private _timestampOracle: TimestampOracleService,
                private _logTransformer: LogToPartialOrderTransformerService,
                private _primeMiner: PrimeMinerService,
                private _netSerializer: PetriNetSerialisationService) {
        this.fcOracle = new FormControl('none');
    }

    public processLogUpload(files: Array<DropFile>) {
        this.processing = true;
        this.resultFiles = [];

        const algorithmProtocol = new AlgorithmResult("prime miner");
        let totalTraces = 0;

        this.log = this._logParser.parse(files[0].content);
        console.debug(this.log);
        this.convertLogToPOs().subscribe(r => {
            const pos = r.pos;
            const cleanLog = r.log;

            pos.sort((a, b) => (b?.frequency ?? 0) - (a?.frequency ?? 0));

            let i = 1;
            for (const po of pos) {
                const f = po.frequency ?? 0;
                totalTraces += f;
                algorithmProtocol.addOutputLine(`PO ${i} - ${f} trace${f !== 1 ? 's' : ''}`);
                i++;
            }

            console.debug(pos);
            this._primeMiner.mine(pos, cleanLog, {
                oneBoundRegions: true,
                noOutputPlaces: false
            }).subscribe({
                next: (result: PrimeMinerResult) => {
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

    private convertLogToPOs(): Observable<{ pos: Array<PetriNet>, log: Array<Trace> }> {
        let concurrency;
        if (this.fcOracle.value === 'alpha' || this.fcOracle.value === 'none') {
            concurrency = this._alphaOracle.determineConcurrency(this.log!, {
                lookAheadDistance: this.fcOracle.value === 'none' ? 0 : 1,
            });
        } else {
            // timestamp
            concurrency = this._timestampOracle.determineConcurrency(this.log!);
        }
        const [pos, log] = this._logTransformer.transformToPartialOrders(this.log!, concurrency, {
            cleanLog: true,
            discardPrefixes: true,
            addStartStopEvent: false
        });
        return of({pos, log});
    }

    private formatModelReplayabilityReport(model: PrimeMinerResult, modelIndex: number, totalTraceCount: number, pos: Array<PetriNet>): string {
        let replayableTraceCount = 0;
        model.supportedPoIndices.forEach((i: number) => {
            replayableTraceCount += pos[i - 1].frequency ?? 0;
        })

        let report = `Model ${modelIndex}`;
        if (totalTraceCount > 0) {
            report += ` - can replay ${(replayableTraceCount / totalTraceCount * 100).toFixed(2)}% of traces`;
        }
        report += ` - POs ${model.supportedPoIndices.join(', ')}`;

        return report;
    }
}
