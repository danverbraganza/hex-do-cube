/**
 * Tests for MessagePanel
 *
 * Note: These tests use happy-dom to provide a DOM environment for testing UI components.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { MessagePanel } from './MessagePanel.js';

// Set up happy-dom for testing
import { Window } from 'happy-dom';

describe('MessagePanel', () => {
  let window: Window;
  let container: HTMLDivElement;
  let messagePanel: MessagePanel;

  beforeEach(() => {
    // Create a new window for each test
    window = new Window();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).document = window.document;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = window;

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    messagePanel?.dispose();
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
    // Clean up global
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).document;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;
  });

  describe('Constructor and Initialization', () => {
    test('should create panel with default visibility', () => {
      messagePanel = new MessagePanel({ container });
      expect(messagePanel.isVisible()).toBe(true);
    });

    test('should create panel with visible=false', () => {
      messagePanel = new MessagePanel({ container, visible: false });
      expect(messagePanel.isVisible()).toBe(false);
    });

    test('should add panel to container', () => {
      messagePanel = new MessagePanel({ container });
      const panel = container.querySelector('#message-panel');
      expect(panel).not.toBeNull();
    });
  });

  describe('Message Display', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
    });

    test('should add USER message via addMessage', () => {
      messagePanel.addMessage('Test message', 'USER');
      const messages = messagePanel.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].text).toBe('Test message');
      expect(messages[0].type).toBe('USER');
    });

    test('should add LOG message via addMessage', () => {
      messagePanel.addMessage('Debug message', 'LOG');
      const messages = messagePanel.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].text).toBe('Debug message');
      expect(messages[0].type).toBe('LOG');
    });

    test('should add USER message via info()', () => {
      messagePanel.info('User info');
      const messages = messagePanel.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].text).toBe('User info');
      expect(messages[0].type).toBe('USER');
    });

    test('should add LOG message via log()', () => {
      messagePanel.log('Log entry');
      const messages = messagePanel.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].text).toBe('Log entry');
      expect(messages[0].type).toBe('LOG');
    });

    test('should store timestamp for messages', () => {
      const before = new Date();
      messagePanel.addMessage('Test', 'USER');
      const after = new Date();

      const messages = messagePanel.getMessages();
      expect(messages[0].timestamp).toBeInstanceOf(Date);
      expect(messages[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(messages[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test('should add multiple messages in order', () => {
      messagePanel.addMessage('First', 'USER');
      messagePanel.addMessage('Second', 'LOG');
      messagePanel.addMessage('Third', 'USER');

      const messages = messagePanel.getMessages();
      expect(messages.length).toBe(3);
      expect(messages[0].text).toBe('First');
      expect(messages[1].text).toBe('Second');
      expect(messages[2].text).toBe('Third');
    });
  });

  describe('Message Rendering', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
    });

    test('should render messages to DOM', () => {
      messagePanel.addMessage('Test message', 'USER');
      const messageList = container.querySelector('#message-list');
      expect(messageList?.children.length).toBe(1);
    });

    test('should display timestamp in rendered message', () => {
      messagePanel.addMessage('Test', 'USER');
      const messageList = container.querySelector('#message-list');
      const messageElement = messageList?.children[0];
      const text = messageElement?.textContent || '';
      // Should contain timestamp pattern [HH:MM:SS]
      expect(text).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
    });

    test('should display [INFO] prefix for USER messages', () => {
      messagePanel.addMessage('User message', 'USER');
      const messageList = container.querySelector('#message-list');
      const messageElement = messageList?.children[0];
      const text = messageElement?.textContent || '';
      expect(text).toContain('[INFO]');
    });

    test('should display [LOG] prefix for LOG messages', () => {
      messagePanel.addMessage('Log message', 'LOG');
      const messageList = container.querySelector('#message-list');
      const messageElement = messageList?.children[0];
      const text = messageElement?.textContent || '';
      expect(text).toContain('[LOG]');
    });

    test('should display message text', () => {
      messagePanel.addMessage('Test message content', 'USER');
      const messageList = container.querySelector('#message-list');
      const messageElement = messageList?.children[0];
      const text = messageElement?.textContent || '';
      expect(text).toContain('Test message content');
    });
  });

  describe('Message Management', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
    });

    test('should clear all messages', () => {
      messagePanel.addMessage('First', 'USER');
      messagePanel.addMessage('Second', 'LOG');
      messagePanel.clear();

      expect(messagePanel.getMessages().length).toBe(0);
      const messageList = container.querySelector('#message-list');
      expect(messageList?.children.length).toBe(0);
    });

    test('should return copy of messages array', () => {
      messagePanel.addMessage('Test', 'USER');
      const messages1 = messagePanel.getMessages();
      const messages2 = messagePanel.getMessages();

      expect(messages1).not.toBe(messages2); // Different array instances
      expect(messages1.length).toBe(messages2.length);
    });
  });

  describe('Visibility', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
    });

    test('should show panel', () => {
      messagePanel.hide();
      messagePanel.show();
      expect(messagePanel.isVisible()).toBe(true);
    });

    test('should hide panel', () => {
      messagePanel.show();
      messagePanel.hide();
      expect(messagePanel.isVisible()).toBe(false);
    });

    test('should toggle visibility', () => {
      messagePanel.hide();
      expect(messagePanel.isVisible()).toBe(false);
      messagePanel.show();
      expect(messagePanel.isVisible()).toBe(true);
    });
  });

  describe('Timestamp Formatting', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
    });

    test('should format timestamp with leading zeros', () => {
      // Add a message and check the timestamp format
      messagePanel.addMessage('Test', 'USER');

      // Access the private formatTimestamp method indirectly by checking rendered output
      const messageList = container.querySelector('#message-list');
      const messageElement = messageList?.children[0];
      const text = messageElement?.textContent || '';

      // Should have format [HH:MM:SS] with leading zeros
      expect(text).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
    });
  });

  describe('Auto-scroll Behavior', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
    });

    test('should not throw when scrolling', () => {
      // Add many messages to trigger scrolling
      for (let i = 0; i < 50; i++) {
        expect(() => messagePanel.addMessage(`Message ${i}`, 'USER')).not.toThrow();
      }
    });
  });

  describe('Disposal', () => {
    test('should remove panel from container on dispose', () => {
      messagePanel = new MessagePanel({ container });
      const panel = container.querySelector('#message-panel');
      expect(panel).not.toBeNull();

      messagePanel.dispose();
      const panelAfter = container.querySelector('#message-panel');
      expect(panelAfter).toBeNull();
    });

    test('should clear messages on dispose', () => {
      messagePanel = new MessagePanel({ container });
      messagePanel.addMessage('Test', 'USER');
      messagePanel.dispose();

      expect(messagePanel.getMessages().length).toBe(0);
    });

    test('should not throw when disposing twice', () => {
      messagePanel = new MessagePanel({ container });
      messagePanel.dispose();
      expect(() => messagePanel.dispose()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
    });

    test('should handle empty message text', () => {
      messagePanel.addMessage('', 'USER');
      const messages = messagePanel.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].text).toBe('');
    });

    test('should handle very long message text', () => {
      const longText = 'A'.repeat(1000);
      messagePanel.addMessage(longText, 'USER');
      const messages = messagePanel.getMessages();
      expect(messages[0].text).toBe(longText);
    });

    test('should handle special characters in message', () => {
      const specialText = '<script>alert("xss")</script>';
      messagePanel.addMessage(specialText, 'USER');
      const messages = messagePanel.getMessages();
      expect(messages[0].text).toBe(specialText);

      // Verify it's rendered as text, not executed
      const messageList = container.querySelector('#message-list');
      const messageElement = messageList?.children[0];
      const text = messageElement?.textContent || '';
      expect(text).toContain(specialText);
    });

    test('should handle rapid message additions', () => {
      for (let i = 0; i < 100; i++) {
        messagePanel.addMessage(`Rapid message ${i}`, i % 2 === 0 ? 'USER' : 'LOG');
      }

      const messages = messagePanel.getMessages();
      expect(messages.length).toBe(100);
    });
  });

  describe('Message Types', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
    });

    test('should default to USER type when not specified', () => {
      messagePanel.addMessage('Default type');
      const messages = messagePanel.getMessages();
      expect(messages[0].type).toBe('USER');
    });

    test('should accept USER type explicitly', () => {
      messagePanel.addMessage('User message', 'USER');
      const messages = messagePanel.getMessages();
      expect(messages[0].type).toBe('USER');
    });

    test('should accept LOG type explicitly', () => {
      messagePanel.addMessage('Log message', 'LOG');
      const messages = messagePanel.getMessages();
      expect(messages[0].type).toBe('LOG');
    });
  });

  describe('Panel Styling', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
    });

    test('should have positioned panel', () => {
      const panel = container.querySelector('#message-panel') as HTMLElement;
      expect(panel.style.position).toBe('absolute');
    });

    test('should have scrollable message list', () => {
      const messageList = container.querySelector('#message-list') as HTMLElement;
      expect(messageList.style.overflowY).toBe('auto');
    });

    test('should have monospace font family', () => {
      const panel = container.querySelector('#message-panel') as HTMLElement;
      expect(panel.style.fontFamily).toContain('Courier New');
    });
  });
});
