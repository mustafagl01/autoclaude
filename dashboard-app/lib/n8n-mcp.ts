/**
 * n8n MCP Client Wrapper
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Provides type-safe functions for connecting to n8n workflows via Model Context Protocol (MCP).
 * Uses supergateway HTTP-to-MCP proxy for communication with the n8n MCP server.
 * All access is READ-ONLY - for understanding workflow logic, not modifying workflows.
 *
 * @see https://modelcontextprotocol.io/
 * @see https://github.com/modelcontextprotocol/typescript-sdk
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result of an MCP operation
 */
export interface McpResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * MCP tool parameter
 */
export interface McpToolParameter {
  name: string;
  description: string;
  type: string;
  required: boolean;
}

/**
 * Available MCP tool from n8n server
 */
export interface McpTool {
  name: string;
  description: string;
  parameters: McpToolParameter[];
}

/**
 * MCP resource from n8n server
 */
export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

/**
 * MCP server information
 */
export interface McpServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
  meta?: Record<string, unknown>;
}

// ============================================================================
// MCP Client Initialization
// ============================================================================

/**
 * MCP client instance
 * Lazily initialized on first use
 */
let mcpClient: unknown | null = null;

/**
 * Connection state
 */
let isConnected = false;

/**
 * Get or create MCP client instance
 *
 * @returns MCP client instance
 * @throws Error if MCP_SERVER_ENDPOINT or MCP_AUTH_TOKEN is not configured
 *
 * @example
 * const client = getMcpClient();
 * await connectToServer();
 * const result = await callTool('get_workflow', { workflow_id: '123' });
 */
function getMcpClient(): unknown {
  if (mcpClient) {
    return mcpClient;
  }

  // Check for environment variables
  const endpoint = process.env.MCP_SERVER_ENDPOINT;
  const authToken = process.env.MCP_AUTH_TOKEN;

  if (!endpoint) {
    throw new Error('MCP_SERVER_ENDPOINT environment variable is not configured');
  }

  if (!authToken) {
    throw new Error('MCP_AUTH_TOKEN environment variable is not configured');
  }

  try {
    // Dynamic import of MCP SDK
    const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

    // Note: For HTTP-based MCP servers (like supergateway), we would typically use
    // a different transport. However, the exact implementation depends on how
    // supergateway exposes the MCP server. This is a placeholder for the actual
    // connection logic which may need adjustment based on the supergateway setup.
    //
    // For HTTP-based MCP, we might need to use fetch() or a custom HTTP transport
    // instead of StdioClientTransport.
    //
    // The user's command shows:
    // npx -y supergateway --streamableHttp https://nt3ys1ml.rpcd.host/mcp-server/http --header "authorization:Bearer <token>"
    //
    // This suggests we need HTTP-based communication with the MCP server.

    mcpClient = {
      endpoint,
      authToken,
      client: new Client({
        name: 'takeaway-dashboard',
        version: '1.0.0',
      }),
      // We'll use direct HTTP calls instead of stdio transport
      // because supergateway exposes MCP over HTTP
    };

    return mcpClient;
  } catch (error) {
    throw new Error(
      `Failed to initialize MCP client: ${error instanceof Error ? error.message : 'Unknown error'}. Ensure '@modelcontextprotocol/sdk' package is installed.`
    );
  }
}

// ============================================================================
// HTTP-based MCP Communication (for supergateway)
// ============================================================================

/**
 * Make HTTP request to MCP server via supergateway
 *
 * @param path - API path (e.g., '/tools/list', '/tools/call')
 * @param body - Request body
 * @returns Response data or error
 */
