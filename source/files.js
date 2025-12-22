import { Modal } from "./modal.js";

class BaseNode {
        constructor() {
                this._parent = null;
        }

        get parent() {
                return this._parent;
        }

        set parent(parent) {
                this._parent = parent;
                this.onParentChanged(parent);
        }

        linkElement(element) {
                Object.defineProperty(element, "__node", {
                        value: this,
                        writable: false,
                        configurable: false
                });
        }

        onParentChanged() {
                // Should be overriden by subclasses if needed
        }

        getSiblings() {
                if (this._parent === null) {
                        return [];
                }

                const siblings = [];
                this._parent.forEachChild(child => {
                        if (child === this) {
                                return;
                        }

                        siblings.push(child);
                });

                return siblings;
        }

        isDescendantOf(parent) {
                let currentParent = this.parent;
                while (currentParent !== null) {
                        if (currentParent === parent) {
                                return true;
                        }

                        currentParent = currentParent.parent;
                }

                return false;
        }
}

class ContainerNode extends BaseNode {
        constructor() {
                super();

                this._children = [];
        }

        onParentChanged(parent) {
                super.onParentChanged(parent);

                this.forEachChild(child => {
                        child.onParentChanged(this);
                });
        }

        forEachChild(action) {
                this._children.forEach(action);
        }

        getChildren() {
                return [...this._children];
        }

        getChildCount() {
                return this._children.length;
        }

        // Places child (including all of its elements) after the sibling
        placeChild(child, sibling) {
                const elements = child.getSubtreeElements();

                if (sibling === null) {
                        // If sibling is null, remove the child's elements
                        for (const element of elements) {
                                element.remove();
                        }

                        return;
                }

                const siblingElement = sibling.getElement();
                siblingElement.after(...elements);
        }

        addChild(node, index = this.getChildCount()) {
                if (node === this || this.isDescendantOf(node)) {
                        return;
                }

                if (node.parent !== null) {
                        node.parent.removeChild(node);
                }

                this._children.splice(index, 0, node);
                node.parent = this;

                // If this is the first child, place it right after the container
                if (index === 0) {
                        this.placeChild(node, this);
                        return;
                }

                // The sibling is the child preceeding the node that was just added
                let sibling = this._children[index - 1];

                // If the sibling is a folder, find the last child of the sibling
                while (sibling instanceof FolderNode) {
                        const siblingChildren = sibling.getChildren();
                        if (siblingChildren.length === 0) {
                                break;
                        }

                        sibling = siblingChildren[siblingChildren.length - 1];
                }

                // If there is only one child (sibling === undefined)
                // then just place it right after the container itself
                this.placeChild(node, sibling ?? this);
        }

        removeChild(node) {
                const index = this._children.indexOf(node);
                if (index === -1) {
                        return;
                }

                this._children.splice(index, 1);
                node.parent = null;

                this.placeChild(node, null);
        }
}

class RootNode extends ContainerNode {
        constructor(editor, fileList) {
                super();

                this.editor = editor;
                this.fileList = fileList;
                this.linkElement(fileList);
        }

        placeChild(child, sibling) {
                if (sibling === this) {
                        // Add all of the elements at the start of the root
                        const elements = child.getSubtreeElements();
                        this.fileList.prepend(...elements);
                        return;
                }

                super.placeChild(child, sibling);
        }
}

