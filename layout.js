export function setupEditorLayout(editor) {
        const leftPanel = editor.querySelector("#left-panel");

        const leftContainer = editor.querySelector("#left-container");
        leftContainer.style.left = 0;
        leftContainer.style.top = "var(--bar-size)";
        leftContainer.style.width = "100%";
        leftContainer.style.height = "calc(100% - var(--bar-size))";

        const leftHandle = editor.querySelector("#left-handle");

        const centerPanel = editor.querySelector("#center-panel");

        const centerContainer = editor.querySelector("#center-container");
        centerContainer.style.left = "0";
        centerContainer.style.top = "var(--bar-size)";
        centerContainer.style.width = "100%";
        centerContainer.style.height = "calc(100% - var(--bar-size))";

        const rightHandle = editor.querySelector("#right-handle");

        const rightPanel = editor.querySelector("#right-panel");

        const topPanel = editor.querySelector("#top-panel");

        const topContainer = editor.querySelector("#top-container");
        topContainer.style.left = "0";
        topContainer.style.top = "var(--bar-size)";
        topContainer.style.width = "100%";

        const middleHandle = editor.querySelector("#middle-handle");

        const bottomPanel = editor.querySelector("#bottom-panel");

        const bottomContainer = editor.querySelector("#bottom-container");
        bottomContainer.style.left = "0";
        bottomContainer.style.top = "var(--bar-size)";
        bottomContainer.style.width = "100%";

        const leftPanelWidthMinimum = 120;
        let leftPanelWidthMaximum = null;
        let leftPanelWidthCurrent = null;

        const centerPanelWidthMinumum = 240;
        let centerPanelWidthMaximum = null;
        let centerPanelWidthCurrent = null;

        const rightPanelWidthMinimum = 240;
        let rightPanelWidthMaximum = null;
        let rightPanelWidthCurrent = null;

        const topPanelHeightMinimum = 240;
        let topPanelHeightMaximum = null;
        let topPanelHeightCurrent = null;

        const bottomPanelHeightMinimum = 240;
        let bottomPanelHeightMaximum = null;
        let bottomPanelHeightCurrent = null;

        function setPanelWidths(leftPanelWidth, centerPanelWidth, rightPanelWidth) {
                leftPanelWidthCurrent = leftPanelWidth;
                centerPanelWidthCurrent = centerPanelWidth;
                rightPanelWidthCurrent = rightPanelWidth;

                leftPanel.style.width = `${leftPanelWidth}px`;
                leftHandle.style.left = `${leftPanelWidth}px`;
                centerPanel.style.left = `${leftPanelWidth}px`;
                centerPanel.style.width = `${centerPanelWidth}px`;
                rightHandle.style.left = `${leftPanelWidth + centerPanelWidth}px`;
                rightPanel.style.width = `${rightPanelWidth}px`;
                rightPanel.style.left = `${leftPanelWidth+ centerPanelWidth}px`;
        }

        function setPanelHeights(topPanelHeight, bottomPanelHeight) {
                topPanelHeightCurrent = topPanelHeight;
                bottomPanelHeightCurrent = bottomPanelHeight;

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

        let previouscontainerWidth = null;
        let previouscontainerHeight = null;

        function containerWidthResized(width) {
                if (width === previouscontainerWidth) {
                        return;
                }

                previouscontainerWidth = width;

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

                const leftPanelWidth = Math.max(leftPanelWidthMinimum, Math.min(leftPanelWidthMaximum, leftPanelWidthCurrent));
                const rightPanelWidth = Math.max(rightPanelWidthMinimum, Math.min(rightPanelWidthMaximum, rightPanelWidthCurrent));
                const centerPanelWidth = editor.clientWidth - leftPanelWidth - rightPanelWidth;
                const adjustedCenter = Math.max(centerPanelWidthMinumum, Math.min(centerPanelWidthMaximum, centerPanelWidth));
                const leftover = editor.clientWidth - leftPanelWidth - rightPanelWidth - adjustedCenter;
                const finalRight = Math.max(rightPanelWidthMinimum, Math.min(rightPanelWidthMaximum, rightPanelWidth + leftover));
                setPanelWidths(leftPanelWidth, adjustedCenter, finalRight);
        }

        function containerHeightResized(height) {
                if (height === previouscontainerHeight) {
                        return;
                }

                previouscontainerHeight = height;

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

        const containerResizeObserver = new ResizeObserver(() => {
                containerWidthResized(editor.clientWidth);
                containerHeightResized(editor.clientHeight);
        })

        containerResizeObserver.observe(editor);
        containerWidthResized(editor.clientWidth);
        containerHeightResized(editor.clientHeight);

        let resizingHandle = null;
        let dragStartPosition = 0;
        let dragPanelStart = 0;

        leftHandle.addEventListener("mousedown", event => {
                document.body.style.userSelect = "none";
                document.body.style.cursor = "ew-resize";
                keepHorizontalDefaults = false;
                resizingHandle = leftHandle;
                dragPanelStart = leftPanelWidthCurrent;
                dragStartPosition = event.clientX;
        });

        rightHandle.addEventListener("mousedown", event => {
                document.body.style.userSelect = "none";
                document.body.style.cursor = "ew-resize";
                keepHorizontalDefaults = false;
                resizingHandle = rightHandle;
                dragPanelStart = rightPanelWidthCurrent;
                dragStartPosition = event.clientX;
        });

        middleHandle.addEventListener("mousedown", event => {
                document.body.style.userSelect = "none";
                document.body.style.cursor = "ns-resize";
                keepVerticalDefaults = false;
                resizingHandle = middleHandle;
                dragPanelStart = topPanelHeightCurrent;
                dragStartPosition = event.clientY;
        });

        editor.addEventListener("mousemove", event => {
                if (resizingHandle === null) {
                        return;
                }

                if (resizingHandle === leftHandle) {
                        const dragDelta = event.clientX - dragStartPosition;
                        const leftPanelWidth = Math.max(leftPanelWidthMinimum, Math.min(leftPanelWidthMaximum, dragPanelStart + dragDelta));
                        const centerPanelWidth = editor.clientWidth - leftPanelWidth - rightPanelWidthCurrent;
                        setPanelWidths(leftPanelWidth, centerPanelWidth, rightPanelWidthCurrent);
                }

                if (resizingHandle === rightHandle) {
                        const dragDelta = dragStartPosition - event.clientX;
                        const rightPanelWidth = Math.max(rightPanelWidthMinimum, Math.min(rightPanelWidthMaximum, dragPanelStart + dragDelta));
                        const centerPanelWidth = editor.clientWidth - leftPanelWidthCurrent - rightPanelWidth;
                        setPanelWidths(leftPanelWidthCurrent, centerPanelWidth, rightPanelWidth);
                }

                if (resizingHandle === middleHandle) {
                        const dragDelta = event.clientY - dragStartPosition;
                        const topPanelHeight = Math.max(topPanelHeightMinimum, Math.min(topPanelHeightMaximum, dragPanelStart + dragDelta));
                        const bottomPanelHeight = editor.clientHeight - topPanelHeight;
                        setPanelHeights(topPanelHeight, bottomPanelHeight);
                }
        });

        editor.addEventListener("mouseup", () => {
                if (resizingHandle === null) {
                        return;
                }

                resizingHandle = null;
                document.body.style.userSelect = "";
                document.body.style.cursor = "";
        });
}