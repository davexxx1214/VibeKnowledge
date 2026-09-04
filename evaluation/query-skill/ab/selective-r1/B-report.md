# Results

## 1. GET /tags

Changed only the application service and its unit tests:

- [TagService.findAll](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/tag/tag.service.ts:13) calls `tagRepository.find({ order: { tag: 'ASC' } })`. Ordering is requested from the database repository, with no in-memory sort, tie-breaker, or collation override.
- The existing [controller route and return type](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/tag/tag.controller.ts:12) remain unchanged: GET `/tags`, returning `Promise<TagEntity[]>` directly.
- Added isolated [service tests](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/tag/tag.service.spec.ts:1), covering nonempty results, empty results, and unchanged error propagation. Each checks the repository's exact ordering options. The nonempty fixture is deliberately unsorted and frozen; the returned array must retain its identity and order.
- Reworked [controller tests](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/tag/tag.controller.spec.ts:1) to inject a mock service instead of opening TypeORM/MySQL connections. They cover nonempty and empty entity-array identity and unchanged error propagation.

Test actually executed through the wrapper:

```text
observe.cjs --phase tags test --runInBand --runTestsByPath src/tag/tag.service.spec.ts src/tag/tag.controller.spec.ts
```

Result: **2 suites passed, 6 tests passed**, exit 0. No MySQL connection was needed. This validates repository delegation and controller/service behavior, not live database ordering or a whole-project typecheck.

## 2. ORM relationships (read-only)

The mapped entities are `ArticleEntity` (`@Entity('article')`), `UserEntity` (`@Entity('user')`), and `Comment` (`@Entity()` without an explicit table name). Each declares `id: number` with `@PrimaryGeneratedColumn()`: [article](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.entity.ts:5), [user](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/user/user.entity.ts:6), [comment](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/comment.entity.ts:4).

| Relation fields and decorators | Direction and ownership |
| --- | --- |
| `ArticleEntity.author: UserEntity`: `@ManyToOne(type => UserEntity, user => user.articles)`; `UserEntity.articles: ArticleEntity[]`: `@OneToMany(type => ArticleEntity, article => article.author)` | Bidirectional. `ArticleEntity.author` is the many-to-one owning side; `UserEntity.articles` is the inverse collection. Neither declaration supplies explicit join-column metadata. [Article lines 37–38](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.entity.ts:37), [user lines 37–38](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/user/user.entity.ts:37). |
| `ArticleEntity.comments: Comment[]`: `@OneToMany(type => Comment, comment => comment.article, {eager: true})` plus `@JoinColumn()`; `Comment.article: ArticleEntity`: `@ManyToOne(type => ArticleEntity, article => article.comments)` | Bidirectional. `Comment.article` is the many-to-one owning side. The bare `@JoinColumn()` is actually written on the inverse `ArticleEntity.comments` collection; it supplies no name/reference options and does not make that one-to-many side the foreign-key owner. [Article lines 40–42](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.entity.ts:40), [comment lines 13–14](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/comment.entity.ts:13). |
| `UserEntity.favorites: ArticleEntity[]`: `@ManyToMany(type => ArticleEntity)` plus `@JoinTable()` | Unidirectional user-to-article relationship. `UserEntity.favorites` owns the join table; there is no inverse callback or matching favorites field on `ArticleEntity`. Join-table and join-column names are not explicitly configured. [User lines 33–35](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/user/user.entity.ts:33), [complete article declaration](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.entity.ts:5). |

There is no direct Comment/User relationship or comment author field in these declarations. `ArticleEntity.favoriteCount` is a scalar `@Column({default: 0})`, not a relation ([article line 44](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.entity.ts:44)).

Only `ArticleEntity.comments` explicitly sets `eager: true`. The relation declarations above do not specify `cascade`, `onDelete`, `onUpdate`, orphan-removal behavior, or custom nullable/join naming options. Do not infer database constraint names, deletion cleanup, automatic relation persistence, or loading guarantees for every query path from these declarations.

### Concrete service dependencies

- **Authorship:** `ArticleService.findAll` joins the string path `'article.author'` and filters the column string `article.authorId` (lines 26–46); `findFeed` also filters `article.authorId` (lines 66–77). Relation or join-column changes must account for these strings. [Source](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.service.ts:26).
- **Inverse author collection:** `ArticleService.create` explicitly loads `relations: ['articles']`, pushes onto `author.articles`, and saves the user (lines 181–184), without directly assigning `article.author`. `UserService.create` initializes `newUser.articles = []` (line 60). [Article creation](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.service.ts:170), [user creation](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/user/user.service.ts:55).
- **Comments:** `ArticleService.addComment` reads an article, pushes a new comment into `article.comments`, explicitly saves the comment, then saves the article (lines 101–111); it does not directly assign `comment.article`. `deleteComment` searches/splices `article.comments`, explicitly deletes the comment, and saves the article (lines 114–127). `findComments` returns `article.comments` after `findOne` (lines 165–167). These reads do not explicitly request relation loading; changes to the comments field or eager setting affect these assumptions. `create` initializes `article.comments = []` (line 177). [Comment mutations](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.service.ts:101), [comment read and initialization](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.service.ts:165).
- **Favorites:** `ArticleService.findAll` maps `author.favorites` in its favorited branch (lines 43–46). `favorite` and `unFavorite` use `user.favorites.findIndex`, push/splice the collection, save the user, and separately adjust/save `article.favoriteCount` (lines 131–162). Their user lookups do not explicitly load `favorites`, and that relation is not explicitly eager; the source alone does not guarantee a populated array. `UserService.update` deletes `toUpdate.favorites` before saving (line 77). [Filtering](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.service.ts:43), [favorite mutations](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.service.ts:131), [user update](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/user/user.service.ts:74).
- **Deletion behavior:** `ArticleService.delete` calls `articleRepository.delete` directly (lines 197–198), while `UserService.delete` calls `userRepository.delete` (lines 83–84). Neither implements related-entity cleanup here; changes to delete/constraint metadata may affect them. Explicit comment deletion is described above and is not evidence of a cascade. [Article deletion](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.service.ts:197), [user deletion](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/user/user.service.ts:83).
- **Returned entity shape:** Relation-loading changes can also affect entity-returning reads: `ArticleService.findOne` (lines 96–98), `UserService.findAll`/`findOne` (lines 21–35), and `ProfileService.findAll`/`findOne` (lines 19–27). These return entities rather than explicitly selecting only scalar response fields. [Article read](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/article/article.service.ts:96), [user reads](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/user/user.service.ts:21), [profile reads](D:/workspace/VibeKnowledge/.vscode-test/query-skill-ab-76VCKe/B/src/profile/profile.service.ts:19).

No relation code was modified, and relation persistence/loading/deletion was not integration-tested against a database.

## Evidence route

Read the query skill fully. Used **no graph operations**: the tags change was local, and the relationship question named three declarations whose immediate service/property references were resolved with focused source searches. Under the skill's selective routing criteria, direct inspection was sufficient; a graph query would repeat the available source evidence. All reads, searches, and test executions used the supplied observation wrapper.
