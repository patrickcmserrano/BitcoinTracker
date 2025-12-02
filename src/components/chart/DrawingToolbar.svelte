<script lang="ts">
    import type { DrawingMode } from "./types";

    // Props
    export let currentMode: DrawingMode = "NONE";
    export let onModeChange: (mode: DrawingMode) => void;
    export let onClearAll: () => void;
    export let isDrawingActive: boolean = false; // True when first point of line_ab is set

    function setMode(mode: DrawingMode) {
        // Toggle off if clicking the same mode
        if (currentMode === mode) {
            onModeChange("NONE");
        } else {
            onModeChange(mode);
        }
    }
</script>

<div class="drawing-toolbar">
    <span class="toolbar-label">Draw:</span>

    <button
        class="tool-btn"
        class:active={currentMode === "HORIZONTAL_LINE"}
        onclick={() => setMode("HORIZONTAL_LINE")}
        title="Draw Horizontal Line"
        aria-label="Draw horizontal line"
    >
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <line x1="2" y1="10" x2="18" y2="10" />
        </svg>
    </button>

    <button
        class="tool-btn"
        class:active={currentMode === "LINE_AB"}
        onclick={() => setMode("LINE_AB")}
        title="Draw Line A→B"
        aria-label="Draw line from point A to point B"
    >
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <line x1="3" y1="15" x2="17" y2="5" />
            <circle cx="3" cy="15" r="2" fill="currentColor" />
            <circle cx="17" cy="5" r="2" fill="currentColor" />
        </svg>
    </button>

    <div class="toolbar-divider"></div>

    <button
        class="tool-btn clear-btn"
        onclick={onClearAll}
        title="Clear All Drawings"
        aria-label="Clear all drawings"
    >
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path d="M6 6l8 8M14 6l-8 8" />
        </svg>
    </button>

    {#if currentMode !== "NONE"}
        <span class="mode-indicator">
            {currentMode === "HORIZONTAL_LINE"
                ? "Click on chart to place horizontal line"
                : isDrawingActive
                  ? "Click to set end point (B)"
                  : "Click to set start point (A)"}
        </span>
    {/if}
</div>

<style>
    .drawing-toolbar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: var(--color-surface-100, #f3f4f6);
        border: 1px solid var(--color-surface-300, #d1d5db);
        border-radius: 6px;
        margin-bottom: 0.5rem;
        flex-wrap: wrap;
    }

    :global(.dark) .drawing-toolbar {
        background: var(--color-surface-800, #1f2937);
        border-color: var(--color-surface-600, #4b5563);
    }

    .toolbar-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text-secondary, #6b7280);
        margin-right: 0.25rem;
    }

    :global(.dark) .toolbar-label {
        color: var(--color-text-secondary-dark, #9ca3af);
    }

    .tool-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 4px;
        background: transparent;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .tool-btn:hover {
        background: #e5e7eb;
        color: #374151;
    }

    .tool-btn.active {
        background: #3b82f6;
        color: white;
        border-color: #2563eb;
    }

    :global(.dark) .tool-btn {
        color: #9ca3af;
    }

    :global(.dark) .tool-btn:hover {
        background: #374151;
        color: #e5e7eb;
    }

    :global(.dark) .tool-btn.active {
        background: #2563eb;
        color: white;
    }

    .clear-btn:hover {
        background: #fee2e2;
        color: #dc2626;
    }

    :global(.dark) .clear-btn:hover {
        background: #7f1d1d;
        color: #fca5a5;
    }

    .toolbar-divider {
        width: 1px;
        height: 24px;
        background: var(--color-surface-300, #d1d5db);
    }

    :global(.dark) .toolbar-divider {
        background: var(--color-surface-600, #4b5563);
    }

    .mode-indicator {
        font-size: 0.75rem;
        font-weight: 500;
        color: #3b82f6;
        padding: 0.25rem 0.5rem;
        background: #dbeafe;
        border-radius: 4px;
    }

    :global(.dark) .mode-indicator {
        color: #93c5fd;
        background: #1e3a8a;
    }
</style>
