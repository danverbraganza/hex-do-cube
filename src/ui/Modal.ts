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
    this.overlay.className = 'hdc-modal-overlay';

    // Create content container
    this.content = document.createElement('div');
    this.content.className = 'hdc-modal-dialog';

    // Create message element
    this.messageElement = document.createElement('div');
    this.messageElement.className = 'hdc-modal-message';

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'hdc-modal-buttons';

    // Create cancel button
    this.cancelButton = document.createElement('button');
    this.cancelButton.className = 'hdc-modal-button hdc-modal-button--cancel';

    // Create confirm button
    this.confirmButton = document.createElement('button');
    this.confirmButton.className = 'hdc-modal-button hdc-modal-button--confirm';

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
