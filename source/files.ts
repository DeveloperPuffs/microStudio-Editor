import { Modal } from "./modal.ts";

declare global {
        interface HTMLElement {
                __node?: RootNode | FileNode | FolderNode;
        }
}

abstract class BaseNode {
        protected parent?: ContainerNode;

        getParent() {
                return this.parent;
        }

        setParent(parent: ContainerNode | undefined) {
                this.parent = parent;
                // Should be overriden by subclasses if needed
        }

        linkElement(element: HTMLElement) {
                Object.defineProperty(element, "__node", {
                        value: this,
                        writable: false,
                        configurable: false
                });
        }

        getSiblings() {
                if (this.parent === undefined) {
                        return [];
                }

                const siblings: BaseNode[] = [];
                this.parent.forEachChild((child: BaseNode) => {
                        if (child === this) {
                                return;
                        }

                        siblings.push(child);
                });

                return siblings;
        }

        isDescendantOf(parent: ContainerNode) {
                let currentParent = this.parent;
                while (currentParent !== undefined) {
                        if (currentParent === parent) {
                                return true;
                        }

                        currentParent = currentParent.parent;
                }

                return false;
        }
}

abstract class ContainerNode extends BaseNode {
        private children: BaseNode[] = [];

        // FolderNode needs to call this because it inherits
        // this class while extending directly from ElementNode
        _intializeChildren() {
                this.children = [];
        }

        setParent(parent: ContainerNode | undefined) {
                super.setParent(parent);

                // Propagate the event to children to let them update their state
                this.forEachChild((child: BaseNode) => {
                        child.setParent(this);
                });
        }

        forEachChild(action: (child: BaseNode) => void) {
                this.children.forEach(action);
        }

        getChildren() {
                return [...this.children];
        }

        countChildren() {
                return this.children.length;
        }

        // Returns the sibling which comes before this node, or undefined if it was not added
        addChild(child: ElementNode, index = this.countChildren()) {
                // Cannot add a container node into itself
                if ((child as unknown as typeof this) === this) {
                        return undefined;
                }

                if (child instanceof ContainerNode) {
                        if (this.isDescendantOf(child)) {
                                return undefined;
                        }
                }

                const previousParent = child.getParent();
                if (previousParent !== undefined) {
                        previousParent.removeChild(child);
                }

                this.children.splice(index, 0, child);
                child.setParent(this);

                if (index === 0) {
                        // If there are no children place it right after the container itself
                        return this;
                }

                // The sibling is the child preceeding the node that was just added
                let sibling = this.children[index - 1] as ElementNode | undefined;

                // If the sibling is a folder, find the last child of the sibling
                while (sibling instanceof FolderNode) {
                        const siblingChildren = sibling.getChildren();
                        if (siblingChildren.length === 0) {
                                break;
                        }

                        sibling = siblingChildren[siblingChildren.length - 1] as ElementNode | undefined;
                }

                // If there is only one child, place it right after the container itself
                if (sibling === undefined) {
                        return this;
                }

                return sibling;
        }

        // Returns whether the child was removed sucessfully
        removeChild(child: BaseNode) {
                const index = this.children.indexOf(child);
                if (index === -1) {
                        return false;
                }

                this.children.splice(index, 1);
                child.setParent(undefined);

                return true;
        }
}

export class RootNode extends ContainerNode {
        constructor() {
                super();

                const fileList = document.querySelector<HTMLUListElement>("#file-list")!;
                this.linkElement(fileList);
        }

        addChild(child: ElementNode, index = this.countChildren()) {
                const leftSibling = super.addChild(child, index);
                if (leftSibling === undefined) {
                        return undefined;
                }

                if (leftSibling === this) {
                        // Add all of the elements at the start of the file list
                        const fileList = document.querySelector<HTMLUListElement>("#file-list")!;
                        fileList.prepend(...child.getSubtreeElements());
                        return undefined;
                }

                const subtreeElements = child.getSubtreeElements();
                const siblingElement = (leftSibling as ElementNode).getElement();
                siblingElement.after(...subtreeElements);

                return undefined;
        }

