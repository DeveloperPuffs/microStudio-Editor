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
        constructor(editor, element) {
                super();

                this.editor = editor;
                this.element = element;

                Object.defineProperty(this.element, "__node", {
                        value: this,
                        writable: false,
                        configurable: false
                });
        }

        placeChild(child, sibling) {
                if (sibling === this) {
                        // Add all of the elements at the start of the root
                        const elements = child.getSubtreeElements();
                        this.element.prepend(...elements);
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
                constructor(editor, name, icon) {
                        super();

                        this.editor = editor;
                        this._name = null;
                        this._icon = null;
                        this._renaming = false;

                        this.element = document.createElement("li");
                        this.element.setAttribute("draggable", true);
                        this.element.classList.add("file");

                        this.element.addEventListener("click", () => {
                                this.onClick();
                        });

                        this.iconElement = document.createElement("div");
                        this.element.appendChild(this.iconElement);

                        this.labelElement = document.createElement("div");
                        this.labelElement.classList.add("label");
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

                        Object.defineProperty(this.element, "__node", {
                                value: this,
                                writable: false,
                                configurable: false
                        });

                        this.name = name;
                        this.icon = icon;
                }

                onClick() {
                        // Should be overriden by subclasses if needed to
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

                get hidden() {
                        return this.element.classList.contains("hidden");
                }

                set hidden(hidden) {
                        this.element.classList.toggle("hidden", hidden);
                }

                getElement() {
                        return this.element;
                }

                getSubtreeElements() {
                        return [this.element];
                }

                canStartDrag() {
                        return !this._renaming;
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

                beginRenaming() {
                        if (this._renaming) {
                                return;
                        }

                        this._renaming = true;

                        const input = document.createElement("input");
                        input.type = "text";
                        input.maxLength = 255;
                        input.value = this._name;
                        input.classList.add("rename");

                        this.labelElement.replaceWith(input);

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
                                        this.name = trimmedName;
                                }

                                cleanup();
                        };

                        const cleanup = () => {
                                if (finished) {
                                        return;
                                }

                                finished = true;
                                hideError();

                                input.replaceWith(this.labelElement);
                                this._renaming = false;
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
                                        if (sibling.name === trimmedName) {
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
                                this.parent.removeChild(this);
                                return;
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
                                this.parent.removeChild(this);
                        }
                }
        };
}

class FileNode extends ElementNode(BaseNode) {
        static Icon = Object.freeze({
                source: `<i class="fa-solid fa-file-code"></i>`,
                image: `<i class="fa-solid fa-file-image"></i>`,
                map: `<i class="fa-regular fa-map"></i>`,
                sound: `<i class="fa-solid fa-file-audio"></i>`,
                music: `<i class="fa-solid fa-music"></i>`,
                doc: `<i class="fa-solid fa-file"></i>`,
        });

        constructor(editor, name, icon, clickCallback = null) {
                super(editor, name, icon);
                this.clickCallback = clickCallback;
        }

        onClick() {
                this.clickCallback?.();
        }
}

class FolderNode extends ElementNode(ContainerNode) {
        static Icon = Object.freeze({
                closed: `<i class="fa-solid fa-folder"></i>`,
                open: `<i class="fa-solid fa-folder-open"></i>`
        });

        constructor(editor, name) {
                super(editor, name, FolderNode.Icon.closed);
        }

        onClick() {
                this.expanded = !this.expanded;
                this.icon = this.expanded ? FolderNode.Icon.open : FolderNode.Icon.closed;
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
                                        this.receivingNode.onClick();
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
                                                message: `An item in this folder already has the name "${this.draggedNode.name}".`,
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
                        let temporaryNameNumber = 0;
                        let temporaryNameClash = true;
                        while (temporaryNameClash) {
                                ++temporaryNameNumber;
                                temporaryNameClash = false;

                                // I can use the previous siblings array because it didn't (and still dosen't) contain the newly dropped node
                                const temporaryName = `${this.draggedNode.name} (${temporaryNameNumber})`;
                                for (const currentSibling of futureSiblings) {
                                        if (currentSibling.name === temporaryName) {
                                                temporaryNameClash = true;
                                                break;
                                        }
                                }
                        }

                        this.draggedNode.name = `${this.draggedNode.name} (${temporaryNameNumber})`;
                        this.draggedNode.beginRenaming();
                }
        }
};

export const FileType = Object.freeze({
        SOURCE: Symbol("SOURCE"),
        IMAGE: Symbol("IMAGE"),
        MAP: Symbol("MAP"),
        SOUND: Symbol("SOUND"),
        MUSIC: Symbol("MUSIC"),
        DOC: Symbol("DOC"),
        FOLDER: Symbol("FOLDER")
});

export function setupEditorFileTree(editor) {
        const fileList = editor.querySelector("#file-list");
        const rootNode = new RootNode(editor, fileList);

        let currentDrag = null;

        fileList.addEventListener("dragstart", event => {
                if (currentDrag !== null) {
                        return;
                }

                const draggedElement = event.target.closest(".file:not(.hidden):not(.dragging)");
                if (draggedElement === null) {
                        return;
                }

                const draggedNode = draggedElement.__node;
                if (!draggedNode.canStartDrag()) {
                        return;
                }

                currentDrag = new FileDrag(editor, draggedElement, () => {
                        currentDrag = null;
                });

                currentDrag.dragStart(event);
        });

        fileList.addEventListener("dragend", event => {
                currentDrag?.dragEnd(event);
        });

        fileList.addEventListener("dragover", event => {
                currentDrag?.dragOver(event);
        });

        fileList.addEventListener("dragleave", event => {
                currentDrag?.dragLeave(event);
        });

        fileList.addEventListener("drop", event => {
                currentDrag?.drop(event);
        });

        const fileTypeToFileIcon = {
                [FileType.SOURCE]: FileNode.Icon.source,
                [FileType.IMAGE]: FileNode.Icon.image,
                [FileType.MAP]: FileNode.Icon.map,
                [FileType.SOUND]: FileNode.Icon.sound,
                [FileType.MUSIC]: FileNode.Icon.music,
                [FileType.DOC]: FileNode.Icon.doc
        };

        const nodeToHandle = new WeakMap();
        const handleToNode = new WeakMap();

        function createHandle(node) {
                const handle = Object.freeze({
                        get name() {
                                return node.name;
                        },

                        set name(name) {
                                node.name = name;
                        },

                        isFolder() {
                                return node instanceof FolderNode;
                        }
                });

                nodeToHandle.set(node, handle);
                handleToNode.set(handle, node);

                return handle;
        }

        function addFile(parent, type, name, clickCallback = null) {
                const parentNode = handleToNode.get(parent) ?? rootNode;

                if (type === FileType.FOLDER) {
                        const node = new FolderNode(editor, name);
                        parentNode.addChild(node);
                        return createHandle(node);
                }

                const icon = fileTypeToFileIcon[type];
                const node = new FileNode(editor, name, icon, clickCallback);
                parentNode.addChild(node);
                return createHandle(node);
        }

        function removeFile(handle, confirmation) {
                const node = handleToNode.get(handle);
                if (node === undefined) {
                        return;
                }

                node.requestDeletion(confirmation);
        }

        return Object.freeze({
                addFile,
                removeFile
        });
}