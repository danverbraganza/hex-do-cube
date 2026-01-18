/**
 * MessagePanel for Hex-Do-Cube
 * Full-height sidebar chat panel styled like poker website chat
 *
 * Responsibilities:
 * - Display messages with timestamps (HH:MM:SS format)
 * - Support two message types: LOG (developer/debug) and USER (player-facing)
 * - Auto-scroll to show latest messages (bottom-up flow)
 * - Full-height sidebar on right side with collapsible functionality
 * - Dark theme with semi-transparent background
 * - Messages flow bottom-up (newest at bottom)
 */

/**
 * Message types
 */
export type MessageType = 'LOG' | 'USER';

/**
 * Message levels
 */
export type MessageLevel = 'info' | 'warning' | 'error' | 'user';

/**
 * Message data structure
 */
export interface Message {
  /** The message text */
  text: string;
  /** The message type */
  type: MessageType;
  /** Message level (for log messages) */
  level?: MessageLevel;
  /** Timestamp when message was created */
  timestamp: Date;
}

/**
 * Configuration for MessagePanel
 */
export interface MessagePanelConfig {
  /** Container element for the message panel */
  container: HTMLElement;
  /** Initial visibility state (default: true) */
  visible?: boolean;
  /** Initial collapsed state (default: false) */
  collapsed?: boolean;
}

/**
 * MessagePanel manages the display of log and user messages
 */
export class MessagePanel {
  private container: HTMLElement;
  private panelElement!: HTMLDivElement;
  private headerElement!: HTMLDivElement;
  private tabElement!: HTMLDivElement;
  private messageContentElement!: HTMLDivElement;
  private messageListElement!: HTMLDivElement;
  private messages: Message[] = [];
  private isCollapsed: boolean = true;
  private showLogs: boolean = true;
  private readonly STORAGE_KEY = 'hex-do-cube-messages-panel-collapsed';
  private readonly SHOW_LOGS_KEY = 'messagePanel-showLogs';

  constructor(config: MessagePanelConfig) {
    this.container = config.container;

    // Load collapse state: config.collapsed takes precedence over localStorage
    // Default to collapsed (true)
    if (config.collapsed !== undefined) {
      this.isCollapsed = config.collapsed;
    } else {
      const savedCollapsed = localStorage.getItem(this.STORAGE_KEY);
      if (savedCollapsed !== null) {
        this.isCollapsed = savedCollapsed === 'true';
      } else {
        // Default state is collapsed
        this.isCollapsed = true;
      }
    }

    // Load showLogs state from localStorage
    const savedShowLogs = localStorage.getItem(this.SHOW_LOGS_KEY);
    if (savedShowLogs !== null) {
      this.showLogs = savedShowLogs === 'true';
    }

    this.initializeUI();

    if (config.visible === false) {
      this.hide();
    }

    if (this.isCollapsed) {
      this.collapse();
    }
  }

  /**
   * Initialize the message panel UI
   */
  private initializeUI(): void {
    // Create panel container (full-height sidebar)
    this.panelElement = document.createElement('div');
    this.panelElement.id = 'message-panel';
    this.panelElement.className = 'hdc-message-panel';

    // Create vertical tab (visible when collapsed)
    this.tabElement = document.createElement('div');
    this.tabElement.className = 'hdc-message-tab';
    this.tabElement.textContent = 'Messages';
    this.tabElement.title = 'Expand Messages panel';

    this.tabElement.addEventListener('click', () => {
      this.expand();
    });

    // Create header with title and checkbox
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'hdc-message-panel-header';

    // Create title and checkbox container
    const leftContainer = document.createElement('div');
    leftContainer.className = 'hdc-message-panel-header-left';

    // Create title (clickable to collapse)
    const titleElement = document.createElement('div');
    titleElement.textContent = 'Messages';
    titleElement.className = 'hdc-message-panel-title';
    titleElement.title = 'Collapse Messages panel';

    titleElement.addEventListener('click', () => {
      this.collapse();
    });

    // Create checkbox container
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'hdc-message-panel-checkbox-container';

    // Create checkbox for showing/hiding logs
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this.showLogs;
    checkbox.id = 'show-logs';
    checkbox.className = 'hdc-message-panel-checkbox';

    const label = document.createElement('label');
    label.htmlFor = 'show-logs';
    label.textContent = 'Logs';
    label.className = 'hdc-message-panel-checkbox-label';

    checkbox.addEventListener('change', () => {
      this.showLogs = checkbox.checked;
      this.renderMessages();
      localStorage.setItem(this.SHOW_LOGS_KEY, String(this.showLogs));
    });

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);
    leftContainer.appendChild(titleElement);
    leftContainer.appendChild(checkboxContainer);

