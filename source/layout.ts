const leftPanelWidthMinimum = 120;
let leftPanelWidthMaximum: number;
let leftPanelWidthCurrent: number;

const centerPanelWidthMinumum = 240;
let centerPanelWidthMaximum: number;
// let centerPanelWidthCurrent: number;

const rightPanelWidthMinimum = 240;
let rightPanelWidthMaximum: number;
let rightPanelWidthCurrent: number;

const topPanelHeightMinimum = 240;
let topPanelHeightMaximum: number;
let topPanelHeightCurrent: number;

const bottomPanelHeightMinimum = 240;
let bottomPanelHeightMaximum: number;
// let bottomPanelHeightCurrent: number;

function setPanelWidths(leftPanelWidth: number, centerPanelWidth: number, rightPanelWidth: number) {
        const leftPanel = document.querySelector<HTMLDivElement>("#left-panel")!;
        const centerPanel = document.querySelector<HTMLDivElement>("#center-panel")!;
        const rightPanel = document.querySelector<HTMLDivElement>("#right-panel")!;
        const leftHandle = document.querySelector<HTMLDivElement>("#left-handle")!;
        const rightHandle = document.querySelector<HTMLDivElement>("#right-handle")!;

        leftPanelWidthCurrent = leftPanelWidth;
        // centerPanelWidthCurrent = centerPanelWidth;
        rightPanelWidthCurrent = rightPanelWidth;

        leftPanel.style.width = `${leftPanelWidth}px`;
        leftHandle.style.left = `${leftPanelWidth}px`;
        centerPanel.style.left = `${leftPanelWidth}px`;
        centerPanel.style.width = `${centerPanelWidth}px`;
        rightHandle.style.left = `${leftPanelWidth + centerPanelWidth}px`;
        rightPanel.style.width = `${rightPanelWidth}px`;
        rightPanel.style.left = `${leftPanelWidth+ centerPanelWidth}px`;
}

function setPanelHeights(topPanelHeight: number, bottomPanelHeight: number) {
        const topPanel = document.querySelector<HTMLDivElement>("#top-panel")!;
        const bottomPanel = document.querySelector<HTMLDivElement>("#bottom-panel")!;
        const topContainer = document.querySelector<HTMLDivElement>("#top-container")!;
        const bottomContainer = document.querySelector<HTMLDivElement>("#bottom-container")!;
        const middleHandle = document.querySelector<HTMLDivElement>("#middle-handle")!;

        topPanelHeightCurrent = topPanelHeight;
        // bottomPanelHeightCurrent = bottomPanelHeight;

        topPanel.style.height = `${topPanelHeight}px`;
        topContainer.style.height = `calc(${topPanelHeight}px - var(--bar-size))`;
        middleHandle.style.top = `${topPanelHeight}px`;
        bottomPanel.style.top = `${topPanelHeight}px`;
        bottomPanel.style.height = `${bottomPanelHeight}px`;
        bottomContainer.style.top = `calc(${topPanelHeight}px + var(--bar-size))`;
        bottomContainer.style.height = `calc(${bottomPanelHeight}px - var(--bar-size))`;
}

let keepHorizontalDefaults = true;
let keepVerticalDefaults = true;

let previousContainerWidth: number;
let previousContainerHeight: number;

function containerWidthResized(width: number) {
        if (width === previousContainerWidth) {
                return;
        }

        previousContainerWidth = width;

        leftPanelWidthMaximum = width * 0.3;
        centerPanelWidthMaximum = width * 0.5;
        rightPanelWidthMaximum = width * 0.5;

        if (keepHorizontalDefaults) {
                const leftPanelWidth = leftPanelWidthMinimum + (leftPanelWidthMaximum - leftPanelWidthMinimum) * 0.3;
                const centerPanelWidth = Math.max(centerPanelWidthMinumum, Math.min(centerPanelWidthMaximum, (width - leftPanelWidth) / 2));
                const rightPanelWidth = Math.max(rightPanelWidthMinimum, Math.min(rightPanelWidthMaximum, (width - leftPanelWidth) / 2));
                setPanelWidths(leftPanelWidth, centerPanelWidth, rightPanelWidth);
                return;
        }

        const editor = document.querySelector<HTMLDivElement>("#editor")!;

        const leftPanelWidth = Math.max(leftPanelWidthMinimum, Math.min(leftPanelWidthMaximum, leftPanelWidthCurrent));
        const rightPanelWidth = Math.max(rightPanelWidthMinimum, Math.min(rightPanelWidthMaximum, rightPanelWidthCurrent));
        const centerPanelWidth = editor.clientWidth - leftPanelWidth - rightPanelWidth;
        const adjustedCenter = Math.max(centerPanelWidthMinumum, Math.min(centerPanelWidthMaximum, centerPanelWidth));
        const leftover = editor.clientWidth - leftPanelWidth - rightPanelWidth - adjustedCenter;
        const finalRight = Math.max(rightPanelWidthMinimum, Math.min(rightPanelWidthMaximum, rightPanelWidth + leftover));
        setPanelWidths(leftPanelWidth, adjustedCenter, finalRight);
}

