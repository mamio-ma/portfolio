// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-mingyong-ma",
    title: "Mingyong Ma",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "post-from-prompt-chains-to-agent-graphs-how-our-agent-architecture-evolved",
        
          title: "From Prompt Chains to Agent Graphs: How Our Agent Architecture Evolved",
        
        description: "Over the past two years, our agent architecture evolved through four stages: deterministic prompt chains, LangGraph-based orchestration, a lightweight skill-based agent loop, and finally agent graph.This post walks through that evolution and explains why we eventually chose to use graph to represent our agent orchestration.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/from-loops-to-graphs-my-journey-building-ai-agents/";
          
        },
      },{
        id: 'social-cv',
        title: 'CV',
        section: 'Socials',
        handler: () => {
          window.open("/assets/pdf/example_pdf.pdf", "_blank");
        },
      },{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%6D%69%6E%67%79%6F%6E%67%6D@%61%64%6F%62%65.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/Mamioma", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/mamioma", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
