import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  Target,
  Zap,
  Shield
} from 'lucide-react';
import { useStore } from '../store/useStore';
import AuthForm from '../components/auth-form';
import { cn } from '../utils/cn';

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  
  const { isAuthenticated, user } = useStore();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowAuth(true);
  };

  const handleAuthSuccess = (userData) => {
    setShowAuth(false);
    navigate('/dashboard');
  };

  const features = [
    {
      icon: Target,
      title: "AI-Powered Predictions",
      description: "Advanced machine learning algorithms analyze your skills and experience to predict the perfect job role."
    },
    {
      icon: TrendingUp,
      title: "Career Growth",
      description: "Discover new opportunities and career paths that align with your professional goals."
    },
    {
      icon: Shield,
      title: "Data Privacy",
      description: "Your information is secure and protected with enterprise-grade security measures."
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Get job predictions and insights in seconds, not days or weeks."
    }
  ];

const roles = [
    {
      name: "Student",
      roleValue: "Student",
      icon: GraduationCap,
      description: "Find your perfect career path",
      color: "from-blue-500 to-cyan-500",
      hoverColor: "from-blue-600 to-cyan-600"
    },
    {
      name: "HR Professional",
      roleValue: "Hr",
      icon: Users,
      description: "Optimize your hiring process",
      color: "from-green-500 to-emerald-500",
      hoverColor: "from-green-600 to-emerald-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Job Prediction
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Discover Your
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Perfect Career
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
                Our advanced AI analyzes your skills, experience, and aspirations to predict the ideal job role that matches your potential and goals.
              </p>
            </motion.div>

            {/* Role Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-12"
            >
              {roles.map((role, index) => (
                <motion.button
                  key={role.name}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect(role.roleValue)}
                  className={cn(
                    "group relative p-6 rounded-2xl bg-gradient-to-br text-white text-left transition-all duration-300 shadow-lg hover:shadow-xl",
                    role.color
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <role.icon className="w-8 h-8" />
                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{role.name}</h3>
                  <p className="text-blue-100 opacity-90">{role.description}</p>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-white"></div>
                </motion.button>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
            >
              {[
                { number: "95%", label: "Accuracy Rate" },
                { number: "10K+", label: "Users Helped" },
                { number: "24/7", label: "AI Support" }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Our AI Job Predictor?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Experience the future of career guidance with cutting-edge technology and personalized insights.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center p-6 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Discover Your Perfect Career?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of professionals who have already found their ideal job roles with our AI-powered predictions.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRoleSelect("Student")}
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors shadow-lg"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuth && (
        <AuthForm
          role={selectedRole}
          onClose={() => setShowAuth(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
