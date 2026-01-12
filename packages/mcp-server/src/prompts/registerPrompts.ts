import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer): void {
    server.registerPrompt(
        'get_observations',
        {
            description: '获取当前项目的所有观察记录（Observations）'
        },
        async () => {
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: '请调用 MCP 工具 search_observations，返回最近的观察记录并附上实体名称、文件路径与更新时间。'
                        }
                    }
                ]
            };
        }
    );

    server.registerPrompt(
        'answer_with_rag',
        {
            description: '指示助手在面对项目问答时优先调用 ask_question（RAG）'
        },
        async () => {
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: '当用户提出与项目文档、配置或架构细节相关的问题时，请调用 MCP 工具 ask_question，并使用用户的原始提问作为参数。收到工具输出后，将答案与引用整理为最终回复。'
                        }
                    }
                ]
            };
        }
    );
}
