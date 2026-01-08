/**
 * MessagePanel for Hex-Do-Cube
 * Displays scrollable messages in the lower-right corner of the screen
 *
 * Responsibilities:
 * - Display messages with timestamps (HH:MM:SS format)
 * - Support two message types: LOG (developer/debug) and USER (player-facing)
 * - Auto-scroll to show latest messages
 * - Styled consistently with existing HUD (semi-transparent dark background)
 * - Not interfere with game interaction (pointer-events: none on container, auto on scrollable content)
 */

/**
 * Message types
 */
export type MessageType = 'LOG' | 'USER';

/**
 * Message data structure
 */
export interface Message {
  /** The message text */
  text: string;
  /** The message type */
  type: MessageType;
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
}

/**
 * MessagePanel manages the display of log and user messages
 */
export class MessagePanel {
  private container: HTMLElement;
  private panelElement!: HTMLDivElement;
  private messageListElement!: HTMLDivElement;
  private messages: Message[] = [];

  constructor(config: MessagePanelConfig) {
    this.container = config.container;
    this.initializeUI();
    if (config.visible === false) {
      this.hide();
    }
  }

  /**
   * Initialize the message panel UI
   */
  private initializeUI(): void {
    // Create panel container
    this.panelElement = document.createElement('div');
    this.panelElement.id = 'message-panel';
    this.panelElement.style.cssText = `
      position: absolute;
      bottom: 16px;
      right: 16px;
      width: 300px;
      height: 150px;
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      z-index: 100;
    `;

    // Create message list container (scrollable)
    this.messageListElement = document.createElement('div');
    this.messageListElement.id = 'message-list';
    this.messageListElement.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    // Custom scrollbar styling
    const style = document.createElement('style');
    style.textContent = `
      #message-list::-webkit-scrollbar {
        width: 8px;
      }
      #message-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      #message-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }
      #message-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
    `;
    document.head.appendChild(style);

    this.panelElement.appendChild(this.messageListElement);
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
    messageElement.style.cssText = `
      display: flex;
      flex-direction: row;
      gap: 4px;
      line-height: 1.4;
      word-wrap: break-word;
    `;

    // Format timestamp as HH:MM:SS
    const timestamp = this.formatTimestamp(message.timestamp);

    // Create timestamp span
    const timestampSpan = document.createElement('span');
    timestampSpan.textContent = `[${timestamp}]`;
    timestampSpan.style.cssText = `
      color: #888;
      flex-shrink: 0;
    `;

    // Create type prefix span
    const typeSpan = document.createElement('span');
    typeSpan.textContent = message.type === 'LOG' ? '[LOG]' : '[INFO]';
    typeSpan.style.cssText = `
      color: ${message.type === 'LOG' ? '#888' : '#fff'};
      flex-shrink: 0;
      font-weight: ${message.type === 'USER' ? 'bold' : 'normal'};
    `;

    // Create message text span
    const textSpan = document.createElement('span');
    textSpan.textContent = message.text;
    textSpan.style.cssText = `
      color: ${message.type === 'LOG' ? '#aaa' : '#fff'};
      flex: 1;
    `;

    messageElement.appendChild(timestampSpan);
    messageElement.appendChild(typeSpan);
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
    const element = this.messageListElement;
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
   * Clean up resources and remove UI elements
   */
  public dispose(): void {
    if (this.panelElement.parentElement === this.container) {
      this.container.removeChild(this.panelElement);
    }
    this.messages = [];
  }
}
