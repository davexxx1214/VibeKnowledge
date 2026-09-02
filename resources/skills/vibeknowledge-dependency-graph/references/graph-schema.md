# Grouped Knowledge Graph manifest schema

Write UTF-8 JSON to `<workspace>/.vscode/.knowledge/agent-graph.json`.

## Top level

```json
{
  "version": 2,
  "generatedAt": "2026-08-25T12:00:00.000Z",
  "scope": ".",
  "groups": []
}
```

- `version` must be `2`.
- `generatedAt` must be an ISO-8601 timestamp.
- `scope` is optional. Use `.` for the whole workspace or a normalized workspace-relative path for a narrower aggregate.
- `groups` must be a non-empty array.
- Rewriting this document replaces only Agent-generated structure. Human description overrides live outside it and win at read time.

## Groups

```json
{
  "key": "authentication",
  "name": "Authentication",
  "kind": "feature",
  "order": 1,
  "description": "Credential validation and session issuance.",
  "scope": "src/auth",
  "entities": [],
  "relations": []
}
```

- `key` is required, unique across groups, and lowercase kebab-case.
- `name` is a concise human-readable module or feature name.
- `kind` is exactly one of `framework`, `module`, or `feature`.
- `order` is a unique non-negative integer used by the left-side group list.
- `description` and `scope` are optional. A scope is `.` or a normalized workspace-relative path.
- There must be exactly one `framework` group. It must use key `framework`, order `0`, and be first when groups are sorted by order.
- All other groups are parallel peers. Their order controls display only; it does not imply a dependency between groups.
- A symbol may appear in multiple groups. Use the same stable entity key in every occurrence. Keys need to be unique only inside one group.
- A relation may connect only entities declared in its own group.

### Framework group semantics

The `framework` group is a boundary graph, not an aggregate call graph. Model startup, root composition, one stable node per top-level package or business module, direct dependencies between those boundaries, shared runtime infrastructure, and important external systems.

Keep controllers, services, repositories, entities, DTOs, interfaces, tests, and feature-internal data flow in module or feature groups. A lower-level symbol belongs in `framework` only when it has a genuine cross-cutting responsibility needed to explain multiple top-level boundaries. Boundary and shared-infrastructure nodes may repeat in detailed groups with the same stable keys.

For an ordinary application, 8–15 framework entities and 10–20 framework relations are useful readability targets, not schema limits. Larger systems should collapse at stable package or module boundaries rather than truncate important architecture.

## Entities

```json
{
  "key": "src/auth/auth-service.ts#AuthService",
  "name": "AuthService",
  "type": "service",
  "filePath": "src/auth/auth-service.ts",
  "startLine": 12,
  "endLine": 94,
  "description": "Authenticates credentials and issues sessions."
}
```

Required fields are `key`, `name`, `type`, `filePath`, `startLine`, and `endLine`. `description` is schema-optional, but every file-backed entity should include concise responsibility prose for the editor's `🧠 KG` hint.

- Prefer key `<workspace-relative-path>#<symbol>`; use the path alone for file, directory, database, or configuration nodes.
- `filePath` uses `/`, is workspace-relative, and contains no empty, `.` or `..` segments.
- Lines are one-based positive integers and `endLine >= startLine`.
- Agent prose may change on refresh. VibeKnowledge reapplies a human override by entity key to every group occurrence.
- `type` is one of `function`, `class`, `interface`, `variable`, `file`, `directory`, `api`, `config`, `database`, `service`, `component`, `external`, `other`.
- For a genuinely external entity, use a portable virtual path such as `external/postgresql`.

### Canonical comparison aliases

The serialized `key` remains the stable identifier and must not be rewritten during routine refreshes. VibeKnowledge derives a comparison-only canonical alias that normalizes path separators, Unicode NFKC compatibility forms, case, surrounding whitespace, and redundant punctuation.

Maintainers can use [canonical-key-cases.json](canonical-key-cases.json) as the executable compatibility contract; ordinary graph generation does not need to load it separately.

- Two entity keys in the same group must not resolve to the same canonical alias.
- Matching, cross-group de-duplication, and manual-description lookup may use the alias.
- Stable IDs and persisted human overrides continue to use the original serialized key.
- Preserve an existing key even when a newly generated spelling looks cleaner.

## Relations

```json
{
  "source": "src/auth/auth-service.ts#AuthService",
  "target": "src/users/user-repository.ts#UserRepository",
  "verb": "depends_on",
  "origin": "agent",
  "confidence": "extracted",
  "description": "Authentication loads a user before checking credentials.",
  "evidence": [
    {
      "filePath": "src/auth/auth-service.ts",
      "startLine": 31,
      "endLine": 34,
      "detail": "login() queries UserRepository before password validation."
    }
  ],
  "structuralPath": [
    {
      "source": "src/auth/auth-service.ts#AuthService.login",
      "target": "src/users/user-repository.ts#UserRepository.findByEmail",
      "verb": "calls",
      "filePath": "src/auth/auth-service.ts",
      "startLine": 31,
      "endLine": 31,
      "traversal": "forward"
    }
  ]
}
```