        removeChild(child: ElementNode) {
                if (!super.removeChild(child)) {
                        return false;
                }

                const subtreeElements = child.getSubtreeElements();
                for (const subtreeElement of subtreeElements) {
                        subtreeElement.remove();
                }

                return true;
        }
}

abstract class ElementNode extends BaseNode {
        private element: HTMLLIElement;
        private icon: HTMLDivElement;
        private label: HTMLSpanElement;
        private delete: HTMLDivElement;

        constructor(name: string, icon: string) {
                super();

                this.element = document.createElement("li");
                this.element.setAttribute("draggable", "true");
                this.element.classList.add("file");

                this.element.addEventListener("click", event => {
                        event.stopPropagation();
                        this.onClick();
                });

                this.icon = document.createElement("div");
                this.icon.innerHTML = icon;
                this.element.appendChild(this.icon);

                this.label = document.createElement("div");
                this.label.classList.add("label");
                this.label.textContent = name;
                this.element.appendChild(this.label);

                this.label.addEventListener("dblclick", event => {
                        event.stopPropagation();
                        this.beginRenaming();
                });

                this.delete = document.createElement("div");
                this.delete.classList.add("delete");
                this.delete.innerHTML = `<i class="fa-solid fa-trash"></i>`;
                this.element.appendChild(this.delete);

                this.delete.addEventListener("click", event => {
                        event.stopPropagation();
                        this.requestDeletion(true);
                });

                this.linkElement(this.element);
        }

        getName() {
                return this.label.textContent;
        }

        setName(name: string) {
                this.label.textContent = name;
        }

        getIcon() {
                return this.icon.innerHTML;
        }

        setIcon(icon: string) {
                this.icon.innerHTML = icon;
        }

        getHidden() {
                return this.element.classList.contains("hidden");
        }

        setHidden(hidden: boolean) {
                this.element.classList.toggle("hidden", hidden);
        }

        getBaseName() {
                return this.getName();
        }

        getExtension(): string | undefined {
                return undefined;
        }

        getElement() {
                return this.element;
        }

        getSubtreeElements() {
                return [this.element];
        }

        setParent(parent: ContainerNode) {
                super.setParent(parent);

                // Loop over the descendants to update the visual state of the file
                let nestedDepth = 0;
                let currentParent = this.parent;
                while (currentParent !== undefined) {
                        if (currentParent instanceof FolderNode) {
                                if (!currentParent.getExpanded()) {
                                        this.setHidden(true);
                                }
                        }

                        if (currentParent instanceof RootNode) {
                                this.element.style.paddingLeft = `${16 + nestedDepth * 24}px`;
                                break;
                        }

                        currentParent = currentParent.getParent();
                        ++nestedDepth;
                }
        }

        onClick() {
                // Should be overriden by subclasses if needed
        }

        onDelete() {
                const parent = this.getParent();
                if (parent === undefined) {
                        return;
                }

                parent.removeChild(this);
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
                input.value = this.getBaseName();
                input.classList.add("rename");
                renameWrapper.appendChild(input);

                const extension = this.getExtension();
                if (extension !== undefined) {
                        const extensionLabel = document.createElement("span");
                        extensionLabel.textContent = extension;
                        extensionLabel.classList.add("extension");
                        renameWrapper.appendChild(extensionLabel);
                }

                this.label.replaceWith(renameWrapper);

                input.focus();
                input.select();

                let finished = false;
                const error = document.querySelector<HTMLDivElement>("#file-error")!;
                const fileList = document.querySelector<HTMLUListElement>("#file-list")!;

                const showError = (message: string) => {
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
                                this.setName(trimmedName + (extension ?? ""));
                        }

                        cleanup();
                };