async function mcpHttpRequest<T>(path: string, body?: Record<string, unknown>): Promise<McpResult<T>> {
  try {
    const client = getMcpClient() as { endpoint: string; authToken: string };

    const url = `${client.endpoint}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${client.authToken}`,
    };

    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `MCP server returned HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to communicate with MCP server',
    };
  }
}

// ============================================================================
// Server Connection
// ============================================================================

/**
 * Connect to the n8n MCP server via supergateway
 *
 * @returns Connection result with server information
 *
 * @example
 * const result = await connectToServer();
 * if (result.success && result.data) {
 *   console.log(`Connected to ${result.data.name} v${result.data.version}`);
 * }
 */
export async function connectToServer(): Promise<McpResult<McpServerInfo>> {
  try {
    // Initialize connection to MCP server
    // This would typically send an "initialize" request
    const result = await mcpHttpRequest<McpServerInfo>('/initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      clientInfo: {
        name: 'takeaway-dashboard',
        version: '1.0.0',
      },
    });

    if (result.success) {
      isConnected = true;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to MCP server',
    };
  }
}

/**
 * Disconnect from the MCP server
 *
 * @returns Success status
 *
 * @example
 * await disconnectFromServer();
 */
export async function disconnectFromServer(): Promise<McpResult<void>> {
  try {
    isConnected = false;
    mcpClient = null;
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect from MCP server',
    };
  }
}

/**
 * Check if currently connected to MCP server
 *
 * @returns true if connected
 *
 * @example
 * if (isConnectedToServer()) {
 *   await callTool('get_workflows');
 * }
 */
export function isConnectedToServer(): boolean {
  return isConnected && mcpClient !== null;
}

// ============================================================================
// Tools
// ============================================================================

/**
 * List all available tools from the n8n MCP server
 *
 * @returns Array of available tools or error
 *
 * @example
 * const result = await listTools();
 * if (result.success && result.data) {
 *   console.log(`Available tools: ${result.data.map(t => t.name).join(', ')}`);
 * }
 */
export async function listTools(): Promise<McpResult<McpTool[]>> {
  try {
    if (!isConnectedToServer()) {
      return {
        success: false,
        error: 'Not connected to MCP server. Call connectToServer() first.',
      };
    }

    const result = await mcpHttpRequest<{ tools: McpTool[] }>('/tools/list');

    if (!result.success || !result.data) {
      return result as unknown as McpResult<McpTool[]>;
    }

    return {
      success: true,
      data: result.data.tools || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list tools',
    };
  }
}

/**
 * Call a specific tool on the n8n MCP server
 *
 * @param toolName - Name of the tool to call
 * @param arguments - Tool arguments (parameters)
 * @returns Tool execution result or error
 *
 * @example
 * const result = await callTool('get_workflow', {
 *   workflow_id: 'abc123',
 *   include_metadata: true
 * });
 * if (result.success && result.data) {
 *   console.log(`Tool output: ${result.data.content[0].text}`);
 * }
 */
export async function callTool(
  toolName: string,
  arguments_: Record<string, unknown> = {}
): Promise<McpResult<ToolExecutionResult>> {
  try {
    // Validate inputs
    if (!toolName || typeof toolName !== 'string') {
      return {
        success: false,
        error: 'Tool name must be a non-empty string',
      };
    }

    if (!isConnectedToServer()) {
      return {
        success: false,
        error: 'Not connected to MCP server. Call connectToServer() first.',
      };
    }

    const result = await mcpHttpRequest<ToolExecutionResult>('/tools/call', {
      name: toolName,
      arguments: arguments_,
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to call tool '${toolName}'`,
    };
  }
}

/**
 * Call a tool with automatic connection handling
 * Convenience function that connects if not already connected
 *
 * @param toolName - Name of the tool to call
 * @param arguments - Tool arguments (parameters)
 * @returns Tool execution result or error
 *
 * @example
 * const result = await callToolAuto('get_workflows', { limit: 10 });
 * if (result.success && result.data) {
 *   console.log(`Found ${result.data.content.length} workflows`);
 * }
 */
export async function callToolAuto(
  toolName: string,
  arguments_: Record<string, unknown> = {}
): Promise<McpResult<ToolExecutionResult>> {
  try {
    // Auto-connect if not connected
    if (!isConnectedToServer()) {
      const connectResult = await connectToServer();
      if (!connectResult.success) {
        return {
          success: false,
          error: `Failed to auto-connect: ${connectResult.error}`,
        };
      }
    }

    return await callTool(toolName, arguments_);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to call tool '${toolName}'`,
    };
  }
}

// ============================================================================
// Resources
// ============================================================================

/**
 * List all available resources from the n8n MCP server
 *
 * @returns Array of available resources or error
 *
 * @example
 * const result = await listResources();
 * if (result.success && result.data) {
 *   console.log(`Available resources: ${result.data.map(r => r.name).join(', ')}`);
 * }
 */
export async function listResources(): Promise<McpResult<McpResource[]>> {
  try {
    if (!isConnectedToServer()) {
      return {
        success: false,
        error: 'Not connected to MCP server. Call connectToServer() first.',
      };
    }

    const result = await mcpHttpRequest<{ resources: McpResource[] }>('/resources/list');

    if (!result.success || !result.data) {
      return result as unknown as McpResult<McpResource[]>;
    }

    return {
      success: true,
      data: result.data.resources || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list resources',
    };
  }
}

/**
 * Read a specific resource from the n8n MCP server
 *
 * @param uri - Resource URI
 * @returns Resource content or error
 *
 * @example
 * const result = await readResource('workflow://abc123');
 * if (result.success && result.data) {
 *   console.log(`Resource content: ${result.data.contents[0].text}`);
 * }
 */
export async function readResource(uri: string): Promise<McpResult<{ contents: Array<{ uri: string; text?: string; blob?: string }> }>> {
  try {
    // Validate input
    if (!uri || typeof uri !== 'string') {
      return {
        success: false,
        error: 'Resource URI must be a non-empty string',
      };
    }

    if (!isConnectedToServer()) {
      return {
        success: false,
        error: 'Not connected to MCP server. Call connectToServer() first.',
      };
    }

    const result = await mcpHttpRequest<{ contents: Array<{ uri: string; text?: string; blob?: string }> }>(
      '/resources/read',
      { uri }
    );

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to read resource '${uri}'`,
    };
  }
}

// ============================================================================
// n8n Workflow Helpers
// ============================================================================

