export type ButtonOptions = {
        label: string;
        value?: unknown;
        foregroundColor?: string;
        backgroundColor?: string;
};

export type DialogOptions = {
        title?: string;
        body?: string | HTMLElement;
        buttonOptions?: readonly ButtonOptions[];
};

export class Modal {
        static defaultButtonOptions: Readonly<ButtonOptions>[] = [
                {
                        label: "Cancel",
                        value: false
                },
                {
                        label: "Ok",
                        value: true
                }
        ];

        private resolve?: (_: unknown | PromiseLike<unknown>) => void;
        private overlay: HTMLDivElement;
        private element: HTMLDivElement;

        constructor({ title, body, buttonOptions }: DialogOptions = {}) {
                this.resolve = undefined;

                this.overlay = document.createElement("div");
                this.overlay.className = "modal-overlay";

                this.overlay.addEventListener("click", event => {
                        event.stopPropagation();
                });

                this.element = document.createElement("div");
                this.element.classList.add("modal");

                if (title !== undefined) {
                        const headerElement = document.createElement("div");
                        headerElement.classList.add("modal-header");
                        headerElement.textContent = title;
                        this.element.appendChild(headerElement);
                }

                if (body !== undefined) {
                        const bodyElement = document.createElement("div");
                        bodyElement.classList.add("modal-body");
                        if (typeof body === "string") {
                                bodyElement.innerHTML = body;
                        } else {
                                bodyElement.appendChild(body);
                        }

                        this.element.appendChild(bodyElement);
                }

                const footerElement = document.createElement("div");
                footerElement.classList.add("modal-footer");
                this.element.appendChild(footerElement);

                buttonOptions ??= Modal.defaultButtonOptions;
                for (const buttonOption of buttonOptions) {
                        const button = document.createElement("button");
                        button.textContent = buttonOption.label;
                        button.style.color = buttonOption.foregroundColor ?? "var(foreground-color-1)";
                        button.style.backgroundColor = buttonOption.backgroundColor ?? "var(--background-color-2)";

                        button.addEventListener("click", () => {
                                this.close(buttonOption.value);
                        });

                        footerElement.appendChild(button);
                }

                this.overlay.appendChild(this.element);
        }

        prompt() {
                const editor = document.querySelector<HTMLDivElement>("#editor")!;
                editor.appendChild(this.overlay);

                return new Promise<unknown>(resolve => {
                        this.resolve = resolve;
                });
        }

        close(result: unknown) {
                this.overlay.remove();
                this.resolve?.(result);
                this.resolve = undefined;
        }
}