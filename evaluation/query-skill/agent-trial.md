# Independent Skill trial

Date: 2026-09-04. A separate agent received only the installed query Skill, the isolated NestJS sample and this read-only request:

> If GET /tags should sort tags by name, which dependencies, implementation layer and tests need attention?

The agent used Node 26.8.1 and the installed Skill, without MCP, network access, dependency installation or graph/source mutations. The original sample project was not accessed.

## Observed workflow

1. Read SKILL.md, then `overview --budget 1200`.
2. Ran `query --query tags --group tag-management --budget 1200 --evidence`.
3. Increased the same query to 2400 after an explicit truncation notice; received 5 entities and 7 relations.
4. Ran `impact --selector src/tag/tag.service.ts#TagService --direction upstream --depth 2 --budget 1200`.
5. Followed the returned paths and searched for relevant tests.

The agent displayed 7 complete source files (157 lines): tag controller, service, entity, module, controller spec, root module and main entry. Search results additionally showed 23 matching lines from 13 other source files, plus 30 package.json lines and one text-file match. No complete graph JSON, audit Markdown or runtime implementation was loaded into model context.

## Answer checked against source

- Correctly traced `TagController.findAll -> TagService.findAll -> Repository<TagEntity>.find`.
- Identified `tag`, not `name`, as the entity's label field and the service's repository query as the proposed sorting location.
- Found that the existing controller test mocks the whole service and returns an already sorted array; it does not validate database ordering.
- Proposed a repository-options service test plus integration coverage, without pretending to have run tests.
- Noted the `/api` global prefix and unresolved sorting semantics (case, locale, ties).

## Findings and limits

- The first trial unnecessarily enabled Evidence on its initial routing query, causing an extra larger query. The final Skill now explicitly starts without Evidence and requests it only to check uncertain edges.
- A curated `TagService --calls--> @nestjs/typeorm` edge summarized module wiring; source inspection prevented treating it as a proven direct runtime call. The Skill now explicitly distinguishes lifted dependencies from direct calls. This trial did not modify the underlying generator.
- Raw impact results can locate test dependencies even when the curated group excludes test nodes.
- The fixture intentionally did not install application dependencies, so no application test execution or implementation correctness is claimed.
- This is one independent usability trial, not a billed-token comparison or statistically controlled agent evaluation. The [paired transport benchmark](results.md) separately measures identical query outputs and explicit text overhead; it does not charge or model the trial agent's reasoning/source reads.
