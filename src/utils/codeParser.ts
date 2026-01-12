import * as vscode from 'vscode';

/**
 * 代码解析工具
 * 用于识别代码中的符号类型（函数、类等）
 */
export class CodeParser {
  /**
   * 识别选中代码的类型
   */
  public static async identifySelectionType(
    document: vscode.TextDocument,
    selection: vscode.Selection
  ): Promise<string | null> {
    const text = document.getText(selection);
    
    // 简单的模式匹配识别
    if (/^\s*(export\s+)?(async\s+)?function\s+\w+/.test(text)) {
      return 'function';
    }
    
    if (/^\s*(export\s+)?(abstract\s+)?class\s+\w+/.test(text)) {
      return 'class';
    }
    
    if (/^\s*(export\s+)?interface\s+\w+/.test(text)) {
      return 'interface';
    }
    
    if (/^\s*(export\s+)?(const|let|var)\s+\w+/.test(text)) {
      return 'variable';
    }

    return null;
  }

  /**
   * 提取符号名称
   */
  public static extractSymbolName(text: string): string | null {
    // 匹配常见的符号定义模式
    const patterns = [
      /(?:function|class|interface)\s+(\w+)/,
      /(?:const|let|var)\s+(\w+)/,
      /(\w+)\s*[:=]\s*(?:function|class|\()/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}

