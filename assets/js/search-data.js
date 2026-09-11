// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-mingyong-ma",
    title: "Mingyong Ma",
    section: "Navigation",
    handler: () => {
      window.location.href = "/portfolio/";
    },
  },{id: "post-math-and-code-rendering-demo",
        
          title: "Math and code rendering demo",
        
        description: "Verifying math typesetting, code highlighting, and the table of contents.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/portfolio/blog/2026/katex-and-code/";
          
        },
      },{id: "post-welcome-to-my-blog",
        
          title: "Welcome to my blog",
        
        description: "First post — what this blog is for.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/portfolio/blog/2026/welcome/";
          
        },
      },{
        id: 'social-cv',
        title: 'CV',
        section: 'Socials',
        handler: () => {
          window.open("/portfolio/assets/pdf/example_pdf.pdf", "_blank");
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
          window.open("/portfolio/feed.xml", "_blank");
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
