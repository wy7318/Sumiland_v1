// lib/api.js - Add these functions to your API utility file

/**
 * Performs a global search across all CRM objects
 * @param {string} query - The search query
 * @param {Object} options - Additional search options
 * @returns {Promise<Array>} Search results
 */
export async function globalSearch(query, options = {}) {
  const { type = 'all', limit = 20, filters = {} } = options;
  
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Search API error:', error);
    throw error;
  }
}

/**
 * Performs a quick search for the search dropdown
 * @param {string} query - The search query
 * @returns {Promise<Object>} Grouped preview results
 */
export async function quickSearch(query) {
  try {
    const response = await fetch(`/api/quick-search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Quick search failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Quick search API error:', error);
    throw error;
  }
}

// Then update your SearchBar.jsx and SearchResultsPage.jsx to use these functions
// Example modification for SearchBar.jsx:

const performSearch = async (query) => {
  setIsSearching(true);
  
  try {
    const searchResults = await quickSearch(query);
    setResults(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    // Handle error state
  } finally {
    setIsSearching(false);
  }
};