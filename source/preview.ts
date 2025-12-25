import * as Modal from "./modal.ts";

enum PreviewState {
        IDLE,
        RUNNING,
        PAUSED
}

let username = "";
let projectSlug = "";
let secretCode = "";
let previewInformationKnown = false;

function getPreviewURL() {
        return `https://microstudio.io/${username}/${projectSlug}/${secretCode}/?debug`;
}

async function getPreviewInformation() {
        const modal = new Modal.FormModal({
                title: "Preview Setup",
                body: /* TODO: Specify that you can edit this later in the editor plugin settings. */ `
                        To open the project preview, the plugin needs to know the exact preview URL.
                        Please enter your microStudio username, your project slug and your project secret
                        code. These values are used to construct that URL so your project can be loaded
                        correctly. Note that these values are case sensitive.
                        <br><br>
                        You only need to fill out this information once. 
                `,
                inputOptions: [
                        {
                                label: "microStudio Username",
                                placeholder: "PlasmaPuffs"
                        },
                        {
                                label: "Project Slug",
                                placeholder: "awesome_game",
                                description: `
                                        A project's slug is the name used in the URL of the project.
                                        You can find your project's slug by going to the project settings
                                        and copuing the value in under <code>Project Slug</code>.
                                `
                        },
                        {
                                label: "Project Secret Code",
                                placeholder: "ABCD1234",
                                description: `
                                        A project's secret code is used in the project URL to
                                        test and run the project when it isn't set to public.
                                        You can find your project's secret code by going to the
                                        project settings and copying the 8-letter code under
                                        <code>Project Secret Code</code>.
                                `
                        }
                ]
        });

        const results = await modal.prompt();
        if (results === undefined) {
                return false;
        }

        username = results["microStudio Username"];
        projectSlug = results["Project Slug"];
        secretCode = results["Project Secret Code"];
        previewInformationKnown = true;
        return true;
}

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
        previewTabButton.href = "";

        previewTabButton.addEventListener("click", async event => {
                if (previewInformationKnown) {
                        return;
                }

                event.preventDefault();

                if (!(await getPreviewInformation())) {
                        return;
                }

                previewTabButton.href = getPreviewURL();
        });

        runRestartButton.addEventListener("click", async () => {
                switch (previewState) {
                        case PreviewState.IDLE: {
                                if (!previewInformationKnown) {
                                        if (!(await getPreviewInformation())) {
                                                return;
                                        }

                                        previewTabButton.href = getPreviewURL();
                                }

                                previewState = PreviewState.RUNNING;
                                preview.src = getPreviewURL();

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
                                preview.src = getPreviewURL();

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