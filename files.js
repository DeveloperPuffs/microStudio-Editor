class TreeNode {
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
        }

        getDepthFromRoot() {
                let nestedDepth = 0;
                let currentParent = this.parent;
                while (currentParent !== null) {
                        if (currentParent instanceof RootNode) {
                                return nestedDepth;
                        }

                        currentParent = currentParent.parent;
                        ++nestedDepth;
                }

                return null;
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

class ContainerNode extends TreeNode {
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

        // Places child (including all of its elements) after the sibling
        placeChild(child, sibling) {
                const elements = child.getSubtreeElements();

                if (sibling === null) {
                        for (const element of elements) {
                                element.remove();
                        }

                        return;
                }

                sibling.view.element.after(...elements);
        }

        addChild(node, index = this._children.length) {
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
                        if (sibling._children.length === 0) {
                                break;
                        }

                        sibling = sibling._children[sibling._children.length - 1];
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

class FileNode extends TreeNode {
        static Icon = Object.freeze({
                source: `<i class="fa-solid fa-file-code"></i>`,
                image: `<i class="fa-solid fa-file-image"></i>`,
                map: `<i class="fa-regular fa-map"></i>`,
                sound: `<i class="fa-solid fa-file-audio"></i>`,
                music: `<i class="fa-solid fa-music"></i>`,
                doc: `<i class="fa-solid fa-file"></i>`,
        });

        constructor(name, icon, callback = null) {
                super();

                this.view = new NodeView(this, name, icon, callback);
        }

        onParentChanged(parent) {
                super.onParentChanged(parent);

                const depth = this.getDepthFromRoot();
                if (depth === null) {
                        return;
                }

                this.view.setIndentationDepth(depth);

                let currentParent = parent;
                while (!(currentParent instanceof RootNode)) {
                        if (currentParent instanceof FolderNode) {
                                if (!currentParent.expanded) {
                                        this.view.hidden = true;
                                        break;
                                }
                        }

                        currentParent = currentParent.parent;
                }
        }

        getSubtreeElements() {
                return [this.view.element];
        }
}

class FolderNode extends ContainerNode {
        static Icon = Object.freeze({
                closed: `<i class="fa-solid fa-folder"></i>`,
                open: `<i class="fa-solid fa-folder-open"></i>`
        });

        constructor(name) {
                super();

                this.expanded = false;
                this.view = new NodeView(this, name, FolderNode.Icon.closed, () => {
                        this.expanded = !this.expanded;
                        this.view.icon = this.expanded
                                ? FolderNode.Icon.open
                                : FolderNode.Icon.closed;
                        this.setDescendantsVisibility(this.expanded);
                });
        }

        setDescendantsVisibility(visible) {
                this.forEachChild(child => {
                        child.view.hidden = !visible;

                        if (child instanceof FolderNode) {
                                child.setDescendantsVisibility(visible && child.expanded);
                        }
                });
        }

        onParentChanged(parent) {
                super.onParentChanged(parent);

                const depth = this.getDepthFromRoot();
                if (depth === null) {
                        return;
                }

                this.view.setIndentationDepth(depth);

                let currentParent = parent;
                while (!(currentParent instanceof RootNode)) {
                        if (currentParent instanceof FolderNode) {
                                if (!currentParent.expanded) {
                                        this.view.hidden = true;
                                        break;
                                }
                        }

                        currentParent = currentParent.parent;
                }
        }

        getSubtreeElements() {
                const elements = [];
                const stack = [this];

                while (stack.length > 0) {
                        const currentNode = stack.pop();
                        elements.push(currentNode.view.element);

                        if (currentNode instanceof ContainerNode) {
                                for (let index = currentNode._children.length - 1; index >= 0; --index) {
                                        stack.push(currentNode._children[index]);
                                }
                        }
                }

                return elements;
        }
}

class NodeView {
        constructor(node, name, icon, callback = null) {
                this._name = null;
                this._icon = null;
                this.callback = callback;

                this.element = document.createElement("li");
                this.element.setAttribute("draggable", true);
                this.element.classList.add("file");

                this.iconElement = document.createElement("div");
                this.element.appendChild(this.iconElement);

                this.labelElement = document.createElement("div");
                this.labelElement.classList.add("label");
                this.element.appendChild(this.labelElement);

                this.deleteElement = document.createElement("div");
                this.deleteElement.classList.add("delete");
                this.deleteElement.innerHTML = `<i class="fa-solid fa-trash"></i>`;
                this.element.appendChild(this.deleteElement);

                this.element.addEventListener("click", () => {
                        this.callback?.();
                });

                Object.defineProperty(this.element, "__node", {
                        value: node,
                        writable: false,
                        configurable: false
                });

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

        get hidden() {
                return this.element.classList.contains("hidden");
        }

        set hidden(hidden) {
                this.element.classList.toggle("hidden", hidden);
        }

        setIndentationDepth(indentationDepth) {
                this.element.style.paddingLeft = `calc(var(--file-base-padding) + var(--file-depth-padding) * ${indentationDepth})`;
        }
}

export function setupEditorFileTree(fileTree) {
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
                if (element === null) {
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
                        while (lastElement.__node.view.hidden) {
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
                        while (aboveElement !== null && aboveElement !== draggedElement && aboveElement.__node.view.hidden) {
                                aboveElement = aboveElement.previousElementSibling;
                        }

                        if (aboveElement === draggedElement) {
                                dropLine.classList.remove("active");
                                return;
                        }
                }

                if (dropPosition === DropPosition.BELOW) {
                        let belowElement = targetElement.nextElementSibling;
                        while (belowElement !== null && belowElement !== draggedElement && belowElement.__node.view.hidden) {
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

        fileList.addEventListener("drop", event => {
                event.preventDefault();

                if (draggedElement === null || receivingNode === null) {
                        return;
                }

                if (receivingNode === rootNode) {
                        // If the receiving node is the root, it means that I should add it to the end of the root
                        // if the dragged node is alread inside the root, shift the insertion index
                        let insertionIndex = receivingNode._children.length;
                        if (receivingNode._children.includes(draggedElement.__node)) {
                                --insertionIndex;
                        }

                        receivingNode.addChild(draggedElement.__node, insertionIndex);
                        finishDrag();
                        return;
                }

                if (receivingNode instanceof FolderNode && receivingNode.expanded && dropPosition === DropPosition.BELOW) {
                        receivingNode.addChild(draggedElement.__node, 0);
                        finishDrag();
                        return;
                }

                let insertionIndex = receivingNode.parent._children.indexOf(receivingNode);
                if (dropPosition === DropPosition.BELOW) {
                        ++insertionIndex;
                }

                // If the dragged file has the same praent as the drop target, shift the insertion index
                const draggedIndex = receivingNode.parent._children.indexOf(draggedElement.__node);
                if (draggedIndex !== -1 && draggedIndex < insertionIndex) {
                        --insertionIndex;
                }

                receivingNode.parent.addChild(draggedElement.__node, insertionIndex);

                finishDrag();
        });

        rootNode.addChild(new FileNode("File A", FileNode.Icon.source));
        rootNode.addChild(new FileNode("File B", FileNode.Icon.source));

        const folder1 = new FolderNode("Folder 1");
        rootNode.addChild(folder1);

        folder1.addChild(new FileNode("File C", FileNode.Icon.source));

        const folder2 = new FolderNode("Folder 2");
        folder1.addChild(folder2);

        folder2.addChild(new FileNode("File D", FileNode.Icon.source));

        folder1.addChild(new FileNode("File E", FileNode.Icon.source));

        rootNode.addChild(new FileNode("File F", FileNode.Icon.source));
}