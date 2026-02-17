import { ToolExecutor, ToolResult } from '../tool-executor.interface';

/**
 * Web search tool: searches the internet for information.
 * Currently uses a mock implementation. Ready for real API integration
 * (e.g., SerpAPI, Brave Search, Google Custom Search).
 */
export class WebSearchExecutor implements ToolExecutor {
  name = 'web_search';

  async execute(input: string, config?: Record<string, any>): Promise<ToolResult> {
    const maxResults = config?.maxResults || 5;

    try {
      // TODO: Replace with real search API when available
      // Supported APIs: SerpAPI, Brave Search, Google Custom Search
      const searchApiKey = process.env.SEARCH_API_KEY;

      if (searchApiKey) {
        return await this.realSearch(input, maxResults, searchApiKey);
      }

      return this.mockSearch(input, maxResults);
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: `خطا در جستجو: ${error.message}`,
      };
    }
  }

  private async realSearch(query: string, maxResults: number, apiKey: string): Promise<ToolResult> {
    // Brave Search API integration (ready for activation)
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey,
          },
        },
      );

      if (!res.ok) throw new Error(`Search API error: ${res.status}`);

      const data = await res.json();
      const results = (data.web?.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        description: r.description,
      }));

      const output = results
        .map((r: any, i: number) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`)
        .join('\n\n');

      return {
        success: true,
        output: output || 'نتیجه‌ای یافت نشد',
        metadata: { query, resultCount: results.length, results },
      };
    } catch (error: any) {
      return this.mockSearch(query, maxResults);
    }
  }

  private mockSearch(query: string, maxResults: number): ToolResult {
    const mockResults = [
      {
        title: `نتیجه جستجو برای "${query}"`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        description: `این یک نتیجه آزمایشی برای عبارت "${query}" است. برای فعال‌سازی جستجوی واقعی، کلید API جستجو را تنظیم کنید.`,
      },
      {
        title: `اطلاعات بیشتر درباره ${query}`,
        url: `https://example.com/info/${encodeURIComponent(query)}`,
        description: `منابع و اطلاعات تکمیلی مرتبط با "${query}".`,
      },
    ];

    const output = mockResults
      .slice(0, maxResults)
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`)
      .join('\n\n');

    return {
      success: true,
      output,
      metadata: { query, resultCount: mockResults.length, mock: true },
    };
  }
}