                const cleanup = () => {
                        if (finished) {
                                return;
                        }

                        finished = true;
                        hideError();

                        renameWrapper.replaceWith(this.label);
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
                                if (!(sibling instanceof ElementNode)) {
                                        continue;
                                }

                                if (sibling.getName() === trimmedName + (extension ?? "")) {
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

        async requestDeletion(confirmation: boolean) {
                if (!confirmation) {
                        this.onDelete();
                        return true;
                }

                const deleteConfirmation = new Modal({
                        title: "Delete Item",
                        body: `
                                Are you sure you want to delete <code>${this.getName()}</code>
                                and all of its contents? This action is irreversible.
                        `,
                        buttonOptions: [
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

export class FileNode extends ElementNode {
        private tab: HTMLLIElement;
        private tabIcon: HTMLDivElement;
        private tabLabel: HTMLSpanElement;
        private tabClose: HTMLDivElement;

        constructor(name: string) {
                const { extension } = getFilenameInformation(name);

                switch (extension) {
                        case ".js": case ".ms": {
                                super(name, `<i class="fa-solid fa-file-code"></i>`);
                                break;
                        }

                        case ".png": case ".jpg": case ".jpeg": {
                                super(name, `<i class="fa-solid fa-file-image"></i>`);
                                break;
                        }

                        case ".map": {
                                super(name, `<i class="fa-regular fa-map"></i>`);
                                break;
                        }

                        case ".wav": {
                                super(name, `<i class="fa-solid fa-file-audio"></i>`);
                                break;
                        }

                        case ".mp3": {
                                super(name, `<i class="fa-solid fa-music"></i>`);
                                break;
                        }

                        case ".md": {
                                super(name, `<i class="fa-solid fa-file"></i>`);
                                break;
                        }

                        default: {
                                super(name, `<i class="fa-solid fa-question"></i>`);
                                break;
                        }
                }

                this.tab = document.createElement("li");
                this.tab.setAttribute("draggable", "true");
                this.tab.classList.add("tab");

                this.tabIcon = document.createElement("div");
                this.tabIcon.innerHTML = this.getIcon();
                this.tab.appendChild(this.tabIcon);

                this.tabLabel = document.createElement("span");
                this.tabLabel.classList.add("label");
                this.tabLabel.textContent = name;
                this.tab.appendChild(this.tabLabel);

                this.tabClose = document.createElement("div");
                this.tabClose.classList.add("close");
                this.tabClose.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
                this.tab.appendChild(this.tabClose);

                this.tab.addEventListener("click", event => {
                        event.stopPropagation();
                        selectFile(this);
                });

                this.tabClose.addEventListener("click", event => {
                        event.stopPropagation();
                        this.tab.remove();
                        closeFile(this);
                });
        }

        setName(name: string) {
                super.setName(name);
                this.tabLabel.textContent = name;
        }

        getBaseName() {
                const filenameInformation = getFilenameInformation(this.getName());
                return filenameInformation.baseName;
        }

        getExtension() {
                const filenameInformation = getFilenameInformation(this.getName());
                return filenameInformation.extension;
        }

        onClick() {
                selectFile(this);
        }

        select(previousFile: FileNode | undefined) {
                const tabList = document.querySelector<HTMLUListElement>("#tab-list")!;

                if (!tabList.contains(this.tab)) {
                        tabList.appendChild(this.tab);

                        if (previousFile !== undefined) {
                                const previousTab = previousFile.tab;
                                previousTab.after(this.tab);
                        }

                        this.tab.scrollIntoView({
                                block: "nearest",
                                inline: "center",
                                behavior: "auto"
                        });
                }

                const element = this.getElement();
                element.classList.add("selected");
                this.tab.classList.add("selected");
        }

        onDelete() {
                closeFile(this);
                this.tab.remove();
                super.onDelete();
        }
}

export class FolderNode extends ElementNode {
        private static readonly CLOSED_ICON = `<i class="fa-solid fa-folder"></i>`;
        private static readonly OPEN_ICON = `<i class="fa-solid fa-folder-open"></i>`;

        private expanded = false;

        constructor(name: string) {
                super(name, FolderNode.CLOSED_ICON);
                this._intializeChildren();
        }

        setParent(parent: ContainerNode) {
                // I have to override this or else it won't let FolderNode inherit both ContainerNode and ElementNode
                // BaseNode.prototype.setParent() will be called twice because both use super.setParent(), but it should be fine
                ContainerNode.prototype.setParent.call(this, parent);
                ElementNode.prototype.setParent.call(this, parent);
        }

        addChild(child: ElementNode, index = this.countChildren()) {
                const leftSibling = ContainerNode.prototype.addChild.call(this, child, index);
                
                if (leftSibling === undefined) {
                        return undefined;
                }

                if (!(leftSibling instanceof ElementNode)) {
                        return undefined;
                }

                const subtreeElements = child.getSubtreeElements();
                const siblingElement = leftSibling.getElement();
                siblingElement.after(...subtreeElements);

                this.setDescendantsVisibility(this.expanded);
                return undefined;
        }

        removeChild(child: ElementNode) {
                if (!ContainerNode.prototype.removeChild.call(this, child)) {
                        return false;
                }

                const subtreeElements = child.getSubtreeElements();
                for (const subtreeElement of subtreeElements) {
                        subtreeElement.remove();
                }

                return true;
        }

        onDelete() {
                this.forEachChild((child: BaseNode) => {
                        if (!(child instanceof ElementNode)) {
                                return;
                        }

                        child.onDelete();
                });

                ElementNode.prototype.onDelete.call(this);
        }

        onClick() {
                this.expanded = !this.expanded;
                this.setIcon(this.expanded ? FolderNode.OPEN_ICON : FolderNode.CLOSED_ICON);
                this.setDescendantsVisibility(this.expanded);
        }

        getExpanded() {
                return this.expanded;
        }

        setDescendantsVisibility(visibility: boolean) {
                this.forEachChild((child: BaseNode) => {
                        if (!(child instanceof ElementNode)) {
                                return;
                        }

                        child.setHidden(!visibility);

                        if (child instanceof FolderNode) {
                                child.setDescendantsVisibility(visibility && child.getExpanded());
                        }
                });
        }

        getSubtreeElements() {
                const elements = ElementNode.prototype.getSubtreeElements.call(this);
                this.forEachChild((child: BaseNode) => {
                        if (!(child instanceof ElementNode)) {
                                return;
                        }

                        const childSubtreeElements = child.getSubtreeElements();
                        elements.push(...childSubtreeElements);
                });

                return elements;
        }
}

export interface FolderNode extends ContainerNode {}
(() => {
        for (const property of Object.getOwnPropertyNames(ContainerNode.prototype)) {
                if (Object.prototype.hasOwnProperty.call(FolderNode.prototype, property)) {
                        continue;
                }

                const descriptor = Object.getOwnPropertyDescriptor(ContainerNode.prototype, property);
                Object.defineProperty(FolderNode.prototype, property, descriptor ?? Object.create(null));
        }
})();

enum DropPosition {
        LEFT,
        RIGHT,
        ABOVE,
        BELOW
}

enum NameClashDropOption {
        CANCEL,
        RENAME,
        REPLACE
}

class FileDrag {
        private static readonly FOLDER_HOVER_OPEN_DELAY = 500;

        private draggedElement: HTMLDivElement;
        private receivingElement?: HTMLDivElement | HTMLUListElement;
        private folderOpenTimeout?: NodeJS.Timeout;
        private dropPosition?: DropPosition;
        private onFinish: () => void

        constructor(draggedElement: HTMLDivElement, onFinish: () => void) {
                this.draggedElement = draggedElement;
                this.onFinish = onFinish;
        }

        setReceivingElement(receivingElement: HTMLDivElement | HTMLUListElement | undefined) {
                if (receivingElement !== this.receivingElement) {
                        if (this.folderOpenTimeout !== undefined) {
                                clearTimeout(this.folderOpenTimeout);
                                this.folderOpenTimeout = undefined;
                        }
                }

                this.receivingElement = receivingElement;

                const dropLine = document.querySelector<HTMLDivElement>("#file-drop-line")!;
                dropLine.classList.toggle("active", receivingElement !== undefined);
        }

        setDropPosition(dropPosition: DropPosition) {
                if (this.dropPosition !== dropPosition) {
                        if (this.folderOpenTimeout !== undefined) {
                                clearTimeout(this.folderOpenTimeout);
                                this.folderOpenTimeout = undefined;
                        }
                }

                this.dropPosition = dropPosition;
        }

        dragStart(event: DragEvent) {
                this.draggedElement.classList.add("dragging");
                if (event.dataTransfer !== null) {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", "ignored");
                }
        }

        dragEnd(_: DragEvent) {
                const dropLine = document.querySelector<HTMLDivElement>("#file-drop-line")!;
                dropLine.classList.remove("active");

                this.draggedElement.classList.remove("dragging");
                this.onFinish?.();
        }

        dragOver(event: DragEvent) {
                if (event.target === null || !(event.target instanceof HTMLElement)) {
                        return;
                }

                const fileList = document.querySelector<HTMLUListElement>("#file-list")!;
                const dropLine = document.querySelector<HTMLDivElement>("#file-drop-line")!;
                const containerRectangle = fileList.getBoundingClientRect();

                const receivingElement = event.target.closest<HTMLDivElement>(".file:not(.hidden)");
                if (receivingElement === null) {
                        // Find the last visible element, since the root is always expanded,
                        // it is guaranteed that there will be an element that is visible now
                        let lastElement = fileList.lastElementChild;
                        while (lastElement instanceof HTMLElement && lastElement.__node instanceof ElementNode && lastElement.__node.getHidden()) {
                                lastElement = lastElement.previousElementSibling;
                        }

                        // It is guaranteed for there to be at least one visible element because this file is being dragged
                        const lastNode = (lastElement as HTMLElement)?.__node;
                        if (
                                // The dragged element is the last visible element and it is already in the root
                                lastElement === this.draggedElement &&
                                lastNode?.getParent() === fileList.__node ||

                                // The dragged folder is already at the root, but the last visible element is a descendant of it
                                this.draggedElement.__node instanceof FolderNode &&
                                this.draggedElement.__node.getParent() === fileList.__node &&
                                lastNode?.isDescendantOf(this.draggedElement.__node)
                        ) {
                                
                                this.setReceivingElement(undefined);
                                return;
                        }

                        // Check if the drag is below the very last element.
                        const lastRectangle = lastElement?.getBoundingClientRect()!;
                        if (event.clientY > lastRectangle.bottom) {
                                event.preventDefault();
                                if (event.dataTransfer !== null) {
                                        event.dataTransfer.dropEffect = "move";
                                }

                                // Dragging below the last element, allow a drop at the root
                                dropLine.style.top = `${lastRectangle.bottom - containerRectangle.top}px`;
                                dropLine.style.width = `${lastRectangle.width}px`;
                                this.setReceivingElement(fileList);
                                return;
                        }

                        this.setReceivingElement(undefined);
                        return;
                }

                if (
                        // You can't drop a file above or below itself
                        receivingElement === this.draggedElement ||

                        // Make sure you don't drop a folder into itself
                        this.draggedElement.__node instanceof FolderNode &&
                        receivingElement.__node?.isDescendantOf(this.draggedElement.__node)
                ) {
                        this.setReceivingElement(undefined);
                        return;
                }

                event.preventDefault();
                if (event.dataTransfer !== null) {
                        event.dataTransfer.dropEffect = "move";
                }

                this.setReceivingElement(receivingElement);

                const receivingRectangle = receivingElement.getBoundingClientRect();
                const aboveHalf = event.clientY < receivingRectangle.top + receivingRectangle.height / 2;
                this.setDropPosition(aboveHalf ? DropPosition.ABOVE : DropPosition.BELOW);
                dropLine.style.top = aboveHalf
                        ? `${receivingRectangle.top - containerRectangle.top}px`
                        : `${receivingRectangle.bottom - containerRectangle.top}px`;

                // Make sure the width of the drop line matches even when there is a vertical scrollbar
                dropLine.style.width = `${receivingRectangle.width}px`;

                if (receivingElement.__node instanceof FolderNode && receivingElement.__node.getExpanded() && !aboveHalf && this.folderOpenTimeout === undefined) {
                        this.folderOpenTimeout = setTimeout(() => {
                                (receivingElement.__node as FolderNode).onClick();
                                this.folderOpenTimeout = undefined;
                        }, FileDrag.FOLDER_HOVER_OPEN_DELAY);
                }
        }

        dragLeave(event: DragEvent) {
                const fileList = document.querySelector<HTMLUListElement>("#file-list")!;
                if (event.relatedTarget instanceof Node && fileList.contains(event.relatedTarget)) {
                        return;
                }

                this.setReceivingElement(undefined);
        }

        drop(event: DragEvent) {
                if (this.receivingElement?.__node === undefined) {
                        return;
                }

                event.preventDefault();

                const fileList = document.querySelector<HTMLUListElement>("#file-list")!;
                if (this.receivingElement === fileList) {
                        // If the receiving node is the root, it means that I should add it to the end of it
                        // if the dragged node is alread inside the root, shift the insertion index
                        const rootNode = this.receivingElement.__node as RootNode;
                        let droppedIndex = rootNode.countChildren();
                        const futureSiblings = rootNode.getChildren();
                        if (futureSiblings.includes(this.draggedElement.__node!)) {
                                --droppedIndex;
                        }

                        this.confirmDrop(rootNode, droppedIndex);
                        return;
                }

                // Dropping right below an open folder will make the node enter the dropped folder
                if (this.receivingElement.__node instanceof FolderNode && this.receivingElement.__node.getExpanded() && this.dropPosition === DropPosition.BELOW) {
                        this.confirmDrop(this.receivingElement.__node, 0);
                        return;
                }

                const futureParent = this.receivingElement.__node.getParent();
                if (futureParent === undefined) {
                        return;
                }

                const futureSiblings = futureParent.getChildren();
                let droppedIndex = futureSiblings.indexOf(this.receivingElement.__node);
                if (this.dropPosition === DropPosition.BELOW) {
                        ++droppedIndex;
                }

                // If the dragged file has the same parent as the drop target, shift the insertion index
                if (futureSiblings.includes(this.draggedElement.__node!)) {
                        const draggedIndex = futureSiblings.indexOf(this.draggedElement.__node!);
                        if (draggedIndex < droppedIndex) {
                                --droppedIndex;
                        }
                }

                this.confirmDrop(futureParent, droppedIndex);
        }

        async confirmDrop(parentNode: ContainerNode, droppedIndex: number) {
                let replacedNode: ElementNode | undefined;
                let shouldRename = false;

                const futureSiblings = parentNode.getChildren();
                if (!futureSiblings.includes(this.draggedElement.__node!)) {
                        const draggedName = (this.draggedElement.__node as ElementNode).getName();
                        // If the file is dropping in a different folder,
                        // make sure there is no name clash between files
                        for (const futureSibling of futureSiblings) {
                                if (!(futureSibling instanceof ElementNode)) {
                                        continue;
                                }

                                if (futureSibling.getName() === draggedName) {
                                        const nameClashModal = new Modal({
                                                title: "Cannot Move Item",
                                                body: `An item in this folder already has the name <code>${draggedName}</code>.`,
                                                buttonOptions: [
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
                                                                backgroundColor: "var(--dark-invalid-color)",
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

                const draggedElementNode = this.draggedElement.__node as ElementNode;
                parentNode.addChild(draggedElementNode, droppedIndex);

                if (replacedNode !== undefined) {
                        replacedNode.requestDeletion(false);
                }

                if (shouldRename) {
                        const baseName = draggedElementNode.getBaseName();
                        const extension = draggedElementNode.getExtension();

                        let temporaryName = "";
                        let temporaryNameNumber = 0;
                        let temporaryNameClash = true;
                        while (temporaryNameClash) {
                                ++temporaryNameNumber;
                                temporaryNameClash = false;

                                // I can use the previous siblings array because it didn't (and still dosen't) contain the newly dropped node
                                temporaryName = `${baseName} (${temporaryNameNumber})${extension}`;
                                for (const currentSibling of futureSiblings) {
                                        if (!(currentSibling instanceof ElementNode)) {
                                                continue;
                                        }

                                        if (currentSibling.getName() === temporaryName) {
                                                temporaryNameClash = true;
                                                break;
                                        }
                                }
                        }

                        draggedElementNode.setName(temporaryName);
                        draggedElementNode.beginRenaming();
                }
        }
};

class TabDrag {
        private draggedElement: HTMLDivElement;
        private receivingElement?: HTMLDivElement | HTMLUListElement;
        private dropPosition?: DropPosition;
        private onFinish: () => void;

        constructor(draggedElement: HTMLDivElement, onFinish: () => void) {
                this.draggedElement = draggedElement;
                this.onFinish = onFinish;
        }

        dragStart(event: DragEvent) {
                this.draggedElement.classList.add("dragging");
                if (event.dataTransfer !== null) {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", "ignored");
                }
        }

        dragEnd(_: DragEvent) {
                const dropLine = document.querySelector<HTMLDivElement>("#tab-drop-line")!;
                dropLine.classList.remove("active");

                this.draggedElement.classList.remove("dragging");
                this.onFinish?.();
        }

        dragOver(event: DragEvent) {
                if (event.target === null || !(event.target instanceof HTMLElement)) {
                        return;
                }

                const tabList = document.querySelector<HTMLUListElement>("#tab-list")!;
                const dropLine = document.querySelector<HTMLDivElement>("#tab-drop-line")!;
                const containerRectangle = tabList.getBoundingClientRect();

                const receivingElement = event.target.closest(".tab");
                if (receivingElement === null) {
                        // Check if the drag is to the right of the very last element
                        const lastElement = tabList.lastElementChild;
                        if (lastElement === null) {
                                event.preventDefault();
                                if (event.dataTransfer !== null) {
                                        event.dataTransfer.dropEffect = "move";
                                }

                                // The tab list is empty, allow a drop at the root
                                dropLine.classList.add("active");
                                dropLine.style.left = "0";
                                dropLine.style.height = `${containerRectangle.height}px`;
                                this.receivingElement = tabList;
                                return;
                        }

                        if (lastElement === this.draggedElement) {
                                dropLine.classList.remove("active");
                                return;
                        }

                        const lastRectangle = lastElement.getBoundingClientRect();
                        if (event.clientX > lastRectangle.right) {
                                event.preventDefault();
                                if (event.dataTransfer !== null) {
                                        event.dataTransfer.dropEffect = "move";
                                }

                                // Dragging to the right of the last element, allow a drop at the root
                                dropLine.classList.add("active");
                                dropLine.style.left = `${lastRectangle.right - containerRectangle.left}px`;
                                dropLine.style.height = `${lastRectangle.height}px`;
                                this.receivingElement = tabList;
                                return;
                        }

                        dropLine.classList.remove("active");
                        return;
                }

                // You can't drop a tab to the left or to the right of itself
                if (receivingElement === this.draggedElement) {
                        dropLine.classList.remove("active");
                        return;
                }

                event.preventDefault();
                if (event.dataTransfer !== null) {
                        event.dataTransfer.dropEffect = "move";
                }

                this.receivingElement = receivingElement as HTMLDivElement;

                const receivingRectangle = receivingElement.getBoundingClientRect();
                const leftHalf = event.clientX < receivingRectangle.left + receivingRectangle.width / 2;
                this.dropPosition = leftHalf ? DropPosition.LEFT : DropPosition.RIGHT;
                dropLine.style.left = leftHalf
                        ? `${receivingRectangle.left - containerRectangle.left}px`
                        : `${receivingRectangle.right - containerRectangle.left}px`;

                // Make sure the height of the drop line matches even when there is a horizontal scrollbar
                dropLine.style.height = `${receivingRectangle.height}px`;
                dropLine.classList.add("active");
        }

        dragLeave(event: DragEvent) {
                const tabList = document.querySelector<HTMLUListElement>("#tab-list")!;
                if (event.relatedTarget instanceof Node && tabList.contains(event.relatedTarget)) {
                        return;
                }

                this.receivingElement = undefined;
        }

        drop(event: DragEvent) {
                if (this.receivingElement === undefined) {
                        return;
                }

                event.preventDefault();

                const tabList = document.querySelector<HTMLUListElement>("#tab-list")!;
                if (this.receivingElement === tabList) {
                        // If the receiving node is the root, it means that I should add it to the end of it
                        tabList.appendChild(this.draggedElement);
                        return;
                }

                if (this.dropPosition === DropPosition.LEFT) {
                        this.receivingElement.before(this.draggedElement);
                        return;
                }

                if (this.dropPosition === DropPosition.RIGHT) {
                        this.receivingElement.after(this.draggedElement);
                        return;
                }
        }
}

export function getFilenameInformation(filename: string) {
        const filenameInformation: { baseName: string, extension?: string } = { baseName: filename };

        const index = filename.lastIndexOf(".");
        if (index !== -1) {
                filenameInformation.baseName = filename.slice(0, index);
                filenameInformation.extension = filename.slice(index);
        }

        return Object.freeze(filenameInformation);
}

export enum FileEvent {
        FILE_OPENED,
        FILE_CLOSED
};

const eventListeners = new Map();

export function registerEventListener(eventType: FileEvent, listener: (data: unknown) => void) {
        const eventListenersSameType = eventListeners.get(eventType) ?? [];
        eventListenersSameType.push(listener);

        eventListeners.set(eventType, eventListenersSameType);
}

function triggerEvent(eventType: FileEvent, data: unknown) {
        const eventListenersForType = eventListeners.get(eventType) ?? [];
        for (const eventListenerForType of eventListenersForType) {
                eventListenerForType(data);
        }
}

const selectionHistory: FileNode[] = [];
let currentFile: FileNode | undefined;

function removeFromHistory(file: FileNode) {
        // Loop backwards to remove all instances of the current file from the selection history
        for (let selectionIndex = selectionHistory.length - 1; selectionIndex >= 0; --selectionIndex) {
                if (selectionHistory[selectionIndex] === file) {
                        selectionHistory.splice(selectionIndex, 1);
                }
        }
}

function unselectAll() {
        const fileList = document.querySelector<HTMLUListElement>("#file-list")!;
        const tabList = document.querySelector<HTMLUListElement>("#tab-list")!;
        const selectedFiles = fileList.querySelectorAll<HTMLLIElement>(".selected");
        const selectedTabs = tabList.querySelectorAll<HTMLLIElement>(".selected");
        for (const selectedElement of [...selectedFiles, ...selectedTabs]) {
                selectedElement.classList.remove("selected");
        }
}

function selectFile(file: FileNode) {
        if (currentFile === file) {
                return;
        }

        if (currentFile !== undefined) {
                removeFromHistory(currentFile);
                selectionHistory.push(currentFile);
        }

        unselectAll();

        file.select(currentFile);
        currentFile = file;

        triggerEvent(FileEvent.FILE_OPENED, currentFile);
}

function closeFile(file: FileNode) {
        removeFromHistory(file);
        triggerEvent(FileEvent.FILE_CLOSED, file);

        if (currentFile !== file) {
                return;
        }

        // The following behavior jumps to the previously selected tab

        unselectAll();

        const previousFile = currentFile;
        currentFile = selectionHistory.pop();
        if (currentFile !== undefined) {
                currentFile.select(previousFile);
                triggerEvent(FileEvent.FILE_OPENED, currentFile);
        }
}

let currentDrag: FileDrag | TabDrag | undefined;

document.addEventListener("dragstart", event => {
        if (currentDrag !== undefined || !(event.target instanceof Element)) {
                return;
        }

        const draggedFile = event.target.closest(".file:not(.hidden):not(.dragging):not(.renaming)");
        const draggedTab = event.target.closest(".tab:not(.dragging)");
        if ((draggedFile === null) === (draggedTab === null)) {
                return;
        }

        const onFinish = () => {
                currentDrag = undefined;
        }

        if (draggedFile !== null) {
                currentDrag = new FileDrag(draggedFile as HTMLDivElement, onFinish);
        }

        if (draggedTab !== null) {
                currentDrag = new FileDrag(draggedTab as HTMLDivElement, onFinish);
        }

        currentDrag!.dragStart(event);
});

document.addEventListener("dragend", event => {
        currentDrag?.dragEnd(event);
});

document.addEventListener("dragover", event => {
        currentDrag?.dragOver(event);
});

document.addEventListener("dragleave", event => {
        currentDrag?.dragLeave(event);
});

document.addEventListener("drop", event => {
        currentDrag?.drop(event);
});