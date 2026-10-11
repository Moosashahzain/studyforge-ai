/* StudyForge AI — Portfolio configuration.
   EDIT THIS FILE to personalize the portfolio. Every field ships with a
   clearly-labelled placeholder — replace with real information; nothing here
   is a real degree, employer, certificate or achievement. */
window.SF_PORTFOLIO = {
  profile: {
    name: "Your Name",
    role: "Student Developer",
    tagline: "I build things for the web and love learning how they work.",
    about: "Computer science student with a passion for building practical, beautiful web applications. Currently exploring full-stack development, AI-assisted tools, and clean UI design.",
    avatarUrl: "", // e.g. "images/me.jpg" — leave empty for the placeholder
    email: "you@example.com",
    location: "Pakistan",
    socials: [
      { label: "GitHub", url: "https://github.com/your-username" },
      { label: "LinkedIn", url: "https://linkedin.com/in/your-username" },
      { label: "X / Twitter", url: "https://x.com/your-username" },
    ],
    resumeUrl: "", // e.g. "files/resume.pdf" — download button appears only when set AND the file exists
  },
  skills: [
    { name: "HTML & CSS", level: 85 }, { name: "JavaScript", level: 80 },
    { name: "Python", level: 70 }, { name: "Git & GitHub", level: 75 },
    { name: "UI Design", level: 65 }, { name: "SQL", level: 60 },
  ],
  education: [
    { degree: "BS Computer Science (placeholder)", school: "Your University", years: "2023 — 2027", detail: "Replace with your real program, institution and dates." },
  ],
  achievements: [
    { title: "Achievement placeholder", detail: "Add real achievements only — hackathons, competitions, scholarships." },
  ],
  certificates: [
    { title: "Certificate placeholder", issuer: "Issuing organization", year: "2025", url: "" },
  ],
  projects: [
    {
      id: "studyforge-ai",
      title: "StudyForge AI",
      tagline: "AI study assistant + student developer portfolio",
      description: "A complete, functional study platform: AI tutor chat with conversation history, a step-by-step math solver with verified calculations, quiz generator with real scoring, study notes generator, flashcards with spaced review, PDF study tools with page-number citations, study planner with weekly calendar, and a progress dashboard — plus this portfolio section. Runs fully in the browser in demo mode; connects to a real AI model via the optional Node server.",
      tech: ["JavaScript", "CSS", "pdf.js", "Node.js"],
      demoUrl: "app.html",
      repoUrl: "",
      featured: true,
      features: [
        "AI Tutor chat — history, rename/delete, streaming, copy, retry, stop",
        "Math solver — algebra, calculus, vectors, geometry, trig; every answer verified step-by-step",
        "Quiz generator — 60-question bank across 6 subjects, difficulty levels, scoring & review",
        "Notes generator — extractive summaries, definitions, formula sheets, auto flashcards",
        "PDF study — on-device text extraction, Q&A with real page citations",
        "Planner, flashcards, dashboard, history search, print/markdown export",
        "Demo mode clearly labelled; provider abstraction ready for a real API key",
      ],
    },
    {
      id: "project-placeholder",
      title: "Project placeholder",
      tagline: "Replace with your real project",
      description: "Add a 2–3 sentence description of what you built, the problem it solves, and your role. Never invent employers, clients or metrics.",
      tech: ["HTML", "CSS", "JavaScript"],
      demoUrl: "", repoUrl: "", featured: false, features: [],
    },
  ],
};
