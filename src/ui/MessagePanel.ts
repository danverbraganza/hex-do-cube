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
  private collapseButton!: HTMLButtonElement;
  private messageContentElement!: HTMLDivElement;
  private messageListElement!: HTMLDivElement;
  private messages: Message[] = [];
  private isCollapsed: boolean = false;
  private showLogs: boolean = true;
  private readonly STORAGE_KEY = 'messagePanel.collapsed';
  private readonly SHOW_LOGS_KEY = 'messagePanel-showLogs';

  constructor(config: MessagePanelConfig) {
    this.container = config.container;

    // Load collapse state: config.collapsed takes precedence over localStorage
    if (config.collapsed !== undefined) {
      this.isCollapsed = config.collapsed;
    } else {
      const savedCollapsed = localStorage.getItem(this.STORAGE_KEY);
      if (savedCollapsed !== null) {
        this.isCollapsed = savedCollapsed === 'true';
      }
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
    this.panelElement.className = 'message-panel';
    this.panelElement.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 280px;
      background: rgba(20, 20, 30, 0.95);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      font-family: 'Segoe UI', system-ui, sans-serif;
      z-index: 100;
      transition: width 0.3s ease;
    `;

    // Create header with title and collapse button
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'message-panel-header';
    this.headerElement.style.cssText = `
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    `;

    // Create title
    const titleElement = document.createElement('div');
    titleElement.textContent = 'Messages';
    titleElement.style.cssText = `
      color: rgba(255, 255, 255, 0.9);
      font-weight: 600;
      font-size: 14px;
    `;

    // Create collapse button
    this.collapseButton = document.createElement('button');
    this.collapseButton.innerHTML = '&laquo;'; // Left double angle
    this.collapseButton.title = 'Collapse panel';
    this.collapseButton.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      font-size: 16px;
      width: 24px;
      height: 24px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    `;

    this.collapseButton.addEventListener('mouseenter', () => {
      this.collapseButton.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    this.collapseButton.addEventListener('mouseleave', () => {
      this.collapseButton.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    this.collapseButton.addEventListener('click', () => {
      this.toggleCollapse();
    });

    this.headerElement.appendChild(titleElement);
    this.headerElement.appendChild(this.collapseButton);

    // Create message content container
    this.messageContentElement = document.createElement('div');
    this.messageContentElement.className = 'message-panel-content';
    this.messageContentElement.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 8px;
    `;

    // Create message list container
    this.messageListElement = document.createElement('div');
    this.messageListElement.id = 'message-list';
    this.messageListElement.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    // Custom scrollbar styling
    const style = document.createElement('style');
    style.textContent = `
      .message-panel-content::-webkit-scrollbar {
        width: 8px;
      }
      .message-panel-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }
      .message-panel-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }
      .message-panel-content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      .message-panel.collapsed {
        width: 40px !important;
      }
      .message-panel.collapsed .message-panel-header > div:first-child {
        display: none;
      }
      .message-panel.collapsed .message-panel-content {
        display: none;
      }
    `;
    document.head.appendChild(style);

    this.messageContentElement.appendChild(this.messageListElement);
    this.panelElement.appendChild(this.headerElement);
    this.panelElement.appendChild(this.messageContentElement);
    this.container.appendChild(this.panelElement);
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
   * Render a single message to the message list
   */
  private renderMessage(message: Message): void {
    const messageElement = document.createElement('div');
    messageElement.className = message.type === 'LOG' ? 'message message-log' : 'message message-user';
    messageElement.style.cssText = `
      padding: 6px 8px;
      margin-bottom: 4px;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
      word-wrap: break-word;
      ${message.type === 'LOG'
        ? 'color: rgba(255, 255, 255, 0.5);'
        : 'color: rgba(255, 255, 255, 0.9); background: rgba(255, 255, 255, 0.05);'}
    `;

    // Format timestamp as HH:MM:SS
    const timestamp = this.formatTimestamp(message.timestamp);

    // Create timestamp span
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'message-timestamp';
    timestampSpan.textContent = timestamp;
    timestampSpan.style.cssText = `
      color: rgba(255, 255, 255, 0.3);
      font-size: 10px;
      margin-right: 8px;
    `;

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
   * Collapse the panel to a thin strip
   */
  public collapse(): void {
    this.isCollapsed = true;
    this.panelElement.classList.add('collapsed');
    this.collapseButton.innerHTML = '&raquo;'; // Right double angle
    this.collapseButton.title = 'Expand panel';
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }

  /**
   * Expand the panel to full width
   */
  public expand(): void {
    this.isCollapsed = false;
    this.panelElement.classList.remove('collapsed');
    this.collapseButton.innerHTML = '&laquo;'; // Left double angle
    this.collapseButton.title = 'Collapse panel';
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
    this.messages = [];
  }
}
