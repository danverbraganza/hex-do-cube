/**
 * Tests for Modal component
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Modal, type ModalConfig } from './Modal.js';
import { Window } from 'happy-dom';

describe('Modal', () => {
  let modal: Modal;
  let window: Window;

  beforeEach(() => {
    // Set up DOM environment using happy-dom
    window = new Window();
    global.document = window.document as unknown as Document;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.window = window as any;

    modal = new Modal();
  });

  afterEach(() => {
    modal.dispose();
  });

  it('should create a modal instance', () => {
    expect(modal).toBeDefined();
    expect(modal.isShowing()).toBe(false);
  });

  it('should show modal when show() is called', () => {
    const config: ModalConfig = {
      message: 'Test message',
      onConfirm: () => {},
      onCancel: () => {}
    };

    modal.show(config);

    expect(modal.isShowing()).toBe(true);
  });

  it('should hide modal when hide() is called', () => {
    const config: ModalConfig = {
      message: 'Test message',
      onConfirm: () => {},
      onCancel: () => {}
    };

    modal.show(config);
    expect(modal.isShowing()).toBe(true);

    modal.hide();
    expect(modal.isShowing()).toBe(false);
  });

  it('should display custom message', () => {
    const testMessage = 'This is a test message';
    const config: ModalConfig = {
      message: testMessage,
      onConfirm: () => {},
      onCancel: () => {}
    };

    modal.show(config);

    // Check that the message is in the DOM
    const messageElements = document.querySelectorAll('.modal-message');
    expect(messageElements.length).toBeGreaterThan(0);
    const messageElement = messageElements[0] as HTMLElement;
    expect(messageElement.textContent).toBe(testMessage);
  });

  it('should use custom button text when provided', () => {
    const config: ModalConfig = {
      message: 'Test',
      confirmText: 'Confirm Action',
      cancelText: 'Cancel Action',
      onConfirm: () => {},
      onCancel: () => {}
    };

    modal.show(config);

    const confirmButtons = document.querySelectorAll('.modal-confirm');
    const cancelButtons = document.querySelectorAll('.modal-cancel');

    expect(confirmButtons.length).toBeGreaterThan(0);
    expect(cancelButtons.length).toBeGreaterThan(0);

    const confirmButton = confirmButtons[0] as HTMLButtonElement;
    const cancelButton = cancelButtons[0] as HTMLButtonElement;

    expect(confirmButton.textContent).toBe('Confirm Action');
    expect(cancelButton.textContent).toBe('Cancel Action');
  });

  it('should use default button text when not provided', () => {
    const config: ModalConfig = {
      message: 'Test',
      onConfirm: () => {},
      onCancel: () => {}
    };

    modal.show(config);

    const confirmButtons = document.querySelectorAll('.modal-confirm');
    const cancelButtons = document.querySelectorAll('.modal-cancel');

    expect(confirmButtons.length).toBeGreaterThan(0);
    expect(cancelButtons.length).toBeGreaterThan(0);

    const confirmButton = confirmButtons[0] as HTMLButtonElement;
    const cancelButton = cancelButtons[0] as HTMLButtonElement;

    expect(confirmButton.textContent).toBe('Yes');
    expect(cancelButton.textContent).toBe('No');
  });

  it('should call onConfirm callback when confirm button is clicked', () => {
    const onConfirm = mock(() => {});
    const onCancel = mock(() => {});

    const config: ModalConfig = {
      message: 'Test',
      onConfirm,
      onCancel
    };

    modal.show(config);

    const confirmButtons = document.querySelectorAll('.modal-confirm');
    const confirmButton = confirmButtons[0] as HTMLButtonElement;
    confirmButton.click();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(modal.isShowing()).toBe(false);
  });

  it('should call onCancel callback when cancel button is clicked', () => {
    const onConfirm = mock(() => {});
    const onCancel = mock(() => {});

    const config: ModalConfig = {
      message: 'Test',
      onConfirm,
      onCancel
    };

    modal.show(config);

    const cancelButtons = document.querySelectorAll('.modal-cancel');
    const cancelButton = cancelButtons[0] as HTMLButtonElement;
    cancelButton.click();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(modal.isShowing()).toBe(false);
  });

  it('should call onCancel when clicking outside the modal content', () => {
    const onConfirm = mock(() => {});
    const onCancel = mock(() => {});

    const config: ModalConfig = {
      message: 'Test',
      onConfirm,
      onCancel
    };

    modal.show(config);

    const overlays = document.querySelectorAll('.modal-overlay');
    const overlay = overlays[0] as HTMLElement;
    overlay.click();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(modal.isShowing()).toBe(false);
  });

  it('should call onCancel when ESC key is pressed', () => {
    const onConfirm = mock(() => {});
    const onCancel = mock(() => {});

    const config: ModalConfig = {
      message: 'Test',
      onConfirm,
      onCancel
    };

    modal.show(config);

    // Simulate ESC key press using happy-dom's KeyboardEvent
    const escEvent = new window.KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escEvent as unknown as Event);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(modal.isShowing()).toBe(false);
  });

  it('should not call callbacks when clicking inside modal content', () => {
    const onConfirm = mock(() => {});
    const onCancel = mock(() => {});

    const config: ModalConfig = {
      message: 'Test',
      onConfirm,
      onCancel
    };

    modal.show(config);

    const contents = document.querySelectorAll('.modal-content');
    const content = contents[0] as HTMLElement;
    content.click();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(modal.isShowing()).toBe(true);
  });

  it('should remove modal from DOM when disposed', () => {
    const config: ModalConfig = {
      message: 'Test',
      onConfirm: () => {},
      onCancel: () => {}
    };

    modal.show(config);
    expect(document.querySelectorAll('.modal-overlay').length).toBeGreaterThan(0);

    modal.dispose();
    expect(document.querySelectorAll('.modal-overlay').length).toBe(0);
  });

  it('should not respond to ESC key when modal is hidden', () => {
    const onConfirm = mock(() => {});
    const onCancel = mock(() => {});

    const config: ModalConfig = {
      message: 'Test',
      onConfirm,
      onCancel
    };

    modal.show(config);
    modal.hide();

    // Simulate ESC key press after hiding using happy-dom's KeyboardEvent
    const escEvent = new window.KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escEvent as unknown as Event);

    // onCancel should not be called again
    expect(onCancel).not.toHaveBeenCalled();
  });
});
