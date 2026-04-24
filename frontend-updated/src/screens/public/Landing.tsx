import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Fingerprint,
    ShieldCheck,
    Zap,
    BarChart3,
    ArrowRight,
    Users,
    Cpu,
    ChevronDown,
    Globe,
    Lock,
    CalendarCheck,
    FileText,
    History,
    Activity,
    Layers,
    Database,
    MonitorSmartphone,
    Plus,
    Minus,
    MapPin,
    Clock,
    Sparkles,
    ShieldAlert,
    Server,
    HelpCircle,
    CheckCircle2,
    TrendingUp,
    Award,
    RefreshCw,
    Wifi,
    Cloud,
    Eye,
    ThumbsUp,
    Target,
    GraduationCap,
    Building2,
    Radio,
    Trophy,
    HeartHandshake,
    Network,
    Gauge,
    Brain,
    ScanFace,
    FileCheck,
    Settings,
    UserCheck,
    ChartBar,
    Menu,
    X,
    Home,
    Info,
    Mail,
    Phone,
    MapPin as MapPinIcon,
    Linkedin,
    Twitter,
    Facebook
} from 'lucide-react';
import backroundimage from "../../assets/HUIOTedited.png";
import iotLogo from "../../assets/iot.webp";
import { cn } from '../../lib/utils';
import { fetchPublicLandingData, PublicLandingData } from '../../lib/public';

