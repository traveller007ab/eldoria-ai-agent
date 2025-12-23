import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3099;
const HOST = '0.0.0.0';
const ALLOWED_COMMANDS = new Set(['git', 'npm', 'ls', 'dir', 'pwd', 'node', 'cd', 'mkdir', 'echo', 'type', 'cat', 'touch', 'python', 'get-childitem', 'copy-item', 'move-item', 'rm', 'powershell', 'pwsh', 'cls', 'whoami']);
const PROJECTS_ROOT = path.join(__dirname, '..', 'projects');
const AUDIT_LOG_PATH = path.join(__dirname, 'audit.log');

if (!fs.existsSync(PROJECTS_ROOT)) {
    fs.mkdirSync(PROJECTS_ROOT, { recursive: true });
}

// --- HYGIENE: Strip BOM and hidden characters from env keys ---
Object.keys(process.env).forEach(key => {
    const cleanKey = key.replace(/^\uFEFF/, '').trim();
    if (cleanKey !== key) {
        process.env[cleanKey] = process.env[key];
    }
});

console.log("🔑 [Init] Sanitized Keys:", Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY')));

function logAudit(command, status) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] CMD: ${command} | STATUS: ${status}\n`;
    console.log(`📝 [Audit] ${status}: ${command}`); // Additional console log for visibility
    try {
        fs.appendFileSync(AUDIT_LOG_PATH, logEntry);
    } catch (err) {
        console.error("Failed to write to audit log:", err);
    }
}

const server = http.createServer((req, res) => {
    console.log(`\n📥 [Request] ${req.method} ${req.url}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // --- HEALTH CHECK ---
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const health = JSON.stringify({
            status: 'online',
            services: { terminal: 'active', filesystem: fs.existsSync(PROJECTS_ROOT) ? 'ready' : 'error' },
            timestamp: new Date().toISOString()
        });
        console.log(`📤 [Response] 200 Health Check`);
        res.end(health);
        return;
    }

    // --- TERMINAL EXECUTION ---
    if (req.method === 'POST' && req.url === '/execute') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { command } = JSON.parse(body);
                console.log(`💻 [Terminal] Executing: ${command}`);
                if (!command) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'No command provided' }));
                    return;
                }

                const baseCommand = command.trim().split(' ')[0].toLowerCase();
                console.log(`🔍 [Security] Checking command: '${baseCommand}' (Full: ${command})`);

                if (!ALLOWED_COMMANDS.has(baseCommand)) {
                    console.warn(`🚫 [Security] BLOCKED: '${baseCommand}' is not in allow-list.`);
                    logAudit(command, 'BLOCKED (Allow-list Violation)');
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Command '${baseCommand}' is forbidden.` }));
                    return;
                }

                exec(command, { cwd: PROJECTS_ROOT }, (error, stdout, stderr) => {
                    logAudit(command, error ? 'FAILED' : 'SUCCESS');
                    if (!res.headersSent) {
                        console.log(`📤 [Response] 200 Command Result`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            output: stdout,
                            error: stderr || (error ? error.message : null)
                        }));
                    }
                });
            } catch (e) {
                if (!res.headersSent) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid request' }));
                }
            }
        });
        return;
    }

    // --- AI PROXY (GROQ/GEMINI FALLBACK) ---
    if (req.method === 'POST' && req.url === '/proxy/groq') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                const { messages, model, stream } = payload;
                const apiKey = payload.apiKey || process.env.VITE_GROQ_API_KEY;
                const geminiApiKey = payload.geminiApiKey || process.env.VITE_API_KEY;
                const openRouterApiKey = payload.openRouterApiKey || process.env.VITE_OPENROUTER_API_KEY;

                console.log(`🤖 [Proxy] Request to Groq (Model: ${model}, Messages: ${messages?.length})`);

                if (!apiKey && !geminiApiKey && !openRouterApiKey) {
                    console.error(`🚫 [Proxy] No API Keys available!`);
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Missing API Keys for Groq, Gemini, and OpenRouter. Please check your .env.local file." }));
                    return;
                }

                console.log(`📡 [Proxy] Attempting Groq (Key: ${apiKey ? 'Found' : 'Missing'})...`);
                const groqAbort = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.warn("⚠️ [Proxy] Groq connection timed out (>8s). Bypassing to OpenRouter/Gemini...");
                    groqAbort.abort();
                }, 8000);

                try {
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            messages,
                            model: model || 'llama-3.3-70b-versatile',
                            temperature: payload.temperature ?? 0.7,
                            stream: stream || false,
                            tools: payload.tools,
                            tool_choice: payload.tool_choice
                        }),
                        signal: groqAbort.signal
                    });
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`🚫 [Proxy] Groq API returned ${response.status}: ${errorText}`);
                        if ((response.status >= 400)) {
                            if (openRouterApiKey) {
                                console.log("🛡️ [Failover] Retrying with OpenRouter due to Groq error...");
                                return await callOpenRouterFallback({ ...payload, openRouterApiKey, geminiApiKey }, res);
                            } else if (geminiApiKey) {
                                console.log("🛡️ [Failover] Retrying with Gemini due to Groq error...");
                                return await callGeminiFallback({ ...payload, geminiApiKey }, res);
                            }
                        }
                        res.writeHead(response.status, { 'Content-Type': 'application/json' });
                        res.end(errorText);
                        return;
                    }

                    if (stream) {
                        console.log(`📤 [Proxy] Streaming Groq response...`);
                        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
                        Readable.fromWeb(response.body).pipe(res);
                    } else {
                        const data = await response.json();
                        console.log(`📤 [Proxy] Successfully returned Groq JSON`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(data));
                    }
                } catch (fetchErr) {
                    clearTimeout(timeoutId);
                    console.error("🔥 [Proxy] Groq network failure:", fetchErr.message);
                    if (openRouterApiKey) {
                        return await callOpenRouterFallback({ ...payload, openRouterApiKey, geminiApiKey }, res);
                    } else if (geminiApiKey) {
                        return await callGeminiFallback({ ...payload, geminiApiKey }, res);
                    } else {
                        throw fetchErr;
                    }
                }
            } catch (e) {
                console.error("🔥 [Proxy] Critical Exception:", e.message);
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: `Bridge internal failure: ${e.message}` }));
                }
            }
        });
        return;
    }

    console.warn(`❓ [Request] Not Found: ${req.url}`);
    res.writeHead(404);
    res.end();
});

async function callOpenRouterFallback(payload, res) {
    const { messages, openRouterApiKey, geminiApiKey, stream, temperature, tools, tool_choice } = payload;
    console.log(`🛡️ [Failover] Triggering OpenRouter Fallback (meta-llama/llama-3.3-70b-instruct)...`);

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://eldoria.ai',
                'X-Title': 'Eldoria AI IDE'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.3-70b-instruct',
                messages,
                stream: stream || false,
                temperature: temperature ?? 0.7,
                tools,
                tool_choice
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`🚫 [Failover] OpenRouter API Error (${response.status}):`, errorText);
            if (geminiApiKey) {
                console.log("🛡️ [Failover] OpenRouter failed, pivoting to Gemini...");
                return await callGeminiFallback({ ...payload, geminiApiKey }, res);
            }
            throw new Error(`OpenRouter Error: ${errorText}`);
        }

        if (stream) {
            res.writeHead(200, { 'Content-Type': 'text/event-stream' });
            Readable.fromWeb(response.body).pipe(res);
        } else {
            const data = await response.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        }
    } catch (e) {
        console.error("🔥 [Failover] OpenRouter Exception:", e.message);
        if (geminiApiKey) {
            return await callGeminiFallback({ ...payload, geminiApiKey }, res);
        }
        if (!res.headersSent) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: `OpenRouter Failover Error: ${e.message}` }));
        }
    }
}

async function callGeminiFallback(payload, res) {
    const { messages, geminiApiKey, stream, temperature, tools } = payload;
    const modelId = "gemini-2.0-flash";
    console.log(`🛡️ [Failover] Starting Gemini Fallback (Model: ${modelId}, Stream: ${stream})...`);

    try {
        const contents = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        const systemMessage = messages.find(m => m.role === 'system');

        let geminiTools = null;
        if (tools && Array.isArray(tools)) {
            geminiTools = [{
                functionDeclarations: tools.map(t => ({
                    name: t.function.name,
                    description: t.function.description,
                    parameters: t.function.parameters
                }))
            }];
        }

        const geminiUrl = stream
            ? `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${geminiApiKey}`
            : `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;

        console.log(`📡 [Failover] Calling Gemini API: ${geminiUrl.split('?')[0]}...`);

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                ...(systemMessage && { systemInstruction: { parts: [{ text: systemMessage.content }] } }),
                generationConfig: { temperature: temperature ?? 0.7 },
                ...(geminiTools && { tools: geminiTools })
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`🚫 [Failover] Gemini API Error (${response.status}):`, err);
            throw new Error(`Gemini Fallback Failed (${response.status}): ${err}`);
        }

        if (stream) {
            console.log(`📤 [Failover] Streaming Gemini response...`);
            res.writeHead(200, { 'Content-Type': 'text/event-stream' });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) {
                                    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
                                }
                            } catch (e) { }
                        }
                    }
                }
            } finally {
                res.write('data: [DONE]\n\n');
                res.end();
                console.log(`✅ [Failover] Gemini Stream Completed`);
            }
        } else {
            const data = await response.json();
            const part = data.candidates?.[0]?.content?.parts?.[0];
            let message = { role: "assistant", content: part?.text || "" };
            if (part?.functionCall) {
                message.tool_calls = [{
                    id: `call_${Date.now()}`,
                    type: "function",
                    function: { name: part.functionCall.name, arguments: JSON.stringify(part.functionCall.args) }
                }];
                message.content = null;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ choices: [{ message }] }));
            console.log(`✅ [Failover] Gemini JSON Response Completed`);
        }
    } catch (e) {
        console.error("🔥 [Failover] Fatal Gemini Error:", e.message);
        let userMessage = `AI Orchestrator Failover Error: ${e.message}`;
        let statusCode = 500;

        if (e.message.includes("429") || e.message.includes("RESOURCE_EXHAUSTED")) {
            userMessage = "🛡️ [Quota Exceeded] Your Gemini API key has reached its free-tier limit. Please wait a minute or upgrade your plan.";
            statusCode = 429;
        }

        if (!res.headersSent) {
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: userMessage }));
        }
    }
}

server.listen(PORT, HOST, () => {
    console.log(`\n\n🚀 [Eldoria Bridge] Evolved Hub running at http://${HOST}:${PORT}`);
    console.log(`📡 [Proxy] Groq/Gemini bypass active`);
    console.log(`🛡️ [Security] Command allow-list active: ${Array.from(ALLOWED_COMMANDS).join(', ')}`);
    console.log(`📝 [Logging] Audit trail: ${AUDIT_LOG_PATH}\n`);
});
