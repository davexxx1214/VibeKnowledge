// Independent compliance audit. Never export reasoning, system messages, answers,
// tool-result bodies or full sessions. Patch bodies are inspected only for headers.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const ts = require('typescript');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(__dirname, 'compliance-audit.json');
const MD = path.join(__dirname, 'compliance-audit.md');
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const sha = file => digest(fs.readFileSync(file));
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const norm = value => value.replace(/\\/g, '/');
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const within = (base, target) => { const r = path.relative(base, path.resolve(base, target)); return !r.startsWith('..') && !path.isAbsolute(r); };
const forbidden = value => /(^|\/)(?:\.agents|\.codex|evaluation|feature-briefs|agent-context)(\/|$)|(^|\/)SKILL\.md$|(^|\/)REPORT\.md$|(^|\/)ab-observations\.jsonl$|(^|\/)mcp-eval\.json$|(^|\/)(?:agent-graph|structural-graph|knowledge-graph)\.(?:json|md)$|(^|\/)graph\.sqlite(?:-|$)/i.test(norm(value));
function inventory(dir, prefix = '') {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name))) {
    const relative = prefix + entry.name, full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) result.push({ path: relative, kind: 'link', target: fs.readlinkSync(full) });
    else if (entry.isDirectory()) result.push(...inventory(full, relative + '/'));
    else result.push({ path: relative, kind: 'file', bytes: fs.statSync(full).size });
  }
  return result;
}
function treeFingerprint(dir) {
  if (!fs.existsSync(dir)) return { missing: true };
  const files = inventory(dir).map(f => ({ ...f, sha256: f.kind === 'file' ? sha(path.join(dir, f.path)) : undefined }));
  return { fileCount: files.length, bytes: files.reduce((n,f)=>n+(f.bytes||0),0), sha256: digest(JSON.stringify(files)),
    packages: files.filter(f=>/(^|\/)package\.json$/.test(f.path)).flatMap(f=>{
      try { const p=json(path.join(dir,f.path)); return typeof p.name==='string' && typeof p.version==='string' ? [{path:f.path,name:p.name,version:p.version,sha256:f.sha256}] : []; } catch { return []; }
    }) };
}
function provenance(run) {
  const manifest = json(path.join(run, 'pair-1/manifest.json'));
  const key = '.vscode/.knowledge/structural-graph.json';
  const historical = [1,2,3].map(i=>{
    const file=path.join(ROOT,`evaluation/query-skill/context/r3/heldout-r${i}/manifest.json`);
    return { manifest: norm(path.relative(ROOT,file)), manifestSha256: sha(file), structuralSha256: json(file).bArtifacts?.[key] };
  });
  const locations = [path.join(ROOT,'.vscode-test/task-context-ab-9W8uP7/structural-graph.json'),path.join(run,'artifacts',key)];
  const raw = locations.map(file=>({path:file,sha256:sha(file)}));
  const scripts=path.join(ROOT,'resources/skills/vibeknowledge-dependency-graph/scripts');
  const req=createRequire(path.join(manifest.runtimeRoot,'package.json'));
  const pkg=json(path.join(manifest.runtimeRoot,'package.json'));
  const dependencies=Object.keys(pkg.dependencies||{}).map(name=>{
    try {
      const entry=req.resolve(name); let dir=path.dirname(entry);
      while(path.dirname(dir)!==dir){const candidate=path.join(dir,'package.json'); if(fs.existsSync(candidate)){const p=json(candidate);if(p.name===name)return {name,version:p.version,entry,entrySha256:sha(entry),packageJsonSha256:sha(candidate)};}dir=path.dirname(dir);}
      return {name,entry,entrySha256:sha(entry),packageMetadataUnresolved:true};
    } catch(error){return {name,error:String(error.message).split('\n')[0]};}
  });
  const where=spawnSync(process.platform==='win32'?'where.exe':'which',['rg'],{encoding:'utf8',windowsHide:true});
  const rgPath=(where.stdout||'').trim().split(/\r?\n/)[0];
  const rg=spawnSync('rg',['--version'],{encoding:'utf8',windowsHide:true});
  const condenserFiles=inventory(scripts).filter(f=>f.kind==='file').map(f=>({path:f.path,sha256:sha(path.join(scripts,f.path)),matchesFrozenSource:manifest.sourceHashes[norm(path.relative(ROOT,path.join(scripts,f.path)))]===sha(path.join(scripts,f.path))}));
  return { collectedAt:new Date().toISOString(), timing:'Supplemental observation after pair 1 started; not an all-pairs pre-run freeze.',
    historicalRawGraph:{historical,raw,preparedManifestDigest:manifest.bArtifacts[key],allMatch:[...historical.map(h=>h.structuralSha256),...raw.map(r=>r.sha256)].every(h=>h===manifest.bArtifacts[key])},
    node:{version:process.version,executable:process.execPath,sha256:sha(process.execPath),candidateExecutableIdentity:'Inferred only when the public command uses node without PATH/environment mutation; not per-child process attestation.'},
    rg:{path:rgPath,sha256:rgPath&&fs.existsSync(rgPath)?sha(rgPath):null,version:rg.stdout?.trim()},
    runtime:{root:manifest.runtimeRoot,version:pkg.version,dependencies,nodeModules:treeFingerprint(path.join(manifest.runtimeRoot,'node_modules'))},
    condenserFiles,
    limitations:['Installed dependency fingerprints are supplemental, not pre-run hashes.','Transient modifications reverted before audit cannot be excluded.','No answer, grade or earlier trial trajectory was read to establish graph provenance.'] };
}
function literal(node, env) {
  if(!node)throw new Error('Missing literal');
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text;
  if(ts.isNumericLiteral(node))return Number(node.text);
  if(node.kind===ts.SyntaxKind.TrueKeyword)return true;
  if(node.kind===ts.SyntaxKind.FalseKeyword)return false;
  if(node.kind===ts.SyntaxKind.NullKeyword)return null;
  if(ts.isIdentifier(node)&&env.has(node.text))return env.get(node.text);
  if(ts.isParenthesizedExpression(node)||ts.isAsExpression(node))return literal(node.expression,env);
  if(ts.isArrayLiteralExpression(node))return node.elements.map(n=>literal(n,env));
  if(ts.isObjectLiteralExpression(node))return Object.fromEntries(node.properties.map(p=>{
    if(ts.isShorthandPropertyAssignment(p))return [p.name.text,literal(p.name,env)];
    if(!ts.isPropertyAssignment(p)||!p.name||!('text' in p.name))throw new Error('Dynamic object');
    return [p.name.text,literal(p.initializer,env)];
  }));
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken)return literal(node.left,env)+literal(node.right,env);
  if(ts.isTemplateExpression(node))return node.head.text+node.templateSpans.map(s=>String(literal(s.expression,env))+s.literal.text).join('');
  throw new Error('Nonliteral argument requires manual review');
}
function publicCalls(events) {
  const calls=[],unknown=[];
  for(const [eventIndex,event] of events.entries()) {
    if(event.type!=='response_item'||!['function_call','custom_tool_call'].includes(event.payload?.type))continue;
    const p=event.payload, name=String(p.name||'').split('.').at(-1), raw=p.input??p.arguments;
    const base={eventIndex,callId:p.call_id,name,publicInputSha256:digest(typeof raw==='string'?raw:JSON.stringify(raw??null))};
    if(name==='exec') {
      const code=typeof raw==='string'?raw:raw?.code;
      if(typeof code!=='string'){unknown.push({...base,reason:'Unrecognized orchestration input'});continue;}
      const source=ts.createSourceFile('public-call.js',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),env=new Map();
      function visit(node) {
        if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer){try{env.set(node.name.text,literal(node.initializer,env));}catch{}}
        if(ts.isCallExpression(node)) {
          let tool;
          if(ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(source)==='tools')tool=node.expression.name.text;
          if(ts.isElementAccessExpression(node.expression)&&node.expression.expression.getText(source)==='tools'){try{tool=literal(node.expression.argumentExpression,env);}catch{tool='dynamic';}}
          if(tool){
            let repeated=false;for(let a=node.parent;a&&a!==source;a=a.parent)if(ts.isIterationStatement(a,false)||ts.isFunctionLike(a))repeated=true;
            try{calls.push({...base,name:tool,args:literal(node.arguments[0],env),repeated,offset:node.pos});}
            catch(error){unknown.push({...base,nestedTool:tool,reason:error.message,offset:node.pos});}
          }
        }
        ts.forEachChild(node,visit);
      }
      visit(source);
      if(source.parseDiagnostics.length)unknown.push({...base,reason:'JavaScript parse diagnostics'});
    } else {
      try{calls.push({...base,args:name==='apply_patch'?raw:typeof raw==='string'?JSON.parse(raw):raw});}
      catch{unknown.push({...base,reason:'Unrecognized tool arguments'});}
    }
  }
  return {calls,unknown};
}
// Conservative PowerShell tokenizer: only simple literal command segments pass.
function shellWords(command) {
  const commands=[],issues=[];let words=[],word='',quote=null,active=false;
  const push=()=>{if(active){words.push(word);word='';active=false;}};
  const end=()=>{push();if(words.length)commands.push(words);words=[];};
  for(let i=0;i<command.length;i++){
    const c=command[i];
    if(quote){
      if(c===quote){if(quote==="'"&&command[i+1]==="'"){word+="'";i++;}else quote=null;}
      else if(quote==='"'&&c==='`'&&i+1<command.length){word+=command[++i];}
      else {if(quote==='"'&&c==='$')issues.push('PowerShell expansion');word+=c;}
      continue;
    }
    if(c==='"'||c==="'"){quote=c;active=true;}
    else if(c===';'||c==='\n'||c==='\r')end();
    else if(/\s/.test(c))push();
    else if(c==='`'&&/\r|\n/.test(command[i+1]||'')){i++;if(command[i]==='\r'&&command[i+1]==='\n')i++;}
    else if('|><'.includes(c)){issues.push('Pipe/redirection');word+=c;active=true;}
    else {if(c==='$')issues.push('PowerShell expansion');word+=c;active=true;}
  }
  end();if(quote)issues.push('Unclosed quote');return {commands,issues};
}
const valueOptions=new Set(['-e','--regexp','-g','--glob','--iglob','-t','--type','-T','--type-not','-A','-B','-C','--after-context','--before-context','--context','-m','--max-count','--max-columns','--max-depth','-j','--threads','--encoding','--color','--sort','--sortr','--field-match-separator','--field-context-separator','--path-separator']);
function rgPaths(args) {
  const issues=[],positionals=[];let pattern=false,files=false,end=false;
  for(let i=0;i<args.length;i++){
    const a=args[i];
    if(end){positionals.push(a);continue;}
    if(a==='--'){end=true;continue;}
    if(a==='--files'){files=true;continue;}
    if(/^--pre(?:=|$)|^--pre-glob(?:=|$)/.test(a))issues.push('rg subprocess option');
    if(a==='-L'||a==='--follow')issues.push('rg symlink following');
    if(a==='--ignore-file'||a.startsWith('--ignore-file='))issues.push('rg external ignore file requires review');
    if(valueOptions.has(a)){if(a==='-e'||a==='--regexp')pattern=true;i++;continue;}
    if(/^--regexp=|^-e./.test(a)){pattern=true;continue;}
    if(a.startsWith('-'))continue;
    positionals.push(a);
  }
  return {paths:files||pattern?positionals:positionals.slice(1),filesOnly:files,issues};
}
function auditSession(item,run) {
  const workspace=path.join(run,`pair-${item.pair}`,item.arm),manifest=json(path.join(run,`pair-${item.pair}/manifest.json`));
  const events=fs.readFileSync(item.session,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const violations=[],review=[],warnings=[];
  const issue=(list,reason,detail={})=>list.push({reason,...detail});
  const meta=events.find(e=>e.type==='session_meta')?.payload||{};
  const spawn=meta.source?.subagent?.thread_spawn;
  if(spawn?.agent_path!==item.agentPath)issue(violations,'Unexpected agent path');
  if(item.sessionId&&meta.id!==item.sessionId)issue(violations,'Unexpected session identity');
  const contexts=events.filter(e=>e.type==='turn_context').map(e=>({timestamp:e.timestamp,model:e.payload?.model,effort:e.payload?.effort,cwd:e.payload?.cwd,turnId:e.payload?.turn_id}));
  if(!contexts.length||contexts.some(c=>!c.model||!c.effort))issue(review,'Missing model/effort context');
  if(new Set(contexts.map(c=>JSON.stringify([c.model,c.effort]))).size!==1)issue(violations,'Model/effort changed within session');
  const starts=events.flatMap((e,i)=>e.type==='event_msg'&&e.payload?.type==='task_started'?[{index:i,turnId:e.payload.turn_id,timestamp:e.timestamp}]:[]);
  const ends=events.flatMap((e,i)=>e.type==='event_msg'&&e.payload?.type==='task_complete'?[{index:i,turnId:e.payload.turn_id,timestamp:e.timestamp}]:[]);
  if(starts.length!==1||ends.length!==1||starts[0]?.turnId!==ends[0]?.turnId||starts[0]?.index>=ends[0]?.index)issue(violations,'Not one fresh completed matching task');
  if(events.some(e=>e.type==='event_msg'&&e.payload?.type==='turn_aborted'))issue(violations,'Aborted turn present');
  const users=events.flatMap((e,i)=>{
    if(e.type!=='response_item'||e.payload?.type!=='message'||e.payload.role!=='user')return [];
    const text=typeof e.payload.content==='string'?e.payload.content:(e.payload.content||[]).map(c=>c.text||'').join('\n');
    return [{index:i,text}];
  });
  const tasks=fs.readFileSync(path.join(__dirname,'tasks.md'),'utf8');
  const taskBody=tasks.slice(tasks.indexOf('1. **visualization**'),tasks.indexOf('Use the common observer')).trim();
  if(users.length!==1)issue(review,'Expected exactly one public task prompt',{count:users.length});
  if(!users.some(u=>u.text.replace(/\r\n/g,'\n').includes(taskBody)))issue(review,'Public task body does not exactly match frozen tasks.md');
  const prior=events.filter((e,i)=>i<(users[0]?.index??0)&&e.type==='response_item'&&(['function_call','custom_tool_call'].includes(e.payload?.type)||(e.payload?.type==='message'&&e.payload?.role==='assistant'))).length;
  if(prior||meta.forked_from_id)issue(violations,'Inherited conversation evidence',{priorPublicAssistantOrToolItems:prior,forkedFrom:meta.forked_from_id});
  if(item.forkTurns!=='none')issue(review,'No supplied no-fork dispatch attestation');
  const parsed=publicCalls(events),commands=[],patches=[],expectedObservations=[];
  review.push(...parsed.unknown);
  const pathCheck=(file,label)=>{
    const absolute=path.resolve(workspace,file);
    if(!within(workspace,absolute))issue(violations,'Outside assigned workspace',{label,path:file});
    else if(forbidden(path.relative(workspace,absolute)))issue(violations,'Forbidden direct read',{label,path:file});
    else if(fs.existsSync(absolute)&&!within(workspace,fs.realpathSync(absolute)))issue(violations,'Symlink escapes workspace',{label,path:file});
  };
  for(const call of parsed.calls){
    if(call.repeated)issue(review,'Tool call in loop/function needs multiplicity review',{callId:call.callId,name:call.name});
    const name=String(call.name).split('.').at(-1),arg=call.args;
    if(name==='apply_patch'){
      const patch=typeof arg==='string'?arg:arg?.patch??arg?.input;
      if(typeof patch!=='string'){issue(review,'Unrecognized patch input');continue;}
      const headers=patch.split(/\r?\n/).filter(l=>/^\*\*\* (?:Add|Update|Delete|Move to):?/.test(l)||/^\*\*\* (?:Add|Update|Delete) File:/.test(l));
      const targets=headers.map(h=>h.replace(/^\*\*\* (?:Add File|Update File|Delete File|Move to):\s*/,''));
      patches.push({callId:call.callId,headers,publicInputSha256:digest(patch)});
      if(!targets.length||targets.some(t=>!same(path.resolve(workspace,t),path.join(workspace,'REPORT.md')))||headers.some(h=>/Delete File|Move to/.test(h)))issue(violations,'Patch targets other than REPORT.md');
      continue;
    }
    if(name==='wait')continue;
    if(name==='write_stdin'){if(arg?.chars)issue(violations,'Interactive terminal input after command');continue;}
    if(name!=='exec_command'){issue(violations,'Unapproved tool',{name});continue;}
    if(!arg||typeof arg.cmd!=='string'){issue(review,'Dynamic shell command');continue;}
    const cwd=arg.workdir||contexts.find(c=>c.cwd)?.cwd;
    if(!cwd||!same(cwd,workspace))issue(violations,'Shell cwd not assigned workspace',{cwd});
    if(arg.shell&&!/powershell|pwsh/i.test(arg.shell))issue(review,'Non-PowerShell command parser requires review',{shell:arg.shell});
    const shell=shellWords(arg.cmd);if(shell.issues.length)issue(review,'Shell operators/expansion require review',{callId:call.callId,issues:shell.issues,publicInputSha256:digest(arg.cmd)});
    for(let words of shell.commands){
      if(words[0]==='&')words=words.slice(1);
      const executable=path.basename(words[0]||'').toLowerCase();
      if(!['node','node.exe'].includes(executable)||!same(path.resolve(workspace,words[1]||''),path.join(workspace,'observe.cjs'))){issue(violations,'Non-observer shell command',{callId:call.callId,executable,publicInputSha256:digest(arg.cmd)});continue;}
      const rest=words.slice(2);let phase='unspecified';if(rest[0]==='--phase'){rest.shift();phase=rest.shift();}
      const operation=rest.shift(),args=rest;
      const entry={callId:call.callId,cwd,phase,operation,args};commands.push(entry);expectedObservations.push({phase,operation,args});
      if(!['visualization','instructions'].includes(phase))issue(review,'Unexpected observer phase',{phase});
      if(operation==='read'){if(!args[0])issue(review,'Missing read path');else pathCheck(args[0],'read');}
      else if(operation==='rg'){const r=rgPaths(args);for(const p of r.paths)pathCheck(p,'rg');if(r.issues.length)issue(review,'rg option review',{issues:r.issues});}
      else if(['mcp-list','mcp','mcp-resource'].includes(operation)){
        if(item.arm!=='B')issue(violations,'A invokes MCP');
        if(operation==='mcp-resource'&&args[0]!=='knowledge://overview')issue(violations,'Unapproved MCP resource');
        if(operation==='mcp'&&!['query_graph','get_entity','get_neighbors','shortest_path','analyze_structure','analyze_impact','find_structural_path','search_entities','search_observations','list_relations'].includes(args[0]))issue(violations,'Unexpected MCP tool',{tool:args[0]});
      }else issue(violations,'Unexpected observer operation',{operation});
    }
  }
  const observations=fs.readFileSync(path.join(workspace,'ab-observations.jsonl'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const unmatched=observations.map((o,i)=>({i,key:JSON.stringify({phase:o.phase,operation:o.operation,args:o.args})}));
  const commandWithoutObservation=[];
  for(const [i,c] of expectedObservations.entries()){const j=unmatched.findIndex(o=>o.key===JSON.stringify(c));if(j<0)commandWithoutObservation.push(i);else unmatched.splice(j,1);}
  if(unmatched.length||commandWithoutObservation.length)issue(review,'Public command/observation multiplicity mismatch',{observationWithoutCommand:unmatched.map(o=>o.i),commandWithoutObservation});
  if(item.arm==='B'&&(observations[0]?.operation!=='mcp-list'||observations[0]?.phase!=='visualization'||observations[0]?.exitCode!==0))issue(violations,'B did not begin with successful visualization discovery');
  // Inspect only file-name prefixes, never export source/result bodies.
  const forbiddenSourceFiles=Object.keys(manifest.sourceHashes).filter(forbidden);
  observations.forEach((o,i)=>{if(o.operation!=='rg'||o.args.includes('--files'))return;
    const exposed=forbiddenSourceFiles.filter(file=>String(o.displayed).split(/\r?\n/).some(line=>line.startsWith(file+':')||line.startsWith(file+'-')||line.startsWith(file.replace(/\//g,'\\')+':')));
    if(exposed.length)issue(violations,'rg output exposed forbidden instruction/artifact content',{observationIndex:i,paths:exposed});
  });
  const files=inventory(workspace),expected=new Set([...Object.keys(manifest.sourceHashes),'observe.cjs','mcp-client.mjs','REPORT.md','ab-observations.jsonl',...(item.arm==='B'?[...Object.keys(manifest.bArtifacts),'mcp-eval.json']:[])]);
  const extra=files.filter(f=>!expected.has(f.path));if(extra.length)issue(violations,'Unexpected final files',{paths:extra.map(f=>f.path)});
  if(files.some(f=>f.kind==='link'))issue(review,'Links present in candidate inventory');
  const hashes={...manifest.sourceHashes,...(item.arm==='B'?manifest.bArtifacts:{}),'observe.cjs':manifest.observerSha256,'mcp-client.mjs':manifest.bridgeSha256};
  const mismatches=Object.entries(hashes).filter(([file,h])=>!fs.existsSync(path.join(workspace,file))||sha(path.join(workspace,file))!==h).map(([file])=>file);
  if(mismatches.length)issue(violations,'Frozen input hash mismatch',{paths:mismatches});
  const conf=path.join(workspace,'mcp-eval.json');if(item.arm==='B'&&JSON.stringify(json(conf))!==JSON.stringify({runtimeRoot:manifest.runtimeRoot}))issue(violations,'MCP config mismatch');
  const usage=events.filter(e=>e.type==='token_usage_record').map(e=>e.payload);
  if(usage.some(u=>!u.response_id||!u.usage||Object.values(u.usage).some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)||u.usage.cached_input_tokens>u.usage.input_tokens))issue(review,'Invalid numeric response metadata');
  warnings.push('No private/system/assistant-answer content exported. REPORT body is never opened; only patch target headers and final file metadata are audited.');
  return {pair:item.pair,arm:item.arm,sessionId:meta.id,agentPath:spawn?.agent_path,workspace,status:violations.length?'fail':review.length?'review_required':'pass_with_limits',
    contexts,taskStart:starts[0],taskEnd:ends[0],freshness:{publicUserPrompts:users.length,priorPublicAssistantOrToolItems:prior,suppliedForkTurns:item.forkTurns,noForkAttestationIsCallerSupplied:true},
    publicUserPrompts:users.map(u=>({sha256:digest(u.text),characters:u.text.length,taskBodyMatches:u.text.replace(/\r\n/g,'\n').includes(taskBody)})),
    publicObserverCommands:commands,reportPatchHeaders:patches,observationCount:observations.length,commandCount:expectedObservations.length,
    observations:observations.map(o=>({at:o.at,phase:o.phase,operation:o.operation,args:o.args,exitCode:o.exitCode,truncated:o.truncated})),
    fileInventory:{files:files.length,extra,hashMismatches:mismatches,allowedGenerated:files.filter(f=>['REPORT.md','ab-observations.jsonl'].includes(f.path))},violations,review,warnings};
}
function writeReport(result) {
  fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
  const lines=['# Independent compliance and provenance audit','',`Status: ${result.status}. Collected ${result.updatedAt}.`,'',
    'No old/new candidate answer or grade is used. Public tool calls are parsed statically; code from sessions is never executed. Private reasoning/system text and tool-result bodies are not exported.','',
    '## Preparation and provenance','',`Historical r3 raw structural graph digest match: ${result.provenance.historicalRawGraph.allMatch}.`,
    result.provenance.timing,'',`Node ${result.provenance.node.version}; MCP ${result.provenance.runtime.version}. Full supplementary fingerprints are in compliance-audit.json.`,
    '', '## Method','',
    '- Check every public function/custom-tool call, with literal JavaScript AST extraction of nested tools; unsupported dynamic constructs require manual review.',
    '- Check shell cwd, observer-only execution, quoted arguments, read/rg paths, MCP allowlist, patch headers restricted to REPORT.md and exact command/observation multiplicity.',
    '- Check all model/effort contexts, task/turn identity, public prompt body, no prior public assistant/tool history, supplied no-fork dispatch attestation and distinct sessions.',
    '- Inventory final files and rehash frozen inputs; never open REPORT.md. Compare raw graph bytes to three historical r3 manifest digests.',
    '- Record environment/dependency/condenser fingerprints as supplemental observations, not a retroactive pre-run freeze.',''];
  if(!result.sessions.length)lines.push('Formal six-session audit is pending the complete session mapping. No candidate session has been inspected in preparation mode.','');
  else {
    lines.push('## Session results','');
    for(const s of result.sessions){lines.push(`### Pair ${s.pair} ${s.arm}: ${s.status}`,'',`Session ${s.sessionId}; public observer commands ${s.commandCount}; observations ${s.observationCount}.`,'');for(const v of s.violations)lines.push(`- Violation: ${v.reason}.`);for(const r of s.review)lines.push(`- Requires review: ${r.reason}.`);if(!s.violations.length&&!s.review.length)lines.push('- No detected command, input-hash or inventory violation within the audited evidence.');lines.push('');}
  }
  lines.push('## Limits','', 'Static parsing is conservative and is not a hostile-code sandbox. Unknown calls are not silently approved. Final file hashes cannot rule out transient reverted modifications. No-fork settings not present in session metadata rely partly on the separately supplied public dispatch record. Delivery completeness and blind quality grading remain separate audits.','');
  fs.writeFileSync(MD,lines.join('\n'));
}
function main(){
  const [mode,runArg,mappingArg]=process.argv.slice(2),run=path.resolve(runArg||'');
  if(!['--prepare','--audit'].includes(mode)||!runArg)throw new Error('Usage: node audit.cjs --prepare RUN | --audit RUN SESSION_MAPPING_JSON');
  if(mode==='--prepare'){
    if(fs.existsSync(OUT))throw new Error('Preparation record already exists; preserve its collection timestamp.');
    const result={version:1,status:'prepared_pending_sessions',updatedAt:new Date().toISOString(),run,provenance:provenance(run),sessions:[]};writeReport(result);console.log(JSON.stringify({status:result.status,rawGraphMatch:result.provenance.historicalRawGraph.allMatch}));return;
  }
  if(!mappingArg)throw new Error('Complete session mapping required');
  const mapping=json(path.resolve(mappingArg));const items=Array.isArray(mapping)?mapping:mapping.sessions;
  if(!Array.isArray(items)||items.length!==6||new Set(items.map(i=>`${i.pair}${i.arm}`)).size!==6||items.some(i=>![1,2,3].includes(i.pair)||!['A','B'].includes(i.arm)))throw new Error('Exactly pair 1-3 A/B required');
  const prior=fs.existsSync(OUT)?json(OUT):null;
  if(prior?.sessions?.length)throw new Error('Formal audit already exists; do not overwrite it');
  const sessions=items.map(i=>auditSession(i,run));
  const globalIssues=[];
  if(new Set(sessions.map(s=>s.sessionId)).size!==6)globalIssues.push('Session IDs are not distinct');
  if(new Set(sessions.flatMap(s=>s.contexts.map(c=>JSON.stringify([c.model,c.effort])))).size!==1)globalIssues.push('Model/effort differs across sessions');
  const result={version:1,status:globalIssues.length||sessions.some(s=>s.status==='fail')?'fail':sessions.some(s=>s.status==='review_required')?'review_required':'pass_with_limits',updatedAt:new Date().toISOString(),run,
    provenance:prior?.provenance||provenance(run),postRunProvenance:provenance(run),sessions,globalIssues};writeReport(result);
  console.log(JSON.stringify({status:result.status,sessions:sessions.map(s=>({pair:s.pair,arm:s.arm,status:s.status,commands:s.commandCount,observations:s.observationCount,violations:s.violations.length,review:s.review.length})),globalIssues}));
}
module.exports={shellWords,rgPaths,publicCalls,literal,forbidden,within,auditSession,provenance};
if(require.main===module)main();
