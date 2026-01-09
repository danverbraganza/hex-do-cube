/**
 * Modal component for Hex-Do-Cube
 * Provides a reusable confirmation dialog with custom styling
 */

/**
 * Callback types for modal actions
 */
export type ModalConfirmCallback = () => void;
export type ModalCancelCallback = () => void;

/**
 * Configuration for modal appearance and behavior
 */
export interface ModalConfig {
  /** Message to display in the modal */
  message: string;
  /** Text for the confirm button (default: "Yes") */
  confirmText?: string;
  /** Text for the cancel button (default: "No") */
  cancelText?: string;
  /** Callback when user confirms */
  onConfirm: ModalConfirmCallback;
  /** Callback when user cancels */
  onCancel: ModalCancelCallback;
}

/**
 * Modal class for displaying confirmation dialogs
 * Features:
 * - Dark theme consistent with game aesthetics
 * - Semi-transparent backdrop
 * - Centered positioning
 * - Keyboard support (ESC to cancel)
 * - Click outside to cancel
 */
export class Modal {
  private overlay: HTMLDivElement;
  private content: HTMLDivElement;
  private messageElement: HTMLDivElement;
  private confirmButton: HTMLButtonElement;
  private cancelButton: HTMLButtonElement;
  private isVisible: boolean = false;
  private currentConfig: ModalConfig | null = null;

  constructor() {
    // Create overlay (backdrop)
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    `;

    // Create content container
    this.content = document.createElement('div');
    this.content.className = 'modal-content';
    this.content.style.cssText = `
      background: rgba(20, 20, 30, 0.95);
      color: #ffffff;
      padding: 32px;
      border-radius: 8px;
      min-width: 320px;
      max-width: 480px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    // Create message element
    this.messageElement = document.createElement('div');
    this.messageElement.className = 'modal-message';
    this.messageElement.style.cssText = `
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 24px;
      text-align: center;
    `;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'modal-buttons';
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
    `;

    // Create cancel button
    this.cancelButton = document.createElement('button');
    this.cancelButton.className = 'modal-button modal-cancel';
    this.applyButtonStyle(this.cancelButton, '#666666', '#555555');

    // Create confirm button
    this.confirmButton = document.createElement('button');
    this.confirmButton.className = 'modal-button modal-confirm';
    this.applyButtonStyle(this.confirmButton, '#2563eb', '#1d4ed8');

    // Assemble modal
    buttonContainer.appendChild(this.cancelButton);
    buttonContainer.appendChild(this.confirmButton);
    this.content.appendChild(this.messageElement);
    this.content.appendChild(buttonContainer);
    this.overlay.appendChild(this.content);

    // Attach event handlers
    this.attachEventHandlers();
  }

  /**
   * Apply consistent button styling
   */
  private applyButtonStyle(button: HTMLButtonElement, bgColor: string, hoverColor: string): void {
    button.style.cssText = `
      background: ${bgColor};
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      min-width: 100px;
    `;

    // Hover effect
    button.addEventListener('mouseenter', () => {
      button.style.background = hoverColor;
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = bgColor;
    });
  }

  /**
   * Attach event handlers for modal interactions
   */
  private attachEventHandlers(): void {
    // Confirm button click
    this.confirmButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleConfirm();
    });

    // Cancel button click
    this.cancelButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleCancel();
    });

    // Click outside content to cancel
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.handleCancel();
      }
    });

    // ESC key to cancel
    document.addEventListener('keydown', (e) => {
      if (this.isVisible && e.key === 'Escape') {
        e.preventDefault();
        this.handleCancel();
      }
    });

    // Prevent content clicks from closing modal
    this.content.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Handle confirm action
   */
  private handleConfirm(): void {
    if (this.currentConfig) {
      this.currentConfig.onConfirm();
    }
    this.hide();
  }

  /**
   * Handle cancel action
   */
  private handleCancel(): void {
    if (this.currentConfig) {
      this.currentConfig.onCancel();
    }
    this.hide();
  }

  /**
   * Show the modal with the specified configuration
   */
  public show(config: ModalConfig): void {
    this.currentConfig = config;
    this.messageElement.textContent = config.message;
    this.confirmButton.textContent = config.confirmText || 'Yes';
    this.cancelButton.textContent = config.cancelText || 'No';

    // Add to DOM if not already present
    if (!this.overlay.parentElement) {
      document.body.appendChild(this.overlay);
    }

    // Show overlay
    this.overlay.style.display = 'flex';
    this.isVisible = true;
  }

  /**
   * Hide the modal
   */
  public hide(): void {
    this.overlay.style.display = 'none';
    this.isVisible = false;
    this.currentConfig = null;
  }

  /**
   * Check if modal is currently visible
   */
  public isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * Clean up and remove modal from DOM
   */
  public dispose(): void {
    this.hide();
    if (this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
  }
}
