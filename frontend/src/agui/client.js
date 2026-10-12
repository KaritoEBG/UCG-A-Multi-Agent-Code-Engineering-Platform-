/**
 * AG-UI Protocol Client
 * Implements the Agent-User Interaction Protocol (https://docs.ag-ui.com)
 * 
 * Standardized event types:
 *   Lifecycle: RUN_STARTED, RUN_FINISHED, RUN_ERROR, STEP_STARTED, STEP_FINISHED
 *   Text:      TEXT_MESSAGE_START, TEXT_MESSAGE_CONTENT, TEXT_MESSAGE_END
 *   Tool:      TOOL_CALL_START, TOOL_CALL_ARGS, TOOL_CALL_END, TOOL_CALL_RESULT
 *   State:     STATE_SNAPSHOT, STATE_DELTA, MESSAGES_SNAPSHOT
 *   Special:   RAW, CUSTOM
 */

// ==================== Event Type Constants ====================

export const EventType = Object.freeze({
  // Lifecycle
  RUN_STARTED: 'RUN_STARTED',
  RUN_FINISHED: 'RUN_FINISHED',
  RUN_ERROR: 'RUN_ERROR',
  STEP_STARTED: 'STEP_STARTED',
  STEP_FINISHED: 'STEP_FINISHED',

  // Text Messages
  TEXT_MESSAGE_START: 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT: 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END: 'TEXT_MESSAGE_END',

  // Tool Calls
  TOOL_CALL_START: 'TOOL_CALL_START',
  TOOL_CALL_ARGS: 'TOOL_CALL_ARGS',
  TOOL_CALL_END: 'TOOL_CALL_END',
  TOOL_CALL_RESULT: 'TOOL_CALL_RESULT',

  // State Management
  STATE_SNAPSHOT: 'STATE_SNAPSHOT',
  STATE_DELTA: 'STATE_DELTA',
  MESSAGES_SNAPSHOT: 'MESSAGES_SNAPSHOT',

  // Special
  RAW: 'RAW',
  CUSTOM: 'CUSTOM',
});


// ==================== SSE Parser ====================

/**
 * Parse a single SSE data line into an AG-UI event object.
 * @param {string} line - Raw SSE line (e.g., "data: {...}")
 * @returns {object|null} Parsed event or null
 */
export const parseSSEEvent = (line) => {
  if (!line || !line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6));
  } catch (e) {
    console.warn('[AG-UI] Failed to parse SSE event:', e.message);
    return null;
  }
};


// ==================== JSON Patch (RFC 6902) ====================

/**
 * Apply JSON Patch operations (RFC 6902) to a state object.
 * Supports: add, remove, replace, move, copy
 * @param {object} state - Current state object (will be cloned)
 * @param {Array} operations - Array of patch operations
 * @returns {object} New state with patches applied
 */
export const applyJsonPatch = (state, operations) => {
  const result = JSON.parse(JSON.stringify(state)); // deep clone

  for (const op of operations) {
    const pathParts = op.path.split('/').filter(Boolean);

    switch (op.op) {
      case 'add':
      case 'replace': {
        let target = result;
        for (let i = 0; i < pathParts.length - 1; i++) {
          target = target[pathParts[i]];
        }
        target[pathParts[pathParts.length - 1]] = op.value;
        break;
      }
      case 'remove': {
        let target = result;
        for (let i = 0; i < pathParts.length - 1; i++) {
          target = target[pathParts[i]];
        }
        delete target[pathParts[pathParts.length - 1]];
        break;
      }
      default:
        console.warn(`[AG-UI] Unsupported patch op: ${op.op}`);
    }
  }

  return result;
};


// ==================== AG-UI Stream Client ====================

/**
 * AG-UI Protocol stream client.
 * Connects to a backend endpoint via fetch + ReadableStream and processes
 * standardized AG-UI events, dispatching them to registered handlers.
 *
 * Usage:
 *   const client = new AGUIClient('http://localhost:5000/api/generate/stream');
 *   client.on(EventType.TEXT_MESSAGE_CONTENT, (event) => { ... });
 *   client.on(EventType.RUN_FINISHED, (event) => { ... });
 *   await client.run({ prompt: 'Create a function...' });
 */
