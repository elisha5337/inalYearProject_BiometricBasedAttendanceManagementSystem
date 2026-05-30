import React from "react";
import { motion } from "motion/react";
import {
  GraduationCap,
  Target,
  Eye,
  ShieldCheck,
  Zap,
  HeartHandshake,
  Fingerprint as FingerIcon,
  ClipboardCheck,
  Search,
} from "lucide-react";

// Bypass missing asset build errors on Render
const fingerImg = "";
const attendanceImg = "";
const auditingImg = "";
const manualImg = "";

export default function AboutPage() {
  const systemCapabilities = [
    {
      title: "Fingerprint Biometrics",
      description:
        "Utilizes advanced biometric fingerprint scanning to ensure secure, unique identity verification for every staff encounter, preventing unauthorized access and identity fraud.",
      image: fingerImg,
      icon: FingerIcon,
    },
    {
      title: "Automated Attendance",
      description:
        "Seamlessly logs presence through high-speed biometric recognition, eliminating manual input errors and streamlining the daily check-in process across the entire campus.",
      image: attendanceImg,
      icon: ClipboardCheck,
    },
    {
      title: "System Auditing",
      description:
        "Maintains an immutable digital audit trail of all attendance logs and system events, providing 100% transparency and data integrity for institutional oversight.",
      image: auditingImg,
      icon: Search,
    },
  ];

  const teamMembers = [
    {
      name: "Dr. Tekle Berhan",
      role: "Project Director",
      department: "IoT Campus Director",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    },
    {
      name: "Prof. Almaz Bekele",
      role: "Technical Lead",
      department: "Computer Engineering",
      image:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop",
    },
    {
      name: "Eng. Solomon Desta",
      role: "System Architect",
      department: "Software Engineering",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    },
    {
      name: "Dr. Eden Mekonnen",
      role: "Security Specialist",
      department: "Cybersecurity",
      image:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop",
    },
  ];

  const milestones = [
    {
      year: "2023",
      title: "Institutional Audit",
      desc: "Analysis of manual attendance bottlenecks at Hawassa University campus nodes.",
    },
    {
      year: "2024",
      title: "Technical Blueprint",
      desc: "Engineering the core biometric engine tailored for large-scale campus staff dynamics.",
    },
    {
      year: "2025",
      title: "Identity Validation",
      desc: "Phase 1 successful pilot deployment at the Hawassa University Main Gate.",
    },
    {
      year: "2026",
      title: "Digital Sovereignty",
      desc: "Full migration from legacy paper logs to campus-wide biometric accountability.",
    },
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
              <span className="text-xs font-bold text-surface-text uppercase tracking-wider">
                Our Story
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-surface-text mb-6">
              About{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-indigo-200">
                BBEAMS
              </span>
            </h1>
            <p className="text-xl text-surface-text leading-relaxed">
              Revolutionizing attendance management at Hawassa University IoT
              Campus through cutting-edge biometric technology
            </p>
          </motion.div>
        </div>
      </section>

      {/* The Evolution Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="relative rounded-[40px] overflow-hidden border-2 border-surface-border shadow-2xl bg-surface-accent h-[450px]"
            >
              <img
                src={manualImg}
                alt="Legacy Manual Attendance"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute top-6 left-6 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-surface-border">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-600">
                  Legacy System
                </span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-4xl md:text-5xl font-black text-surface-text tracking-tighter uppercase italic leading-none">
                The <span className="text-indigo-600">Evolution</span> of
                Attendance
              </h2>
              <div className="h-1.5 w-20 bg-indigo-600 rounded-full" />
              <p className="text-surface-muted text-lg font-medium leading-relaxed">
                Before the introduction of BBEAMS, Hawassa University relied
                primarily on paper-based manual attendance logs. This legacy
                system was prone to human error, buddy-punching, and significant
                administrative delays in reporting and payroll processing.
              </p>
              <p className="text-surface-muted text-lg font-medium leading-relaxed">
                Our project represents a leap forward—replacing these fragile
                paper trails with an immutable, high-speed biometric ecosystem
                that ensures 100% accuracy and real-time oversight.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      {/* System Capabilities Section */}
      <section className="py-24 bg-surface-accent/30 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-surface-text mb-6">
              SYSTEM <span className="text-indigo-600 italic">CORE</span>
            </h2>
            <p className="text-surface-muted text-lg font-semibold italic">
              The technological foundation of the BBEAMS ecosystem.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {systemCapabilities.map((cap, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="group bg-surface-card rounded-[40px] overflow-hidden border border-surface-border shadow-2xl hover:border-indigo-500/30 transition-all duration-500"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={cap.image}
                    alt={cap.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-indigo-900/10 group-hover:bg-transparent transition-all" />
                  <div className="absolute bottom-6 left-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl">
                    <cap.icon className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                <div className="p-10">
                  <h3 className="text-2xl font-black text-surface-text mb-4 uppercase tracking-tighter italic">
                    {cap.title}
                  </h3>
                  <p className="text-surface-muted leading-relaxed font-medium text-sm">
                    {cap.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-surface-bg px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-surface-text mb-4">
              Leadership Team
            </h2>
            <p className="text-surface-text max-w-2xl mx-auto">
              Meet the experts behind the BBEAMS project
            </p>
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
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-48 object-cover opacity-90 hover:opacity-100 transition-opacity"
                />
                <div className="p-6 text-center">
                  <h3 className="text-lg font-bold text-surface-text mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm text-indigo-500 font-medium mb-1">
                    {member.role}
                  </p>
                  <p className="text-xs text-surface-muted">
                    {member.department}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* Mission & Vision - High Impact Dual Section */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Mission Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative p-12 rounded-[50px] bg-slate-900 border-2 border-indigo-500/20 text-white shadow-2xl overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/20">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 mb-4">
                  Strategic Purpose
                </h3>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-8 group-hover:text-indigo-400 transition-colors">
                  Our Mission
                </h2>
                <p className="text-slate-300 text-lg font-medium leading-relaxed">
                  To provide a{" "}
                  <span className="text-white font-bold">
                    secure, efficient, and reliable
                  </span>{" "}
                  biometric attendance system that enhances institutional
                  accountability, reduces administrative overhead, and empowers
                  staff through transparent digital workflows.
                </p>
              </div>
            </motion.div>

            {/* Vision Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative p-12 rounded-[50px] bg-surface-card border-2 border-surface-border text-surface-text shadow-2xl overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <div className="w-16 h-16 bg-surface-bg border border-surface-border rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                  <Eye className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-surface-muted mb-4">
                  Future Trajectory
                </h3>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-8 group-hover:text-indigo-600 transition-colors">
                  Our Vision
                </h2>
                <p className="text-surface-muted text-lg font-medium leading-relaxed">
                  To become{" "}
                  <span className="text-surface-text font-bold">
                    Ethiopia's leading institutional
                  </span>{" "}
                  biometric identity management platform, setting the standard
                  for accuracy, security, and user experience in higher
                  education.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      {/* Milestones - Professional Chronological Timeline */}
      <section className="py-32 bg-slate-50 dark:bg-slate-900/40 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-2xl">
              <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.5em] mb-4">
                Project Evolution
              </h3>
              <h2 className="text-5xl font-black tracking-tighter text-surface-text italic uppercase leading-none">
                Our Journey
              </h2>
            </div>
            <p className="text-surface-muted font-bold text-sm uppercase tracking-widest border-l-4 border-indigo-600 pl-6">
              Key milestones in the <br /> BBEAMS development cycle
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-indigo-500/10 -translate-y-1/2" />

            {milestones.map((milestone, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative bg-surface-card p-10 rounded-[30px] border border-surface-border shadow-xl hover:border-indigo-500/40 transition-all group z-10"
              >
                <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-8 text-white font-black text-xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                  {milestone.year}
                </div>
                <h3 className="text-xl font-black text-surface-text italic uppercase tracking-tighter mb-4">
                  {milestone.title}
                </h3>
                <p className="text-surface-muted text-sm font-medium leading-relaxed">
                  {milestone.desc}
                </p>
                <div className="absolute top-1/2 right-0 w-8 h-0.5 bg-indigo-500/20 -translate-y-1/2 hidden md:group-last:hidden" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* Core Values - High Fidelity Cards */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.5em] mb-4">
              Ethics & Engineering
            </h3>
            <h2 className="text-5xl font-black tracking-tighter text-surface-text italic uppercase leading-none mb-6">
              Our Core Values
            </h2>
            <p className="text-surface-muted text-lg font-medium max-w-2xl mx-auto italic">
              The principles that guide everything we do as an institution.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: ShieldCheck,
                title: "Institutional Security",
                desc: "Securing student and staff biometric identities with industrial-grade encryption vaulting.",
                color: "indigo",
              },
              {
                icon: Zap,
                title: "Campus Innovation",
                desc: "Establishing Hawassa University as a leader in IoT-driven administrative excellence.",
                color: "emerald",
              },
              {
                icon: HeartHandshake,
                title: "Operational Trust",
                desc: "Replacing manual uncertainties with transparent, real-time verified attendance logs.",
                color: "rose",
              },
            ].map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="relative bg-surface-card rounded-[40px] p-12 text-center border-2 border-surface-border shadow-2xl hover:border-indigo-500/30 transition-all group overflow-hidden"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-600/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                  <div className="w-20 h-20 bg-surface-bg border border-surface-border rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500">
                    <value.icon className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-black text-surface-text italic uppercase tracking-tighter mb-4">
                    {value.title}
                  </h3>
                  <p className="text-surface-muted font-medium leading-relaxed text-sm">
                    {value.desc}
                  </p>
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
