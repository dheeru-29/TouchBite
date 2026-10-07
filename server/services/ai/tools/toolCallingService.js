import { TOOL_DEFINITIONS, executeToolCall } from './index.js';

export function getToolDefinitions() {
  return TOOL_DEFINITIONS;
}

export async function runToolCall({ name, argumentsValue, context }) {
  return executeToolCall(name, argumentsValue, context);
}
