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
        question: "When writing for a multinational audience, which adjustment most improves cross-cultural clarity?",
        options: [
          "Choose vocabulary and idioms that minimize cultural-specific interpretation risks",
          "Preserve original idioms and explain their meaning in footnotes",
          "Translate content literally and leave cultural references intact",
          "Localize only dates and currency while keeping language unchanged"
        ],
        correctAnswer: 0,
        explanation: "Selecting neutral vocabulary reduces misunderstandings across cultures while preserving meaning."
      },
      {
        question: "Which sentence correctly demonstrates advanced subjunctive usage in a hypothetical recommendation?",
        options: [
          "Were the board to consent, the department would implement the revised policy",
          "If the board will consent, the department can implement the revised policy",
          "If the board was to consent, the department would then implement policy",
          "If the board is to consent, the department should implement the revised policy"
        ],
        correctAnswer: 0,
        explanation: "Formal hypothetical constructions often use the inverted subjunctive 'Were ... to' for conditional nuance."
      },
      {
        question: "Which statement best captures the strategic purpose of an internal memorandum?",
        options: [
          "Communicate formal decisions, rationale, and required actions to internal stakeholders",
          "Publicize corporate achievements and services to prospective external customers",
          "Record individual reflections for personal or archival use within a department",
          "Solicit informal feedback and casual suggestions from cross-functional teams"
        ],
        correctAnswer: 0,
        explanation: "Memos are formal internal documents used to convey decisions, rationale, and directives."
      },
      {
        question: "Which rhetorical approach most reliably persuades a skeptical professional audience?",
        options: [
          "Present a concise logical argument supported by relevant, verifiable evidence",
          "Use emotive storytelling with vivid personal anecdotes throughout the argument",
          "Rely on authoritative-sounding jargon to establish domain credibility quickly",
          "Introduce dramatic forecasts and sweeping claims to emphasize urgency"
        ],
        correctAnswer: 0,
        explanation: "Skeptical professional audiences respond best to logic reinforced by credible evidence."
      },
      {
        question: "What principal difference should writers consider between business and academic prose?",
        options: [
          "Business prose prioritizes action-oriented clarity; academic prose emphasizes conceptual analysis",
          "Business prose must always use simpler vocabulary than academic prose",
          "Academic prose is typically structured as memos with direct action items",
          "Business prose avoids citation whereas academic prose never uses examples"
        ],
        correctAnswer: 0,
        explanation: "Business writing targets decisions and actions; academic writing focuses on argument and theory."
      },
      {
        question: "In time-sensitive incidents, what communication priority best preserves organizational credibility?",
        options: [
          "Deliver timely, accurate updates that transparently acknowledge what is known and unknown",
          "Wait for legal clearance before communicating any updates to avoid inaccuracies",
          "Release minimal statements to reduce speculation until investigations conclude",
          "Route all external communications exclusively through executive leadership"
        ],
        correctAnswer: 0,
        explanation: "Transparency about knowns and unknowns, shared quickly, helps maintain trust during incidents."
      },
      {
        question: "Which use of hedging language is appropriate in a professional recommendation?",
        options: [
          "Frame projections with qualifiers that indicate uncertainty and conditionality",
          "Avoid any qualifiers so recommendations appear decisive and authoritative",
          "Use hedging to shift responsibility away from the author entirely",
          "Insert long qualifying clauses to obscure the recommendation's weaknesses"
        ],
        correctAnswer: 0,
        explanation: "Qualified language signals responsible caution and distinguishes evidence-based projection from certainty."
      },
      {
        question: "Which practice best demonstrates advanced intercultural communication competence?",
        options: [
          "Analyze cultural expectations and adapt register, examples, and protocols accordingly",
          "Adopt a universal corporate voice and assume it will be understood globally",
          "Rely on machine translation to convert messages into local languages",
          "Limit interactions to third-party intermediaries who handle localization"
        ],
        correctAnswer: 0,
        explanation: "Competence requires deliberate adaptation of tone, register and conventions to local norms."
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
        question: "What is the strategic objective of a service recovery program after a major failure?",
        options: [
          "Restore customer trust by resolving the issue and offering remedies aligned to impact",
          "Limit company exposure by avoiding public acknowledgment of the failure",
          "Transfer all affected accounts to a separate team for lower-cost handling",
          "Implement punitive measures against frontline staff responsible for issues"
        ],
        correctAnswer: 0,
        explanation: "Effective recovery focuses on restoring trust through appropriate remedies and communication."
      },
      {
        question: "Which metric most directly indicates future revenue potential from existing customers?",
        options: [
          "Customer lifetime value and retention trajectory over repeat transactions",
          "Average handling time for support calls during peak contact periods",
          "Net promoter score from a single post-interaction survey",
          "Rate of first-contact resolution measured during campaign launches"
        ],
        correctAnswer: 0,
        explanation: "CLV and retention trends better predict long-term revenue than single-interaction metrics."
      },
      {
        question: "How does the service gap model help design better customer experiences?",
        options: [
          "It identifies mismatches between expected service and delivered service to guide improvements",
          "It prescribes ideal staffing levels for all customer contact channels worldwide",
          "It provides a checklist for product bundling and up-sell opportunities",
          "It quantifies per-ticket costs to optimize operational budgets"
        ],
        correctAnswer: 0,
        explanation: "The model isolates expectation-vs-delivery gaps to target interventions that improve experience."
      },
      {
        question: "When facing systemic failures, which managerial action is most appropriate?",
        options: [
          "Perform root-cause analysis and implement cross-functional corrective measures",
          "Handle complaints individually without escalating for broader fixes",
          "Reduce published service options to simplify intake processes",
          "Outsource fault management to third parties to reduce internal burden"
        ],
        correctAnswer: 0,
        explanation: "Systemic problems require organization-level analysis and coordinated solutions, not ad hoc fixes."
      },
      {
        question: "How should emotional intelligence be applied in a high-stress service escalation?",
        options: [
          "Recognize emotions, de-escalate using empathy, and align solutions to customer needs",
          "Prioritize scripted responses to ensure consistency and remove emotion from exchanges",
          "Delegate all escalations to senior agents regardless of their relationship with the customer",
          "Use selective disclosure to influence customer reactions and close the case quickly"
        ],
        correctAnswer: 0,
        explanation: "EI in escalations focuses on empathy, de-escalation, and outcome alignment to preserve relationships."
      },
      {
        question: "For strategic accounts, which service approach yields the highest long-term value?",
        options: [
          "Deliver proactive, personalized engagement informed by account history and preferences",
          "Apply standardized enterprise processes designed for broad scalability and efficiency",
          "Reduce contact frequency to lower operational costs while automating touchpoints",
          "Offer discount-driven campaigns to maintain transactional loyalty exclusively"
        ],
        correctAnswer: 0,
        explanation: "High-value accounts benefit most from tailored, proactive relationship management."
      },
      {
        question: "What is the primary purpose of customer journey mapping in service redesign?",
        options: [
          "Map end-to-end customer interactions to reveal friction points and improvement opportunities",
          "Catalog customer complaints to build a reactive incident log for support teams",
          "Segment customers by demographic to create targeted marketing personas",
          "Inventory operational tasks to streamline internal workflows for staff"
        ],
        correctAnswer: 0,
        explanation: "Journey maps expose cross-touchpoint friction and inform design changes to improve outcomes."
      },
      {
        question: "How should service teams adapt delivery for customers from diverse cultural backgrounds?",
        options: [
          "Customize interaction style, channels, and escalation protocols to align with cultural expectations",
          "Translate standard service scripts verbatim to the customer's preferred language",
          "Centralize service delivery to ensure uniform procedures for all customers",
          "Limit culturally specific accommodations to premium accounts only"
        ],
        correctAnswer: 0,
        explanation: "Meaningful adaptation goes beyond translation and aligns process and tone to cultural norms."
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
        question: "What is the primary purpose of stakeholder analysis during strategic planning?",
        options: [
          "Assess stakeholders' interests, influence, and likely reactions to shape targeted messaging",
          "List every individual touched by the initiative to send the exact same communication",
          "Categorize stakeholders only by their geographic location for regional messaging",
          "Rank stakeholders by seniority and default to leadership priorities first"
        ],
        correctAnswer: 0,
        explanation: "Stakeholder analysis identifies influence and interests to tailor communication approaches effectively."
      },
      {
        question: "Which communication model is most effective for implementing major organizational change?",
        options: [
          "Two-way dialogue with feedback loops that integrate stakeholder input into decisions",
          "One-way broadcast communication that emphasizes speed and consistency",
          "Top-down directive instructions delivered only by senior leadership",
          "Informal grapevine dissemination to quickly spread messages across teams"
        ],
        correctAnswer: 0,
        explanation: "Change succeeds when dialogue and feedback mechanisms allow adjustments and buy-in."
      },
      {
        question: "How does framing influence audience interpretation of complex information?",
        options: [
          "It selects contextual cues and emphasis that shape how recipients interpret the same data",
          "It eliminates all nuance so audiences accept the message without questioning",
          "It prioritizes sensational aspects to ensure maximum attention and reaction",
          "It standardizes technical terms to make all communications identical across units"
        ],
        correctAnswer: 0,
        explanation: "Framing controls context and emphasis, guiding interpretation without falsifying facts."
      },
      {
        question: "When stakeholder interests conflict, which communication approach maintains credibility?",
        options: [
          "Acknowledge differing perspectives and communicate transparently about trade-offs and rationale",
          "Favor the most powerful stakeholder and avoid discussing alternatives publicly",
          "Delay discussions until consensus emerges within leadership to present a single position",
          "Delegate all stakeholder conflict communications to a third-party mediator"
        ],
        correctAnswer: 0,
        explanation: "Transparency about trade-offs and rationale preserves trust across stakeholder groups."
      },
      {
        question: "What is the role of message architecture in organizational communications?",
        options: [
          "Define core messages and supporting points that align communications to strategic goals",
          "Create catchy slogans and taglines for all product marketing campaigns",
          "Standardize every sentence across departments to ensure identical phrasing",
          "Limit communications to only digital channels to maximize reach and efficiency"
        ],
        correctAnswer: 0,
        explanation: "Message architecture provides the structured hierarchy of core messages aligned to objectives."
      },
      {
        question: "During a crisis, which communication strategy best serves organizational resilience?",
        options: [
          "Proactive transparency with frequent updates that include actions taken and next steps",
          "Minimal public comment to avoid escalating stakeholder concerns unnecessarily",
          "Shift all communications to legal counsel to reduce reputational risk exposure",
          "Announce decisions only after internal investigations are fully concluded"
        ],
        correctAnswer: 0,
        explanation: "Proactive, factual updates reduce rumor, manage expectations, and support resilience."
      },
      {
        question: "How should communicators select channels for strategic messaging?",
        options: [
          "Match channels to audience preferences, message complexity, and the need for interaction",
          "Use the broadest-reaching channel available for any strategic message regardless of nuance",
          "Prefer internal newsletters for all external stakeholder communications by default",
          "Rely solely on social media for immediacy and assume audiences will follow there"
        ],
        correctAnswer: 0,
        explanation: "Channel selection must reflect audience habits and whether two-way engagement is required."
      },
      {
        question: "Which evaluation best measures the effectiveness of a strategic communication program?",
        options: [
          "Assess audience understanding, behavioral outcomes, and alignment with stated objectives",
          "Count impressions and raw message delivery numbers across platforms",
          "Track only media mentions and tone regardless of stakeholder action",
          "Monitor social engagement metrics as the primary indicator of success"
        ],
        correctAnswer: 0,
        explanation: "Meaningful evaluation measures comprehension, behavior change, and objective achievement."
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
        question: "What is the core purpose of a project charter at initiation?",
        options: [
          "Formally authorize the project and outline its objectives, scope, and sponsor authority",
          "Provide a detailed task-level schedule and every team member's daily assignments",
          "Act as the final technical specification for developers to follow during execution",
          "Record vendor agreements and invoice schedules for procurement teams"
        ],
        correctAnswer: 0,
        explanation: "A charter authorizes the project and defines objectives, scope boundaries and sponsor authority."
      },
      {
        question: "Which methodology best suits projects with high uncertainty and frequent requirement changes?",
        options: [
          "Iterative, adaptive approaches such as agile frameworks that support incremental delivery",
          "A traditional waterfall model with strict phase gates and upfront complete planning",
          "A rigid control-based approach focused on minimizing scope adjustments",
          "A documentation-heavy Six Sigma approach focused on process measurement"
        ],
        correctAnswer: 0,
        explanation: "Adaptive methods manage changing requirements through iterative delivery and feedback."
      },
      {
        question: "What is the objective of stakeholder engagement planning in projects?",
        options: [
          "Identify stakeholder expectations and plan communications and involvement to manage them",
          "Exclude minor stakeholders to reduce the complexity of communication plans",
          "Assign all stakeholder interactions to the project sponsor to centralize control",
          "Create static reports that list stakeholders without scheduling engagement activities"
        ],
        correctAnswer: 0,
        explanation: "Engagement planning maps expectations to involvement and communications to mitigate risk."
      },
      {
        question: "How should a project manager address scope creep without damaging relationships?",
        options: [
          "Evaluate requested changes against objectives and use formal change control to decide",
          "Accept all stakeholder requests immediately to preserve goodwill and avoid conflict",
          "Ignore additional requests and proceed with the original plan unquestioned",
          "Defer all scope decisions to external consultants to avoid internal disputes"
        ],
        correctAnswer: 0,
        explanation: "Formal change control balances stakeholder needs with project constraints and scope integrity."
      },
      {
        question: "How should risk management be integrated into strategic project planning?",
        options: [
          "Identify, assess, and prepare response strategies for both threats and opportunities",
          "Concentrate only on the largest financial risks and ignore lower-impact items",
          "Postpone risk identification until initial delivery milestones are achieved",
          "Transfer all risk to contractors regardless of feasibility or cost"
        ],
        correctAnswer: 0,
        explanation: "Comprehensive risk management addresses both negative and positive uncertainties proactively."
      },
      {
        question: "Which success metric best reflects strategic value from a completed project?",
        options: [
          "Achievement of strategic objectives and measurable business value realization",
          "Strict adherence to the baseline schedule and original task estimates",
          "Completing the project under the approved budget at all costs",
          "High internal team satisfaction scores irrespective of business outcomes"
        ],
        correctAnswer: 0,
        explanation: "Strategic success is measured by delivering intended business value and objectives."
      },
      {
        question: "What is the purpose of a lessons learned review at project close?",
        options: [
          "Capture insights and practical recommendations to improve future project performance",
          "Assign blame for failures so that personnel decisions can be made quickly",
          "Compile an archival report of budgets and invoices for audit purposes",
          "Include only positive feedback to boost team morale and avoid criticism"
        ],
        correctAnswer: 0,
        explanation: "Lessons learned aim to create actionable improvements, not to assign blame or simply archive data."
      },
      {
        question: "How should managers balance competing project constraints when priorities conflict?",
        options: [
          "Analyze trade-offs among cost, scope, time and align decisions with strategic priorities",
          "Always prioritize schedule adherence regardless of other business impacts",
          "Reduce quality standards to meet budget constraints immediately",
          "Pass all constraint trade-off decisions upward to executive leadership without analysis"
        ],
        correctAnswer: 0,
        explanation: "Effective balancing requires trade-off analysis aligned to strategic priorities and stakeholder needs."
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
        question: "What is the fundamental purpose of software architecture in a complex system?",
        options: [
          "Define the high-level structure and organizing principles that enable evolution and scalability",
          "Provide an exhaustive implementation-level specification for every module and class",
          "Ensure the codebase uses the latest frameworks and trending technologies",
          "Centralize all development decisions under a single architectural authority"
        ],
        correctAnswer: 0,
        explanation: "Architecture sets organizing principles and structure to support long-term scalability and change."
      },
      {
        question: "Which architecture style best supports independent scaling of components in large web systems?",
        options: [
          "Microservices architecture that separates concerns into independently deployable services",
          "A tightly integrated monolith deployed as a single artifact for simplicity",
          "Peer-to-peer design where each node shares identical responsibilities and state",
          "Client-heavy single-page applications that push complexity to browsers"
        ],
        correctAnswer: 0,
        explanation: "Microservices allow targeted scaling and independent deployment of service components."
      },
      {
        question: "What value do design patterns provide in system architecture and development?",
        options: [
          "Offer proven structural and behavioral templates that improve maintainability and reuse",
          "Guarantee bug-free code by enforcing a fixed set of implementation patterns",
          "Force teams to use identical coding styles regardless of problem context",
          "Accelerate delivery by replacing design with off-the-shelf components always"
        ],
        correctAnswer: 0,
        explanation: "Patterns provide reusable solutions for common problems, improving maintainability when applied wisely."
      },
      {
        question: "Which approach is most appropriate for managing significant technical debt in a product?",
        options: [
          "Balance refactoring efforts against delivery needs and plan prioritized remediation cycles",
          "Ignore the debt until it causes an unavoidable production outage",
          "Immediately halt all feature work until the entire codebase is refactored",
          "Outsource the debt cleanup to junior contractors without oversight"
        ],
        correctAnswer: 0,
        explanation: "Systematic prioritization allows debt reduction while maintaining delivery momentum."
      },
      {
        question: "What is the key goal of system integration testing within an architecture lifecycle?",
        options: [
          "Verify that independently developed components work together and meet integration requirements",
          "Focus only on unit tests for each component in isolation to guarantee correctness",
          "Measure runtime performance of the full system under production load exclusively",
          "Satisfy compliance checklists without exercising real integration scenarios"
        ],
        correctAnswer: 0,
        explanation: "Integration tests validate interactions and interfaces among components, not just isolated units."
      },
      {
        question: "Which leadership approach best improves technical team performance sustainably?",
        options: [
          "Cultivate technical excellence, cross-team collaboration, and continuous learning practices",
          "Drive output solely through strict deadlines and individual productivity targets",
          "Reduce investment in training to force on-the-job learning under pressure",
          "Rely only on performance bonuses to elicit higher engineering results"
        ],
        correctAnswer: 0,
        explanation: "Sustainable performance combines technical standards with collaboration and ongoing development."
      },
      {
        question: "Why is thoughtful API design critical in modern system architecture?",
        options: [
          "APIs expose stable contracts for interoperability, enabling maintainability and developer efficiency",
          "APIs primarily serve to hide internal systems and should be limited in surface area",
          "APIs exist mostly for documentation purposes rather than runtime integration goals",
          "APIs should always be as feature-rich as possible to avoid future changes"
        ],
        correctAnswer: 0,
        explanation: "Well-designed APIs define stable integration points that enable independent evolution and reuse."
      },
      {
        question: "How should technology selection be performed for long-lived architectural initiatives?",
        options: [
          "Evaluate fit against requirements, team capability, ecosystem maturity, and long-term support",
          "Always adopt the newest technology to demonstrate technical leadership and innovation",
          "Select tools based solely on current team familiarity to minimize short-term ramp-up",
          "Outsource selection decisions to vendors who can guarantee long-term pricing"
        ],
        correctAnswer: 0,
        explanation: "Selection requires balancing requirements, team skills, and ecosystem sustainability over time."
      }
    ]
  }
];

module.exports = skillTests;
