import type { IChartApi, Time } from 'lightweight-charts';

export class CoordinateTransformer {
    private currentData: number[] = [];
    private currentInterval: string = '1h';

    constructor(private chart: IChartApi | null) { }

    public setChart(chart: IChartApi) {
        this.chart = chart;
    }

    public updateData(data: any[]) {
        // Extract timestamps and ensure they are numbers
        this.currentData = data.map(d => d.time as number).sort((a, b) => a - b);
    }

    public updateLastCandle(candle: any) {
        const time = candle.time as number;
        if (this.currentData.length === 0 || time > this.currentData[this.currentData.length - 1]) {
            this.currentData.push(time);
        } else if (time === this.currentData[this.currentData.length - 1]) {
            // Update existing candle (no change to timestamp list)
        } else {
            this.currentData.push(time);
            this.currentData.sort((a, b) => a - b);
        }
    }

    public setCurrentInterval(interval: string) {
        this.currentInterval = interval;
    }

    public resolveCoordinate(time: number): number | null {
        if (!this.chart) return null;

        // 1. Try direct conversion
        const coordinate = this.chart.timeScale().timeToCoordinate(time as Time);
        if (coordinate !== null) return coordinate;

        // 2. If not found, interpolate using currentData
        if (this.currentData.length < 2) {
            // console.warn('[DrawingService] Not enough data for interpolation');
            return null;
        }

        const lastTime = this.currentData[this.currentData.length - 1];

        // Handle future timestamps (extrapolation)
        if (time > lastTime) {
            const lastIndex = this.currentData.length - 1;
            const interval = this.parseIntervalToSeconds(this.currentInterval);
            const diff = time - lastTime;
            const futureLogical = lastIndex + (diff / interval);
            return this.chart.timeScale().logicalToCoordinate(futureLogical as any);
        }

        // Binary search to find the time range
        let low = 0;
        let high = this.currentData.length - 1;
        let index = -1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.currentData[mid] === time) {
                index = mid;
                break;
            } else if (this.currentData[mid] < time) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        if (index !== -1) {
            const logical = index;
            return this.chart.timeScale().logicalToCoordinate(logical as any);
        }

        // 'high' is now the index of the element smaller than 'time'
        // 'low' is the index of the element larger than 'time'
        if (high < 0 || low >= this.currentData.length) {
            return null;
        }

        const t1 = this.currentData[high];
        const t2 = this.currentData[low];
        const i1 = high;
        const i2 = low;

        const fraction = (time - t1) / (t2 - t1);
        const interpolatedLogical = i1 + (i2 - i1) * fraction;

        return this.chart.timeScale().logicalToCoordinate(interpolatedLogical as any);
    }

    private parseIntervalToSeconds(interval: string): number {
        const unit = interval.slice(-1);
        const value = parseInt(interval.slice(0, -1)) || 1;

        switch (unit) {
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 24 * 60 * 60;
            case 'w': return value * 7 * 24 * 60 * 60;
            case 'M': return value * 30 * 24 * 60 * 60;
            default: return 60;
        }
    }
}
