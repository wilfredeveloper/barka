#!/usr/bin/env node

/**
 * Quick verification that all 6 tools are registered
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function verifyTools() {
  console.log('🔍 Verifying MCP Server Tools...\n');

  const serverPath = join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let toolsFound = false;

  server.stdout.on('data', (data) => {
    const output = data.toString();
    try {
      const response = JSON.parse(output);
      if (response.tools) {
        console.log('✅ MCP Server Tools Found:');
        response.tools.forEach((tool, index) => {
          console.log(`${index + 1}. ${tool.name}`);
          console.log(`   Description: ${tool.description.substring(0, 80)}...`);
          
          // Count actions for this tool
          const actions = tool.inputSchema?.properties?.action?.enum || [];
          console.log(`   Actions: ${actions.length} (${actions.join(', ')})`);
          console.log('');
        });
        
        console.log(`📊 Total: ${response.tools.length} tools implemented`);
        toolsFound = true;
        server.kill();
      }
    } catch (e) {
      // Not JSON, probably log output
    }
  });

  server.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('MCP Server started successfully')) {
      console.log('✅ Server started, requesting tools list...\n');
      // Send tools list request
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };
      server.stdin.write(JSON.stringify(request) + '\n');
    }
  });

  server.on('close', (code) => {
    if (!toolsFound) {
      console.log('❌ Could not retrieve tools list');
    }
    process.exit(code);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    if (!toolsFound) {
      console.log('⏰ Timeout - killing server');
      server.kill();
    }
  }, 10000);
}

verifyTools().catch(console.error);
