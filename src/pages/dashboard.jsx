import { useState, useEffect, useMemo } from 'react';
import { motion,AnimatePresence  } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart as RBChart, Bar, XAxis, YAxis, RadialBarChart, RadialBar } from 'recharts';
import { Upload, FileText, Users, BarChart3, TrendingUp, ClipboardList, Target, Briefcase, User, GraduationCap, Building2, MapPin, DollarSign, Filter, Search, Star, Plus, X, XCircle, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../utils/cn';
import { dashboardAPI, resumeAPI, getCurrentUser } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { jobListings } from '../data/jobListings';

const colors = {
  primary: "#1976d2",
  success: "#2e7d32",
  warning: "#ed6c02",
  error: "#d32f2f",
  grey: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#eeeeee",
    300: "#e0e0e0",
    400: "#bdbdbd",
    500: "#9e9e9e",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
  },
};

const styles = {
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: `1px solid ${colors.grey[200]}`
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.grey[700],
    marginBottom: '8px',
    display: 'block'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.grey[300]}`,
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease-in-out',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.grey[300]}`,
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
  },
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '128px',
    border: `2px dashed ${colors.grey[300]}`,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};

function Card({ children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user, setLoading } = useStore();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const role = String(currentUser?.role || user?.role || '').toLowerCase().trim();
  const isHR = ['hr', 'hr professional', 'hrprofessional', 'human resources'].includes(role);

  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  // Student tool state
  const [studentSkills, setStudentSkills] = useState('');
  const [studentResumeName, setStudentResumeName] = useState('');
  const [studentResult, setStudentResult] = useState(null);
  const [resumeAnalysisResult, setResumeAnalysisResult] = useState(null);
  const [isAnalyzingResume, setIsAnalyzingResume] = useState(false);

  // HR tool state
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [minEducation, setMinEducation] = useState('3');
  const [minExperience, setMinExperience] = useState('0');
  const [topN, setTopN] = useState(5);
  const [hrResults, setHrResults] = useState([]);
  const [hrAllResults, setHrAllResults] = useState([]);
  const [hrFiles, setHrFiles] = useState([]);
  const [hrError, setHrError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [matchedJobs, setMatchedJobs] = useState([]);

const toggleDropdown = (id) => {
  setOpenDropdowns((prev) => ({ ...prev, [id]: !prev[id] }));
};

  useEffect(() => {
    // Check authentication and load user data
    const loadUserData = async () => {
      setLoading(true);
      try {
        // Get user from localStorage or API
        const storedUser = getCurrentUser();
        if (!storedUser) {
          navigate('/'); // Redirect to home if not authenticated
          return;
        }
        setCurrentUser(storedUser);
        
        // Fetch dashboard stats
        const stats = await dashboardAPI.getStats();
        setDashboardStats(stats);
        
        // Fetch upload history for HR users
        if (storedUser.role === 'Hr') {
          const history = await resumeAPI.getUploadHistory();
          setUploadHistory(history);

          // NEW: also fetch candidates for each upload
          const token = localStorage.getItem('token');
          const allCandidates = [];

          for (const upload of history) {
            const res = await fetch(`http://localhost:3000/api/candidates/${upload.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              allCandidates.push({ uploadId: upload.id, candidates: data.candidates });
            }
          }

          setHrAllResults(allCandidates);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // If token is invalid, redirect to login
        if (error.message.includes('token')) {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [setLoading, navigate]);

  useEffect(() => {
    if (!isHR) {
      const topJobs = jobListings.sort((a, b) => b.matchScore - a.matchScore);
      setMatchedJobs(topJobs);
    }
  }, [isHR]);

  // Data tailored by role
  const dashboardData = useMemo(() => {
    if (isHR) {
      return {
        stats: [
          { label: 'Total Uploads', value: dashboardStats?.totalUploads || 0, icon: Upload, color: 'blue' },
          { label: 'Total Candidates', value: dashboardStats?.totalCandidates || 0, icon: Users, color: 'green' },
          { label: 'Avg. Match Score', value: `${dashboardStats?.avgScore || 0}%`, icon: TrendingUp, color: 'purple' },
          { label: 'Recent Uploads', value: uploadHistory?.length || 0, icon: ClipboardList, color: 'orange' }
        ],
        listTitle: 'Recent Uploads',
        items: uploadHistory?.map((upload, idx) => ({
          id: upload.id,
          title: upload.job_role,
          company: `${upload.total_resumes} resumes`,
          location: new Date(upload.upload_date).toLocaleDateString(),
          salary: `Top ${upload.required_candidates} candidates`,
          matchScore: upload.avg_score ? `${upload.avg_score}` : "0%",
          skills: upload.skills || [],
          status: upload.status || 'Completed'
        })) || [],
        tabs: [
          { id: 'overview', label: 'HR Overview', icon: BarChart3 },
          { id: 'tools', label: 'HR Tools', icon: Briefcase },
          { id: 'candidates', label: 'Candidates', icon: Users },
        ],
        headerGreeting: 'HR Dashboard',
        cta: { label: 'Create Job Post', icon: Plus }
      };
    }

    // Student default
     return {
      stats: [
        { label: 'Profile Views', value: dashboardStats?.profileViews || 0, icon: Target, color: 'blue' },
        { label: 'Applications', value: dashboardStats?.applications || 0, icon: Briefcase, color: 'green' },
        { label: 'Matched Jobs', value: matchedJobs.length, icon: Star, color: 'purple' },
        { label: 'Profile Strength', value: `${dashboardStats?.profileStrength || 75}%`, icon: TrendingUp, color: 'orange' }
      ],
      listTitle: 'Recommended Jobs For You',
      items: matchedJobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        matchScore: job.calculatedScore || job.matchScore,
        skills: job.matchingSkills || job.skills.slice(0, 5),
        missingSkills: job.missingSkills || [],
        status: job.status
      })),
      tabs: [
        { id: 'overview', label: 'Student Overview', icon: BarChart3 },
        { id: 'tools', label: 'Student Tools', icon: GraduationCap },
        { id: 'history', label: ' Student History', icon: Target },
      ],
      headerGreeting: 'Student Dashboard',
      cta: { label: 'Upload Resume', icon: Plus }
    };
  }, [isHR, dashboardStats, uploadHistory, matchedJobs]);

  const getStatusColor = (status) => {
    const normalized = status.toLowerCase();
    if (['recommended', 'shortlisted', 'interviewing'].includes(normalized)) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }
    if (['good match', 'under review'].includes(normalized)) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
    if (['consider'].includes(normalized)) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const matchJobsWithSkills = (studentSkillsText) => {
    if (!studentSkillsText) {
      return jobListings.sort((a, b) => b.matchScore - a.matchScore).slice(0, 200);
    }
    const userSkills = studentSkillsText.toLowerCase().split(/[,\s]+/).filter(Boolean);
    const scoredJobs = jobListings.map(job => {
      const jobSkills = job.skills.map(s => s.toLowerCase());
      const matchingSkills = userSkills.filter(skill =>
        jobSkills.some(jobSkill => jobSkill.includes(skill) || skill.includes(jobSkill))
      );
      
      const missingSkills = jobSkills.filter(jobSkill =>
      !userSkills.some(skill => 
        jobSkill.includes(skill) || skill.includes(jobSkill))
      );

      const calculatedScore = matchingSkills.length > 0
        ? Math.round((matchingSkills.length / jobSkills.length) * 100)
        : 0;
      return { ...job, calculatedScore, matchingSkills,missingSkills  };
    });
    return scoredJobs
      .filter(job => job.calculatedScore > 0)
      .sort((a, b) => b.calculatedScore - a.calculatedScore);
  };

  // ---- Mock analysis helpers ----
  const baseRoles = [
    { role: 'Software Engineer', skills: ['javascript', 'react', 'node', 'git', 'html', 'css'] },
    { role: 'Data Scientist', skills: ['python', 'pandas', 'machine learning', 'sql', 'statistics'] },
    { role: 'Business Analyst', skills: ['excel', 'sql', 'communication', 'visualization'] },
    { role: 'DevOps Engineer', skills: ['aws', 'docker', 'ci/cd', 'linux'] },
  ];

  function analyzeStudent(skillsText, resumeText = '') {
    const tokens = (skillsText + ' ' + resumeText).toLowerCase().split(/[^a-z+#.]+/).filter(Boolean);
    const tokenSet = new Set(tokens);

    const roleScores = baseRoles.map(({ role, skills }) => {
      const compact = (s) => s.replace(/\s+/g, '');
      const have = skills.filter(s => tokenSet.has(compact(s)) || tokenSet.has(s));
      const percent = Math.round((have.length / skills.length) * 100);
      const gaps = skills.filter(s => !have.includes(s));
      return { role, percent, have, gaps, required: skills };
    }).sort((a, b) => b.percent - a.percent);

    const best = roleScores[0];
    const acquired = best.have.map(s => ({ skill: s, percent: 100 }));
    const lacking = best.gaps.map(s => ({ skill: s, percent: 0 }));

    return {
      bestRole: best.role,
      matchScore: best.percent,
      acquired,
      lacking,
      roleBreakdown: roleScores.slice(0, 3)
    };
  }

  function analyzeHR(files) {
    const results = Array.from(files).map((f) => {
      const base = Math.min(95, 50 + Math.floor((f.name.length % 20) * 2.2));
      const score = Math.max(50, Math.min(98, base));
      const skills = ['javascript','react','python','sql','aws','docker','excel','ml'];
      const top = skills
        .map(s => ({ s, v: Math.floor(Math.random() * 60) + 40 }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 4)
        .map(({ s, v }) => ({ skill: s, percent: v }));
      const suggested = top[0]?.skill?.includes('react') || top[0]?.skill?.includes('javascript') ? 'Frontend Engineer' : top[0]?.skill?.includes('python') || top[0]?.skill?.includes('ml') ? 'Data Scientist' : 'Analyst';
      return { name: f.name, size: f.size, score, top, suggested };
    }).sort((a, b) => b.score - a.score);

    return { top5: results.slice(0, 5), all: results };
  }

  // ---- Student actions ----
const onStudentResume = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Validate file type
  const validTypes = ['.pdf', '.doc', '.docx', '.txt'];
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!validTypes.includes(fileExt)) {
    alert('Please upload a valid resume file (.pdf, .docx, .txt)');
    return;
  }
  
  // Validate file size (e.g., 5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB');
    return;
  }
  
  setStudentResumeName(file.name);
  setIsAnalyzingResume(true);
  setResumeAnalysisResult(null); // Clear previous results
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('http://localhost:8000/api/analyze-student-resume', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `Server error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Resume analysis result:', result);
    
    setResumeAnalysisResult(result);
    
    const skillsText = result.extracted_skills.join(', ');
    setStudentSkills(skillsText);
    
    const roleAnalysis = analyzeStudent(skillsText, '');
    setStudentResult(roleAnalysis);
    
    const matched = matchJobsWithSkills(skillsText);
    setMatchedJobs(matched);
    
  } catch (error) {
    console.error('Error analyzing resume:', error);
    alert(`Failed to analyze resume: ${error.message}`);
    setStudentResumeName(''); // Clear the file name on error
  } finally {
    setIsAnalyzingResume(false);
    // Reset file input
    e.target.value = '';
  }
};

  const runStudentAnalysis = () => {
    setResumeAnalysisResult(null); // ✅ ADD THIS LINE to clear resume analysis
    const result = analyzeStudent(studentSkills, '');
    setStudentResult(result);
    const matched = matchJobsWithSkills(studentSkills); 
    setMatchedJobs(matched);
  };

  // ---- HR actions ----
  const onHrFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length < 3 || files.length > 20) {
      setHrError("Please upload between 5 and 20 resumes");
      setHrFiles([]);
      return;
    }
    setHrFiles(files);
    setHrError("");
  };

  const handleRankCandidates = async () => {
    if (hrFiles.length < 3 || hrFiles.length > 20) {
      setHrError('Please upload between 5 and 20 resumes');
      return;
    }

    if (!jobRole || !jobDescription) {
      setHrError('Job role and description are required');
      return;
    }

    setIsProcessing(true);
    setHrError('');
  };



  // Aggregations for charts
  const studentAcquiredChart = useMemo(() => {
    if (!studentResult) return [];
    return studentResult.acquired.map((s) => ({ name: s.skill, value: s.percent }));
  }, [studentResult]);

  const studentGapsChart = useMemo(() => {
    if (!studentResult) return [];
    return studentResult.lacking.map((s) => ({ name: s.skill, value: 100 }));
  }, [studentResult]);

const hrSkillDistribution = useMemo(() => {
  const counts = new Map();

  hrAllResults.forEach(r => {
    // Handle the 'top' field (used in HR Tools tab)
    if (Array.isArray(r.top)) {
      r.top.forEach(t => counts.set(t.skill, (counts.get(t.skill) || 0) + 1));
    }

    // Handle the 'candidates' field (used for dashboard upload summary)
    if (Array.isArray(r.candidates)) {
      r.candidates.forEach(c => {
        if (Array.isArray(c.matched_skills)) {
          c.matched_skills.forEach(skill =>
            counts.set(skill, (counts.get(skill) || 0) + 1)
          );
        }
      });
    }
  });

  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}, [hrAllResults]);


  const pieColors = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#F472B6'];

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return dashboardData.items;
    
    const term = searchTerm.toLowerCase();
    return dashboardData.items.filter(item => {
      return (
        item.title?.toLowerCase().includes(term) ||
        item.company?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term) ||
        item.skills?.some(skill => skill.toLowerCase().includes(term))
      );
    });
  }, [searchTerm, dashboardData.items]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - left aligned */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {dashboardData.headerGreeting}{currentUser?.name ? `, ${currentUser.name}` : ''}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isHR ? 'Upload and rank fresher resumes. Manage candidates and roles.' : 'Search jobs by skill or upload your resume to see fit and gaps.'}
            </p>
          </div>

          {/* Role-based tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-0">
              {dashboardData.tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                          if (tab.id !== 'tools') {
                            setHrResults([]);
                          }
                    }}
                    className={cn(
                      'flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </motion.div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Search */}
              <Card>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={isHR ? 'Search candidates, jobs, or skills...' : 'Search jobs, companies, or skills...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button className="btn-secondary">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </button>
                </div>
              </Card>

              {/* List */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {dashboardData.listTitle}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {filteredItems.length} jobs
                      </span>
                      </div>
                  <div
        className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 
                  dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 
                  dark:hover:scrollbar-thumb-gray-500"
      >
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 
                      dark:hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                  <span className={cn('px-2 py-1 text-xs font-medium rounded-full', getStatusColor(item.status))}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <span className="flex items-center"><Building2 className="w-4 h-4 mr-1" />{item.company}</span>
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{item.location}</span>
                  <span className="flex items-center"><DollarSign className="w-4 h-4 mr-1" />{item.salary}</span>
                </div>
                <div className="mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Required Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {item.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded-md">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                {item.missingSkills && item.missingSkills.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-red-500 dark:text-red-400 mb-1">Missing Skills:</p>
                              <div className="flex flex-wrap gap-2">
                                {item.missingSkills.map((skill, i) => (
                                  <span key={i} className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded-md">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.missingSkills && item.missingSkills.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-red-500 dark:text-red-400 mb-1">Missing Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.missingSkills.map((skill, i) => (
                        <span key={i} className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
                        <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {item.matchScore}%
                        </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Match Score</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'tools' && !isHR && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              {/* ✅ IMPROVED: Two-Column Upload Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Search Jobs by Skills Card */}
                <Card>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                      <Search className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Search Jobs by Skills
                    </h4>
                  </div>
                  <div className="space-y-3">
                    <textarea 
                      value={studentSkills} 
                      onChange={(e) => setStudentSkills(e.target.value)} 
                      rows={5} 
                      className="w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                      placeholder="e.g., React, JavaScript, SQL, Python, Node.js"
                    />
                      <button 
                        onClick={runStudentAnalysis} 
                        className="w-full flex items-center justify-center gap-2 btn-primary py-3 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
                      >
                        <Target className="w-5 h-5" />
                        <span>Analyze Skills</span>
                      </button>
                  </div>
                </Card>

                {/* Upload Resume Card */}
                <Card>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-900/40 dark:to-purple-700/40 flex items-center justify-center mb-2 shadow-inner">
                      <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400"/>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Upload Your Resume
                    </h4>
                  </div>
                  
                  <label className={cn(
                    "relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                    isAnalyzingResume 
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" 
                      : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                  )}>
                    {isAnalyzingResume ? (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-3"></div>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Analyzing your resume...
                        </span>
                        <span className="text-xs text-gray-500 mt-1">This may take a few seconds</span>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center mb-3">
                          <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                          Click to upload your resume
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          PDF, DOCX, TXT • Max 5MB
                        </span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx,.txt" 
                      onChange={onStudentResume} 
                      className="hidden" 
                      disabled={isAnalyzingResume}
                    />
                  </label>
                  
                  {studentResumeName && !isAnalyzingResume && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900 dark:text-green-300 truncate">
                          {studentResumeName}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400">
                          Resume uploaded successfully
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* ✅ IMPROVED: Resume Analysis Results with Luxurious Design */}
              {resumeAnalysisResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  {/* Candidate Info Banner */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-2xl">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                          <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold mb-1">
                            {resumeAnalysisResult.candidate_name}
                          </h3>
                          <p className="text-blue-100 text-sm">
                            Resume Analysis Complete
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold mb-1">
                          {resumeAnalysisResult.ats_score}
                          <span className="text-2xl">/100</span>
                        </div>
                        <p className="text-sm text-blue-100">ATS Score</p>
                      </div>
                    </div>
                  </div>

                  {/* ✅ FIXED: Three Cards in Same Row - ATS Score, Acquired Skills, Missing Skills */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* ATS Resume Score Card */}
                    <Card>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          ATS Resume Score
                        </h4>
                      </div>
                      
                      <div className="flex flex-col items-center py-4">
                        {/* Circular Progress */}
                        <div className="relative w-32 h-32 mb-4">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth="12"
                            />
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              fill="none"
                              stroke={resumeAnalysisResult.ats_score >= 80 ? '#10b981' : 
                                      resumeAnalysisResult.ats_score >= 60 ? '#3b82f6' : '#f59e0b'}
                              strokeWidth="12"
                              strokeDasharray={`${(resumeAnalysisResult.ats_score / 100) * 352} 352`}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                              {resumeAnalysisResult.ats_score}
                            </span>
                          </div>
                        </div>
                        
                        {/* Best Role */}
                        <div className="text-center w-full">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Best Fit Role</p>
                          <p className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                            {resumeAnalysisResult.best_role.role}
                          </p>
                          <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-3">
                            <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                              {resumeAnalysisResult.best_role.match_percentage}%
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Role Match</p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Acquired Skills Card */}
                    <Card>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Acquired Skills
                        </h4>
                      </div>
                      
                      <div className="h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        {resumeAnalysisResult.best_role.matched_skills.length > 0 ? (
                          <div className="space-y-2">
                            {resumeAnalysisResult.best_role.matched_skills.map((skill, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 hover:shadow-md transition-shadow"
                              >
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                  {skill}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <CheckCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No matching skills found for this role
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {resumeAnalysisResult.best_role.matched_skills.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {resumeAnalysisResult.best_role.matched_skills.length}
                            </span>
                            {' '}skills matched for {resumeAnalysisResult.best_role.role}
                          </p>
                        </div>
                      )}
                    </Card>

                    {/* Missing Skills Card */}
                    <Card>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Skills to Learn
                        </h4>
                      </div>
                      
                      <div className="h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        {resumeAnalysisResult.best_role.missing_skills.length > 0 ? (
                          <div className="space-y-2">
                            {resumeAnalysisResult.best_role.missing_skills.map((skill, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 hover:shadow-md transition-shadow"
                              >
                                <XCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                  {skill}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <Star className="w-12 h-12 text-green-500 mb-2" />
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                              Perfect Match!
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              You have all required skills
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {resumeAnalysisResult.best_role.missing_skills.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {resumeAnalysisResult.best_role.missing_skills.length}
                            </span>
                            {' '}skills to learn for better match
                          </p>
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* ✅ Extracted Skills Summary */}
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <Star className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          All Extracted Skills
                        </h4>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-semibold rounded-full">
                        {resumeAnalysisResult.extracted_skills.length} skills
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {resumeAnalysisResult.extracted_skills.map((skill, i) => (
                        <span 
                          key={i}
                          className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ✅ IMPROVED: Top Matching Jobs - Only shown when analysis is done */}
              {(studentResult || resumeAnalysisResult) && matchedJobs.filter(j => j.calculatedScore > 0).length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Top Matching Jobs
                      </h4>
                    </div>
                    <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm font-semibold rounded-full">
                      {matchedJobs.filter(j => j.calculatedScore > 0).length} jobs found
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 pr-2">
                    {matchedJobs
                      .filter(job => job.calculatedScore > 0)
                      .slice(0, 50)
                      .map((job, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-5 border border-gray-200 dark:border-gray-600 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                        >
                          {/* Job Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h6 className="font-bold text-gray-900 dark:text-white text-base mb-2 line-clamp-2">
                                {job.title}
                              </h6>
                              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                <p className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {job.company}
                                </p>
                                <p className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {job.location}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end ml-3">
                              <span className={cn(
                                'text-2xl font-bold',
                                getScoreColor(job.calculatedScore)
                              )}>
                                {job.calculatedScore}%
                              </span>
                              <span className="text-xs text-gray-500">Match</span>
                            </div>
                          </div>

                          {/* Matching Skills */}
                          {job.matchingSkills && job.matchingSkills.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                You have ({job.matchingSkills.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {job.matchingSkills.slice(0, 4).map((s, j) => (
                                  <span 
                                    key={j} 
                                    className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-md font-medium"
                                  >
                                    {s}
                                  </span>
                                ))}
                                {job.matchingSkills.length > 4 && (
                                  <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-md font-medium">
                                    +{job.matchingSkills.length - 4}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Missing Skills */}
                          {job.missingSkills && job.missingSkills.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Need to learn ({job.missingSkills.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {job.missingSkills.slice(0, 4).map((s, j) => (
                                  <span 
                                    key={j} 
                                    className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs rounded-md font-medium"
                                  >
                                    {s}
                                  </span>
                                ))}
                                {job.missingSkills.length > 4 && (
                                  <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-md font-medium">
                                    +{job.missingSkills.length - 4}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'tools' && isHR && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* HR Tools - ML Resume Matcher */}
              <Card>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">ML Resume Matcher</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Role *</label>
                    <input
                      type="text"
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      placeholder="e.g., Senior Python Developer"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Required Skills (comma separated)</label>
                    <input
                      type="text"
                      value={requiredSkills}
                      onChange={(e) => setRequiredSkills(e.target.value)}
                      placeholder="e.g., python, django, aws"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top N Candidates</label>
                    <input
                      type="number"
                      value={topN}
                      onChange={(e) => setTopN(e.target.value)}
                      min="1"
                      max="20"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Education</label>
                    <select
                      value={minEducation}
                      onChange={(e) => setMinEducation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="0">Any</option>
                      <option value="2">Diploma</option>
                      <option value="3">Bachelor's</option>
                      <option value="4">Master's</option>
                      <option value="5">PhD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Experience (years)</label>
                    <input
                      type="number"
                      value={minExperience}
                      onChange={(e) => setMinExperience(e.target.value)}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Description *</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Describe the job role, requirements, and responsibilities..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-vertical"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Upload Resumes (2–20 files)
                  </h4>
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <Upload className="w-6 h-6 text-gray-500 dark:text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Select multiple files (.pdf, .docx)</span>
                    <input type="file" accept=".pdf,.doc,.docx" multiple onChange={onHrFiles} className="hidden" />
                  </label>
                  {!!hrFiles.length && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                      ✓ Selected: {hrFiles.length} files
                    </p>
                  )}
                  {hrError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{hrError}</p>}

                  <button
                    onClick={async () => {
                      if (hrFiles.length < 3 || hrFiles.length > 20) {
                        setHrError('Please upload between 5 and 20 resumes');
                        return;
                      }
                      if (!jobRole || !jobDescription) {
                        setHrError('Job role and description are required');
                        return;
                      }

                      setIsProcessing(true);
                      setHrError('');
                      try {
                        const token = localStorage.getItem('token');
                        const formData = new FormData();
                        hrFiles.forEach((file) => formData.append('files', file));
                        formData.append('jobRole', jobRole);
                        formData.append('jobDescription', jobDescription);
                        formData.append('requiredSkills', requiredSkills);
                        formData.append('minEducation', minEducation);
                        formData.append('minExperience', minExperience);
                        formData.append('topN', topN);

                        const res = await fetch('http://localhost:3000/api/match-resumes', {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                          body: formData,
                        });

                        if (!res.ok) {
                          const err = await res.json();
                          throw new Error(err.message || 'Failed to process resumes');
                        }

                        const data = await res.json();
                        setHrResults(data.results?.top_candidates || []);
                        setHrAllResults(data.results?.all_candidates || []);

                        const stats = await dashboardAPI.getStats();
                        setDashboardStats(stats);

                        const history = await resumeAPI.getUploadHistory();
                        setUploadHistory(history);

                        const newUploadId = data.uploadId;
                        if (newUploadId) {
                          const candidateRes = await fetch(`http://localhost:3000/api/candidates/${newUploadId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (candidateRes.ok) {
                            const candidateData = await candidateRes.json();
                            setHrAllResults(prev => [...prev, { uploadId: newUploadId, candidates: candidateData.candidates }]);
                          }
                        }

                        setJobRole('');
                        setJobDescription('');
                        setRequiredSkills('');
                        setHrFiles([]);
                        
                      } catch (err) {
                        setHrError(err.message);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    className={cn(
                      "mt-4 w-full py-3 px-6 rounded-lg text-white font-semibold text-base transition-colors flex items-center justify-center gap-2",
                      isProcessing 
                        ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed" 
                        : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 cursor-pointer"
                    )}
                  >
                    {isProcessing ? 'Processing...' : 'Rank Candidates'}
                  </button>
                </div>
              </Card>

              {hrResults.length > 0 && (
                <Card>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-4">
                    Top {hrResults.length} Candidates (ML Results)
                  </h5>
                  <div className="space-y-4">
                    {hrResults.map((candidate, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      >
                        <div className="flex items-start justify-between flex-wrap gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div
                                className="w-8 h-8 flex items-center justify-center rounded-full font-bold text-white"
                                style={{ background: colors.primary }}
                              >
                                #{idx + 1}
                              </div>
                              <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                                <FileText className="w-4 h-4" /> {candidate.filename}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-gray-500">Overall Score</p>
                                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                  {candidate.score}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Semantic Match</p>
                                <p className="text-lg font-bold text-blue-600">{candidate.semantic_score}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Feature Match</p>
                                <p className="text-lg font-bold text-purple-600">{candidate.feature_score}%</p>
                              </div>
                            </div>

                            {candidate.matched_skills?.length > 0 && (
                              <div className="mb-2">
                                <p className="text-xs text-gray-500 mb-1">Matched Skills:</p>
                                <div className="flex flex-wrap gap-2">
                                  {candidate.matched_skills.map((s, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-md"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex gap-4 text-sm mt-2">
                              <div className="flex items-center gap-1">
                                {candidate.education_match ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className="text-gray-700 dark:text-gray-300">Education</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {candidate.experience_match ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className="text-gray-700 dark:text-gray-300">Experience</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'candidates' && isHR && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                Candidates by Job Role
              </h3>

              {uploadHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Uploads Yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Upload resumes using the HR Tools tab to start viewing candidates here.
                  </p>
                </div>
              ) : (
                uploadHistory.map((upload) => {
                  const roleCandidates =
                    hrAllResults.find((r) => r.uploadId === upload.id)?.candidates || [];
                  const isOpen = openDropdowns[upload.id] || false;

                  return (
                    <Card key={upload.id} className="p-0 overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 rounded-xl">
                      {/* Header */}
                      <button
                        onClick={() => toggleDropdown(upload.id)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      >
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {upload.job_role}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Uploaded on {new Date(upload.upload_date).toLocaleDateString()} —{" "}
                            {upload.total_resumes} resumes processed
                          </p>
                        </div>
                          <motion.span
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-gray-500 dark:text-gray-400"
                          >
                            ▼
                          </motion.span>

                      </button>

                      {/* Dropdown Body */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="content"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
                          >
                            <div
                              className="max-h-72 overflow-y-auto px-6 py-4
                                        scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600
                                        scrollbar-track-transparent hover:scrollbar-thumb-gray-400
                                        dark:hover:scrollbar-thumb-gray-500 scroll-smooth"
                            >
                              {roleCandidates.length > 0 ? (
                                roleCandidates.map((c, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3 
                                              hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                          {c.candidate_name || c.filename}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          Rank #{c.rank_position} • Score:{" "}
                                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                                            {parseFloat(c.score).toFixed(2)}%
                                          </span>
                                        </div>
                                        {c.matched_skills?.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {c.matched_skills.slice(0, 5).map((skill, j) => (
                                              <span
                                                key={j}
                                                className="px-2 py-1 bg-green-100 dark:bg-green-900/20 
                                                          text-green-700 dark:text-green-400 text-xs rounded-md"
                                              >
                                                {skill}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                ))
                              ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                  No candidates found for this role yet.
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'history' && !isHR && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Predictions</h3>
              <p className="text-gray-500 dark:text-gray-400">Your complete list of AI job predictions.</p>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}