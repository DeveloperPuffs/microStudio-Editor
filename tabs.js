class Tab {
        static Icon = Object.freeze({
                source: `<i class="fa-solid fa-file-code"></i>`,
                image: `<i class="fa-solid fa-file-image"></i>`,
                map: `<i class="fa-regular fa-map"></i>`,
                sound: `<i class="fa-solid fa-file-audio"></i>`,
                music: `<i class="fa-solid fa-music"></i>`,
                doc: `<i class="fa-solid fa-file"></i>`,
        });

        constructor(editor, name, icon, onClick = null, onClose = null) {
                this.editor = editor;
                this._name = null;
                this._icon = null;
                this.onClick = onClick;
                this.onClose = onClose;

                this.element = document.createElement("li");
                this.element.setAttribute("draggable", true);
                this.element.classList.add("tab");

                this.iconElement = document.createElement("div");
                this.element.appendChild(this.iconElement);

                this.labelElement = document.createElement("span");
                this.labelElement.classList.add("label");
                this.element.appendChild(this.labelElement);

                this.closeElement = document.createElement("div");
                this.closeElement.classList.add("close");
                this.closeElement.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
                this.element.appendChild(this.closeElement);

                this.element.addEventListener("click", () => {
                        this.onClick?.();
                });

                this.closeElement.addEventListener("click", () => {
                        this.element.remove();
                        this.onClose?.();
                });

                Object.defineProperty(this.element, "__tab", {
                        value: this,
                        writable: false,
                        configurable: false
                });

                this.tabList = this.editor.querySelector("#tab-list");
                this.tabList.appendChild(this.element);

                this.name = name;
                this.icon = icon;
        }

        get name() {
                return this._name;
        }

        set name(name) {
                this._name = name;
                this.labelElement.textContent = name;
        }

        get icon() {
                return this._icon;
        }

        set icon(icon) {
                this._icon = icon;
                this.iconElement.innerHTML = icon;
        }
}

class TabDrag {
        static DropPosition = Object.freeze({
                LEFT: Symbol("LEFT"),
                RIGHT: Symbol("RIGHT")
        });

        constructor(editor, draggedElement, onFinish = null) {
                this.tabList = editor.querySelector("#tab-list");
                this.dropLine = editor.querySelector("#tab-drop-line");
                this.draggedElement = draggedElement;
                this.receivingElement = null;
                this.dropPosition = null;
                this.onFinish = onFinish;
        }

        dragStart(event) {
                this.draggedElement.classList.add("dragging");
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", "ignored");
        }

        dragEnd(_) {
                this.dropLine.classList.remove("active");
                this.draggedElement.classList.remove("dragging");
                this.onFinish?.();
        }

        dragOver(event) {
                const containerRectangle = this.tabList.getBoundingClientRect();

                const receivingElement = event.target.closest(".tab");
                if (receivingElement === null) {
                        // Check if the drag is to the right of the very last element
                        const lastElement = this.tabList.lastElementChild;
                        if (lastElement === null) {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";

                                // The tab list is empty, allow a drop at the root
                                this.dropLine.classList.add("active");
                                this.dropLine.style.left = "0";
                                this.dropLine.style.height = `${containerRectangle.height}px`;
                                this.receivingElement = this.tabList;
                                return;
                        }

                        if (lastElement === this.draggedElement) {
                                this.dropLine.classList.remove("active");
                                return;
                        }

                        const lastRectangle = lastElement.getBoundingClientRect();
                        if (event.clientX > lastRectangle.right) {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";

                                // Dragging to the right of the last element, allow a drop at the root
                                this.dropLine.classList.add("active");
                                this.dropLine.style.left = `${lastRectangle.right - containerRectangle.left}px`;
                                this.dropLine.style.height = `${lastRectangle.height}px`;
                                this.receivingElement = this.tabList;
                                return;
                        }

                        this.dropLine.classList.remove("active");
                        return;
                }

                // You can't drop a tab to the left or to the right of itself
                if (receivingElement === this.draggedElement) {
                        this.dropLine.classList.remove("active");
                        return;
                }

                const receivingRectangle = receivingElement.getBoundingClientRect();
                if (event.clientX < receivingRectangle.left + receivingRectangle.width / 2) {
                        this.dropPosition = TabDrag.DropPosition.LEFT;

                        if (receivingElement.previousElementSibling === this.draggedElement) {
                                this.dropLine.classList.remove("active");
                                return;
                        }
                } else {
                        this.dropPosition = TabDrag.DropPosition.RIGHT;

                        if (receivingElement.nextElementSibling === this.draggedElement) {
                                this.dropLine.classList.remove("active");
                                return;
                        }
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                this.receivingElement = receivingElement;

                this.dropLine.style.left = this.dropPosition === TabDrag.DropPosition.LEFT
                        ? `${receivingRectangle.left - containerRectangle.left}px`
                        : `${receivingRectangle.right - containerRectangle.left}px`;

                // Make sure the height of the drop line matches even when there is a horizontal scrollbar
                this.dropLine.style.height = `${receivingRectangle.height}px`;
                this.dropLine.classList.add("active");
        }

        dragLeave(event) {
                if (event.relatedTarget === null || !this.tabList.contains(event.relatedTarget)) {
                        this.dropLine.classList.remove("active");
                }
        }

        drop(event) {
                event.preventDefault();

                if (this.receivingElement === this.tabList) {
                        // If the receiving node is the root, it means that I should add it to the end of it
                        this.tabList.appendChild(this.draggedElement);
                        return;
                }

                if (this.dropPosition === TabDrag.DropPosition.LEFT) {
                        this.receivingElement.before(this.draggedElement);
                        return;
                }

                if (this.dropPosition === TabDrag.DropPosition.RIGHT) {
                        this.receivingElement.after(this.draggedElement);
                        return;
                }
        }
}

export function setupEditorTabBar(editor) {
        const tabList = editor.querySelector("#tab-list");

        let currentDrag = null;

        tabList.addEventListener("dragstart", event => {
                if (currentDrag !== null) {
                        return;
                }

                const draggedElement = event.target.closest(".tab:not(.dragging)");
                if (draggedElement === null) {
                        return;
                }

                currentDrag = new TabDrag(editor, draggedElement, () => {
                        currentDrag = null;
                });

                currentDrag.dragStart(event);
        });

        tabList.addEventListener("dragend", event => {
                currentDrag?.dragEnd(event);
        });

        tabList.addEventListener("dragover", event => {
                currentDrag?.dragOver(event);
        });

        tabList.addEventListener("dragleave", event => {
                currentDrag?.dragLeave(event);
        });

        tabList.addEventListener("drop", event => {
                currentDrag?.drop(event);
        });

        // TODO: When opening a tab, place it right after the current selected tab

        new Tab(editor, "something long? long?", Tab.Icon.image, null, null);
        new Tab(editor, "ff", Tab.Icon.image, null, null);
        new Tab(editor, "ff", Tab.Icon.source, null, null);
}