// A mixin for node classes that appear as elements in the file list
// BaseNode -> ElementNode -> FileNode, BaseNode -> ContainerNode -> ElementNode -> FolderNode
// ContainerNode is needed as a separate class because it is inherited by RootNode, which isn't an ElementNode
function ElementNode(NodeClass) {
        return class extends NodeClass {
                constructor(editor, name, icon, containsExtension) {
                        super();

                        this.editor = editor;
                        this.containsExtension = containsExtension;

                        this.element = document.createElement("li");
                        this.element.setAttribute("draggable", true);
                        this.element.classList.add("file");

                        this.element.addEventListener("click", event => {
                                event.stopPropagation();
                                this.onClick();
                        });

                        this.iconElement = document.createElement("div");
                        this.iconElement.innerHTML = icon;
                        this.element.appendChild(this.iconElement);

                        this.labelElement = document.createElement("div");
                        this.labelElement.classList.add("label");
                        this.labelElement.textContent = name;
                        this.element.appendChild(this.labelElement);

                        this.labelElement.addEventListener("dblclick", event => {
                                event.stopPropagation();
                                this.beginRenaming();
                        });

                        this.deleteElement = document.createElement("div");
                        this.deleteElement.classList.add("delete");
                        this.deleteElement.innerHTML = `<i class="fa-solid fa-trash"></i>`;
                        this.element.appendChild(this.deleteElement);

                        this.deleteElement.addEventListener("click", event => {
                                event.stopPropagation();
                                this.requestDeletion(true);
                        });

                        this.linkElement(this.element);
                }

                get name() {
                        return this.labelElement.textContent;
                }

                set name(name) {
                        this.labelElement.textContent = name;
                }

                get icon() {
                        return this.iconElement.innerHTML;
                }

                set icon(icon) {
                        this.iconElement.innerHTML = icon;
                }

                get hidden() {
                        return this.element.classList.contains("hidden");
                }

                set hidden(hidden) {
                        this.element.classList.toggle("hidden", hidden);
                }

                get base() {
                        if (!this.containsExtension) {
                                return this.name;
                        }

                        const filenameInformation = getFilenameInformation(this.name);
                        return filenameInformation.base;
                }

                get extension() {
                        if (!this.containsExtension) {
                                return "";
                        }

                        const filenameInformation = getFilenameInformation(this.name);
                        return filenameInformation.extension;
                }

                getElement() {
                        return this.element;
                }

                getSubtreeElements() {
                        return [this.element];
                }

                onParentChanged(parent) {
                        super.onParentChanged(parent);

                        // Loop over the descendants to update the visual state of the file

                        let nestedDepth = 0;
                        let currentParent = this.parent;
                        while (currentParent !== null) {
                                if (currentParent instanceof FolderNode) {
                                        if (!currentParent.expanded) {
                                                this.hidden = true;
                                        }
                                }

                                if (currentParent instanceof RootNode) {
                                        this.element.style.paddingLeft = `${16 + nestedDepth * 24}px`;
                                        break;
                                }

                                currentParent = currentParent.parent;
                                ++nestedDepth;
                        }
                }

                onClick() {
                        // Should be overriden by subclasses if needed
                }

                onDelete() {
                        this.parent.removeChild(this);
                }

                scrollIntoView() {
                        this.element.scrollIntoView({
                                block: "nearest",
                                inline: "center",
                                behavior: "auto"
                        });
                }

                beginRenaming() {
                        if (this.element.classList.contains("renaming")) {
                                return;
                        }

                        this.element.classList.add("renaming");

                        const renameWrapper = document.createElement("div");
                        renameWrapper.classList.add("rename-wrapper");

                        const input = document.createElement("input");
                        input.type = "text";
                        input.maxLength = 255;
                        input.value = this.base;
                        input.classList.add("rename");
                        renameWrapper.appendChild(input);

                        if (this.containsExtension) {
                                const extensionLabel = document.createElement("span");
                                extensionLabel.textContent = this.extension;
                                extensionLabel.classList.add("extension");
                                renameWrapper.appendChild(extensionLabel);
                        }

                        this.labelElement.replaceWith(renameWrapper);

                        input.focus();
                        input.select();

                        let finished = false;
                        const error = this.editor.querySelector("#file-error");
                        const fileList = this.editor.querySelector("#file-list");

                        const showError = message => {
                                const fileRectangle = this.element.getBoundingClientRect();
                                const listRectangle = fileList.getBoundingClientRect();

                                error.textContent = message;
                                error.style.top = `${fileRectangle.bottom - listRectangle.top}px`;
                                error.hidden = false;
                        };

                        const hideError = () => {
                                error.hidden = true;
                        }

                        const commit = () => {
                                const trimmedName = input.value.trim();
                                if (trimmedName !== "") {
                                        this.name = trimmedName + this.extension;
                                }

                                cleanup();
                        };

                        const cleanup = () => {
                                if (finished) {
                                        return;
                                }

                                finished = true;
                                hideError();

                                renameWrapper.replaceWith(this.labelElement);
                                this.element.classList.remove("renaming");
                        };

                        input.addEventListener("input", () => {
                                const trimmedName = input.value.trim();
                                if (trimmedName === "") {
                                        showError("Cannot have an empty file name");
                                        return;
                                }

                                if (trimmedName[trimmedName.length - 1] === ".") {
                                        showError(`Cannot name file "${trimmedName}": File name cannot end with "."`);
                                        return;
                                }

                                if (/[\/\\\0<>:"|?*]/.test(trimmedName)) {
                                        showError(`Cannot name file "${trimmedName}": File name contains invalid characters`);
                                        return;
                                }

                                for (const sibling of this.getSiblings()) {
                                        if (sibling.name === trimmedName + this.extension) {
                                                showError(`Cannot name file "${trimmedName}": File with same name already exists in folder`);
                                                return;
                                        }
                                }

                                hideError();
                        });

                        input.addEventListener("keydown", event => {
                                if (event.key === "Enter" && error.hidden) {
                                        commit();
                                }

                                if (event.key === "Escape") {
                                        cleanup();
                                }
                        });

                        input.addEventListener("blur", () => {
                                if (error.hidden) {
                                        commit();
                                        return;
                                }

                                cleanup();
                        });
                }

                async requestDeletion(confirmation) {
                        if (!confirmation) {
                                this.onDelete();
                                return true;
                        }

                        const deleteConfirmation = new Modal(this.editor, {
                                title: `Delete Item`,
                                message: `
                                        Are you sure you want to delete <code>${this.name}</code>
                                        and all of its contents? This action is irreversible.
                                `,
                                buttons: [
                                        {
                                                label: "Cancel",
                                                value: false
                                        },
                                        {
                                                label: "Delete",
                                                backgroundColor: "var(--dark-invalid-color)",
                                                value: true
                                        },
                                ]
                        });

                        if (await deleteConfirmation.prompt()) {
                                this.onDelete();
                                return true;
                        }

                        return false;
                }
        };
}

class FileNode extends ElementNode(BaseNode) {
        constructor(editor, name, selectFile, closeFile) {
                const { extension } = getFilenameInformation(name);
                let icon = `<i class="fa-solid fa-question"></i>`;

                switch (extension) {
                        case ".js": case ".ms": {
                                icon = `<i class="fa-solid fa-file-code"></i>`;
                                break;
                        }

                        case ".png": case ".jpg": case ".jpeg": {
                                icon = `<i class="fa-solid fa-file-image"></i>`;
                                break;
                        }

                        case ".map": {
                                icon = `<i class="fa-regular fa-map"></i>`;
                                break;
                        }

                        case ".wav": {
                                icon = `<i class="fa-solid fa-file-audio"></i>`;
                                break;
                        }

                        case ".mp3": {
                                icon = `<i class="fa-solid fa-music"></i>`;
                                break;
                        }

                        case ".md": {
                                icon = `<i class="fa-solid fa-file"></i>`;
                                break;
                        }
                }

                super(editor, name, icon, true);

                this.selectFile = selectFile;
                this.closeFile = closeFile;

                this.tabList = this.editor.querySelector("#tab-list");
                this.tabElement = document.createElement("li");
                this.tabElement.setAttribute("draggable", true);
                this.tabElement.classList.add("tab");

                this.tabIconElement = document.createElement("div");
                this.tabIconElement.innerHTML = icon;
                this.tabElement.appendChild(this.tabIconElement);

                this.tabLabelElement = document.createElement("span");
                this.tabLabelElement.classList.add("label");
                this.tabLabelElement.textContent = name;
                this.tabElement.appendChild(this.tabLabelElement);

                this.tabCloseElement = document.createElement("div");
                this.tabCloseElement.classList.add("close");
                this.tabCloseElement.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
                this.tabElement.appendChild(this.tabCloseElement);

                this.tabElement.addEventListener("click", event => {
                        event.stopPropagation();
                        this.selectFile(this);
                });

                this.tabCloseElement.addEventListener("click", event => {
                        event.stopPropagation();
                        this.tabElement.remove();
                        this.closeFile(this);
                });
        }

        get name() {
                return super.name;
        }

        set name(name) {
                super.name = name;
                this.tabLabelElement.textContent = name;
        }

        onClick() {
                this.selectFile(this);
        }

        select(previousFile) {
                if (!this.tabList.contains(this.tabElement)) {
                        this.tabList.appendChild(this.tabElement);

                        if (previousFile !== null) {
                                const previousTab = previousFile.tabElement;
                                previousTab.after(this.tabElement);
                        }

                        this.tabElement.scrollIntoView({
                                block: "nearest",
                                inline: "center",
                                behavior: "auto"
                        });
                }

                this.element.classList.add("selected");
                this.tabElement.classList.add("selected");
        }

        onDelete() {
                this.tabElement.remove();
                this.closeFile(this);
                super.onDelete();
        }
}

class FolderNode extends ElementNode(ContainerNode) {
        static CLOSED_ICON = `<i class="fa-solid fa-folder"></i>`;
        static OPEN_ICON = `<i class="fa-solid fa-folder-open"></i>`;

        constructor(editor, name) {
                super(editor, name, FolderNode.CLOSED_ICON, false);
        }

        onDelete() {
                this.forEachChild(child => {
                        child.onDelete();
                });

                super.onDelete();
        }

        onClick() {
                this.expanded = !this.expanded;
                this.icon = this.expanded ? FolderNode.OPEN_ICON : FolderNode.CLOSED_ICON;
                this.setDescendantsVisibility(this.expanded);
        }

        setDescendantsVisibility(visible) {
                this.forEachChild(child => {
                        child.hidden = !visible;

                        if (child instanceof FolderNode) {
                                child.setDescendantsVisibility(visible && child.expanded);
                        }
                });
        }

        getSubtreeElements() {
                const elements = super.getSubtreeElements();
                this.forEachChild(child => {
                        const childSubtreeElements = child.getSubtreeElements();
                        elements.push(...childSubtreeElements);
                });

                return elements;
        }
}

class FileDrag {
        static FOLDER_HOVER_OPEN_DELAY = 500;

        static DropPosition = Object.freeze({
                ABOVE: Symbol("ABOVE"),
                BELOW: Symbol("BELOW")
        });

        static NameClashDropOption = Object.freeze({
                CANCEL: Symbol("CANCEL"),
                RENAME: Symbol("RENAME"),
                REPLACE: Symbol("REPLACE")
        });

        constructor(editor, element, onFinish = null) {
                this.editor = editor;
                this.fileList = editor.querySelector("#file-list");
                this.dropLine = editor.querySelector("#file-drop-line");
                this.draggedElement = element;
                this._receivingElement = null;
                this.folderOpenTimeout = null;
                this._dropPosition = null;
                this.onFinish = onFinish;
        }

        get draggedNode() {
                return this.draggedElement.__node;
        }

        get receivingElement() {
                return this._receivingElement;
        }

        set receivingElement(receivingElement) {
                if (receivingElement !== this._receivingElement) {
                        if (this.folderOpenTimeout !== null) {
                                clearTimeout(this.folderOpenTimeout);
                                this.folderOpenTimeout = null;
                        }
                }

                this._receivingElement = receivingElement;
                this.dropLine.classList.toggle("active", receivingElement !== null);
        }

        get receivingNode() {
                return this.receivingElement?.__node ?? null;
        }

        get dropPosition() {
                return this._dropPosition;
        }

        set dropPosition(dropPosition) {
                if (this._dropPosition !== dropPosition) {
                        if (this.folderOpenTimeout !== null) {
                                clearTimeout(this.folderOpenTimeout);
                                this.folderOpenTimeout = null;
                        }
                }

                this._dropPosition = dropPosition;
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
                const containerRectangle = this.fileList.getBoundingClientRect();

                const receivingElement = event.target.closest(".file:not(.hidden)");
                if (receivingElement === null) {
                        // Check if the drag is below the very last element. It is guaranteed for
                        // there to be at least one visible element because this file is being dragged
                        // Find the last visible element, since the root is always expanded,
                        // it is guaranteed that there will be an element that is visible now
                        let lastElement = this.fileList.lastElementChild;
                        while (lastElement.__node.hidden) {
                                lastElement = lastElement.previousElementSibling;
                        }

                        if (lastElement === this.draggedElement) {
                                // The dragged element is the last visible element and it is already in the root
                                if (lastElement.__node.parent === this.fileList.__node) {
                                        this.receivingElement = null;
                                        return;
                                }
                        }

                        if (this.draggedNode instanceof FolderNode && this.draggedNode.parent === this.fileList.__node) {
                                // The dragged folder is already at the root, but the last visible element is a descendant of it
                                if (lastElement.__node.isDescendantOf(this.draggedNode)) {
                                        this.receivingElement = null;
                                        return;
                                }
                        }

                        const lastRectangle = lastElement.getBoundingClientRect();
                        if (event.clientY > lastRectangle.bottom) {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";

                                // Dragging below the last element, allow a drop at the root
                                this.dropLine.style.top = `${lastRectangle.bottom - containerRectangle.top}px`;
                                this.dropLine.style.width = `${lastRectangle.width}px`;
                                this.receivingElement = this.fileList;
                                return;
                        }

                        this.receivingElement = null;
                        return;
                }

                // You can't drop a file above or below itself
                if (receivingElement === this.draggedElement) {
                        this.receivingElement = null;
                        return;
                }

                if (this.draggedNode instanceof FolderNode) {
                        // Make sure you don't drop a folder into itself
                        if (receivingElement.__node.isDescendantOf(this.draggedNode)) {
                                this.receivingElement = null;
                                return;
                        }
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                this.receivingElement = receivingElement;

                const receivingRectangle = receivingElement.getBoundingClientRect();
                this.dropPosition = event.clientY < receivingRectangle.top + receivingRectangle.height / 2
                        ? FileDrag.DropPosition.ABOVE : FileDrag.DropPosition.BELOW;
                this.dropLine.style.top = this.dropPosition === FileDrag.DropPosition.ABOVE
                        ? `${receivingRectangle.top - containerRectangle.top}px`
                        : `${receivingRectangle.bottom - containerRectangle.top}px`;

                // Make sure the width of the drop line matches even when there is a vertical scrollbar
                this.dropLine.style.width = `${receivingRectangle.width}px`;

                if (this.receivingNode instanceof FolderNode && !this.receivingNode.expanded && this.dropPosition === FileDrag.DropPosition.BELOW) {
                        if (this.folderOpenTimeout === null) {
                                this.folderOpenTimeout = setTimeout(() => {
                                        this.receivingNode.toggle();
                                        this.folderOpenTimeout = null;
                                }, FileDrag.FOLDER_HOVER_OPEN_DELAY);
                        }
                }
        }

        dragLeave(event) {
                if (event.relatedTarget === null || !this.fileList.contains(event.relatedTarget)) {
                        this.receivingElement = null;
                }
        }

        drop(event) {
                event.preventDefault();

                if (this.receivingElement === this.fileList) {
                        // If the receiving node is the root, it means that I should add it to the end of it
                        // if the dragged node is alread inside the root, shift the insertion index
                        let droppedIndex = this.receivingNode.getChildCount();
                        const futureSiblings = this.receivingNode.getChildren();
                        if (futureSiblings.includes(this.draggedNode)) {
                                --droppedIndex;
                        }

                        this.confirmDrop(this.receivingNode, droppedIndex);
                        return;
                }

                // Dropping right below an open folder will make the node enter the dropped folder
                if (this.receivingNode instanceof FolderNode) {
                        if (this.receivingNode.expanded && this.dropPosition === FileDrag.DropPosition.BELOW) {
                                this.confirmDrop(this.receivingNode, 0);
                                return;
                        }
                }

                const futureSiblings = this.receivingNode.parent.getChildren();
                let droppedIndex = futureSiblings.indexOf(this.receivingNode);
                if (this.dropPosition === FileDrag.DropPosition.BELOW) {
                        ++droppedIndex;
                }

                // If the dragged file has the same parent as the drop target, shift the insertion index
                if (futureSiblings.includes(this.draggedNode)) {
                        const draggedIndex = futureSiblings.indexOf(this.draggedNode);
                        if (draggedIndex < droppedIndex) {
                                --droppedIndex;
                        }
                }

                this.confirmDrop(this.receivingNode.parent, droppedIndex);
        }

        async confirmDrop(parentNode, droppedIndex) {
                let replacedNode = null;
                let shouldRename = false;

                const futureSiblings = parentNode.getChildren();
                if (!futureSiblings.includes(this.draggedNode)) {
                        // If the file is dropping in a different folder,
                        // make sure there is no name clash between files
                        for (const futureSibling of futureSiblings) {
                                if (futureSibling.name === this.draggedNode.name) {
                                        const nameClashModal = new Modal(this.editor, {
                                                title: `Cannot Move Item`,
                                                message: `An item in this folder already has the name <code>${this.draggedNode.name}</code>.`,
                                                buttons: [
                                                        {
                                                                label: "Cancel",
                                                                value: FileDrag.NameClashDropOption.CANCEL
                                                        },
                                                        {
                                                                label: "Rename",
                                                                value: FileDrag.NameClashDropOption.RENAME
                                                        },
                                                        {
                                                                label: "Replace",
                                                                backgroundColor: "var(--dark-invalid-color)",
                                                                value: FileDrag.NameClashDropOption.REPLACE
                                                        }
                                                ]
                                        });

                                        const option = await nameClashModal.prompt();
                                        if (option === FileDrag.NameClashDropOption.CANCEL) {
                                                return;
                                        }

                                        if (option === FileDrag.NameClashDropOption.RENAME) {
                                                shouldRename = true;
                                        }

                                        if (option === FileDrag.NameClashDropOption.REPLACE) {
                                                replacedNode = futureSibling;
                                        }

                                        break;
                                }
                        }
                }

                parentNode.addChild(this.draggedNode, droppedIndex);

                if (replacedNode !== null) {
                        replacedNode.requestDeletion(false);
                }

                if (shouldRename) {
                        let temporaryName = "";
                        let temporaryNameNumber = 0;
                        let temporaryNameClash = true;
                        while (temporaryNameClash) {
                                ++temporaryNameNumber;
                                temporaryNameClash = false;

                                // I can use the previous siblings array because it didn't (and still dosen't) contain the newly dropped node
                                temporaryName = `${this.draggedNode.base} (${temporaryNameNumber})${this.draggedNode.extension}`;
                                for (const currentSibling of futureSiblings) {
                                        if (currentSibling.name === temporaryName) {
                                                temporaryNameClash = true;
                                                break;
                                        }
                                }
                        }

                        this.draggedNode.name = temporaryName;
                        this.draggedNode.beginRenaming();
                }
        }
};

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

                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                this.receivingElement = receivingElement;

                const receivingRectangle = receivingElement.getBoundingClientRect();
                this.dropPosition = event.clientX < receivingRectangle.left + receivingRectangle.width / 2
                        ? TabDrag.DropPosition.LEFT : TabDrag.DropPosition.RIGHT;
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

export function getFilenameInformation(filename) {
        const filenameInformation = {
                base: filename,
                extension: ""
        };

        const index = filename.lastIndexOf(".");
        if (index !== -1) {
                filenameInformation.base = filename.slice(0, index);
                filenameInformation.extension = filename.slice(index);
        }

        return filenameInformation;
}

export function setupEditorFiles(editor, onFileOpen, onFileClose) {
        const fileList = editor.querySelector("#file-list");
        const tabList = editor.querySelector("#tab-list");
        const rootNode = new RootNode(editor, fileList);

        let currentDrag = null;

        fileList.addEventListener("dragstart", event => {
                if (currentDrag !== null) {
                        return;
                }

                const draggedElement = event.target.closest(".file:not(.hidden):not(.dragging):not(.renaming)");
                if (draggedElement === null) {
                        return;
                }

                currentDrag = new FileDrag(editor, draggedElement, () => {
                        currentDrag = null;
                });

                currentDrag.dragStart(event);
        });

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

        const dragTargets = [fileList, tabList];
        for (const dragTarget of dragTargets) {
                dragTarget.addEventListener("dragend", event => {
                        currentDrag?.dragEnd(event);
                });

                dragTarget.addEventListener("dragover", event => {
                        currentDrag?.dragOver(event);
                });

                dragTarget.addEventListener("dragleave", event => {
                        currentDrag?.dragLeave(event);
                });

                dragTarget.addEventListener("drop", event => {
                        currentDrag?.drop(event);
                });
        }

        const selectionHistory = [];
        let currentFile = null;

        function removeFromHistory(file) {
                // Loop backwards to remove all instances of the current file from the selection history
                for (let selectionIndex = selectionHistory.length - 1; selectionIndex >= 0; --selectionIndex) {
                        if (selectionHistory[selectionIndex] === file) {
                                selectionHistory.splice(selectionIndex, 1);
                        }
                }
        }

        function unselectAll() {
                const selectedElements = editor.querySelectorAll(".selected");
                for (const selectedElement of selectedElements) {
                        selectedElement.classList.remove("selected");
                }
        }

        function selectFile(file) {
                if (currentFile === file) {
                        return;
                }

                if (currentFile !== null) {
                        removeFromHistory(currentFile);
                        selectionHistory.push(currentFile);
                }

                unselectAll();

                file.select(currentFile);
                currentFile = file;

                onFileOpen(currentFile);
        }

        function closeFile(file) {
                removeFromHistory(file);
                onFileClose(file);

                if (currentFile !== file) {
                        return;
                }

                // The following behavior jumps to the previously selected tab

                unselectAll();

                const previousFile = currentFile;
                currentFile = selectionHistory.pop() ?? null;
                if (currentFile !== null) {
                        currentFile.select(previousFile);
                        onFileOpen(currentFile);
                }
        }

        function addFile({ parent, type, name, children }) {
                const file = type === "folder" ? new FolderNode(editor, name) : new FileNode(editor, name, selectFile, closeFile);
                const parentNode = parent?.isDescendantOf?.(rootNode) ? parent : rootNode;
                parentNode.addChild(file);

                if (type === "folder" && Array.isArray(children)) {
                        for (const child of children) {
                                addFile({...child, parent: file});
                        }
                }

                file.scrollIntoView();
                return file;
        }

        return Object.freeze({
                addFile
        });
}