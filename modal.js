export class Modal {
        constructor(editor, { title = null, message = null, buttons = null }) {
                this.editor = editor;
                this._resolve = null;

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
                                if (button.color !== undefined) {
                                        buttonElement.style.backgroundColor = button.color;
                                }

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
                return new Promise(resolve => {
                        this._resolve = resolve;
                });
        }

        close(result) {
                this.overlay.remove();
                this._resolve?.(result);
                this._resolve = null;
        }
}