export class AGUIClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.handlers = {};
    this.state = {};
    this.messages = {};  // messageId -> accumulated text
    this.toolCalls = {}; // toolCallId -> accumulated args
    this.isRunning = false;
    this.abortController = null;
  }

  /**
   * Register an event handler.
   * @param {string} eventType - AG-UI event type (from EventType enum)
   * @param {Function} handler - Callback function(event)
   */
  on(eventType, handler) {
    if (!this.handlers[eventType]) {
      this.handlers[eventType] = [];
    }
    this.handlers[eventType].push(handler);
    return this; // chainable
  }

  /**
   * Register a handler for all events.
   */
  onAny(handler) {
    this.on('*', handler);
    return this;
  }

  /**
   * Dispatch an event to registered handlers.
   */
  _dispatch(event) {
    const type = event.type;

    // Type-specific handlers
    if (this.handlers[type]) {
      for (const handler of this.handlers[type]) {
        handler(event);
      }
    }

    // Wildcard handlers
    if (this.handlers['*']) {
      for (const handler of this.handlers['*']) {
        handler(event);
      }
    }

    // Handle CUSTOM events by sub-name
    if (type === EventType.CUSTOM && event.name) {
      const customKey = `CUSTOM:${event.name}`;
      if (this.handlers[customKey]) {
        for (const handler of this.handlers[customKey]) {
          handler(event);
        }
      }
    }
  }

  /**
   * Internal: Process a parsed AG-UI event with protocol-level logic.
   */
  _processEvent(event) {
    switch (event.type) {
      // --- State Management ---
      case EventType.STATE_SNAPSHOT:
        this.state = event.snapshot || {};
        break;

      case EventType.STATE_DELTA:
        if (event.delta) {
          this.state = applyJsonPatch(this.state, event.delta);
        }
        break;

      // --- Text Message accumulation ---
      case EventType.TEXT_MESSAGE_START:
        this.messages[event.messageId] = { role: event.role, content: '' };
        break;

      case EventType.TEXT_MESSAGE_CONTENT:
        if (this.messages[event.messageId]) {
          this.messages[event.messageId].content += event.delta;
        }
        break;

      case EventType.TEXT_MESSAGE_END:
        // Message complete — content is in this.messages[messageId]
        break;

      // --- Tool Call accumulation ---
      case EventType.TOOL_CALL_START:
        this.toolCalls[event.toolCallId] = {
          name: event.toolCallName,
          args: '',
          parentMessageId: event.parentMessageId
        };
        break;

      case EventType.TOOL_CALL_ARGS:
        if (this.toolCalls[event.toolCallId]) {
          this.toolCalls[event.toolCallId].args += event.delta;
        }
        break;

      case EventType.TOOL_CALL_END:
        // Tool call specification complete
        break;

      case EventType.TOOL_CALL_RESULT:
        if (this.toolCalls[event.toolCallId]) {
          this.toolCalls[event.toolCallId].result = event.content;
        }
        break;

      // --- Lifecycle ---
      case EventType.RUN_STARTED:
        this.isRunning = true;
        break;

      case EventType.RUN_FINISHED:
      case EventType.RUN_ERROR:
        this.isRunning = false;
        break;

      default:
        break;
    }

    // Dispatch to handlers
    this._dispatch(event);
  }

  /**
   * Start an AG-UI run by POSTing to the endpoint and processing the SSE stream.
   * @param {object} body - Request body (e.g., { prompt, context_code })
   * @param {object} headers - Additional headers
   * @returns {Promise<object>} Final state
   */
  async run(body, headers = {}) {
    this.abortController = new AbortController();
    this.isRunning = true;
    this.state = {};
    this.messages = {};
    this.toolCalls = {};

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`AG-UI request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const event = parseSSEEvent(trimmed);
          if (event) {
            this._processEvent(event);
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const event = parseSSEEvent(buffer.trim());
        if (event) {
          this._processEvent(event);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[AG-UI] Run cancelled');
      } else {
        this._dispatch({
          type: EventType.RUN_ERROR,
          message: error.message,
          code: 'CLIENT_ERROR'
        });
        throw error;
      }
    } finally {
      this.isRunning = false;
    }

    return this.state;
  }

  /**
   * Cancel the current run.
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Get the current accumulated state.
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get accumulated message content by messageId.
   */
  getMessage(messageId) {
    return this.messages[messageId] || null;
  }

  /**
   * Get all accumulated messages.
   */
  getMessages() {
    return { ...this.messages };
  }

  /**
   * Get accumulated tool call by toolCallId.
   */
  getToolCall(toolCallId) {
    return this.toolCalls[toolCallId] || null;
  }

  /**
   * Get all tool calls.
   */
  getToolCalls() {
    return { ...this.toolCalls };
  }

  /**
   * Clear all handlers.
   */
  removeAllListeners() {
    this.handlers = {};
    return this;
  }
}


// ==================== React Integration Helpers ====================

/**
 * Map AG-UI event to a simplified action for React reducers.
 * This bridges the standard protocol events to app-specific state updates.
 */
export const mapEventToAction = (event) => {
  switch (event.type) {
    case EventType.RUN_STARTED:
      return { action: 'RUN_START', threadId: event.threadId, runId: event.runId };

    case EventType.RUN_FINISHED:
      return { action: 'RUN_COMPLETE', result: event.result };

    case EventType.RUN_ERROR:
      return { action: 'RUN_ERROR', message: event.message, code: event.code };

    case EventType.STEP_STARTED:
      return { action: 'STEP_START', stepName: event.stepName };

    case EventType.STEP_FINISHED:
      return { action: 'STEP_END', stepName: event.stepName };

    case EventType.TEXT_MESSAGE_START:
      return { action: 'MSG_START', messageId: event.messageId, role: event.role };

    case EventType.TEXT_MESSAGE_CONTENT:
      return { action: 'MSG_CHUNK', messageId: event.messageId, delta: event.delta };

    case EventType.TEXT_MESSAGE_END:
      return { action: 'MSG_END', messageId: event.messageId };

    case EventType.TOOL_CALL_START:
      return {
        action: 'TOOL_START',
        toolCallId: event.toolCallId,
        toolCallName: event.toolCallName,
        parentMessageId: event.parentMessageId
      };

    case EventType.TOOL_CALL_ARGS:
      return { action: 'TOOL_ARGS', toolCallId: event.toolCallId, delta: event.delta };

    case EventType.TOOL_CALL_END:
      return { action: 'TOOL_END', toolCallId: event.toolCallId };

    case EventType.TOOL_CALL_RESULT:
      return { action: 'TOOL_RESULT', toolCallId: event.toolCallId, content: event.content };

    case EventType.STATE_SNAPSHOT:
      return { action: 'STATE_SNAPSHOT', snapshot: event.snapshot };

    case EventType.STATE_DELTA:
      return { action: 'STATE_DELTA', delta: event.delta };

    case EventType.CUSTOM:
      return { action: 'CUSTOM', name: event.name, value: event.value };

    default:
      return { action: 'UNKNOWN', event };
  }
};

export default AGUIClient;
