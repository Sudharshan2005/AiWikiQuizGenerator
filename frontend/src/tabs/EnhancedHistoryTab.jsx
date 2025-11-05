import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Calendar, 
  ExternalLink, 
  Search, 
  Filter,
  Trash2,
  Download,
  Star,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import EnhancedModal from '../components/EnhancedModal';
import EnhancedQuizCard from '../components/EnhancedQuizCard';
import LoadingSpinner from '../components/LoadingSpinner';

const EnhancedHistoryTab = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterAndSortQuizzes();
  }, [quizzes, searchTerm, sortBy]);

  const loadHistory = async () => {
    try {
      const history = await api.getQuizHistory();
      console.log(history)
      setQuizzes(history);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortQuizzes = () => {
    let filtered = quizzes.filter(quiz =>
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.url.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort quizzes
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date_generated) - new Date(a.date_generated);
        case 'oldest':
          return new Date(a.date_generated) - new Date(b.date_generated);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredQuizzes(filtered);
  };

  const handleViewDetails = async (quizId) => {
    try {
      const quiz = await api.getQuizById(quizId);
      setSelectedQuiz(quiz);
      setModalOpen(true);
    } catch (err) {
      console.error('Failed to load quiz details:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading your quiz history..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Quiz <span className="gradient-text">History</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Review all your previously generated quizzes and track your learning progress.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          {[
            { label: 'Total Quizzes', value: quizzes.length, icon: BarChart3, color: 'blue' },
            { label: 'This Week', value: quizzes.filter(q => new Date(q.date_generated) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length, icon: Calendar, color: 'green' },
            { label: 'This Month', value: quizzes.filter(q => new Date(q.date_generated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, icon: Star, color: 'amber' },
            { label: 'Active', value: quizzes.length, icon: BarChart3, color: 'purple' }
          ].map((stat, index) => (
            <div key={index} className="card p-6 text-center">
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                <stat.icon className={`text-${stat.color}-600`} size={24} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 w-full lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search quizzes by title or URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {/* Sort and Filter */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter size={18} className="text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-3 pr-8 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quizzes Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filteredQuizzes.map((quiz, index) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6 hover:shadow-xl transition-all duration-300 group"
              >
                {/* Quiz Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {quiz.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Calendar size={14} className="mr-1" />
                      {getTimeAgo(quiz.date_generated)}
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ml-4">
                    {quiz.title.charAt(0)}
                  </div>
                </div>

                {/* URL Preview */}
                <div className="mb-4">
                  <a
                    href={quiz.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <ExternalLink size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate">{quiz.url}</span>
                  </a>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleViewDetails(quiz.id)}
                    className="btn-primary flex items-center space-x-2 text-sm px-4 py-2"
                  >
                    <Eye size={16} />
                    <span>View Details</span>
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Download size={16} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-rose-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredQuizzes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-12 text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="text-gray-400" size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              No Quizzes Yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Your generated quizzes will appear here. Start by creating your first quiz from a Wikipedia article!
            </p>
            <button className="btn-primary">
              Generate First Quiz
            </button>
          </motion.div>
        )}
      </div>

      {/* Quiz Details Modal */}
      <EnhancedModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedQuiz?.title}
        size="xl"
      >
        {selectedQuiz && (
          <div className="p-4">
            <EnhancedQuizCard quiz={selectedQuiz} showAnswers={true} />
          </div>
        )}
      </EnhancedModal>
    </div>
  );
};

export default EnhancedHistoryTab;