function containerHeightResized(height: number) {
        if (height === previousContainerHeight) {
                return;
        }

        previousContainerHeight = height;

        topPanelHeightMaximum = height * 0.7;
        bottomPanelHeightMaximum = height * 0.7;

        if (keepVerticalDefaults) {
                const topPanelHeight = Math.max(topPanelHeightMinimum, Math.min(topPanelHeightMaximum, height / 2));
                const bottomPanelHeight = Math.max(bottomPanelHeightMinimum, Math.min(bottomPanelHeightMaximum, height - topPanelHeight));
                setPanelHeights(topPanelHeight, bottomPanelHeight);
                return;
        }

        const topPanelHeight = Math.max(topPanelHeightMinimum, Math.min(topPanelHeightMaximum, topPanelHeightCurrent));
        const bottomPanelHeight = height - topPanelHeight;
        setPanelHeights(topPanelHeight, bottomPanelHeight);
}

enum LayoutHandle {
        LEFT_HANDLE,
        RIGHT_HANDLE,
        MIDDLE_HANDLE
}

let resizingHandle: LayoutHandle | undefined;
let dragStartPosition = 0;
let dragPanelStart = 0;

document.addEventListener("mousemove", event => {
        if (resizingHandle === undefined) {
                return;
        }

        const editor = document.querySelector<HTMLDivElement>("#editor")!;

        if (resizingHandle === LayoutHandle.LEFT_HANDLE) {
                const dragDelta = event.clientX - dragStartPosition;
                const leftPanelWidth = Math.max(leftPanelWidthMinimum, Math.min(leftPanelWidthMaximum, dragPanelStart + dragDelta));
                const centerPanelWidth = editor.clientWidth - leftPanelWidth - rightPanelWidthCurrent;
                setPanelWidths(leftPanelWidth, centerPanelWidth, rightPanelWidthCurrent);
        }

        if (resizingHandle === LayoutHandle.RIGHT_HANDLE) {
                const dragDelta = dragStartPosition - event.clientX;
                const rightPanelWidth = Math.max(rightPanelWidthMinimum, Math.min(rightPanelWidthMaximum, dragPanelStart + dragDelta));
                const centerPanelWidth = editor.clientWidth - leftPanelWidthCurrent - rightPanelWidth;
                setPanelWidths(leftPanelWidthCurrent, centerPanelWidth, rightPanelWidth);
        }

        if (resizingHandle === LayoutHandle.MIDDLE_HANDLE) {
                const dragDelta = event.clientY - dragStartPosition;
                const topPanelHeight = Math.max(topPanelHeightMinimum, Math.min(topPanelHeightMaximum, dragPanelStart + dragDelta));
                const bottomPanelHeight = editor.clientHeight - topPanelHeight;
                setPanelHeights(topPanelHeight, bottomPanelHeight);
        }
});

document.addEventListener("mouseup", () => {
        if (resizingHandle === undefined) {
                return;
        }

        resizingHandle = undefined;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
});

export function initialize() {
        const leftContainer = document.querySelector<HTMLDivElement>("#left-container")!;
        leftContainer.style.left = "0";
        leftContainer.style.top = "var(--bar-size)";
        leftContainer.style.width = "100%";
        leftContainer.style.height = "calc(100% - var(--bar-size))";

        const centerContainer = document.querySelector<HTMLDivElement>("#center-container")!;
        centerContainer.style.left = "0";
        centerContainer.style.top = "var(--bar-size)";
        centerContainer.style.width = "100%";
        centerContainer.style.height = "calc(100% - var(--bar-size))";

        const topContainer = document.querySelector<HTMLDivElement>("#top-container")!;
        topContainer.style.left = "0";
        topContainer.style.top = "var(--bar-size)";
        topContainer.style.width = "100%";

        const bottomContainer = document.querySelector<HTMLDivElement>("#bottom-container")!;
        bottomContainer.style.left = "0";
        bottomContainer.style.top = "var(--bar-size)";
        bottomContainer.style.width = "100%";

        const editor = document.querySelector<HTMLDivElement>("#editor")!;
        const containerResizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                        if (entry.target !== editor) {
                                continue;
                        }

                        containerWidthResized(editor.clientWidth);
                        containerHeightResized(editor.clientHeight);
                }
        })

        containerResizeObserver.observe(editor);
        containerWidthResized(editor.clientWidth);
        containerHeightResized(editor.clientHeight);

        const leftHandle = document.querySelector<HTMLDivElement>("#left-handle")!;
        const rightHandle = document.querySelector<HTMLDivElement>("#right-handle")!;
        const middleHandle = document.querySelector<HTMLDivElement>("#middle-handle")!;

        leftHandle.addEventListener("mousedown", event => {
                document.body.style.userSelect = "none";
                document.body.style.cursor = "ew-resize";
                keepHorizontalDefaults = false;
                resizingHandle = LayoutHandle.LEFT_HANDLE;
                dragPanelStart = leftPanelWidthCurrent;
                dragStartPosition = event.clientX;
        });

        rightHandle.addEventListener("mousedown", event => {
                document.body.style.userSelect = "none";
                document.body.style.cursor = "ew-resize";
                keepHorizontalDefaults = false;
                resizingHandle = LayoutHandle.RIGHT_HANDLE;
                dragPanelStart = rightPanelWidthCurrent;
                dragStartPosition = event.clientX;
        });

        middleHandle.addEventListener("mousedown", event => {
                document.body.style.userSelect = "none";
                document.body.style.cursor = "ns-resize";
                keepVerticalDefaults = false;
                resizingHandle = LayoutHandle.MIDDLE_HANDLE;
                dragPanelStart = topPanelHeightCurrent;
                dragStartPosition = event.clientY;
        });
}