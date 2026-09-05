import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ShelfExporter } from '../src/exporter';

test('plain export writes then indexes', async () => {
  const events: string[] = [];
  const exporter = new ShelfExporter({
    async write(path, content) { events.push(`write:${path}:${content}`); },
    async appendIndex(path) { events.push(`index:${path}`); },
  });
  assert.equal(await exporter.save('/project', ['one', 'two'], { format: 'plain', autoOpen: false }), '/project/shelf-export.txt');
  assert.deepEqual(events, ['write:/project/shelf-export.txt:one\ntwo', 'index:/project/shelf-export.txt']);
});

test('structured preference renders nonempty content', () => {
  const exporter = new ShelfExporter({ async write() {}, async appendIndex() {} });
  assert.ok(exporter.render(['one'], { format: 'structured', autoOpen: false }).length > 0);
});
