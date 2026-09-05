// Export only six public spawn calls; never include other messages or reasoning.
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
const records = [];
for (const session of process.argv.slice(2)) {
  const lines = createInterface({ input: createReadStream(session), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.includes('mcp_pair') || !line.includes('spawn_agent')) continue;
    const event = JSON.parse(line), p = event.payload;
    if (event.type !== 'response_item' || p?.type !== 'function_call' || !p.name?.endsWith('spawn_agent')) continue;
    const args = typeof p.arguments === 'string' ? JSON.parse(p.arguments) : p.arguments;
    if (!/^mcp_pair[123]_[ab]$/.test(args?.task_name)) continue;
    records.push({ session, timestamp: event.timestamp, callId: p.call_id, taskName: args.task_name,
      forkTurns: args.fork_turns, modelOverride: args.model ?? null, effortOverride: args.reasoning_effort ?? null,
      messageStorage: args.message.startsWith('gAAAA') ? 'Opaque persisted payload; not decrypted or exported.' : 'Public plaintext',
      ...(args.message.startsWith('gAAAA') ? {} : { message: args.message }),
      messagePayloadSha256: createHash('sha256').update(args.message).digest('hex') });
  }
}
if (records.length !== 6 || new Set(records.map(r => r.taskName)).size !== 6) throw new Error(`Expected six unique dispatches, got ${records.length}`);
const out = 'evaluation/mcp-ab/public-dispatch.json';
if (existsSync(out)) {
  const previous = JSON.parse(readFileSync(out, 'utf8'));
  if (previous.records.some(p => !records.some(r => r.taskName === p.taskName && r.messagePayloadSha256 === p.messageSha256))) throw new Error('Dispatch already archived or changed');
}
writeFileSync(out, JSON.stringify({ version: 2, createdAt: new Date().toISOString(), note: 'Only actual public dispatch metadata for six candidates. Persistence stored message bodies as opaque payloads; export their hashes, not ciphertext or a claim of readable plaintext. No decryption, private reasoning/system or unrelated history. Version 2 sanitizes the earlier opaque-body export without changing dispatch identities.', records }, null, 2) + '\n');
console.log(JSON.stringify({ output: out, dispatches: records.map(r => ({ taskName: r.taskName, forkTurns: r.forkTurns, timestamp: r.timestamp })) }, null, 2));