- `source` and `target` reference entity keys in the same group and must differ.
- `(source, target, verb)` is unique within the group. The same tuple may occur in another group.
- `origin` is optional for backward compatibility and is one of:
  - `ast`: emitted directly by a syntax or compiler extractor;
  - `resolver`: produced by deterministic cross-file symbol resolution;
  - `agent`: selected or inferred by an Agent semantic pass.
- `confidence` is optional for backward compatibility and is one of:
  - `extracted`: the cited source directly proves the relation;
  - `inferred`: the relation is a deterministic or semantic synthesis of multiple facts;
  - `review_required`: the relation is useful but remains ambiguous and needs review.
- `evidence` contains at least one item.
- Evidence and confidence serve different purposes: Evidence records what can be audited; confidence states how directly that Evidence supports the relation. Never omit Evidence because confidence is present.
- Evidence paths and lines follow the entity rules, resolve to an existing workspace file, and stay inside that file. `endLine` and `detail` are optional.
- `structuralPath` is optional for backward compatibility and for genuinely Agent-only business relations. When present, it is a non-empty ordered list of raw structural edges from `structural-graph.json`.
- Every structural hop requires `source`, `target`, `verb`, `filePath`, `startLine`, and `endLine`, and must exactly match one raw relation and its location. `traversal` is optional and is `forward` or `reverse`; generated multi-hop paths use it to record how the raw edge is traversed. A collapsed boundary relation may contain several ordered hops.
- Deterministic condenser output must keep `structuralPath`; Agents must not fabricate or rewrite its hops. The compact Markdown view omits it, while the full audit report retains it.
- `verb` is one of:
  - `calls`: source directly invokes target.
  - `extends`: source inherits from target.
  - `implements`: source implements target.
  - `imports`: source imports target.
  - `exports`: source exports target.
  - `contains`: source structurally owns target.
  - `references`: source directly references target without a stronger verb.
  - `uses`: source uses target in a broader runtime interaction.
  - `depends_on`: source cannot fulfill its responsibility without target and no more specific verb applies.

## Complete example

```json
{
  "version": 2,
  "generatedAt": "2026-08-25T12:00:00.000Z",
  "scope": "src",
  "groups": [
    {
      "key": "framework",
      "name": "Framework",
      "kind": "framework",
      "order": 0,
      "description": "Application bootstrapping and top-level module boundaries.",
      "entities": [
        {
          "key": "src/app.ts#Application",
          "name": "Application",
          "type": "component",
          "filePath": "src/app.ts",
          "startLine": 1,
          "endLine": 45,
          "description": "Bootstraps the runtime and registers top-level modules."
        },
        {
          "key": "src/auth/auth-module.ts#AuthModule",
          "name": "AuthModule",
          "type": "component",
          "filePath": "src/auth/auth-module.ts",
          "startLine": 1,
          "endLine": 28,
          "description": "Defines the top-level authentication boundary."
        }
      ],
      "relations": [
        {
          "source": "src/app.ts#Application",
          "target": "src/auth/auth-module.ts#AuthModule",
          "verb": "imports",
          "origin": "agent",
          "confidence": "extracted",
          "description": "The application assembles the authentication boundary.",
          "evidence": [
            {
              "filePath": "src/app.ts",
              "startLine": 18,
              "endLine": 22,
              "detail": "Application composition imports AuthModule."
            }
          ]
        }
      ]
    },
    {
      "key": "authentication",
      "name": "Authentication",
      "kind": "feature",
      "order": 1,
      "scope": "src/auth",
      "entities": [
        {
          "key": "src/auth/auth-service.ts#AuthService",
          "name": "AuthService",
          "type": "service",
          "filePath": "src/auth/auth-service.ts",
          "startLine": 12,
          "endLine": 94,
          "description": "Authenticates credentials and issues sessions."
        },
        {
          "key": "src/users/user-repository.ts#UserRepository",
          "name": "UserRepository",
          "type": "service",
          "filePath": "src/users/user-repository.ts",
          "startLine": 8,
          "endLine": 70,
          "description": "Loads and stores user records."
        }
      ],
      "relations": [
        {
          "source": "src/auth/auth-service.ts#AuthService",
          "target": "src/users/user-repository.ts#UserRepository",
          "verb": "depends_on",
          "origin": "agent",
          "confidence": "extracted",
          "description": "Authentication requires persisted user records.",
          "evidence": [
            {
              "filePath": "src/auth/auth-service.ts",
              "startLine": 18,
              "endLine": 34,
              "detail": "UserRepository is injected and queried by login()."
            }
          ]
        }
      ]
    }
  ]
}
```
