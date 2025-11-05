import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  Star,
  ExternalLink,
  Calendar,
  Users,
  MapPin,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DifficultyBadge = ({ difficulty }) => {
  const config = {
    easy: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '🌟' },
    medium: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '💡' },
    hard: { color: 'bg-rose-100 text-rose-800 border-rose-200', icon: '🔥' }
  };

  const { color, icon } = config[difficulty] || config.medium;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
      <span className="mr-1">{icon}</span>
      {difficulty}
    </span>
  );
};

const EntitySection = ({ entities }) => {
  const icons = {
    people: Users,
    organizations: Building,
    locations: MapPin
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(entities).map(([category, items]) => {
        const Icon = icons[category] || HelpCircle;
        return (
          <div key={category} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <Icon size={18} className="text-primary-600 mr-2" />
              <h4 className="font-semibold text-gray-900 capitalize">{category}</h4>
            </div>
            <ul className="space-y-2">
              {items.slice(0, 5).map((entity, idx) => (
                <li key={idx} className="flex items-center text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-primary-400 rounded-full mr-3"></div>
                  {entity}
                </li>
              ))}
              {items.length > 5 && (
                <li className="text-xs text-primary-600 font-medium mt-2">
                  +{items.length - 5} more
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

const QuizQuestionCard = ({ question, index, showAnswers, userAnswer, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleOptionSelect = (option) => {
    if (!showAnswers && onAnswer) {
      setSelectedOption(option);
      onAnswer(option);
    }
  };

  const isCorrect = selectedOption === question.answer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card p-6 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start space-x-4 flex-1">
          <div className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
            {index + 1}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 leading-relaxed">
              {question.question}
            </h3>
            <div className="mt-2">
              <DifficultyBadge difficulty={question.difficulty} />
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {question.options.map((option, optIndex) => {
          const isSelected = selectedOption === option;
          const isCorrectAnswer = showAnswers && option === question.answer;
          const isWrongAnswer = showAnswers && isSelected && !isCorrect;

          let optionStyle = "bg-gray-50 border-gray-200 hover:bg-gray-100";
          if (isCorrectAnswer) optionStyle = "bg-emerald-50 border-emerald-300 text-emerald-900";
          if (isWrongAnswer) optionStyle = "bg-rose-50 border-rose-300 text-rose-900";
          if (isSelected && !showAnswers) optionStyle = "bg-primary-50 border-primary-300 text-primary-900";

          return (
            <motion.div
              key={optIndex}
              whileHover={{ scale: !showAnswers ? 1.02 : 1 }}
              whileTap={{ scale: !showAnswers ? 0.98 : 1 }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${optionStyle} ${
                !showAnswers ? 'hover:shadow-md' : ''
              }`}
              onClick={() => handleOptionSelect(option)}
            >
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 ${
                  isSelected || isCorrectAnswer
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'border-gray-300'
                }`}>
                  {String.fromCharCode(65 + optIndex)}
                </div>
                <span className="font-medium">{option}</span>
                {isCorrectAnswer && (
                  <CheckCircle2 size={20} className="text-emerald-500 ml-auto flex-shrink-0" />
                )}
                {isWrongAnswer && (
                  <XCircle size={20} className="text-rose-500 ml-auto flex-shrink-0" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Explanation */}
      {showAnswers && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center mb-2">
              <HelpCircle size={18} className="text-blue-600 mr-2" />
              <span className="font-semibold text-blue-900">Explanation</span>
            </div>
            <p className="text-blue-800 text-sm leading-relaxed">
              {question.explanation}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const EnhancedQuizCard = ({ quiz, showAnswers = true, onTakeQuiz }) => {
  const [activeSection, setActiveSection] = useState('quiz');
  const [userAnswers, setUserAnswers] = useState({});
  const [quizCompleted, setQuizCompleted] = useState(false);

  const handleAnswer = (questionIndex, answer) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const calculateScore = () => {
    const correctAnswers = quiz.quiz.filter((q, index) => userAnswers[index] === q.answer).length;
    return {
      correct: correctAnswers,
      total: quiz.quiz.length,
      percentage: Math.round((correctAnswers / quiz.quiz.length) * 100)
    };
  };

  const score = calculateScore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="card p-8 bg-gradient-to-br from-white to-gray-50">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></div>
              <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">{quiz.summary}</p>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Calendar size={16} className="mr-2" />
                Generated on {new Date().toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <HelpCircle size={16} className="mr-2" />
                {quiz.quiz.length} questions
              </div>
            </div>
          </div>
          
          <a
            href={quiz.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center whitespace-nowrap"
          >
            <ExternalLink size={16} className="mr-2" />
            View Article
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 p-1 bg-gray-100 rounded-2xl w-fit">
        {['overview', 'quiz', 'topics'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSection(tab)}
            className={`px-6 py-3 rounded-xl font-medium capitalize transition-all duration-200 ${
              activeSection === tab
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Section */}
      <AnimatePresence mode="wait">
        {activeSection === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Key Entities */}
            <div className="card p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="mr-3 text-primary-600" size={24} />
                Key Entities
              </h3>
              <EntitySection entities={quiz.key_entities} />
            </div>

            {/* Sections */}
            <div className="card p-6 mt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Star className="mr-3 text-primary-600" size={24} />
                Article Sections
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {quiz.sections.map((section, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                  >
                    <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{section}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Quiz Section */}
        {activeSection === 'quiz' && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {!showAnswers && !quizCompleted && (
              <div className="card p-6 mb-6 bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary-900 mb-2">
                      🎯 Take the Quiz
                    </h3>
                    <p className="text-primary-700">
                      Test your knowledge! Select the correct answer for each question.
                    </p>
                  </div>
                  <button
                    onClick={() => setQuizCompleted(true)}
                    className="btn-primary"
                  >
                    Submit Answers
                  </button>
                </div>
              </div>
            )}

            {!showAnswers && quizCompleted && (
              <div className="card p-8 mb-6 text-center bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-900 mb-2">
                  Quiz Completed!
                </h3>
                <p className="text-emerald-700 mb-4">
                  You scored {score.correct} out of {score.total} ({score.percentage}%)
                </p>
                <div className="w-full bg-emerald-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${score.percentage}%` }}
                  ></div>
                </div>
                <button
                  onClick={() => {
                    setQuizCompleted(false);
                    setUserAnswers({});
                  }}
                  className="btn-secondary"
                >
                  Retry Quiz
                </button>
              </div>
            )}

            <div className="space-y-6">
              {quiz.quiz.map((question, index) => (
                <QuizQuestionCard
                  key={index}
                  question={question}
                  index={index}
                  showAnswers={showAnswers || quizCompleted}
                  userAnswer={userAnswers[index]}
                  onAnswer={(answer) => handleAnswer(index, answer)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Related Topics Section */}
        {activeSection === 'topics' && (
          <motion.div
            key="topics"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="card p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Star className="mr-3 text-primary-600" size={24} />
                Continue Learning
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                Explore these related topics to deepen your understanding:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quiz.related_topics.map((topic, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 text-center hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  >
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-200 transition-colors">
                      <span className="text-2xl">📚</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-primary-600 transition-colors">
                      {topic}
                    </h4>
                    <p className="text-gray-500 text-sm">
                      Explore this topic on Wikipedia
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EnhancedQuizCard;