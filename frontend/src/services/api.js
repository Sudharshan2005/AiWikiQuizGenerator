const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw new Error(error.message || 'Network request failed');
    }
  }

  async generateQuiz(url) {
    return this.request('/generate-quiz', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async getQuizHistory() {
    return this.request('/quizzes');
  }

  async getQuizById(quizId) {
    return this.request(`/quizzes/${quizId}`);
  }

  async getHealth() {
    return this.request('/');
  }
}

export const api = new ApiService();