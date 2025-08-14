const skillTests = [
  {
    title: "Advanced English Proficiency Assessment",
    description: "Comprehensive evaluation of advanced English grammar, business vocabulary, professional writing, and cross-cultural communication skills. This assessment requires college-level language proficiency.",
    category: "english",
    difficulty: "advanced",
    timeLimit: 35,
    passingScore: 85,
    badge: {
      name: "English Language Expert",
      description: "Demonstrates advanced English proficiency and professional communication skills",
      icon: "📚",
      color: "#3B82F6"
    },
    questions: [
      {
        question: "In international business communication, which approach demonstrates cultural sensitivity?",
        options: [
          "Using idioms and slang to appear friendly",
          "Adapting communication style to match the recipient's cultural background",
          "Speaking louder to ensure understanding",
          "Using only formal language regardless of context"
        ],
        correctAnswer: 1,
        explanation: "Cultural sensitivity involves adapting communication style to respect different cultural norms and expectations."
      },
      {
        question: "Which sentence demonstrates proper use of the subjunctive mood in business writing?",
        options: [
          "If I was you, I would accept the offer.",
          "If I were you, I would accept the offer.",
          "If I am you, I would accept the offer.",
          "If I will be you, I would accept the offer."
        ],
        correctAnswer: 1,
        explanation: "The subjunctive mood uses 'were' instead of 'was' for hypothetical situations, even with singular subjects."
      },
      {
        question: "What is the primary purpose of a memorandum in professional communication?",
        options: [
          "To entertain colleagues",
          "To convey information, decisions, or requests within an organization",
          "To advertise products to clients",
          "To record personal thoughts"
        ],
        correctAnswer: 1,
        explanation: "Memos serve as internal communication tools for conveying official information within organizations."
      },
      {
        question: "Which rhetorical device is most effective in persuasive business writing?",
        options: [
          "Hyperbole and exaggeration",
          "Logical reasoning supported by evidence",
          "Emotional manipulation",
          "Complex technical jargon"
        ],
        correctAnswer: 1,
        explanation: "Logical reasoning with evidence is most effective in professional persuasive writing."
      },
      {
        question: "What distinguishes academic writing from business writing?",
        options: [
          "Academic writing is always longer",
          "Business writing prioritizes clarity and action, while academic writing emphasizes analysis and theory",
          "Academic writing uses simpler language",
          "Business writing is always formal"
        ],
        correctAnswer: 1,
        explanation: "Business writing focuses on practical outcomes and clear action items, while academic writing emphasizes theoretical analysis."
      },
      {
        question: "Which communication principle is most important in crisis management?",
        options: [
          "Delaying response to gather complete information",
          "Providing timely, accurate, and transparent information",
          "Avoiding media contact entirely",
          "Shifting blame to external factors"
        ],
        correctAnswer: 1,
        explanation: "Timely, accurate, and transparent communication builds trust and manages stakeholder expectations during crises."
      },
      {
        question: "What is the function of hedging language in professional communication?",
        options: [
          "To confuse the reader",
          "To express uncertainty or qualify statements appropriately",
          "To make writing more formal",
          "To avoid responsibility"
        ],
        correctAnswer: 1,
        explanation: "Hedging language appropriately qualifies statements and acknowledges uncertainty in professional contexts."
      },
      {
        question: "Which approach best demonstrates intercultural communication competence?",
        options: [
          "Assuming all cultures share the same values",
          "Learning about cultural differences and adapting communication accordingly",
          "Using only your native communication style",
          "Avoiding communication with different cultures"
        ],
        correctAnswer: 1,
        explanation: "Intercultural competence involves understanding cultural differences and adapting communication strategies accordingly."
      }
    ]
  },
  {
    title: "Strategic Customer Service Management",
    description: "Advanced assessment of customer service strategy, conflict resolution, service recovery, and customer relationship management. Tests professional-level service delivery skills.",
    category: "customer-service",
    difficulty: "advanced",
    timeLimit: 30,
    passingScore: 85,
    badge: {
      name: "Customer Service Strategist",
      description: "Demonstrates advanced customer service strategy and relationship management skills",
      icon: "🎧",
      color: "#10B981"
    },
    questions: [
      {
        question: "What is the primary goal of service recovery in customer service management?",
        options: [
          "To minimize refunds and costs",
          "To restore customer satisfaction and loyalty after a service failure",
          "To avoid negative reviews",
          "To transfer difficult customers to other departments"
        ],
        correctAnswer: 1,
        explanation: "Service recovery aims to restore customer satisfaction and rebuild loyalty after service failures."
      },
      {
        question: "Which customer service metric is most predictive of long-term business success?",
        options: [
          "Average handling time",
          "Customer lifetime value and retention rate",
          "First call resolution rate",
          "Customer satisfaction scores"
        ],
        correctAnswer: 1,
        explanation: "Customer lifetime value and retention rate directly correlate with long-term business profitability and success."
      },
      {
        question: "What is the 'service gap model' in customer service management?",
        options: [
          "A model for measuring customer wait times",
          "A framework for identifying and closing gaps between customer expectations and service delivery",
          "A method for calculating service costs",
          "A tool for scheduling customer service staff"
        ],
        correctAnswer: 1,
        explanation: "The service gap model helps organizations identify and address gaps between expected and actual service quality."
      },
      {
        question: "How should a customer service manager handle a systemic service failure?",
        options: [
          "Address individual complaints as they arise",
          "Implement root cause analysis and systemic solutions",
          "Blame frontline staff for the issues",
          "Ignore the problem until it resolves itself"
        ],
        correctAnswer: 1,
        explanation: "Systemic failures require root cause analysis and organizational-level solutions rather than individual case management."
      },
      {
        question: "What is the role of emotional intelligence in customer service leadership?",
        options: [
          "To manipulate customer emotions",
          "To understand and manage emotions in service interactions and team leadership",
          "To avoid emotional situations entirely",
          "To suppress all emotions in the workplace"
        ],
        correctAnswer: 1,
        explanation: "Emotional intelligence enables service leaders to understand customer emotions and manage team dynamics effectively."
      },
      {
        question: "Which customer service strategy is most effective for high-value clients?",
        options: [
          "Standardized service procedures",
          "Personalized service delivery based on individual preferences and history",
          "Automated responses and self-service options",
          "Minimal interaction to reduce costs"
        ],
        correctAnswer: 1,
        explanation: "High-value clients require personalized service that recognizes their individual needs and relationship history."
      },
      {
        question: "What is the purpose of customer journey mapping in service design?",
        options: [
          "To track customer complaints",
          "To visualize and optimize the complete customer experience across all touchpoints",
          "To measure customer satisfaction scores",
          "To identify customer demographics"
        ],
        correctAnswer: 1,
        explanation: "Customer journey mapping helps organizations understand and optimize the complete customer experience."
      },
      {
        question: "How should customer service teams handle cultural differences in service delivery?",
        options: [
          "Apply the same service standards to all customers",
          "Adapt service delivery to respect cultural norms and preferences",
          "Avoid serving customers from different cultures",
          "Use translation services for all interactions"
        ],
        correctAnswer: 1,
        explanation: "Cultural adaptation in service delivery demonstrates respect and improves customer satisfaction across diverse populations."
      }
    ]
  },
  {
    title: "Advanced Communication Strategy",
    description: "Comprehensive assessment of strategic communication, stakeholder management, crisis communication, and organizational messaging. Tests professional communication leadership skills.",
    category: "communication",
    difficulty: "advanced",
    timeLimit: 35,
    passingScore: 85,
    badge: {
      name: "Communication Strategist",
      description: "Demonstrates advanced strategic communication and stakeholder management skills",
      icon: "💬",
      color: "#8B5CF6"
    },
    questions: [
      {
        question: "What is the primary purpose of stakeholder analysis in communication planning?",
        options: [
          "To identify potential critics",
          "To understand audience needs, interests, and influence for targeted communication",
          "To avoid difficult stakeholders",
          "To measure communication effectiveness"
        ],
        correctAnswer: 1,
        explanation: "Stakeholder analysis helps develop targeted communication strategies based on audience characteristics and needs."
      },
      {
        question: "Which communication model is most effective for organizational change management?",
        options: [
          "One-way information transmission",
          "Two-way dialogue with feedback mechanisms and engagement",
          "Top-down directive communication",
          "Informal grapevine communication"
        ],
        correctAnswer: 1,
        explanation: "Two-way dialogue with feedback mechanisms is essential for successful organizational change management."
      },
      {
        question: "What is the role of framing in strategic communication?",
        options: [
          "To manipulate audience perceptions",
          "To present information in a context that influences how it's interpreted",
          "To avoid difficult topics",
          "To simplify complex messages"
        ],
        correctAnswer: 1,
        explanation: "Framing presents information in a context that influences audience interpretation while maintaining ethical standards."
      },
      {
        question: "How should communication leaders handle conflicting stakeholder interests?",
        options: [
          "Choose one stakeholder group to prioritize",
          "Acknowledge conflicts and develop transparent communication strategies that address multiple perspectives",
          "Avoid addressing conflicts publicly",
          "Delegate conflict resolution to other departments"
        ],
        correctAnswer: 1,
        explanation: "Transparent communication about conflicts and multiple perspectives builds trust and credibility."
      },
      {
        question: "What is the purpose of message architecture in organizational communication?",
        options: [
          "To create catchy slogans",
          "To develop consistent, coherent messaging that supports organizational goals",
          "To standardize all communications",
          "To reduce communication costs"
        ],
        correctAnswer: 1,
        explanation: "Message architecture ensures consistent, coherent messaging that supports organizational objectives."
      },
      {
        question: "Which communication strategy is most effective during organizational crises?",
        options: [
          "Minimal communication to avoid panic",
          "Proactive, transparent communication with regular updates and clear action plans",
          "Delayed communication until all facts are confirmed",
          "Delegating all communication to legal teams"
        ],
        correctAnswer: 1,
        explanation: "Proactive, transparent communication during crises maintains trust and provides necessary information to stakeholders."
      },
      {
        question: "What is the importance of communication channels in strategic messaging?",
        options: [
          "To reduce communication costs",
          "To ensure messages reach target audiences through appropriate and effective mediums",
          "To standardize all communications",
          "To avoid face-to-face interactions"
        ],
        correctAnswer: 1,
        explanation: "Selecting appropriate communication channels ensures messages reach target audiences effectively."
      },
      {
        question: "How should communication professionals measure the effectiveness of strategic communication?",
        options: [
          "By counting message deliveries",
          "Through systematic evaluation of audience understanding, behavior change, and goal achievement",
          "By measuring media coverage",
          "By tracking social media mentions"
        ],
        correctAnswer: 1,
        explanation: "Effective measurement evaluates audience understanding, behavior change, and goal achievement."
      }
    ]
  },
  {
    title: "Strategic Project Management",
    description: "Advanced assessment of project management methodology, risk management, stakeholder engagement, and strategic project planning. Tests professional project management leadership.",
    category: "project-management",
    difficulty: "advanced",
    timeLimit: 35,
    passingScore: 85,
    badge: {
      name: "Strategic Project Manager",
      description: "Demonstrates advanced project management strategy and leadership skills",
      icon: "📋",
      color: "#F59E0B"
    },
    questions: [
      {
        question: "What is the primary purpose of a project charter in strategic project management?",
        options: [
          "To assign team roles",
          "To formally authorize the project and establish its strategic objectives and constraints",
          "To create a detailed schedule",
          "To estimate project costs"
        ],
        correctAnswer: 1,
        explanation: "A project charter formally authorizes the project and establishes its strategic foundation and boundaries."
      },
      {
        question: "Which project management methodology is most appropriate for highly uncertain, innovative projects?",
        options: [
          "Traditional waterfall methodology",
          "Agile or adaptive methodologies with iterative development",
          "Lean project management",
          "Six Sigma methodology"
        ],
        correctAnswer: 1,
        explanation: "Agile methodologies are designed for projects with high uncertainty and changing requirements."
      },
      {
        question: "What is the purpose of stakeholder engagement planning in project management?",
        options: [
          "To identify project critics",
          "To develop strategies for managing stakeholder expectations and involvement throughout the project lifecycle",
          "To avoid stakeholder conflicts",
          "To reduce project costs"
        ],
        correctAnswer: 1,
        explanation: "Stakeholder engagement planning ensures effective management of stakeholder relationships and expectations."
      },
      {
        question: "How should project managers handle scope creep in strategic projects?",
        options: [
          "Accept all changes to maintain stakeholder satisfaction",
          "Evaluate changes against project objectives and implement formal change control procedures",
          "Ignore scope changes to maintain schedule",
          "Delegate scope management to team members"
        ],
        correctAnswer: 1,
        explanation: "Formal change control procedures ensure scope changes align with project objectives and are properly managed."
      },
      {
        question: "What is the role of risk management in strategic project planning?",
        options: [
          "To eliminate all project risks",
          "To identify, assess, and develop response strategies for potential project threats and opportunities",
          "To avoid risky projects entirely",
          "To transfer all risks to external parties"
        ],
        correctAnswer: 1,
        explanation: "Risk management proactively addresses potential threats and opportunities to improve project success."
      },
      {
        question: "Which project success metric is most important for strategic projects?",
        options: [
          "On-time delivery",
          "Achievement of strategic objectives and business value realization",
          "Budget compliance",
          "Team satisfaction scores"
        ],
        correctAnswer: 1,
        explanation: "Strategic projects are ultimately measured by their contribution to organizational objectives and value creation."
      },
      {
        question: "What is the purpose of lessons learned in project management?",
        options: [
          "To assign blame for project failures",
          "To capture knowledge and improve future project performance",
          "To document project costs",
          "To satisfy audit requirements"
        ],
        correctAnswer: 1,
        explanation: "Lessons learned capture valuable knowledge to improve future project planning and execution."
      },
      {
        question: "How should project managers balance competing project constraints?",
        options: [
          "Prioritize cost above all other factors",
          "Analyze trade-offs and make informed decisions based on project priorities and stakeholder needs",
          "Always prioritize schedule to meet deadlines",
          "Delegate constraint management to senior management"
        ],
        correctAnswer: 1,
        explanation: "Effective constraint management involves analyzing trade-offs and making informed decisions based on project priorities."
      }
    ]
  },
  {
    title: "Advanced Technical Architecture",
    description: "Comprehensive assessment of software architecture, system design, technical leadership, and advanced development methodologies. Tests professional technical leadership skills.",
    category: "technical",
    difficulty: "advanced",
    timeLimit: 40,
    passingScore: 85,
    badge: {
      name: "Technical Architect",
      description: "Demonstrates advanced technical architecture and system design skills",
      icon: "💻",
      color: "#EF4444"
    },
    questions: [
      {
        question: "What is the primary purpose of software architecture in system design?",
        options: [
          "To make systems more complex",
          "To establish the fundamental structure and organization of a software system",
          "To reduce development costs",
          "To satisfy technical requirements only"
        ],
        correctAnswer: 1,
        explanation: "Software architecture establishes the fundamental structure that guides system development and evolution."
      },
      {
        question: "Which architectural pattern is most appropriate for highly scalable web applications?",
        options: [
          "Monolithic architecture",
          "Microservices architecture with distributed systems",
          "Client-server architecture",
          "Peer-to-peer architecture"
        ],
        correctAnswer: 1,
        explanation: "Microservices architecture enables independent scaling and deployment of system components."
      },
      {
        question: "What is the role of design patterns in software architecture?",
        options: [
          "To make code more complex",
          "To provide proven solutions to common design problems and improve code maintainability",
          "To reduce development time only",
          "To satisfy coding standards"
        ],
        correctAnswer: 1,
        explanation: "Design patterns provide proven solutions that improve code quality, maintainability, and reusability."
      },
      {
        question: "How should technical architects handle technical debt in system design?",
        options: [
          "Ignore technical debt to meet deadlines",
          "Balance technical debt against business priorities and plan for systematic refactoring",
          "Eliminate all technical debt immediately",
          "Delegate technical debt management to junior developers"
        ],
        correctAnswer: 1,
        explanation: "Effective technical debt management balances immediate needs with long-term system health."
      },
      {
        question: "What is the purpose of system integration testing in technical architecture?",
        options: [
          "To test individual components",
          "To verify that system components work together correctly and meet integration requirements",
          "To reduce testing costs",
          "To satisfy quality assurance requirements"
        ],
        correctAnswer: 1,
        explanation: "Integration testing ensures system components work together and meet architectural requirements."
      },
      {
        question: "Which approach is most effective for managing technical team performance?",
        options: [
          "Focusing only on individual productivity metrics",
          "Balancing technical excellence with team collaboration and continuous improvement",
          "Implementing strict deadlines and penalties",
          "Avoiding performance measurement entirely"
        ],
        correctAnswer: 1,
        explanation: "Effective technical leadership balances technical excellence with team development and collaboration."
      },
      {
        question: "What is the importance of API design in modern software architecture?",
        options: [
          "To reduce development costs",
          "To enable system interoperability, maintainability, and developer productivity",
          "To satisfy security requirements",
          "To meet performance benchmarks"
        ],
        correctAnswer: 1,
        explanation: "Well-designed APIs enable system integration, maintainability, and developer productivity."
      },
      {
        question: "How should technical leaders approach technology selection for projects?",
        options: [
          "Choose the latest technologies regardless of project needs",
          "Evaluate technologies based on project requirements, team capabilities, and long-term maintainability",
          "Always use familiar technologies to reduce risk",
          "Delegate technology decisions to external consultants"
        ],
        correctAnswer: 1,
        explanation: "Technology selection should be based on project requirements, team capabilities, and long-term considerations."
      }
    ]
  }
];

module.exports = skillTests;
