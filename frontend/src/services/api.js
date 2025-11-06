const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Important for cookies
      ...options,
    };

    try {
      console.log(`🔄 API Request: ${url}`, config);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error ${response.status}:`, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || `HTTP ${response.status}` };
        }
        
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ API Response: ${url}`, data);
      return data;
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw new Error(error.message || 'Network request failed');
    }
  }

  async generateQuiz(url) {
    return this.request('/generate-quiz', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async submitQuizAttempt(quizId, attemptData) {
    return this.request(`/quizzes/${quizId}/attempt`, {
      method: 'POST',
      body: JSON.stringify(attemptData),
    });
  }

  async getQuizAttempts(quizId) {
    try {
      console.log(`🔄 Getting attempts for quiz ${quizId}`);
      const result = await this.request(`/quizzes/${quizId}/attempts`);
      console.log(`✅ Got ${result.length} attempts for quiz ${quizId}`, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to get attempts for quiz ${quizId}:`, error);
      // Return empty array on error to prevent UI breakage
      return [];
    }
  }

  async getQuizHistory() {
    return this.request('/quizzes');
  }

  async getQuizById(quizId) {
    return this.request(`/quizzes/${quizId}`);
  }

  async getHealth() {
    return this.request('/health');
  }

  async getEndpoints() {
    return this.request('/endpoints');
  }
}

export const api = new ApiService();