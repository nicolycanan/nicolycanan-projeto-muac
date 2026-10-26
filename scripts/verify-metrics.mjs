import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {execFileSync} from 'node:child_process';
// Compare only the pre-migration range. New visits may legitimately be added.
const backup=new DatabaseSync(':memory:');
backup.exec(fs.readFileSync('.backups/migration-2026-10-25/analytics.sql','utf8'));
const expected=backup.prepare('SELECT * FROM analytics_events ORDER BY id').all().map(r=>({...r}));
const maximum=Math.max(0,...expected.map(r=>r.id));
const output=execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','muac-analytics','--remote','--json',`--command=SELECT * FROM analytics_events WHERE id<=${maximum} ORDER BY id`],{maxBuffer:10*1024*1024,stdio:['ignore','pipe','pipe']});
const actual=JSON.parse(output.toString())[0].results;
assert.deepEqual(actual,expected);
backup.close();
console.log(JSON.stringify({preserved:true,originalEvents:expected.length,allOriginalFieldsMatch:true}));
