import { useState } from "react";
import { Link } from "wouter";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAppContext } from "@/context/AppContext";
import { Target, CheckCircle, XCircle, AlertCircle, Briefcase, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  analyzeSkillGap,
  parseJobDescription,
  generateRoadmap,
  generateProjectRecommendations,
  generateResumeFeedback,
} from "@/services/aiService";

const ROLES = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "AI Engineer",
  "Data Scientist",
  "DevOps Engineer",
  "Cloud Engineer",
  "Cyber Security Analyst"
];

export default function SkillGap() {
  const {
    resume,
    jobDescription,
    skillGap,
    targetRole,
    setTargetRole,
    setJobDescription,
    setSkillGap,
    setRoadmap,
    setProjects,
    setFeedback,
  } = useAppContext();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jdText, setJdText] = useState("");
  const { toast } = useToast();

  // Runs the full pipeline: parse JD -> skill gap -> roadmap -> projects -> feedback.
  // This is the one place that actually generates everything the other pages display.
  const runFullAnalysis = async (jdTextInput: string, role: string) => {
    if (!resume) {
      toast({
        title: "Resume required",
        description: "Analyze your resume first on the Resume Analyzer page.",
        variant: "destructive",
      });
      return;
    }
    if (jdTextInput.length > 6000) {
      toast({
        title: "Job description too long",
        description: "Please paste just the job posting text (under 6000 characters). Check for accidental duplicate content in the box.",
        variant: "destructive",
      });
      return;
    }
    setIsAnalyzing(true);
    toast({ title: "Analyzing...", description: "Running skill gap, roadmap, projects and feedback." });

    try {
      const jd = await parseJobDescription(jdTextInput);
      const jdWithRole = { ...jd, title: role };
      setJobDescription(jdWithRole);

      const gap = await analyzeSkillGap(resume, jdWithRole);
      setSkillGap(gap);

      const missing = gap.missingSkills.map(m => m.skill);
      const [roadmap, projects, feedback] = await Promise.all([
        generateRoadmap(missing, resume, gap.matchPercentage),
        generateProjectRecommendations(missing),
        generateResumeFeedback(resume),
      ]);
      setRoadmap(roadmap);
      setProjects(projects);
      setFeedback(feedback);

      toast({ title: "Done", description: "Skill gap, roadmap, projects and feedback are ready." });
    } catch (e) {
      toast({ title: "Error", description: "Analysis failed. Check console for details.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRoleChange = async (role: string) => {
    setTargetRole(role);
    // Changing the role does NOT fetch a new job description — it would just
    // re-run the analysis against whatever JD text is still sitting in the
    // textarea (or worse, the old title itself) and slap the new role's name
    // on the old results. That's how you get a misleading "100% match" for a
    // role you never actually pasted a JD for. Instead, drop the stale
    // analysis and ask for a fresh, role-specific job description.
    if (jobDescription && role !== jobDescription.title) {
      setSkillGap(null);
      setJobDescription(null);
      setRoadmap(null);
      setProjects(null);
      setFeedback(null);
      toast({
        title: "New role selected",
        description: `Paste a job description for "${role}" to get an accurate match.`,
      });
    }
  };

  const radarData = skillGap ? [
    ...skillGap.matchedSkills.slice(0, 4).map(skill => ({ subject: skill, A: 85, fullMark: 100 })),
    ...skillGap.missingSkills.slice(0, 4).map(m => ({
      subject: m.skill,
      A: m.priority === 'High' ? 15 : m.priority === 'Medium' ? 35 : 55,
      fullMark: 100,
    })),
  ] : [];

  return (
    <DashboardShell>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Skill Gap Analysis</h1>
          <p className="text-muted-foreground">Compare your resume against industry requirements.</p>
        </div>
        
        <div className="w-full md:w-64">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Role</label>
          <Select value={targetRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="bg-black/20 border-white/10 text-white h-11">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              {ROLES.map(role => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!skillGap && !isAnalyzing && (
        <div className="glass-card p-8 rounded-2xl mb-6">
          {!resume ? (
            <div className="text-center flex flex-col items-center">
              <Target className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Analyze your resume first</h2>
              <p className="text-muted-foreground mb-6">
                We need your resume data before we can compute a skill gap.
              </p>
              <Link href="/dashboard/resume" className="bg-white text-black px-5 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                Go to Resume Analyzer
              </Link>
            </div>
          ) : (
            <>
              <h3 className="text-white font-medium mb-3">Paste a job description</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Paste the job posting text you're targeting. We'll compare it against your resume and generate your skill gap, roadmap, project ideas and resume feedback in one go.
              </p>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste job description text here..."
                className="w-full min-h-[140px] rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <div className="flex justify-between items-center mt-1.5">
                <span className={`text-xs ${jdText.length > 6000 ? "text-red-400" : "text-muted-foreground"}`}>
                  {jdText.length.toLocaleString()} / 6,000 characters
                </span>
                {jdText.length > 0 && (
                  <button onClick={() => setJdText("")} className="text-xs text-muted-foreground hover:text-white">
                    Clear
                  </button>
                )}
              </div>
              <button
                onClick={() => runFullAnalysis(jdText, targetRole)}
                disabled={!jdText.trim() || jdText.length > 6000}
                className="mt-3 w-full bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Analyze
              </button>
            </>
          )}
        </div>
      )}

      {isAnalyzing ? (
        <div className="glass-card p-12 rounded-2xl text-center flex flex-col items-center animate-pulse">
          <Zap className="w-16 h-16 text-primary mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2">AI is processing...</h2>
          <p className="text-muted-foreground">Analyzing skill gap, roadmap, projects and feedback.</p>
        </div>
      ) : skillGap ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl flex items-center gap-6 col-span-1 md:col-span-2">
              <div className="relative w-32 h-32 flex shrink-0 items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="60" className="stroke-white/10 fill-none stroke-[8]" />
                  <circle 
                    cx="64" cy="64" r="60" 
                    className="stroke-primary fill-none stroke-[8] drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-1000" 
                    strokeDasharray="377"
                    strokeDashoffset={377 - (377 * skillGap.matchPercentage) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{skillGap.matchPercentage}%</span>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Match</span>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {skillGap.matchPercentage >= 90 ? "Excellent Match" :
                   skillGap.matchPercentage >= 70 ? "Strong Foundation" :
                   skillGap.matchPercentage >= 40 ? "Solid Starting Point" :
                   "Significant Gap to Close"}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  You have a <strong className="text-white">{skillGap.matchPercentage}%</strong> match for the{" "}
                  <strong className="text-white">{targetRole}</strong> role.
                  {skillGap.missingSkills.length > 0 ? (
                    <> Focus on closing the gap in{" "}
                      <strong className="text-white">
                        {skillGap.missingSkills.slice(0, 3).map(m => m.skill).join(", ")}
                      </strong>{" "}
                      to raise your match score.
                    </>
                  ) : " You're covering all the key skills for this role."}
                </p>
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl h-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                  <Radar name="Resume" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Missing */}
            <div className="glass p-6 rounded-2xl md:col-span-2 border-t-2 border-t-destructive">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" /> Critical Missing Skills
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {skillGap.missingSkills.map((item, i) => (
                  <div key={i} className="bg-black/20 rounded-xl p-4 border border-white/5 flex justify-between items-center group hover:bg-black/40 transition-colors">
                    <span className="font-medium text-white group-hover:text-primary transition-colors">{item.skill}</span>
                    <span className={`text-xs px-2 py-1 rounded border font-medium ${
                      item.priority === 'High' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      item.priority === 'Medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {item.priority} Priority
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matched */}
            <div className="glass p-6 rounded-2xl border-t-2 border-t-green-500">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" /> Verified Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {skillGap.matchedSkills.map(skill => (
                  <span key={skill} className="px-3 py-1.5 rounded-lg text-sm bg-green-500/10 text-green-400 border border-green-500/20">
                    {skill}
                  </span>
                ))}
              </div>
              
              <h3 className="text-lg font-bold text-white mt-8 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-400" /> Bonus Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {skillGap.extraSkills.map(skill => (
                  <span key={skill} className="px-3 py-1.5 rounded-lg text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </DashboardShell>
  );
}

