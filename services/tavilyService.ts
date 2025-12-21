import { TAVILY_API_KEY } from '../config';

interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
}

interface TavilyResponse {
    results: TavilySearchResult[];
    answer?: string;
}

export const advancedSearchTavily = async (query: string): Promise<TavilyResponse> => {
    if (!TAVILY_API_KEY) {
        throw new Error('Tavily API Key is missing.');
    }

    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query,
            search_depth: 'advanced',
            include_answer: true,
            max_results: 5,
        }),
    });

    if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
    }

    return await response.json();
};

export const searchTavily = async (query: string): Promise<string> => {
    const data = await advancedSearchTavily(query);
    let formattedResult = `**Search Results for:** "${query}"\n\n`;

    if (data.answer) {
        formattedResult += `**Summary:** ${data.answer}\n\n---\n\n`;
    }

    data.results.forEach((result, index) => {
        formattedResult += `**${index + 1}. [${result.title}](${result.url})**\n`;
        formattedResult += `${result.content}\n\n`;
    });

    return formattedResult;
};
