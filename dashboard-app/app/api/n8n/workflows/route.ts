/**
 * n8n Workflows API Route
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Provides authenticated read-only access to n8n workflow logic via MCP server.
 * Lists available workflow tools and their metadata for dashboard integration.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 * @see /lib/n8n-mcp.ts - MCP client wrapper for n8n workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/api/auth/[...nextauth]/route';
import { listTools, type McpTool } from '@/lib/n8n-mcp';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Workflow tool metadata for API response
 *
 * Simplified version of McpTool for client consumption
 */
interface WorkflowTool {
  /** Tool name (used to invoke the tool) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** Required and optional parameters for the tool */
  parameters: Array<{
    name: string;
    description: string;
    type: string;
    required: boolean;
  }>;
}

/**
 * Successful response format
 */
interface WorkflowsResponse {
  /** Array of available workflow tools */
  tools: WorkflowTool[];
  /** Total number of tools */
  total: number;
  /** MCP server connection status */
  serverConnected: boolean;
}

// ============================================================================
// GET Handler - List Available Workflow Tools
// ============================================================================

/**
 * GET /api/n8n/workflows
 *
 * Fetches available n8n workflow tools from the MCP server.
 * Provides read-only access to understand available workflow logic.
 *
 * Authentication:
 * - Requires valid NextAuth session
 * - Returns 401 Unauthorized if no session
 *
 * Response Format:
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "tools": [
 *       {
 *         "name": "get_workflows",
 *         "description": "Get all n8n workflows",
 *         "parameters": [
 *           {
 *             "name": "limit",
 *             "description": "Maximum number of workflows to return",
 *             "type": "number",
 *             "required": false
 *           }
 *         ]
 *       },
 *       {
 *         "name": "get_workflow",
 *         "description": "Get specific n8n workflow by ID",
 *         "parameters": [
 *           {
 *             "name": "workflow_id",
 *             "description": "Workflow ID",
 *             "type": "string",
 *             "required": true
 *           }
 *         ]
 *       }
 *     ],
 *     "total": 2,
 *     "serverConnected": true
 *   }
 * }
 * ```
 *
 * Error Response:
 * ```json
 * {
 *   "success": false,
 *   "error": "Error message describing what went wrong"
 * }
 * ```
 *
 * @param request - Next.js Request object
 * @returns Next.js Response with workflow tools list or error
 *
 * @example
 * // Fetch all available workflow tools
 * const response = await fetch('/api/n8n/workflows');
 * const data = await response.json();
 *
 * if (data.success) {
 *   console.log(`Found ${data.data.total} workflow tools`);
 *   data.data.tools.forEach(tool => {
 *     console.log(`- ${tool.name}: ${tool.description}`);
 *   });
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // --------------------------------------------------------------------------
  // Authentication Check
  // --------------------------------------------------------------------------

  /**
   * Verify user is authenticated
   *
   * Uses getServerSession() to validate the NextAuth JWT token.
   * If no valid session exists, returns 401 Unauthorized.
   *
   * @see https://next-auth.js.org/configuration/nextjs#getserversession
   */
  const session = await getServerSession(authConfig);

  if (!session || !session.user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized - Please sign in to access workflow data',
      },
      { status: 401 }
    );
  }

  // --------------------------------------------------------------------------
  // Fetch Available Workflow Tools from n8n MCP Server
  // --------------------------------------------------------------------------

  try {
    /**
     * List available tools from the n8n MCP server
     *
     * The listTools function handles:
     * - MCP server connection (if not already connected)
     * - Fetching tool list from server
     * - Error handling for connection failures
     *
     * This is READ-ONLY access - no workflows are modified.
     */
    const result = await listTools();

    if (!result.success) {
      // MCP server returned an error
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch workflow tools from n8n MCP server',
        },
        { status: 500 }
      );
    }

    if (!result.data) {
      // No data returned (unexpected case)
      return NextResponse.json(
        {
          success: false,
          error: 'No workflow tools available',
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------------------------------
    // Transform MCP Tools to Workflow Tools Format
    // --------------------------------------------------------------------------

    /**
     * Transform MCP tool format to simplified workflow tool format
     *
     * This removes any MCP-specific implementation details and provides
     * a clean interface for the frontend dashboard.
     */
    const workflowTools: WorkflowTool[] = result.data.map((tool: McpTool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters.map((param) => ({
        name: param.name,
        description: param.description,
        type: param.type,
        required: param.required,
      })),
    }));

    // --------------------------------------------------------------------------
    // Return Successful Response
    // --------------------------------------------------------------------------

    /**
     * Return workflow tools to the client
     *
     * The response includes:
     * - Array of workflow tools with metadata
     * - Total count of available tools
     * - Server connection status
     */
    const responseData: WorkflowsResponse = {
      tools: workflowTools,
      total: workflowTools.length,
      serverConnected: true,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    // --------------------------------------------------------------------------
    // Error Handling
    // --------------------------------------------------------------------------

    /**
     * Handle unexpected errors during fetch
     *
     * Errors could include:
     * - Network issues connecting to MCP server
     * - MCP server unavailability
     * - Invalid authentication credentials
     * - Malformed server response
     */
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Log error for debugging (in production, use proper logging service)
    // Don't expose sensitive details to client

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch workflow tools. Please try again later.',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Runtime Configuration
// ============================================================================

/**
 * Edge runtime configuration
 *
 * This API route runs on Cloudflare Workers edge runtime.
 * Edge functions provide low-latency responses and global distribution.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes
 */
export const runtime = 'edge';