    this.headerElement.appendChild(leftContainer);

    // Create message content container
    this.messageContentElement = document.createElement('div');
    this.messageContentElement.className = 'hdc-message-panel-content';

    // Create message list container
    this.messageListElement = document.createElement('div');
    this.messageListElement.id = 'message-list';
    this.messageListElement.className = 'hdc-message-list';

    this.messageContentElement.appendChild(this.messageListElement);
    this.panelElement.appendChild(this.headerElement);
    this.panelElement.appendChild(this.messageContentElement);
    this.container.appendChild(this.panelElement);
    this.container.appendChild(this.tabElement);
  }

  /**
   * Add a message to the panel
   * @param text - The message text
   * @param type - The message type (LOG or USER)
   */
  public addMessage(text: string, type: MessageType = 'USER'): void {
    const message: Message = {
      text,
      type,
      timestamp: new Date(),
    };

    this.messages.push(message);
    this.renderMessage(message);
    this.autoScroll();
  }

  /**
   * Add a LOG message (developer/debug message)
   * @param text - The message text
   */
  public log(text: string): void {
    this.addMessage(text, 'LOG');
  }

  /**
   * Add a USER message (player-facing message)
   * @param text - The message text
   */
  public info(text: string): void {
    this.addMessage(text, 'USER');
  }

  /**
   * Render all messages (used when filtering)
   */
  private renderMessages(): void {
    this.messageListElement.innerHTML = '';
    const visibleMessages = this.showLogs ? this.messages : this.messages.filter((m) => m.type === 'USER');
    for (const message of visibleMessages) {
      this.renderMessage(message);
    }
  }

  /**
   * Render a single message to the message list
   */
  private renderMessage(message: Message): void {
    // Skip rendering LOG messages if they are hidden
    if (!this.showLogs && message.type === 'LOG') {
      return;
    }

    const messageElement = document.createElement('div');
    messageElement.className = message.type === 'LOG' ? 'hdc-message-item hdc-message-item--log' : 'hdc-message-item hdc-message-item--user';

    // Format timestamp as HH:MM:SS
    const timestamp = this.formatTimestamp(message.timestamp);

    // Create timestamp span
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'hdc-message-timestamp';
    timestampSpan.textContent = timestamp;

    // Create message text span
    const textSpan = document.createElement('span');
    textSpan.textContent = message.text;

    messageElement.appendChild(timestampSpan);
    messageElement.appendChild(textSpan);

    this.messageListElement.appendChild(messageElement);
  }

  /**
   * Format a timestamp as HH:MM:SS
   */
  private formatTimestamp(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Auto-scroll to the bottom of the message list
   * Only scrolls if already at or near the bottom
   */
  private autoScroll(): void {
    const element = this.messageContentElement;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;

    if (isNearBottom || element.scrollTop === 0) {
      // Scroll to bottom
      element.scrollTop = element.scrollHeight;
    }
  }

  /**
   * Clear all messages
   */
  public clear(): void {
    this.messages = [];
    this.messageListElement.innerHTML = '';
  }

  /**
   * Get all messages
   * @returns Array of all messages
   */
  public getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Show the message panel
   */
  public show(): void {
    this.panelElement.style.display = 'flex';
  }

  /**
   * Hide the message panel
   */
  public hide(): void {
    this.panelElement.style.display = 'none';
  }

  /**
   * Check if the panel is visible
   * @returns true if the panel is visible
   */
  public isVisible(): boolean {
    return this.panelElement.style.display !== 'none';
  }

  /**
   * Toggle the collapsed state of the panel
   */
  public toggleCollapse(): void {
    if (this.isCollapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  /**
   * Collapse the panel (slide out to the right)
   */
  public collapse(): void {
    this.isCollapsed = true;
    this.panelElement.classList.add('collapsed');
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }

  /**
   * Expand the panel (slide in from the right)
   */
  public expand(): void {
    this.isCollapsed = false;
    this.panelElement.classList.remove('collapsed');
    localStorage.setItem(this.STORAGE_KEY, 'false');
  }

  /**
   * Check if the panel is collapsed
   * @returns true if the panel is collapsed
   */
  public isCollapsedState(): boolean {
    return this.isCollapsed;
  }

  /**
   * Clean up resources and remove UI elements
   */
  public dispose(): void {
    if (this.panelElement.parentElement === this.container) {
      this.container.removeChild(this.panelElement);
    }
    if (this.tabElement.parentElement === this.container) {
      this.container.removeChild(this.tabElement);
    }
    this.messages = [];
  }
}
