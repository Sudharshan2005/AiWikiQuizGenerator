import { api } from '../services/api.js';

export const testApiEndpoints = async () => {
  console.log('🧪 Testing API endpoints...');
  
  try {
    // Test health endpoint
    const health = await api.getHealth();
    console.log('✅ Health check:', health);
    
    // Test quizzes endpoint
    const quizzes = await api.getQuizHistory();
    console.log('✅ Quizzes list:', quizzes);
    
    if (quizzes.length > 0) {
      const firstQuiz = quizzes[0];
      console.log('📝 First quiz:', firstQuiz);
      
      // Test attempts for first quiz
      const attempts = await api.getQuizAttempts(firstQuiz.id);
      console.log('✅ Attempts for quiz:', firstQuiz.id, attempts);
      
      // Test getting quiz details
      const quizDetails = await api.getQuizById(firstQuiz.id);
      console.log('✅ Quiz details:', quizDetails);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
};

testApiEndpoints();