// About Page Component
export function AboutPage() {
  const teamMembers = [
    { name: "Dr. Tekle Berhan", role: "Project Director", department: "IoT Campus Director", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop" },
    { name: "Prof. Almaz Bekele", role: "Technical Lead", department: "Computer Engineering", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop" },
    { name: "Eng. Solomon Desta", role: "System Architect", department: "Software Engineering", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" },
    { name: "Dr. Eden Mekonnen", role: "Security Specialist", department: "Cybersecurity", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop" }
  ];

  const milestones = [
    { year: "2023", title: "Project Initiation", desc: "Research and planning phase begins" },
    { year: "2024", title: "Development Phase", desc: "Core biometric engine development" },
    { year: "2025", title: "Pilot Testing", desc: "Successful pilot at Main Gate" },
    { year: "2026", title: "Full Deployment", desc: "Campus-wide implementation" }
  ];

  return (
    <div className="min-h-screen bg-surface-bg pt-24 text-surface-text">
      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-bg rounded-full mb-6">
              <GraduationCap className="w-4 h-4 text-surface-text" />
              <span className="text-xs font-bold text-surface-text uppercase tracking-wider">Our Story</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-surface-text mb-6">
              About <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-200">BBEAMS</span>
            </h1>
            <p className="text-xl text-surface-text leading-relaxed">
              Revolutionizing attendance management at Hawassa University IoT Campus through cutting-edge biometric technology
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-8 text-white"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
            <p className="text-slate-200 leading-relaxed">
              To provide a secure, efficient, and reliable biometric attendance system that enhances institutional accountability, reduces administrative overhead, and empowers staff through transparent digital workflows.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-slate-100 to-white rounded-2xl p-8 border border-surface-border"
          >
            <div className="w-16 h-16 bg-surface-bg rounded-2xl flex items-center justify-center mb-6">
              <Eye className="w-8 h-8 text-surface-text" />
            </div>
            <h3 className="text-2xl font-bold text-surface-text mb-4">Our Vision</h3>
            <p className="text-surface-text leading-relaxed">
              To become Ethiopia's leading institutional biometric identity management platform, setting the standard for accuracy, security, and user experience in higher education.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-surface-bg px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-text mb-4">Our Core Values</h2>
            <p className="text-surface-text max-w-2xl mx-auto">The principles that guide everything we do</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: "Security First", desc: "Protecting biometric data with military-grade encryption" },
              { icon: Zap, title: "Innovation", desc: "Continuously improving with cutting-edge technology" },
              { icon: HeartHandshake, title: "Integrity", desc: "Transparent and accountable operations" }
            ].map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-surface-card rounded-2xl p-8 text-center border border-surface-border hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 bg-surface-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-surface-text" />
                </div>
                <h3 className="text-xl font-bold text-surface-text mb-2">{value.title}</h3>
                <p className="text-surface-text">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-20 bg-surface-bg px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-text mb-4">Our Journey</h2>
            <p className="text-surface-text">Key milestones in the BBEAMS project</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {milestones.map((milestone, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">
                  {milestone.year}
                </div>
                <h3 className="text-lg font-bold text-surface-text mb-2">{milestone.title}</h3>
                <p className="text-sm text-surface-text">{milestone.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-surface-bg px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-text mb-4">Leadership Team</h2>
            <p className="text-surface-text max-w-2xl mx-auto">Meet the experts behind the BBEAMS project</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-surface-card rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all"
              >
                <img src={member.image} alt={member.name} className="w-full h-48 object-cover opacity-90 hover:opacity-100 transition-opacity" />
                <div className="p-6 text-center">
                  <h3 className="text-lg font-bold text-surface-text mb-1">{member.name}</h3>
                  <p className="text-sm text-indigo-500 font-medium mb-1">{member.role}</p>
                  <p className="text-xs text-surface-muted">{member.department}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-slate-800 to-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <p className="text-4xl font-bold">10K+</p>
              <p className="text-sm text-slate-300 mt-2">Registered Users</p>
            </div>
            <div>
              <p className="text-4xl font-bold">99.92%</p>
              <p className="text-sm text-slate-300 mt-2">Accuracy Rate</p>
            </div>
            <div>
              <p className="text-4xl font-bold">15+</p>
              <p className="text-sm text-slate-300 mt-2">Terminals</p>
            </div>
            <div>
              <p className="text-4xl font-bold">24/7</p>
              <p className="text-sm text-slate-300 mt-2">Support</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Main Landing Page Component
export default function Landing() {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeUserType, setActiveUserType] = useState<'employee' | 'hr' | 'admin'>('employee');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dynamicData, setDynamicData] = useState<PublicLandingData | null>(null);

  useEffect(() => {
    fetchPublicLandingData().then(data => {
      if (data) setDynamicData(data);
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // System capacity data
  const systemCapacity = [
    { label: "Active Users", value: dynamicData?.systemCapacity[0]?.value || "10,000+", icon: Users, description: "Scalable user management" },
    { label: "Check-in Speed", value: dynamicData?.systemCapacity[1]?.value || "<1.2s", icon: Zap, description: "Fast and fluid recognition" },
    { label: "Reliability", value: dynamicData?.systemCapacity[2]?.value || "99.9%", icon: Target, description: "High accuracy verification" },
    { label: "System Uptime", value: "99.9%", icon: Gauge, description: "Always available" },
    { label: "Active Kiosks", value: `${dynamicData?.terminals?.length || 15}+`, icon: MonitorSmartphone, description: "Campus-wide coverage" },
    { label: "Data Sync", value: "100%", icon: FileCheck, description: "Real-time updates" }
  ];


  const baseTerminals = [
    { name: "IoT Main Gate", status: "Active", icon: MapPin, traffic: "Very High", lastSync: "Just now", image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&h=300&fit=crop" },
    { name: "IoT Complex", status: "Active", icon: Building2, traffic: "High", lastSync: "Just now", image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop" },
    { name: "Computer Engineering", status: "Active", icon: Cpu, traffic: "High", lastSync: "1 min ago", image: "https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=400&h=300&fit=crop" },
    { name: "Electrical Engineering", status: "Active", icon: Zap, traffic: "Medium", lastSync: "2 mins ago", image: "https://images.unsplash.com/photo-1581092335871-5c3e2a4c7e9d?w=400&h=300&fit=crop" },
    { name: "Mechanical Workshop", status: "Active", icon: Settings, traffic: "Medium", lastSync: "3 mins ago", image: "https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=400&h=300&fit=crop" },
    { name: "IoT Library", status: "Active", icon: MonitorSmartphone, traffic: "Very High", lastSync: "Just now", image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400&h=300&fit=crop" }
  ];

  const terminalLocations = dynamicData && dynamicData.terminals.length > 0
    ? dynamicData.terminals.map((t, i) => ({
        ...t,
        icon: baseTerminals[i % baseTerminals.length].icon,
        image: baseTerminals[i % baseTerminals.length].image,
      }))
    : baseTerminals;

  const userGuideContent = {
    employee: {
      title: "For Employees",
      steps: [
        "Identify: Stand in front of any campus biometric kiosk",
        "Verify: Align your face within the scanning guide - auto-capture processes your identity",
        "Confirm: View your 'Success' status and marked time",
        "Access: Return to Staff Portal anytime to check history or request leave"
      ],
      icon: UserCheck,
      image: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=600&h=400&fit=crop"
    },
    hr: {
      title: "For HR Officers",
      steps: [
        "Dashboard: Monitor live attendance logs and system health in real-time",
        "Schedules: Create and assign shifts to specific departments or individuals",
        "Audit: Review pending leave requests and generate monthly performance reports",
        "Compliance: Export PDF/CSV reports for payroll integration"
      ],
      icon: ChartBar,
      image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&h=400&fit=crop"
    },
    admin: {
      title: "For Administrators",
      steps: [
        "Enroll: Conduct high-precision 3-step biometric enrollment for new staff",
        "Configure: Set institutional policies like grace periods and login attempts",
        "Manage: Supervise all connected hardware devices and system-wide audit logs",
        "Security: Review Dual-Admin access and system availability metrics"
      ],
      icon: Settings,
      image: "https://images.unsplash.com/photo-1551434678-e076c2235b10?w=600&h=400&fit=crop"
    }
  };

  const coreFunctionality = [
    { icon: ScanFace, title: "Facial Recognition", desc: "Fast, contactless identification for everyday use.", color: "blue" },
    { icon: Eye, title: "Anti-Spoofing", desc: "Ensures actual presence and prevents photo or screen spoofing.", color: "emerald" },
    { icon: Clock, title: "Smart Scheduling", desc: "Automatically tracks shifts, late arrivals, and early exits.", color: "purple" },
    { icon: FileText, title: "Digital Workflow", desc: "Fully paperless leave applications, review cycles, and approvals.", color: "orange" },
    { icon: BarChart3, title: "Easy Reporting", desc: "Simple and accessible reports for HR and management.", color: "cyan" },
    { icon: ShieldAlert, title: "Administrative Control", desc: "Secure dashboard tools for special attendance cases.", color: "pink" }
  ];

  const faqs = [
    {
      q: "How does the system protect my privacy?",
      a: "Our system converts facial scans into secure numerical codes. Actual images are never stored, which means your biometric data cannot be reverse-engineered or misused.",
      icon: ShieldAlert
    },
    {
      q: "What happens if the network goes down?",
      a: "The attendance terminals can operate offline. They securely store your check-ins locally and automatically sync with the main server once connectivity is restored.",
      icon: RefreshCw
    },
    {
      q: "Can the system be tricked by a photo?",
      a: "No. The system uses advanced anti-spoofing techniques to distinguish between a live person and a photograph or digital screen.",
      icon: Eye
    },
    {
      q: "How are late arrivals handled?",
      a: "The system references your department's specific schedule and grace periods, automatically categorizing your check-in time as 'On-Time', 'Late', or 'Early Exit'.",
      icon: Clock
    }
  ];

  const stats = [
    { label: "Max Capacity", value: dynamicData?.stats[0]?.value || "10K+", icon: Users },
    { label: "Verification Speed", value: dynamicData?.stats[1]?.value || "<1.2s", icon: Zap },
    { label: "Accuracy", value: dynamicData?.stats[2]?.value || "99.92%", icon: Target },
    { label: "API Latency", value: "24ms", icon: Gauge }
  ];

  return (
    <div className="min-h-screen bg-surface-bg font-sans text-surface-text selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4",
        scrolled ? "bg-surface-card/90 backdrop-blur-md shadow-lg border-b border-surface-border" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className={cn("font-black text-xl tracking-tight", scrolled ? "text-surface-text" : "text-white")}>
                BBEAMS
              </span>
              <p className={cn("text-[10px] font-bold tracking-wide", scrolled ? "text-surface-muted" : "text-slate-300")}>HU-IoT Campus</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#capacity" className={cn("text-sm font-medium transition-colors", scrolled ? "text-surface-muted hover:text-surface-text" : "text-slate-300 hover:text-white")}>Highlights</a>
            <a href="#functionality" className={cn("text-sm font-medium transition-colors", scrolled ? "text-surface-muted hover:text-surface-text" : "text-slate-300 hover:text-white")}>Features</a>
            <a href="#guide" className={cn("text-sm font-medium transition-colors", scrolled ? "text-surface-muted hover:text-surface-text" : "text-slate-300 hover:text-white")}>Guide</a>
            <button
              onClick={() => navigate('/about')}
              className={cn("text-sm font-medium transition-colors", scrolled ? "text-surface-muted hover:text-surface-text" : "text-slate-300 hover:text-white")}
            >
              About
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="hidden md:block px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-900/20"
            >
              Staff Login
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-2xl bg-surface-card border border-slate-700 text-white shadow-md"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 py-4 bg-surface-card rounded-2xl shadow-xl border border-slate-700"
            >
              <div className="flex flex-col gap-3 px-4">
                <a href="#capacity" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-300 hover:text-white">Highlights</a>
                <a href="#functionality" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-300 hover:text-white">Features</a>
                <a href="#guide" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-300 hover:text-white">Guide</a>
                <button onClick={() => { navigate('/about'); setMobileMenuOpen(false); }} className="py-2 text-left text-slate-300 hover:text-white">About</button>
                <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-center shadow-md">Staff Login</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section with Enhanced Images */}
      <section className="relative min-h-screen flex items-center px-6 overflow-hidden pt-20">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-surface-bg to-surface-card opacity-50">
          <div className="absolute top-[20%] right-[-10%] w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >


            <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-surface-text leading-[1.1]">
              The Future of
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-200">
                Campus Attendance
              </span>
            </h1>

            <p className="text-lg text-surface-text max-w-lg leading-relaxed">
              A modern and easy-to-use biometric attendance system for Hawassa University staff. Fast, simple, and secure.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => navigate('/terminal')}
                className="group px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 hover:shadow-indigo-500/20 hover:shadow-2xl hover:scale-105 transition-all shadow-lg"
              >
                Access Terminal
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-white text-surface-text border-2 border-surface-border rounded-2xl font-bold hover:bg-surface-bg hover:border-surface-border transition-all"
              >
                Staff Portal
              </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-surface-border">
              {stats.map((stat, i) => (
                <div key={i} className="space-y-1">
                  <stat.icon className="w-5 h-5 text-surface-text mb-2" />
                  <p className="text-2xl font-bold text-surface-text">{stat.value}</p>
                  <p className="text-xs font-medium text-surface-text uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block overflow-hidden h-[600px] rounded-[2rem] shadow-2xl border border-surface-border"
          >
            <img
              src={backroundimage}
              alt="HU-IoT Campus"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-slate-400" />
        </div>
      </section>

      {/* System Capacity Section */}
      <section id="capacity" className="py-24 bg-surface-bg px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-bg rounded-full mb-6">
              <Gauge className="w-4 h-4 text-surface-text" />
              <span className="text-xs font-bold text-surface-text uppercase tracking-wider">System Highlights</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-surface-text mb-6">
              Built for <span className="text-surface-text">Scale and Reliability</span>
            </h2>
            <p className="text-lg text-surface-text">
              Designed to seamlessly manage attendance for thousands of users with fast, reliable, and secure data processing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemCapacity.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 bg-gradient-to-br from-surface-bg to-surface-card rounded-2xl border border-surface-border hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-surface-bg flex items-center justify-center mb-6 transition-all group-hover:scale-110 group-hover:bg-surface-card">
                  <item.icon className="w-7 h-7 text-surface-text group-hover:text-white transition-colors" />
                </div>
                <p className="text-3xl font-bold text-surface-text mb-2">{item.value}</p>
                <p className="text-sm font-semibold text-surface-text mb-2">{item.label}</p>
                <p className="text-xs text-surface-text">{item.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Performance Metrics Bar */}
          <div className="mt-12 bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-2xl p-8 dark:from-slate-900 dark:to-slate-950">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center text-white">
                <p className="text-2xl font-bold">Sub-Second</p>
                <p className="text-sm text-slate-300">Average Recognition Speed</p>
              </div>
              <div className="text-center text-white">
                <p className="text-2xl font-bold">100%</p>
                <p className="text-sm text-slate-300">Automated Payroll Syncing</p>
              </div>
              <div className="text-center text-white">
                <p className="text-2xl font-bold">24/7</p>
                <p className="text-sm text-slate-300">High-Concurrency Handling</p>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Core Functionality */}
      <section id="functionality" className="py-24 bg-surface-bg px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-bg rounded-full mb-6">
              <Layers className="w-4 h-4 text-surface-text" />
              <span className="text-xs font-bold text-surface-text uppercase tracking-wider">Core Functionality</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-surface-text mb-6">
              Comprehensive <span className="text-surface-text">Biometric Intelligence</span>
            </h2>
            <p className="text-lg text-surface-text">
              Enterprise-grade features designed for institutional excellence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFunctionality.map((func, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 bg-gradient-to-br from-surface-bg to-surface-card rounded-2xl border border-surface-border hover:shadow-md transition-all"
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center mb-3",
                  func.color === "blue" && "bg-indigo-100 text-indigo-600",
                  func.color === "emerald" && "bg-emerald-100 text-emerald-600",
                  func.color === "purple" && "bg-purple-100 text-purple-600",
                  func.color === "orange" && "bg-amber-100 text-amber-600",
                  func.color === "cyan" && "bg-cyan-100 text-cyan-600",
                  func.color === "pink" && "bg-pink-100 text-pink-600"
                )}>
                  <func.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-surface-text mb-1">{func.title}</h3>
                <p className="text-xs text-surface-text leading-relaxed">{func.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* Terminal Locations with Images */}
      <section id="locations" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-surface-text uppercase tracking-wider mb-4">Campus Infrastructure</p>
            <h2 className="text-4xl md:text-5xl font-bold text-surface-text mb-6">
              Distributed Terminal Network
            </h2>
            <p className="text-lg text-surface-text max-w-2xl mx-auto">
              Real-time synchronization across all campus locations with offline-first caching
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {terminalLocations.map((loc, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white rounded-2xl overflow-hidden border border-surface-border hover:shadow-xl transition-all"
              >
                <div className="relative h-48 overflow-hidden">
                  <img src={loc.image} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    {loc.status}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-surface-bg flex items-center justify-center">
                      <loc.icon className="w-5 h-5 text-surface-text" />
                    </div>
                    <h3 className="text-lg font-bold text-surface-text">{loc.name}</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-surface-text">Traffic:</span>
                      <span className={cn(
                        "font-medium",
                        loc.traffic === "Very High" ? "text-rose-600" :
                        loc.traffic === "High" ? "text-amber-600" : "text-amber-600"
                      )}>{loc.traffic}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-text">Last Sync:</span>
                      <span className="font-medium text-surface-text">{loc.lastSync}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* User Guide Section with Images */}
      <section id="guide" className="py-24 bg-surface-bg px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-surface-text uppercase tracking-wider mb-4">User Guide</p>
            <h2 className="text-4xl md:text-5xl font-bold text-surface-text mb-6">
              How to Use the System
            </h2>
            <p className="text-lg text-surface-text max-w-2xl mx-auto">
              Role-based workflows for Employees, HR Officers, and Administrators
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex justify-center gap-4 mb-12 flex-wrap">
            {(['employee', 'hr', 'admin'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActiveUserType(type)}
                className={cn(
                  "px-6 py-3 rounded-2xl font-bold transition-all capitalize",
                  activeUserType === type
                    ? "bg-surface-card text-white shadow-lg"
                    : "bg-white text-surface-text hover:bg-surface-bg border border-surface-border"
                )}
              >
                {userGuideContent[type].title}
              </button>
            ))}
          </div>

          {/* Role Content */}
          <motion.div
            key={activeUserType}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl overflow-hidden shadow-xl border border-surface-border"
          >
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="p-8 md:p-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-surface-bg rounded-2xl flex items-center justify-center">
                    {React.createElement(userGuideContent[activeUserType].icon, { className: "w-8 h-8 text-surface-text" })}
                  </div>
                  <h3 className="text-2xl font-bold text-surface-text">{userGuideContent[activeUserType].title}</h3>
                </div>
                <div className="space-y-4">
                  {userGuideContent[activeUserType].steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-surface-bg rounded-2xl">
                      <div className="w-8 h-8 bg-surface-card text-white rounded-2xl flex items-center justify-center font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-surface-text leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative h-full min-h-[300px] lg:min-h-full">
                <img
                  src={userGuideContent[activeUserType].image}
                  alt={userGuideContent[activeUserType].title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-surface-bg px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-surface-text uppercase tracking-wider mb-4">Technical Support</p>
            <h2 className="text-4xl md:text-5xl font-bold text-surface-text mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-surface-text">
              Everything you need to know about the biometric attendance system
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="border border-surface-border rounded-2xl overflow-hidden hover:border-surface-border transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-surface-bg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-surface-bg rounded-2xl flex items-center justify-center flex-shrink-0">
                      <faq.icon className="w-5 h-5 text-surface-text" />
                    </div>
                    <span className="font-bold text-surface-text text-lg">{faq.q}</span>
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                    activeFaq === i ? "bg-surface-card text-white" : "bg-surface-bg text-slate-400"
                  )}>
                    {activeFaq === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-8 pb-6"
                    >
                      <div className="pt-4 border-t border-surface-border">
                        <p className="text-surface-text leading-relaxed">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-surface-card overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-surface-text">
            Ready for a Modern Attendance System?
          </h2>
          <p className="text-xl text-surface-muted mb-8 font-medium">
            Access your dashboard and manage your schedules today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/terminal')}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 hover:shadow-indigo-500/20 shadow-2xl transition-all hover:scale-105"
            >
              Access Biometric Terminal
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white/10 text-white rounded-2xl font-bold border border-white/20 hover:bg-white/20 backdrop-blur-md transition-all hover:scale-105"
            >
              Staff Portal Login
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-surface-card px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-10 h-10 bg-surface-card rounded-2xl flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl text-white">BBEAMS</span>
                  <p className="text-xs text-slate-400">Hawassa University IoT Campus</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Biometric Based Employee Attendance Management System for Hawassa University IoT Campus.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#capacity" className="hover:text-white transition-colors">Highlights</a></li>
                <li><a href="#functionality" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#guide" className="hover:text-white transition-colors">User Guide</a></li>
                <li><button onClick={() => navigate('/about')} className="hover:text-white transition-colors">About Us</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" /> IoT Campus, Hawassa</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +251-46-220-xxxx</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> bbeams@hu.edu.et</li>
                <li>24/7 Technical Support</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Values</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Secure Validation</li>
                <li className="flex items-center gap-2"><Lock className="w-4 h-4" /> Strong Privacy</li>
                <li className="flex items-center gap-2"><Server className="w-4 h-4" /> Reliable Uptime</li>
              </ul>
              <div className="flex gap-4 mt-6">
                <a href="#" className="text-slate-400 hover:text-white transition-colors"><Facebook className="w-5 h-5" /></a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm text-surface-text">
            <p>Â© 2026 Hawassa University - Institute of Technology Campus. All rights reserved.</p>
            <p className="mt-2">Biometric Based Employee Attendance Management System (BBEAMS)</p>
            <p className="mt-1 text-xs">Transforming Campus Attendance</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
