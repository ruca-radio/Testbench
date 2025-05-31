/**
 * MCP Server Health Check Utility
 * 
 * This script performs health checks on configured MCP servers and reports their status.
 * It can be used as a standalone monitoring tool or integrated into a larger monitoring system.
 * 
 * Usage:
 *   node mcp-health-check.js [--server=server-name] [--verbose] [--json] [--threshold=500]
 * 
 * Options:
 *   --server     Check only the specified server (default: all servers)
 *   --verbose    Show detailed information about each check
 *   --json       Output results in JSON format
 *   --threshold  Response time threshold in ms (default: 500)
 */

const fetch = require('node-fetch');
const database = require('../database');

// Configuration
const DEFAULT_TIMEOUT = 5000; // 5 seconds
const DEFAULT_THRESHOLD = 500; // 500 ms

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    server: null,
    verbose: false,
    json: false,
    threshold: DEFAULT_THRESHOLD
  };

  for (const arg of args) {
    if (arg.startsWith('--server=')) {
      options.server = arg.split('=')[1];
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg.startsWith('--threshold=')) {
      options.threshold = parseInt(arg.split('=')[1], 10);
    }
  }

  return options;
}

/**
 * Check health of a single MCP server
 */
async function checkServerHealth(server, options) {
  const startTime = Date.now();
  const result = {
    name: server.name,
    displayName: server.displayName || server.name,
    endpoint: server.endpoint,
    status: 'unknown',
    responseTime: null,
    error: null,
    details: {}
  };

  try {
    // Set up request options with timeout
    const requestOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(server.apiKey && { 'Authorization': `Bearer ${server.apiKey}` })
      },
      timeout: DEFAULT_TIMEOUT
    };

    // Execute the request
    const response = await fetch(`${server.endpoint}/status`, requestOptions);
    const responseTime = Date.now() - startTime;
    result.responseTime = responseTime;

    // Process response
    if (response.ok) {
      const data = await response.json();
      result.status = 'healthy';
      result.details = {
        version: data.version,
        capabilities: data.capabilities || [],
        serverTime: data.server_time
      };

      // Check if response time exceeds threshold
      if (responseTime > options.threshold) {
        result.status = 'degraded';
        result.warning = `Response time (${responseTime}ms) exceeds threshold (${options.threshold}ms)`;
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      result.status = 'unhealthy';
      result.error = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    result.status = 'unreachable';
    result.error = error.name === 'AbortError' 
      ? 'Connection timed out' 
      : error.message;
  }

  return result;
}

/**
 * Format and display results
 */
function displayResults(results, options) {
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Summary counts
  const counts = {
    total: results.length,
    healthy: results.filter(r => r.status === 'healthy').length,
    degraded: results.filter(r => r.status === 'degraded').length,
    unhealthy: results.filter(r => r.status === 'unhealthy').length,
    unreachable: results.filter(r => r.status === 'unreachable').length
  };

  // Print summary
  console.log('\n=== MCP Server Health Check Summary ===');
  console.log(`Total Servers: ${counts.total}`);
  console.log(`Healthy: ${counts.healthy}`);
  console.log(`Degraded: ${counts.degraded}`);
  console.log(`Unhealthy: ${counts.unhealthy}`);
  console.log(`Unreachable: ${counts.unreachable}`);
  console.log('=======================================\n');

  // Print details for each server
  for (const result of results) {
    // Status indicator
    let statusIndicator;
    switch (result.status) {
      case 'healthy':
        statusIndicator = '✅';
        break;
      case 'degraded':
        statusIndicator = '⚠️';
        break;
      case 'unhealthy':
        statusIndicator = '❌';
        break;
      case 'unreachable':
        statusIndicator = '❌';
        break;
      default:
        statusIndicator = '❓';
    }

    console.log(`${statusIndicator} ${result.displayName} (${result.name})`);
    console.log(`   Status: ${result.status}`);
    
    if (result.responseTime !== null) {
      console.log(`   Response Time: ${result.responseTime}ms`);
    }
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.warning) {
      console.log(`   Warning: ${result.warning}`);
    }
    
    if (options.verbose && result.status === 'healthy' || result.status === 'degraded') {
      console.log(`   Version: ${result.details.version || 'unknown'}`);
      console.log(`   Capabilities: ${result.details.capabilities?.join(', ') || 'none'}`);
    }
    
    console.log(''); // Empty line between servers
  }

  // Exit with non-zero code if any servers are unhealthy or unreachable
  if (counts.unhealthy > 0 || counts.unreachable > 0) {
    process.exitCode = 1;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const options = parseArgs();
    
    // Get servers from database
    let servers;
    if (options.server) {
      const server = database.getMCPServer(options.server);
      if (!server) {
        console.error(`Error: Server '${options.server}' not found`);
        process.exit(1);
      }
      servers = [server];
    } else {
      servers = database.getAllMCPServers();
    }
    
    if (servers.length === 0) {
      console.log('No MCP servers configured.');
      return;
    }
    
    // Check health of all servers
    const results = [];
    for (const server of servers) {
      const result = await checkServerHealth(server, options);
      results.push(result);
    }
    
    // Display results
    displayResults(results, options);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

// Export functions for use in other scripts
module.exports = {
  checkServerHealth
};