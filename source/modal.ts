export type ButtonOptions = {
        label: string;
        value?: unknown;
        destructive?: boolean;
};

export type ModalOptions = {
        title?: string;
        body?: string | HTMLElement;
        buttonOptions?: readonly ButtonOptions[];
};

export const cancelButton: ButtonOptions = Object.freeze({
        label: "Cancel",
        value: false
} as const);

export const okButton: ButtonOptions = Object.freeze({
        label: "Ok",
        value: true
} as const);

export class Modal {
        private resolve?: (_: unknown | PromiseLike<unknown>) => void;
        private overlay: HTMLDivElement;
        protected element: HTMLDivElement;
        protected headerElement?: HTMLDivElement;
        protected bodyElement?: HTMLDivElement;
        protected footerElement: HTMLDivElement;

        constructor({title, body, buttonOptions}: ModalOptions = {}) {
                this.resolve = undefined;

                this.overlay = document.createElement("div");
                this.overlay.className = "modal-overlay";

                this.overlay.addEventListener("click", event => {
                        event.stopPropagation();
                });

                this.element = document.createElement("div");
                this.element.classList.add("modal");

                if (title !== undefined) {
                        this.headerElement = document.createElement("div");
                        this.headerElement.classList.add("modal-header");
                        this.headerElement.textContent = title;
                        this.element.appendChild(this.headerElement);
                }

                if (body !== undefined) {
                        this.bodyElement = document.createElement("div");
                        this.bodyElement.classList.add("modal-body");
                        if (typeof body === "string") {
                                this.bodyElement.innerHTML = body;
                        } else {
                                this.bodyElement.appendChild(body);
                        }

                        this.element.appendChild(this.bodyElement);
                }

                this.footerElement = document.createElement("div");
                this.footerElement.classList.add("modal-footer");
                this.element.appendChild(this.footerElement);

                buttonOptions ??= [cancelButton, okButton];
                for (const buttonOption of buttonOptions) {
                        const button = document.createElement("button");
                        button.textContent = buttonOption.label;
                        button.style.color = "var(foreground-color-1)";
                        button.style.backgroundColor = buttonOption.destructive
                                ? "var(--dark-destructive-color)"
                                : "var(--background-color-2)";

                        button.addEventListener("click", () => {
                                this.close(buttonOption.value);
                        });

                        this.footerElement.appendChild(button);
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

export type InputOption = {
        identifier?: string;
        name?: string;
        label: string;
        type?: string;
        description?: string;
        placeholder?: string;
        value?: string;
        inline?: boolean;
        // TODO: Add a callback that can be used to check if the
        // input value is valid why the input is being edited.
};

export type FormModalOptions = {
        title?: string;
        body?: string | HTMLElement;
        cancellable?: boolean;
        inputOptions?: readonly InputOption[];
};

export class FormModal extends Modal {
        private formElement: HTMLDivElement;
        private inputs: {option: InputOption; element: HTMLInputElement}[] = [];

        constructor({title, body, cancellable, inputOptions}: FormModalOptions = {}) {
                super({title, body, buttonOptions: [...(cancellable === false ? [] : [cancelButton]), okButton]});

                this.formElement = document.createElement("div");
                this.footerElement.before(this.formElement);

                for (const inputOption of inputOptions ?? []) {
                        const inputWrapper = document.createElement("div");
                        inputWrapper.classList.add("input-wrapper");
                        inputWrapper.classList.add(inputOption.inline ? "inline" : "multiline");

                        const labelWrapper = document.createElement("div");
                        labelWrapper.classList.add("label-wrapper");
                        inputWrapper.appendChild(labelWrapper);

                        const label = document.createElement("label");
                        label.htmlFor = inputOption.identifier ?? "";
                        label.textContent = inputOption.label;
                        labelWrapper.appendChild(label);

                        if (inputOption.description !== undefined) {
                                const information = document.createElement("div");
                                information.classList.add("information");
                                labelWrapper.appendChild(information);

                                const icon = document.createElement("div");
                                icon.classList.add("icon");
                                icon.innerHTML = `<i class="fa-solid fa-question"></i>`;;
                                information.appendChild(icon);

                                const tooltip = document.createElement("div");
                                tooltip.classList.add("tooltip");
                                tooltip.innerHTML = inputOption.description;
                                information.appendChild(tooltip);
                        }

                        const input = document.createElement("input");
                        input.id = inputOption.identifier ?? "";
                        input.name = inputOption.name ?? "";
                        input.type = inputOption.type ?? "text";
                        input.placeholder = inputOption.placeholder ?? "";
                        input.value = inputOption.value ?? "";
                        inputWrapper.appendChild(input);

                        this.inputs.push({option: inputOption, element: input});
                        this.formElement.appendChild(inputWrapper);
                }
        }

        async prompt(): Promise<Record<string, string> | undefined> {
                const confirmed = await super.prompt();
                if (!confirmed) {
                        return undefined;
                }

                const record: Record<string, string> = {};
                for (const {option, element} of this.inputs) {
                        record[option.label] = element.value;
                }

                return record;
        }
}