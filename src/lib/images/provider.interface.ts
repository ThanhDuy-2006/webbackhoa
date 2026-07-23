export interface ImageSearchResult {
  url: string;
  width?: number;
  height?: number;
  title?: string;
  source_domain?: string;
  thumbnail_url?: string;
}

export interface ImageSearchProvider {
  /**
   * Searches for images based on a query.
   * @param query The search term
   * @returns A promise resolving to an array of image search results
   */
  searchImages(query: string): Promise<ImageSearchResult[]>;
}
