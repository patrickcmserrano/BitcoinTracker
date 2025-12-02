import type { DrawingState, DrawingLine, DrawingMode } from './types';

export class DrawingStateManager {
    private state: DrawingState = {
        mode: 'NONE',
        lines: [],
        activeDrawing: null,
        selectedLineId: null,
    };

    private currentSymbol: string = '';
    private onChange: (() => void) | null = null;
    private onModeChange: ((mode: DrawingMode) => void) | null = null;

    constructor() { }

    public setOnChangeCallback(callback: () => void) {
        this.onChange = callback;
    }

    public setOnModeChangeCallback(callback: (mode: DrawingMode) => void) {
        this.onModeChange = callback;
    }

    public setMode(mode: DrawingMode) {
        this.state.mode = mode;
        this.state.activeDrawing = null;
        this.onModeChange?.(mode);
    }

    public getMode(): DrawingMode {
        return this.state.mode;
    }

    public getState(): DrawingState {
        return this.state;
    }

    public setCurrentSymbol(symbol: string) {
        if (symbol !== this.currentSymbol) {
            this.saveToLocalStorage();
            this.currentSymbol = symbol;
            this.loadFromLocalStorage();
        }
    }

    public addLine(line: DrawingLine) {
        this.state.lines.push(line);
        this.saveToLocalStorage();
    }

    public updateLine(line: DrawingLine) {
        const index = this.state.lines.findIndex(l => l.id === line.id);
        if (index !== -1) {
            this.state.lines[index] = line;
            this.saveToLocalStorage();
        }
    }

    public removeLine(id: string) {
        const index = this.state.lines.findIndex(line => line.id === id);
        if (index !== -1) {
            this.state.lines.splice(index, 1);
            if (this.state.selectedLineId === id) {
                this.state.selectedLineId = null;
            }
            this.saveToLocalStorage();
        }
    }

    public removeSelectedLine() {
        if (this.state.selectedLineId) {
            this.removeLine(this.state.selectedLineId);
        }
    }

    public clearAll() {
        this.state.lines = [];
        this.state.selectedLineId = null;
        this.state.activeDrawing = null;
        this.saveToLocalStorage();
    }

    public setActiveDrawing(drawing: Partial<DrawingLine> | null) {
        this.state.activeDrawing = drawing;
        this.onChange?.();
    }

    public setSelectedLine(id: string | null) {
        this.state.selectedLineId = id;
    }

    public getLine(id: string): DrawingLine | undefined {
        return this.state.lines.find(l => l.id === id);
    }

    public getLines(): DrawingLine[] {
        return [...this.state.lines];
    }

    public generateId(): string {
        return `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getStorageKey(): string {
        return `drawing_lines_${this.currentSymbol}`;
    }

    public saveToLocalStorage() {
        try {
            if (!this.currentSymbol) return;
            const key = this.getStorageKey();
            localStorage.setItem(key, JSON.stringify(this.state.lines));
        } catch (error) {
            console.error('Failed to save drawings to localStorage:', error);
        }
    }

    public loadFromLocalStorage() {
        try {
            if (!this.currentSymbol) return;
            const key = this.getStorageKey();
            const data = localStorage.getItem(key);
            if (data) {
                this.state.lines = JSON.parse(data);
            } else {
                this.state.lines = [];
            }
        } catch (error) {
            console.error('Failed to load drawings from localStorage:', error);
            this.state.lines = [];
        }
    }
}
