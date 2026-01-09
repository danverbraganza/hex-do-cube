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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = window.localStorage;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).localStorage;
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
      // Should contain timestamp pattern HH:MM:SS (no brackets in new design)
      expect(text).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    test('should apply message-user class for USER messages', () => {
      messagePanel.addMessage('User message', 'USER');
      const messageList = container.querySelector('#message-list');
      const messageElement = messageList?.children[0] as HTMLElement;
      expect(messageElement.className).toContain('message-user');
    });

    test('should apply message-log class for LOG messages', () => {
      messagePanel.addMessage('Log message', 'LOG');
      const messageList = container.querySelector('#message-list');
      const messageElement = messageList?.children[0] as HTMLElement;
      expect(messageElement.className).toContain('message-log');
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

      // Should have format HH:MM:SS with leading zeros (no brackets in new design)
      expect(text).toMatch(/\d{2}:\d{2}:\d{2}/);
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

    test('should have fixed positioning for full-height sidebar', () => {
      const panel = container.querySelector('#message-panel') as HTMLElement;
      expect(panel.style.position).toBe('fixed');
    });

    test('should have scrollable message content', () => {
      const messageContent = container.querySelector('.message-panel-content') as HTMLElement;
      expect(messageContent.style.overflowY).toBe('auto');
    });

    test('should have modern font family', () => {
      const panel = container.querySelector('#message-panel') as HTMLElement;
      expect(panel.style.fontFamily).toContain('Segoe UI');
    });

    test('should have header element', () => {
      const header = container.querySelector('.message-panel-header');
      expect(header).not.toBeNull();
    });

    test('should have collapse button', () => {
      const header = container.querySelector('.message-panel-header');
      const button = header?.querySelector('button');
      expect(button).not.toBeNull();
    });
  });

  describe('Collapse/Expand Functionality', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
      // Clear localStorage before each test
      localStorage.removeItem('messagePanel.collapsed');
    });

    test('should start in expanded state by default', () => {
      expect(messagePanel.isCollapsedState()).toBe(false);
      const panel = container.querySelector('#message-panel') as HTMLElement;
      expect(panel.className).not.toContain('collapsed');
    });

    test('should collapse when collapse() is called', () => {
      messagePanel.collapse();
      expect(messagePanel.isCollapsedState()).toBe(true);
      const panel = container.querySelector('#message-panel') as HTMLElement;
      expect(panel.className).toContain('collapsed');
    });

    test('should expand when expand() is called', () => {
      messagePanel.collapse();
      messagePanel.expand();
      expect(messagePanel.isCollapsedState()).toBe(false);
      const panel = container.querySelector('#message-panel') as HTMLElement;
      expect(panel.className).not.toContain('collapsed');
    });

    test('should toggle collapse state', () => {
      expect(messagePanel.isCollapsedState()).toBe(false);
      messagePanel.toggleCollapse();
      expect(messagePanel.isCollapsedState()).toBe(true);
      messagePanel.toggleCollapse();
      expect(messagePanel.isCollapsedState()).toBe(false);
    });

    test('should save collapsed state to localStorage', () => {
      messagePanel.collapse();
      expect(localStorage.getItem('messagePanel.collapsed')).toBe('true');
      messagePanel.expand();
      expect(localStorage.getItem('messagePanel.collapsed')).toBe('false');
    });

    test('should restore collapsed state from localStorage', () => {
      localStorage.setItem('messagePanel.collapsed', 'true');
      const newPanel = new MessagePanel({ container });
      expect(newPanel.isCollapsedState()).toBe(true);
      newPanel.dispose();
    });

    test('should prefer config.collapsed over localStorage when provided', () => {
      localStorage.setItem('messagePanel.collapsed', 'true');
      const newPanel = new MessagePanel({ container, collapsed: false });
      expect(newPanel.isCollapsedState()).toBe(false);
      newPanel.dispose();
    });

    test('should update collapse button icon when collapsing', () => {
      const button = container.querySelector('.message-panel-header button') as HTMLButtonElement;
      const initialText = button.innerHTML;
      messagePanel.collapse();
      expect(button.innerHTML).not.toBe(initialText);
      messagePanel.expand();
      expect(button.innerHTML).toBe(initialText);
    });
  });

  describe('Log Filtering', () => {
    beforeEach(() => {
      messagePanel = new MessagePanel({ container });
      // Clear localStorage before each test
      localStorage.removeItem('messagePanel-showLogs');
    });

    test('should show both LOG and USER messages by default', () => {
      messagePanel.addMessage('User message', 'USER');
      messagePanel.addMessage('Log message', 'LOG');

      const messageList = container.querySelector('#message-list');
      expect(messageList?.children.length).toBe(2);
    });

    test('should have logs checkbox checked by default', () => {
      const checkbox = container.querySelector('#show-logs') as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      expect(checkbox.checked).toBe(true);
    });

    test('should hide LOG messages when checkbox is unchecked', () => {
      messagePanel.addMessage('User message', 'USER');
      messagePanel.addMessage('Log message', 'LOG');

      const checkbox = container.querySelector('#show-logs') as HTMLInputElement;
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));

      const messageList = container.querySelector('#message-list');
      expect(messageList?.children.length).toBe(1);

      // Verify the remaining message is the USER message
      const messageElement = messageList?.children[0];
      expect(messageElement?.className).toContain('message-user');
    });

    test('should show LOG messages when checkbox is checked', () => {
      messagePanel.addMessage('User message', 'USER');
      messagePanel.addMessage('Log message', 'LOG');

      const checkbox = container.querySelector('#show-logs') as HTMLInputElement;

      // Uncheck first
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));

      // Then check again
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      const messageList = container.querySelector('#message-list');
      expect(messageList?.children.length).toBe(2);
    });

    test('should save filter state to localStorage', () => {
      const checkbox = container.querySelector('#show-logs') as HTMLInputElement;

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      expect(localStorage.getItem('messagePanel-showLogs')).toBe('false');

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      expect(localStorage.getItem('messagePanel-showLogs')).toBe('true');
    });

    test('should restore filter state from localStorage', () => {
      // Dispose the initial panel first
      messagePanel.dispose();

      // Set localStorage to hide logs
      localStorage.setItem('messagePanel-showLogs', 'false');

      // Create new panel which should restore the filter state
      const newPanel = new MessagePanel({ container });

      newPanel.addMessage('User message', 'USER');
      newPanel.addMessage('Log message', 'LOG');

      const messageList = container.querySelector('#message-list');
      expect(messageList?.children.length).toBe(1);

      newPanel.dispose();
    });

    test('should only hide LOG messages, not USER messages', () => {
      messagePanel.addMessage('User message 1', 'USER');
      messagePanel.addMessage('Log message', 'LOG');
      messagePanel.addMessage('User message 2', 'USER');

      const checkbox = container.querySelector('#show-logs') as HTMLInputElement;
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));

      const messageList = container.querySelector('#message-list');
      expect(messageList?.children.length).toBe(2);

      // Verify both are USER messages
      const firstMessage = messageList?.children[0];
      const secondMessage = messageList?.children[1];
      expect(firstMessage?.className).toContain('message-user');
      expect(secondMessage?.className).toContain('message-user');
    });

    test('should preserve message order when filtering', () => {
      messagePanel.addMessage('First user message', 'USER');
      messagePanel.addMessage('Log message', 'LOG');
      messagePanel.addMessage('Second user message', 'USER');

      const checkbox = container.querySelector('#show-logs') as HTMLInputElement;
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));

      const messageList = container.querySelector('#message-list');
      const firstMessage = messageList?.children[0]?.textContent;
      const secondMessage = messageList?.children[1]?.textContent;

      expect(firstMessage).toContain('First user message');
      expect(secondMessage).toContain('Second user message');
    });
  });
});