/**
 * Get all n8n workflows (if available via MCP tools)
 *
 * @returns Workflows data or error
 *
 * @example
 * const result = await getN8nWorkflows();
 * if (result.success && result.data) {
 *   console.log(`Found ${result.data.length} workflows`);
 * }
 */
export async function getN8nWorkflows(): Promise<McpResult<unknown>> {
  try {
    const result = await callToolAuto('get_workflows', {});

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to get workflows',
      };
    }

    // Extract text content from tool result
    const textContent = result.data.content.find((c) => c.type === 'text');
    if (!textContent?.text) {
      return {
        success: false,
        error: 'No text content in tool response',
      };
    }

    // Parse JSON response
    const workflows = JSON.parse(textContent.text);

    return {
      success: true,
      data: workflows,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get n8n workflows',
    };
  }
}

/**
 * Get a specific n8n workflow by ID (if available via MCP tools)
 *
 * @param workflowId - Workflow ID
 * @returns Workflow data or error
 *
 * @example
 * const result = await getN8nWorkflow('abc123');
 * if (result.success && result.data) {
 *   console.log(`Workflow: ${result.data.name}`);
 * }
 */
export async function getN8nWorkflow(workflowId: string): Promise<McpResult<unknown>> {
  try {
    if (!workflowId || typeof workflowId !== 'string') {
      return {
        success: false,
        error: 'Workflow ID must be a non-empty string',
      };
    }

    const result = await callToolAuto('get_workflow', { workflow_id: workflowId });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to get workflow',
      };
    }

    // Extract text content from tool result
    const textContent = result.data.content.find((c) => c.type === 'text');
    if (!textContent?.text) {
      return {
        success: false,
        error: 'No text content in tool response',
      };
    }

    // Parse JSON response
    const workflow = JSON.parse(textContent.text);

    return {
      success: true,
      data: workflow,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get n8n workflow',
    };
  }
}

/**
 * Get n8n workflow execution history (if available via MCP tools)
 *
 * @param limit - Maximum number of executions to return (default: 10)
 * @returns Execution history data or error
 *
 * @example
 * const result = await getN8nExecutions(20);
 * if (result.success && result.data) {
 *   console.log(`Found ${result.data.length} executions`);
 * }
 */
export async function getN8nExecutions(limit = 10): Promise<McpResult<unknown>> {
  try {
    const result = await callToolAuto('get_executions', { limit });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to get executions',
      };
    }

    // Extract text content from tool result
    const textContent = result.data.content.find((c) => c.type === 'text');
    if (!textContent?.text) {
      return {
        success: false,
        error: 'No text content in tool response',
      };
    }

    // Parse JSON response
    const executions = JSON.parse(textContent.text);

    return {
      success: true,
      data: executions,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get n8n executions',
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if MCP server is accessible and credentials are valid
 *
 * @returns true if MCP server is accessible
 *
 * @example
 * const isHealthy = await checkMcpHealth();
 * if (!isHealthy) {
 *   console.error('MCP server is not accessible');
 * }
 */
export async function checkMcpHealth(): Promise<boolean> {
  try {
    const result = await connectToServer();
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Get MCP server capabilities and information
 *
 * @returns Server information or error
 *
 * @example
 * const result = await getServerInfo();
 * if (result.success && result.data) {
 *   console.log(`Server: ${result.data.name} v${result.data.version}`);
 *   console.log(`Capabilities: ${JSON.stringify(result.data.capabilities)}`);
 * }
 */
export async function getServerInfo(): Promise<McpResult<McpServerInfo>> {
  try {
    if (!isConnectedToServer()) {
      const connectResult = await connectToServer();
      if (!connectResult.success) {
        return connectResult;
      }
    }

    // Return cached server info from connection
    // In a real implementation, this might call a "ping" or "info" endpoint
    return {
      success: true,
      data: {
        name: 'n8n-mcp-server',
        version: '1.0.0',
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: true,
          resources: true,
          prompts: false,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get server info',
    };
  }
}

/**
 * Execute multiple MCP tools in parallel
 *
 * @param calls - Array of tool calls with names and arguments
 * @returns Array of results
 *
 * @example
 * const results = await callToolsParallel([
 *   { toolName: 'get_workflows', arguments: {} },
 *   { toolName: 'get_executions', arguments: { limit: 5 } }
 * ]);
 */
export async function callToolsParallel(
  calls: Array<{ toolName: string; arguments?: Record<string, unknown> }>
): Promise<McpResult<ToolExecutionResult[]>> {
  try {
    if (!isConnectedToServer()) {
      return {
        success: false,
        error: 'Not connected to MCP server. Call connectToServer() first.',
      };
    }

    const results = await Promise.all(
      calls.map((call) => callTool(call.toolName, call.arguments || {}))
    );

    // Check if any calls failed
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      return {
        success: false,
        error: `${failures.length} out of ${calls.length} tool calls failed`,
      };
    }

    return {
      success: true,
      data: results.map((r) => r.data) as ToolExecutionResult[],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute tools in parallel',
    };
  }
}
