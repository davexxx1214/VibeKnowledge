// Export only the six public candidate spawn records; no private content.
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = dirname(fileURLToPath(import.meta.url));
const prepared = JSON.parse(readFileSync(join(directory, 'dispatches.json'), 'utf8')).records;
const records = [];
const sha = s => createHash('sha256').update(s).digest('hex');
for (const session of process.argv.slice(2)) {
  const lines = createInterface({ input: createReadStream(session), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.includes('mcp_feature_pair') || !line.includes('spawn_agent')) continue;
    const event = JSON.parse(line), p = event.payload;
    if (event.type !== 'response_item' || p?.type !== 'function_call' || !p.name?.endsWith('spawn_agent')) continue;
    const args = typeof p.arguments === 'string' ? JSON.parse(p.arguments) : p.arguments;
    if (!/^mcp_feature_pair[123]_[ab]$/.test(args?.task_name)) continue;
    const expected = prepared.find(r => r.taskName === args.task_name);
    if (!expected || args.fork_turns !== 'none' || args.model || args.reasoning_effort) throw new Error('Unexpected dispatch settings');
    const opaque = args.message.startsWith('gAAAA');
    if (!opaque && args.message !== expected.message) throw new Error('Task plaintext differs from prewritten dispatch: ' + args.task_name);
    records.push({ timestamp: event.timestamp, callId: p.call_id, taskName: args.task_name,
      forkTurns: args.fork_turns, modelOverride: args.model ?? null, effortOverride: args.reasoning_effort ?? null,
      messageStorage: opaque ? 'Opaque persisted payload, not decrypted/exported' : 'Public plaintext matched prewritten dispatch',
      messagePayloadSha256: sha(args.message), preparedPlaintextSha256: sha(expected.message),
      plaintextIndependentlyMatched: !opaque });
  }
}
if (records.length !== 6 || new Set(records.map(r => r.taskName)).size !== 6) throw new Error('Expected exactly six unique dispatches');
const expectedOrder = ['1_a', '1_b', '2_b', '2_a', '3_a', '3_b'].map(s => 'mcp_feature_pair' + s);
if (records.map(r => r.taskName).join(',') !== expectedOrder.join(',')) throw new Error('Dispatch order differs from protocol');
const out = join(directory, 'public-dispatch.json');
if (existsSync(out)) throw new Error('Already exported');
writeFileSync(out, JSON.stringify({ createdAt: new Date().toISOString(), records,
  limitation: 'Opaque persistence proves neither its plaintext nor delivery. Prewritten public prompts are primary-agent attestations where exact plaintext is not available; no decryption is attempted.' }, null, 2) + '\n');
console.log(JSON.stringify({ records: records.map(r => ({ taskName: r.taskName, timestamp: r.timestamp, plaintextMatched: r.plaintextIndependentlyMatched })) }));
