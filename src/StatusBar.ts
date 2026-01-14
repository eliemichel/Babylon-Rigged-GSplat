import { getElementsByIds } from "./utils";

interface StatusBarElements {
    statusBar: HTMLDivElement;
    statusMessage: HTMLSpanElement;
    statusBarSpinner: HTMLSpanElement;
}

// Handle is a unique identifier for the status message.
// It is used to unset the status message.
type StatusHandle = number;

interface StatusBarState {
    statusStack: { handle: StatusHandle, status: string }[];
}

/**
 * The status bar always displays the most recent status message.
 * When this status is unset, the previous status is displayed.
 * Statuses can be unset in any order.
 */
export default class StatusBar {
    private readonly elements: StatusBarElements;
    private readonly state: StatusBarState;
    private readonly visiblestatusBarSpinnerDisplay: string;

    constructor() {
        this.elements = getElementsByIds([
            "statusBar",
            "statusMessage",
            "statusBarSpinner",
        ]) as unknown as StatusBarElements;

        this.state = {
            statusStack: [],
        };

        this.visiblestatusBarSpinnerDisplay = this.elements.statusBarSpinner.style.display;
    }

    public setStatus(status: string): StatusHandle {
        const { statusStack } = this.state;

        const handle = this.generateHandle();
        statusStack.push({ handle, status });

        this.setStatusMessage(status);
        
        return handle;
    }

    public unsetStatus(handle: StatusHandle) {
        const { statusStack } = this.state;
        
        const index = statusStack.findIndex((item) => item.handle === handle);
        if (index === -1) {
            throw new Error(`Status handle ${handle} not found`);
        }

        statusStack.splice(index, 1);

        const lastEntry = statusStack[statusStack.length - 1];

        this.setStatusMessage(lastEntry?.status);
    }

    private setStatusMessage(status: string | undefined) {
        const { statusBarSpinner, statusMessage } = this.elements;
        statusMessage.textContent = status ?? "";
        statusBarSpinner.style.display = status ? this.visiblestatusBarSpinnerDisplay : "none";
    }

    private generateHandle(): StatusHandle {
        return Math.random();
    }
}
