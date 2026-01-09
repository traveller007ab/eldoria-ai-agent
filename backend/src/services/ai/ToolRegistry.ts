import { logger } from '@/utils/logger';

export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: any, context: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private categories: Map<string, string[]> = new Map();

  /**
   * Register a new tool
   */
  register(tool: Tool, category: string = 'general') {
    this.tools.set(tool.name, tool);
    
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push(tool.name);

    logger.info(`Tool registered: ${tool.name} (${category})`);
  }

  /**
   * Get tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: string): Tool[] {
    const toolNames = this.categories.get(category) || [];
    return toolNames.map(name => this.tools.get(name)!).filter(Boolean);
  }

  /**
   * AI-powered tool selection
   */
  async selectToolsForTask(taskDescription: string): Promise<Tool[]> {
    const selectionPrompt = `
Given this task, select the most appropriate tools.

Task: ${taskDescription}

Available Tools:
${Array.from(this.tools.values()).map(t => `
- ${t.name}
  Category: ${this.getToolCategory(t.name)}
  Description: ${t.description}
  Parameters: ${JSON.stringify(t.parameters)}
`).join('\n')}

Select tools as JSON array of tool names:
{
  "tools": ["tool1", "tool2"],
  "reasoning": "Why these tools are best for this task"
}
`;

    // This would use an LLM service
    const response = await this.mockLLMCall(selectionPrompt);
    const selection = JSON.parse(response);
    
    return selection.tools
      .map((name: string) => this.tools.get(name))
      .filter(Boolean) as Tool[];
  }

  private getToolCategory(toolName: string): string {
    for (const [category, tools] of this.categories.entries()) {
      if (tools.includes(toolName)) return category;
    }
    return 'general';
  }

  private async mockLLMCall(prompt: string): Promise<string> {
    // Mock implementation - would use actual LLM
    return JSON.stringify({
      tools: [],
      reasoning: 'Mock LLM response'
    });
  }
}