import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
const HOST = '127.0.0.1';
const ALLOWED_COMMANDS = new Set(['git', 'npm', 'ls', 'dir', 'pwd', 'node', 'cd', 'mkdir', 'echo', 'type', 'cat', 'touch', 'python']);
const PROJECTS_ROOT = path.join(__dirname, '..', 'projects');
const AUDIT_LOG_PATH = path.join(__dirname, 'audit.log');

if (!fs.existsSync(PROJECTS_ROOT)) {
    fs.mkdirSync(PROJECTS_ROOT, { recursive: true });
}

function logAudit(command, status) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] CMD: ${command} | STATUS: ${status}\n`;
    try {
        fs.appendFileSync(AUDIT_LOG_PATH, logEntry);
    } catch (err) {
        console.error("Failed to write to audit log:", err);
    }
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/execute') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { command } = JSON.parse(body);
                if (!command) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'No command provided' }));
                    return;
                }

                const baseCommand = command.trim().split(' ')[0].toLowerCase();

                if (!ALLOWED_COMMANDS.has(baseCommand)) {
                    logAudit(command, 'BLOCKED (Allow-list Violation)');
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Command '${baseCommand}' is not in the allow-list for security.` }));
                    return;
                }

                exec(command, { cwd: PROJECTS_ROOT }, (error, stdout, stderr) => {
                    logAudit(command, error ? 'FAILED' : 'SUCCESS');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        output: stdout,
                        error: stderr || (error ? error.message : null)
                    }));
                });
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, HOST, () => {
    console.log(`[Eldoria Bridge] Fortified terminal bridge running at http://${HOST}:${PORT}`);
    console.log(`[Security] Command allow-list active: ${Array.from(ALLOWED_COMMANDS).join(', ')}`);
    console.log(`[Security] Audit logging to: ${AUDIT_LOG_PATH}`);
});
