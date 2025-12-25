enum PreviewState {
        IDLE,
        RUNNING,
        PAUSED
}

let projectSlug = "";
let previewState = PreviewState.IDLE;

const pauseMessage = JSON.stringify({name: "pause"});
const resumeMessage =  JSON.stringify({name: "resume"});
const nextFrameMessage =  JSON.stringify({name: "step_forward"});

export function intialize() {
        const preview = document.querySelector<HTMLIFrameElement>("#preview")!;

        const runRestartButton = document.querySelector<HTMLButtonElement>("#run-restart-button")!;
        runRestartButton.style.backgroundColor = "var(--dark-prominent-color)";
        runRestartButton.innerHTML = `<i class="fa-solid fa-play"></i>`;
        runRestartButton.title = "Run Preview";

        const pauseResumeButton = document.querySelector<HTMLButtonElement>("#pause-resume-button")!;
        pauseResumeButton.innerHTML = `<i class="fa-solid fa-pause"></i>`;
        pauseResumeButton.style.backgroundColor = "var(--dark-disabled-color)";

        const nextFrameButton = document.querySelector<HTMLButtonElement>("#next-frame-button")!;
        nextFrameButton.innerHTML = `<i class="fa-solid fa-forward-step"></i>`;
        nextFrameButton.style.backgroundColor = "var(--dark-disabled-color)";

        const stopButton = document.querySelector<HTMLButtonElement>("#stop-button")!;
        stopButton.innerHTML = `<i class="fa-solid fa-stop"></i>`;
        stopButton.style.backgroundColor = "var(--dark-disabled-color)";

        const previewTabButton = document.querySelector<HTMLLinkElement>("#preview-tab-button")!;
        previewTabButton.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i>`;
        previewTabButton.href = "https://microstudio.io/PlasmaPuffs/loopslasher/";

        runRestartButton.addEventListener("click", () => {
                switch (previewState) {
                        case PreviewState.IDLE: {
                                previewState = PreviewState.RUNNING;
                                preview.src = "https://microstudio.io/PlasmaPuffs/temp/67U2K497/?debug";

                                pauseResumeButton.style.backgroundColor = "var(--dark-prominent-color)";
                                stopButton.style.backgroundColor = "var(--dark-destructive-color)";
                                runRestartButton.innerHTML = `<i class="fa-solid fa-rotate-right"></i>`;
                                runRestartButton.title = "Restart Preview";
                                pauseResumeButton.title = "Pause Preview";
                                stopButton.title = "Stop Preview";
                                break;
                        }

                        case PreviewState.RUNNING: case PreviewState.PAUSED: {
                                previewState = PreviewState.RUNNING;
                                preview.src = "";
                                preview.src = "https://microstudio.io/PlasmaPuffs/temp/67U2K497/?debug";

                                nextFrameButton.style.backgroundColor = "var(--dark-disabled-color)";
                                nextFrameButton.title = "";
                                break;
                        }
                }
        });

        pauseResumeButton.addEventListener("click", () => {
                switch (previewState) {
                        case PreviewState.RUNNING: {
                                previewState = PreviewState.PAUSED;
                                preview.contentWindow!.postMessage(pauseMessage, "*");

                                pauseResumeButton.innerHTML = `<i class="fa-solid fa-play"></i>`
                                pauseResumeButton.title = "Resume Preview";
                                nextFrameButton.style.backgroundColor = "var(--dark-prominent-color)";
                                nextFrameButton.title = "Next Frame";
                                break;
                        }

                        case PreviewState.PAUSED: {
                                previewState = PreviewState.RUNNING;
                                preview.contentWindow!.postMessage(resumeMessage, "*");

                                pauseResumeButton.innerHTML = `<i class="fa-solid fa-pause"></i>`
                                pauseResumeButton.title = "Pause Preview";
                                nextFrameButton.style.backgroundColor = "var(--dark-disabled-color)";
                                nextFrameButton.title = "";
                                break;
                        }
                }
        });

        nextFrameButton.addEventListener("click", () => {
                if (previewState !== PreviewState.PAUSED) {
                        return;
                }

                preview.contentWindow!.postMessage(nextFrameMessage, "*");
        });

        stopButton.addEventListener("click", () => {
                if (previewState === PreviewState.IDLE) {
                        return;
                }

                previewState = PreviewState.IDLE;

                runRestartButton.innerHTML = `<i class="fa-solid fa-play"></i>`;
                runRestartButton.title = "Run Preview";

                pauseResumeButton.style.backgroundColor = "var(--dark-disabled-color)";
                pauseResumeButton.innerHTML = `<i class="fa-solid fa-pause"></i>`
                pauseResumeButton.title = "";

                nextFrameButton.style.backgroundColor = "var(--dark-disabled-color)";
                nextFrameButton.title = "";

                stopButton.style.backgroundColor = "var(--dark-disabled-color)";
                stopButton.title = "";

                preview.src = "";
        });
}