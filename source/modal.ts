export class Modal {
        private resolve?: (_: unknown | PromiseLike<unknown>) => void;
        private editor: HTMLElement;
        private overlay: HTMLElement;
        private element: HTMLElement

        constructor(editor: HTMLElement, { title = null, message = null, buttons = null }) {
                this.editor = editor;
                this.resolve = null;

                this.overlay = document.createElement("div");
                this.overlay.className = "modal-overlay";

                this.overlay.addEventListener("click", event => {
                        event.stopPropagation();
                });

                this.element = document.createElement("div");
                this.element.classList.add("modal");

                if (title !== null) {
                        const headerElement = document.createElement("div");
                        headerElement.classList.add("modal-header");
                        headerElement.textContent = title;
                        this.element.appendChild(headerElement);
                }

                if (message !== null) {
                        const bodyElement = document.createElement("div");
                        bodyElement.classList.add("modal-body");
                        if (typeof message === "string") {
                                bodyElement.innerHTML = message;
                        } else {
                                bodyElement.appendChild(message);
                        }

                        this.element.appendChild(bodyElement);
                }

                if (buttons !== null) {
                        const footerElement = document.createElement("div");
                        footerElement.classList.add("modal-footer");

                        buttons.forEach(button => {
                                const buttonElement = document.createElement("button");
                                buttonElement.textContent = button.label;
                                buttonElement.style.backgroundColor = button.backgroundColor ?? "var(--background-color-2)";

                                buttonElement.addEventListener("click", () => {
                                        this.close(button.value ?? null);
                                });

                                footerElement.appendChild(buttonElement);
                        });

                        this.element.appendChild(footerElement);
                }

                this.overlay.appendChild(this.element);
        }

        prompt() {
                this.editor.appendChild(this.overlay);
                return new Promise<unknown>(resolve => {
                        this.resolve = resolve;
                });
        }

        close(result: unknown) {
                this.overlay.remove();
                this.resolve?.(result);
                this.resolve = null;
        }
}