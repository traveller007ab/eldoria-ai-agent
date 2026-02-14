import { SearchService } from './src/services/SearchService';

async function testSearchService() {
  console.log('🧪 Testing Search Service...\n');

  const searchService = new SearchService();

  // Check available providers
  console.log('Available providers:', searchService.getAvailableProviders());

  // Check provider availability
  const availability = await searchService.checkProviderAvailability();
  console.log('Provider availability:', availability);

  // Test search
  try {
    const testQuery = 'artificial intelligence in academic research';
    console.log(`\n🔎 Testing search for: "${testQuery}"`);

    const results = await searchService.search(testQuery, 3);
    
    console.log(`✅ Search successful! Found ${results.length} results:`);
    results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}:`);
      console.log(`  Title: ${result.title}`);
      console.log(`  URL: ${result.url}`);
      console.log(`  Snippet: ${result.snippet.substring(0, 100)}...`);
      console.log(`  Source: ${result.source}`);
    });

  } catch (error) {
    console.error('❌ Search test failed:', error instanceof Error ? error.message : error);
  }
}

testSearchService().catch(console.error);