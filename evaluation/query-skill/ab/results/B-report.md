# Implementation and relationship analysis

## Tag endpoint

`TagService.findAll()` now requests `{ order: { tag: 'ASC' } }` from the repository. There is no in-memory sort, secondary ordering, or collation change ([service:14](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/tag/tag.service.ts:14)). `GET /tags` and its `Promise<TagEntity[]>` response remain unchanged ([controller:12](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/tag/tag.controller.ts:12)).

Added isolated service tests using a mocked repository token; replaced the controller test's database initialization with a mocked service. Both suites cover nonempty arrays, empty arrays, and propagation of the original error. Identity assertions preserve the returned entity array. Service tests assert the exact repository ordering options, rather than merely observing sorted fixtures ([service tests:22](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/tag/tag.service.spec.ts:22), [controller tests:20](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/tag/tag.controller.spec.ts:20)).

Executed from this workspace:

```powershell
& 'D:/workspace/VibeKnowledge/.vscode-test/node-26.1.0/node.exe' observe.cjs --phase tags test --runInBand
```

Result: **2 suites passed, 6 tests passed**, exit 0. No MySQL connection was needed.

## ORM relationships (read-only)

The local query skill routed investigation; relevant declarations and service references were then confirmed in source. The graph snapshot is dated 2026-09-04 and is not treated as runtime proof.

| Relationship | Fields, decorators, inverse links, and ownership |
| --- | --- |
| Article author ↔ user articles | `ArticleEntity.author: UserEntity` has `@ManyToOne(type => UserEntity, user => user.articles)` ([article:37](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.entity.ts:37)). `UserEntity.articles: ArticleEntity[]` has `@OneToMany(type => ArticleEntity, article => article.author)` ([user:37](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/user/user.entity.ts:37)). Bidirectional; the many-to-one `author` side owns the foreign-key relationship. No explicit join-column name or referenced-column override is supplied. |
| Article comments ↔ comment article | `ArticleEntity.comments: Comment[]` has `@OneToMany(type => Comment, comment => comment.article, {eager: true})` and a bare `@JoinColumn()` ([article:40](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.entity.ts:40)). `Comment.article: ArticleEntity` has `@ManyToOne(type => ArticleEntity, article => article.comments)` ([comment:13](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/comment.entity.ts:13)). Bidirectional; the many-to-one `Comment.article` side owns the foreign-key relationship. The unusual `@JoinColumn()` placement on the inverse collection does not make it the owning side; no custom join metadata is specified. |
| User favorites → articles | `UserEntity.favorites: ArticleEntity[]` has `@ManyToMany(type => ArticleEntity)` and bare `@JoinTable()` ([user:33](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/user/user.entity.ts:33)). Unidirectional: there is no inverse favorites field on `ArticleEntity`. User owns this junction-table relationship; table/column names are not customized. |

There is no direct Comment–User relation or comment-author field in these entities ([Comment:5](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/comment.entity.ts:5), [UserEntity:7](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/user/user.entity.ts:7)). `tagList` is a `simple-array` column, and `favoriteCount` is a scalar column, not relations ([article:34](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.entity.ts:34)).

Only `ArticleEntity.comments` explicitly enables eager loading. None of these relation decorators explicitly configures cascades, `onDelete`, or orphan deletion. The source therefore does not establish cascade-delete behavior or exact physical schema names. Explicit service saves/deletes are separate from cascade configuration.

## Concrete service dependencies

- **Author mapping:** `ArticleService.findAll()` joins the literal `article.author` and filters literal `article.authorId`; its favorited branch also filters `article.authorId` after reading `author.favorites`. `findFeed()` likewise filters `article.authorId`. Renaming the relation or changing join metadata requires reviewing these expressions ([findAll:26](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:26), [findFeed:66](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:66)). `authorId` is a service assumption, not an explicitly declared entity field.
- **Comments:** `addComment()` pushes onto `article.comments`, explicitly saves the comment, then saves the article; it does not directly assign `comment.article` ([101](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:101)). `deleteComment()` searches/splices that collection and explicitly deletes the comment ([114](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:114)). `findComments()` returns it ([165](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:165)). These methods fetch articles without explicit relation options, so changing comments/eager metadata requires revisiting their collection assumptions. `findOne()` returns the fetched entity directly, making relation-loading changes response-relevant ([96](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:96)).
- **Favorites:** `findAll()` maps `author.favorites`; `favorite()` and `unFavorite()` search and mutate `user.favorites`, save the user, and separately update/save `article.favoriteCount` ([43](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:43), [131](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:131), [147](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:147)). Those user lookups do not explicitly load favorites, and its decorator is not eager: source alone does not guarantee this collection is populated.
- **Article creation/inverse links:** `ArticleService.create()` initializes `article.comments`, saves the article, explicitly requests `relations: ['articles']`, pushes onto `author.articles`, and saves the author; it does not directly assign `article.author` ([170](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:170)). `UserService.create()` initializes `newUser.articles`; `update()` deletes the `favorites` property before saving ([60](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/user/user.service.ts:60), [74](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/user/user.service.ts:74)).
- **Delete behavior:** `ArticleService.delete()` and `UserService.delete()` directly call their repositories' `delete`; neither explicitly cleans up related entities here. Changes to foreign-key/delete metadata require reviewing those paths, without assuming the present database outcome ([article delete:197](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/article/article.service.ts:197), [user delete:83](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-xOz4a1/B/src/user/user.service.ts:83)).

## Limits

No relationship code was changed. No database integration tests, HTTP end-to-end tests, schema inspection, or whole-project typecheck were run. The supplied isolated Jest setup validates the service/controller behavior, not database collation, generated SQL, or relation persistence. Graphs were not regenerated, and no dependencies or test configuration were changed.
