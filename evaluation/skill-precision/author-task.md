为此工程的 Shelf 导出功能编写一份可供后续 Coding Agent 复用的功能简报。
覆盖实际功能、主要依赖、相关运行机制、现有测试和影响修改的约束。使用分配给你的
authoring.md，输出符合其中 schema 的 draft.json；功能 key 使用 shelf-export。
只能读取分配工作区的 src/、tests/ 和 authoring.md，使用 apply_patch 创建 draft.json。
无需发布简报、运行代码/测试、生成图谱、安装依赖或修改源文件。不能读取父目录、
其他工作区、评测文件或联网，也不要启动子代理。不要为假设的未来测试编写答案。
最终只报告简报路径和实际核查范围。
