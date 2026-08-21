# Agent Graph manifest schema

Write UTF-8 JSON to `<workspace>/.vscode/.knowledge/agent-graph.json`.

## Top level

```json
{
  "version": 1,
  "generatedAt": "2026-08-21T12:00:00.000Z",
  "scope": ".",
  "entities": [],
  "relations": []
}
```

- `version` must be `1`.
- `generatedAt` must be an ISO-8601 timestamp.
- `scope` is optional. Use `.` for the whole workspace or a normalized workspace-relative path for a narrower graph.
- Rewriting the document replaces the previous Agent Graph. It never replaces the separate human-maintained graph.

## Entities

Each entity has this shape:

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

Required fields are `key`, `name`, `type`, `filePath`, `startLine`, and `endLine`. `description` is optional.

- `key` must be unique and stable across runs. Prefer `<workspace-relative-path>#<symbol>`; use just the path for file, directory, database, or configuration nodes.
- `filePath` must use `/`, be relative to the workspace, and must not contain `.` or `..` path segments.
- Lines are one-based positive integers and `endLine >= startLine`.
- `type` must be one of: `function`, `class`, `interface`, `variable`, `file`, `directory`, `api`, `config`, `database`, `service`, `component`, `external`, `other`.
- For a genuinely external entity, use a portable virtual path under `external/`, such as `external/postgresql`.

## Relations

Each relation has this shape:

```json
{
  "source": "src/auth/auth-service.ts#AuthService",
  "target": "src/users/user-repository.ts#UserRepository",
  "verb": "depends_on",
  "description": "Authentication loads the user record before checking credentials.",
  "evidence": [
    {
      "filePath": "src/auth/auth-service.ts",
      "startLine": 31,
      "endLine": 34,
      "detail": "Constructor injection and the login call both reference UserRepository."
    }
  ]
}
```

- `source` and `target` must reference entity keys in the same document and must differ.
- The tuple `(source, target, verb)` must be unique.
- `evidence` is required and must contain at least one item.
- Evidence paths and lines follow the entity path and line rules. They must resolve to an existing workspace file, and the cited line range must be inside that file. `endLine` and `detail` are optional.
- `verb` must be one of:
  - `calls`: source directly invokes target.
  - `extends`: source inherits from target.
  - `implements`: source implements target.
  - `imports`: source imports target.
  - `exports`: source exports target.
  - `contains`: source structurally owns target.
  - `references`: source directly references target without a stronger verb.
  - `uses`: source uses target in a broader runtime interaction.
  - `depends_on`: source cannot fulfill its responsibility without target; use when no more specific verb captures the architectural dependency.

## Complete example

```json
{
  "version": 1,
  "generatedAt": "2026-08-21T12:00:00.000Z",
  "scope": "src",
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
```
