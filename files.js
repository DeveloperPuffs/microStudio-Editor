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
        constructor(fileList) {
                super();

                this.fileList = fileList;
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
                                        this.element.style.paddingLeft
                                                = `calc(var(--file-base-padding) + var(--file-depth-padding) * ${nestedDepth})`;
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
                                                color: "var(--invalid-destructive-color)",
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

export function setupEditorFileTree(editor, fileTree) {
        const fileList = fileTree.querySelector("#file-list");
        const dropLine = fileTree.querySelector("#drop-line");
        const rootNode = new RootNode(fileList);

        const DropPosition = Object.freeze({
                ABOVE: Symbol("ABOVE"),
                BELOW: Symbol("BELOW")
        });

        let draggedElement = null;
        let receivingNode = null;
        let dropPosition = null;

        function finishDrag() {
                dropLine.classList.remove("active");

                if (draggedElement !== null) {
                        draggedElement.classList.remove("dragging");
                }

                draggedElement = null;
                receivingNode = null;
                dropPosition = null;
        }

        fileList.addEventListener("dragstart", event => {
                const element = event.target.closest(".file:not(.hidden):not(.dragging)");
                if (element === null || !element.__node.canStartDrag()) {
                        return;
                }

                draggedElement = element;
                draggedElement.classList.add("dragging");

                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", "ignored");
        });

        fileList.addEventListener("dragover", event => {
                if (draggedElement === null) {
                        return;
                }

                const containerRectangle = dropLine.parentElement.getBoundingClientRect();

                const targetElement = event.target.closest(".file:not(.hidden)");
                if (targetElement === null) {
                        // Check if the drag is below the very last element
                        let lastElement = fileList.lastElementChild;
                        if (lastElement === null) {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";

                                // The file list is empty, allow a drop at the root
                                dropLine.classList.add("active");
                                dropLine.style.top = "0";
                                dropLine.style.width = `${containerRectangle.width}px`;
                                receivingNode = rootNode;
                                return;
                        }

                        // Find the last visible element, since the root is always expanded,
                        // it is guaranteed that there will be an element that is visible now
                        while (lastElement.__node.hidden) {
                                lastElement = lastElement.previousElementSibling;
                        }

                        const rectangle = lastElement.getBoundingClientRect();
                        if (event.clientY > rectangle.bottom) {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";

                                // Dragging below the last element, allow a drop at the root
                                dropLine.classList.add("active");
                                dropLine.style.top = `${rectangle.bottom - containerRectangle.top}px`;
                                dropLine.style.width = `${rectangle.width}px`;
                                receivingNode = rootNode;
                                return;
                        }

                        dropLine.classList.remove("active");
                        return;
                }

                if (targetElement.__node === draggedElement.__node) {
                        dropLine.classList.remove("active");
                        return;
                }

                if (draggedElement.__node instanceof FolderNode) {
                        // Make sure you don't drop a folder into itself
                        if (targetElement.__node.isDescendantOf(draggedElement.__node)) {
                                dropLine.classList.remove("active");
                                return;
                        }
                }

                const targetRectangle = targetElement.getBoundingClientRect();
                dropPosition = event.clientY < targetRectangle.top + targetRectangle.height / 2
                        ? DropPosition.ABOVE
                        : DropPosition.BELOW;

                if (dropPosition === DropPosition.ABOVE) {
                        let aboveElement = targetElement.previousElementSibling;
                        while (aboveElement !== null && aboveElement !== draggedElement && aboveElement.__node.hidden) {
                                aboveElement = aboveElement.previousElementSibling;
                        }

                        if (aboveElement === draggedElement) {
                                dropLine.classList.remove("active");
                                return;
                        }
                }

                if (dropPosition === DropPosition.BELOW) {
                        let belowElement = targetElement.nextElementSibling;
                        while (belowElement !== null && belowElement !== draggedElement && belowElement.__node.hidden) {
                                belowElement = belowElement.nextElementSibling;
                        }

                        if (belowElement === draggedElement) {
                                dropLine.classList.remove("active");
                                return;
                        }
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = "move";

                receivingNode = targetElement.__node;

                dropLine.style.top = dropPosition === DropPosition.ABOVE
                        ? `${targetRectangle.top - containerRectangle.top}px`
                        : `${targetRectangle.bottom - containerRectangle.top}px`;

                // Make sure the width matches even when there is a scrollbar
                dropLine.style.width = `${targetRectangle.width}px`;
                dropLine.classList.add("active");
        });

        fileList.addEventListener("dragleave", event => {
                if (event.relatedTarget === null || !fileList.contains(event.relatedTarget)) {
                        dropLine.classList.remove("active");
                }
        });

        fileList.addEventListener("dragend", () => {
                finishDrag();
        });

        const NameClashDropOption = Object.freeze({
                CANCEL: Symbol("CANCEL"),
                RENAME: Symbol("RENAME"),
                REPLACE: Symbol("REPLACE")
        });

        async function confirmDrop(receivingNode, droppedNode, droppedIndex) {
                let replacedNode = null;
                let shouldRename = false;

                const futureSiblings = receivingNode.getChildren();
                if (!futureSiblings.includes(droppedNode)) {
                        // If the file is dropping in a different folder,
                        // make sure there is no name clash between files
                        for (const futureSibling of futureSiblings) {
                                if (futureSibling.name === droppedNode.name) {
                                        const nameClashModal = new Modal(editor, {
                                                title: `Cannot Move Item`,
                                                message: `An item in this folder already has the name "${droppedNode.name}".`,
                                                buttons: [
                                                        {
                                                                label: "Cancel",
                                                                value: NameClashDropOption.CANCEL
                                                        },
                                                        {
                                                                label: "Rename",
                                                                value: NameClashDropOption.RENAME
                                                        },
                                                        {
                                                                label: "Replace",
                                                                color: "var(--invalid-destructive-color)",
                                                                value: NameClashDropOption.REPLACE
                                                        }
                                                ]
                                        });

                                        const option = await nameClashModal.prompt();
                                        if (option === NameClashDropOption.CANCEL) {
                                                return;
                                        }

                                        if (option === NameClashDropOption.RENAME) {
                                                shouldRename = true;
                                        }

                                        if (option === NameClashDropOption.REPLACE) {
                                                replacedNode = futureSibling;
                                        }

                                        break;
                                }
                        }
                }

                receivingNode.addChild(droppedNode, droppedIndex);

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
                                const temporaryName = `${droppedNode.name} (${temporaryNameNumber})`;
                                for (const currentSibling of futureSiblings) {
                                        if (currentSibling.name === temporaryName) {
                                                temporaryNameClash = true;
                                                break;
                                        }
                                }
                        }

                        droppedNode.name = `${droppedNode.name} (${temporaryNameNumber})`;
                        droppedNode.beginRenaming();
                }
        }

        fileList.addEventListener("drop", async event => {
                event.preventDefault();

                if (draggedElement === null || receivingNode === null) {
                        return;
                }

                if (receivingNode === rootNode) {
                        // If the receiving node is the root, it means that I should add it to the end of the root
                        // if the dragged node is alread inside the root, shift the insertion index
                        let droppedIndex = receivingNode.getChildCount();
                        const futureSiblings = receivingNode.getChildren();
                        if (futureSiblings.includes(draggedElement.__node)) {
                                --droppedIndex;
                        }

                        await confirmDrop(receivingNode, draggedElement.__node, droppedIndex);

                        finishDrag();
                        return;
                }

                // Dropping right below an open folder will make the node enter the dropped folder
                if (receivingNode instanceof FolderNode && receivingNode.expanded && dropPosition === DropPosition.BELOW) {
                        await confirmDrop(receivingNode, draggedElement.__node, 0);

                        finishDrag();
                        return;
                }

                const futureSiblings = receivingNode.parent.getChildren();
                let droppedIndex = futureSiblings.indexOf(receivingNode);
                if (dropPosition === DropPosition.BELOW) {
                        ++droppedIndex;
                }

                // If the dragged file has the same parent as the drop target, shift the insertion index
                if (futureSiblings.includes(draggedElement.__node)) {
                        const draggedIndex = futureSiblings.indexOf(draggedElement.__node);
                        if (draggedIndex < droppedIndex) {
                                --droppedIndex;
                        }
                }

                await confirmDrop(receivingNode.parent, draggedElement.__node, droppedIndex);
                finishDrag();
        });

        rootNode.addChild(new FileNode(editor, "File A", FileNode.Icon.source));
        rootNode.addChild(new FileNode(editor, "File B", FileNode.Icon.source));

        const folder1 = new FolderNode(editor, "Folder 1");
        rootNode.addChild(folder1);

        folder1.addChild(new FileNode(editor, "File B", FileNode.Icon.source));

        const folder2 = new FolderNode(editor, "Folder 2");
        folder1.addChild(folder2);

        folder2.addChild(new FileNode(editor, "File D", FileNode.Icon.source));

        folder1.addChild(new FileNode(editor, "File E", FileNode.Icon.source));

        rootNode.addChild(new FileNode(editor, "File F", FileNode.Icon.source));
}