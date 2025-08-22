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
          "Preserve original idioms and explain their meaning in detailed footnotes",
          "Translate content literally while leaving cultural references intact completely",
          "Choose vocabulary and idioms that minimize cultural-specific interpretation risks",
          "Localize only dates and currency while keeping language structure unchanged"
        ],
        correctAnswer: 2,
        explanation: "Selecting neutral vocabulary reduces misunderstandings across cultures while preserving meaning."
      },
      {
        question: "Which sentence correctly demonstrates advanced subjunctive usage in a hypothetical recommendation?",
        options: [
          "If the board will consent, the department can implement the revised policy",
          "If the board was to consent, the department would then implement policy",
          "If the board is to consent, the department should implement the revised policy",
          "Were the board to consent, the department would implement the revised policy"
        ],
        correctAnswer: 3,
        explanation: "Formal hypothetical constructions often use the inverted subjunctive 'Were ... to' for conditional nuance."
      },
      {
        question: "Which statement best captures the strategic purpose of an internal memorandum?",
        options: [
          "Publicize corporate achievements and services to prospective external customers",
          "Communicate formal decisions, rationale, and required actions to internal stakeholders",
          "Record individual reflections for personal or archival use within a department",
          "Solicit informal feedback and casual suggestions from cross-functional teams"
        ],
        correctAnswer: 1,
        explanation: "Memos are formal internal documents used to convey decisions, rationale, and directives."
      },
      {
        question: "Which rhetorical approach most reliably persuades a skeptical professional audience?",
        options: [
          "Use emotive storytelling with vivid personal anecdotes throughout the argument",
          "Rely on authoritative-sounding jargon to establish domain credibility quickly",
          "Introduce dramatic forecasts and sweeping claims to emphasize urgency effectively",
          "Present a concise logical argument supported by relevant, verifiable evidence"
        ],
        correctAnswer: 3,
        explanation: "Skeptical professional audiences respond best to logic reinforced by credible evidence."
      },
      {
        question: "What principal difference should writers consider between business and academic prose?",
        options: [
          "Business prose must always use simpler vocabulary than academic prose consistently",
          "Business prose prioritizes action-oriented clarity; academic prose emphasizes conceptual analysis",
          "Academic prose is typically structured as memos with direct action items included",
          "Business prose avoids citation whereas academic prose never uses practical examples"
        ],
        correctAnswer: 1,
        explanation: "Business writing targets decisions and actions; academic writing focuses on argument and theory."
      },
      {
        question: "In time-sensitive incidents, what communication priority best preserves organizational credibility?",
        options: [
          "Wait for legal clearance before communicating any updates to avoid inaccuracies completely",
          "Release minimal statements to reduce speculation until investigations conclude successfully",
          "Deliver timely, accurate updates that transparently acknowledge what is known and unknown",
          "Route all external communications exclusively through executive leadership channels"
        ],
        correctAnswer: 2,
        explanation: "Transparency about knowns and unknowns, shared quickly, helps maintain trust during incidents."
      },
      {
        question: "Which use of hedging language is appropriate in a professional recommendation?",
        options: [
          "Avoid any qualifiers so recommendations appear decisive and authoritative",
          "Use hedging to shift responsibility away from the author entirely",
          "Insert long qualifying clauses to obscure the recommendation's weaknesses",
          "Frame projections with qualifiers that indicate uncertainty and conditionality"
        ],
        correctAnswer: 3,
        explanation: "Qualified language signals responsible caution and distinguishes evidence-based projection from certainty."
      },
      {
        question: "Which practice best demonstrates advanced intercultural communication competence?",
        options: [
          "Adopt a universal corporate voice and assume it will be understood globally",
          "Analyze cultural expectations and adapt register, examples, and protocols accordingly",
          "Rely on machine translation to convert messages into local languages effectively",
          "Limit interactions to third-party intermediaries who handle localization processes"
        ],
        correctAnswer: 1,
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
          "Limit company exposure by avoiding public acknowledgment of the failure completely",
          "Transfer all affected accounts to a separate team for lower-cost handling",
          "Restore customer trust by resolving the issue and offering remedies aligned to impact",
          "Implement punitive measures against frontline staff responsible for issues"
        ],
        correctAnswer: 2,
        explanation: "Effective recovery focuses on restoring trust through appropriate remedies and communication."
      },
      {
        question: "Which metric most directly indicates future revenue potential from existing customers?",
        options: [
          "Average handling time for support calls during peak contact periods",
          "Net promoter score from a single post-interaction survey assessment",
          "Rate of first-contact resolution measured during campaign launches",
          "Customer lifetime value and retention trajectory over repeat transactions"
        ],
        correctAnswer: 3,
        explanation: "CLV and retention trends better predict long-term revenue than single-interaction metrics."
      },
      {
        question: "How does the service gap model help design better customer experiences?",
        options: [
          "It prescribes ideal staffing levels for all customer contact channels worldwide",
          "It identifies mismatches between expected service and delivered service to guide improvements",
          "It provides a checklist for product bundling and up-sell opportunities",
          "It quantifies per-ticket costs to optimize operational budgets effectively"
        ],
        correctAnswer: 1,
        explanation: "The model isolates expectation-vs-delivery gaps to target interventions that improve experience."
      },
      {
        question: "When facing systemic failures, which managerial action is most appropriate?",
        options: [
          "Handle complaints individually without escalating for broader fixes",
          "Reduce published service options to simplify intake processes",
          "Outsource fault management to third parties to reduce internal burden",
          "Perform root-cause analysis and implement cross-functional corrective measures"
        ],
        correctAnswer: 3,
        explanation: "Systemic problems require organization-level analysis and coordinated solutions, not ad hoc fixes."
      },
      {
        question: "How should emotional intelligence be applied in a high-stress service escalation?",
        options: [
          "Prioritize scripted responses to ensure consistency and remove emotion from exchanges",
          "Recognize emotions, de-escalate using empathy, and align solutions to customer needs",
          "Delegate all escalations to senior agents regardless of their relationship with the customer",
          "Use selective disclosure to influence customer reactions and close the case quickly"
        ],
        correctAnswer: 1,
        explanation: "EI in escalations focuses on empathy, de-escalation, and outcome alignment to preserve relationships."
      },
      {
        question: "For strategic accounts, which service approach yields the highest long-term value?",
        options: [
          "Apply standardized enterprise processes designed for broad scalability and efficiency",
          "Reduce contact frequency to lower operational costs while automating touchpoints",
          "Deliver proactive, personalized engagement informed by account history and preferences",
          "Offer discount-driven campaigns to maintain transactional loyalty exclusively"
        ],
        correctAnswer: 2,
        explanation: "High-value accounts benefit most from tailored, proactive relationship management."
      },
      {
        question: "What is the primary purpose of customer journey mapping in service redesign?",
        options: [
          "Catalog customer complaints to build a reactive incident log for support teams",
          "Segment customers by demographic to create targeted marketing personas",
          "Inventory operational tasks to streamline internal workflows for staff",
          "Map end-to-end customer interactions to reveal friction points and improvement opportunities"
        ],
        correctAnswer: 3,
        explanation: "Journey maps expose cross-touchpoint friction and inform design changes to improve outcomes."
      },
      {
        question: "How should service teams adapt delivery for customers from diverse cultural backgrounds?",
        options: [
          "Translate standard service scripts verbatim to the customer's preferred language",
          "Customize interaction style, channels, and escalation protocols to align with cultural expectations",
          "Centralize service delivery to ensure uniform procedures for all customers",
          "Limit culturally specific accommodations to premium accounts only"
        ],
        correctAnswer: 1,
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
          "List every individual touched by the initiative to send the exact same communication",
          "Categorize stakeholders only by their geographic location for regional messaging purposes",
          "Assess stakeholders' interests, influence, and likely reactions to shape targeted messaging",
          "Rank stakeholders by seniority and default to leadership priorities first consistently"
        ],
        correctAnswer: 2,
        explanation: "Stakeholder analysis identifies influence and interests to tailor communication approaches effectively."
      },
      {
        question: "Which communication model is most effective for implementing major organizational change?",
        options: [
          "One-way broadcast communication that emphasizes speed and consistency effectively",
          "Top-down directive instructions delivered only by senior leadership exclusively",
          "Informal grapevine dissemination to quickly spread messages across teams widely",
          "Two-way dialogue with feedback loops that integrate stakeholder input into decisions"
        ],
        correctAnswer: 3,
        explanation: "Change succeeds when dialogue and feedback mechanisms allow adjustments and buy-in."
      },
      {
        question: "How does framing influence audience interpretation of complex information?",
        options: [
          "It eliminates all nuance so audiences accept the message without questioning completely",
          "It selects contextual cues and emphasis that shape how recipients interpret the same data",
          "It prioritizes sensational aspects to ensure maximum attention and reaction",
          "It standardizes technical terms to make all communications identical across units"
        ],
        correctAnswer: 1,
        explanation: "Framing controls context and emphasis, guiding interpretation without falsifying facts."
      },
      {
        question: "When stakeholder interests conflict, which communication approach maintains credibility?",
        options: [
          "Favor the most powerful stakeholder and avoid discussing alternatives publicly",
          "Delay discussions until consensus emerges within leadership to present a single position",
          "Delegate all stakeholder conflict communications to a third-party mediator exclusively",
          "Acknowledge differing perspectives and communicate transparently about trade-offs and rationale"
        ],
        correctAnswer: 3,
        explanation: "Transparency about trade-offs and rationale preserves trust across stakeholder groups."
      },
      {
        question: "What is the role of message architecture in organizational communications?",
        options: [
          "Create catchy slogans and taglines for all product marketing campaigns effectively",
          "Define core messages and supporting points that align communications to strategic goals",
          "Standardize every sentence across departments to ensure identical phrasing",
          "Limit communications to only digital channels to maximize reach and efficiency"
        ],
        correctAnswer: 1,
        explanation: "Message architecture provides the structured hierarchy of core messages aligned to objectives."
      },
      {
        question: "During a crisis, which communication strategy best serves organizational resilience?",
        options: [
          "Minimal public comment to avoid escalating stakeholder concerns unnecessarily",
          "Shift all communications to legal counsel to reduce reputational risk exposure",
          "Proactive transparency with frequent updates that include actions taken and next steps",
          "Announce decisions only after internal investigations are fully concluded"
        ],
        correctAnswer: 2,
        explanation: "Proactive, factual updates reduce rumor, manage expectations, and support resilience."
      },
      {
        question: "How should communicators select channels for strategic messaging?",
        options: [
          "Use the broadest-reaching channel available for any strategic message regardless of nuance",
          "Prefer internal newsletters for all external stakeholder communications by default",
          "Rely solely on social media for immediacy and assume audiences will follow there",
          "Match channels to audience preferences, message complexity, and the need for interaction"
        ],
        correctAnswer: 3,
        explanation: "Channel selection must reflect audience habits and whether two-way engagement is required."
      },
      {
        question: "Which evaluation best measures the effectiveness of a strategic communication program?",
        options: [
          "Count impressions and raw message delivery numbers across platforms",
          "Assess audience understanding, behavioral outcomes, and alignment with stated objectives",
          "Track only media mentions and tone regardless of stakeholder action",
          "Monitor social engagement metrics as the primary indicator of success"
        ],
        correctAnswer: 1,
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
          "Provide a detailed task-level schedule and every team member's daily assignments",
          "Act as the final technical specification for developers to follow during execution",
          "Formally authorize the project and outline its objectives, scope, and sponsor authority",
          "Record vendor agreements and invoice schedules for procurement teams systematically"
        ],
        correctAnswer: 2,
        explanation: "A charter authorizes the project and defines objectives, scope boundaries and sponsor authority."
      },
      {
        question: "Which methodology best suits projects with high uncertainty and frequent requirement changes?",
        options: [
          "A traditional waterfall model with strict phase gates and upfront complete planning",
          "A rigid control-based approach focused on minimizing scope adjustments completely",
          "A documentation-heavy Six Sigma approach focused on process measurement exclusively",
          "Iterative, adaptive approaches such as agile frameworks that support incremental delivery"
        ],
        correctAnswer: 3,
        explanation: "Adaptive methods manage changing requirements through iterative delivery and feedback."
      },
      {
        question: "What is the objective of stakeholder engagement planning in projects?",
        options: [
          "Exclude minor stakeholders to reduce the complexity of communication plans completely",
          "Identify stakeholder expectations and plan communications and involvement to manage them",
          "Assign all stakeholder interactions to the project sponsor to centralize control",
          "Create static reports that list stakeholders without scheduling engagement activities"
        ],
        correctAnswer: 1,
        explanation: "Engagement planning maps expectations to involvement and communications to mitigate risk."
      },
      {
        question: "How should a project manager address scope creep without damaging relationships?",
        options: [
          "Accept all stakeholder requests immediately to preserve goodwill and avoid conflict",
          "Ignore additional requests and proceed with the original plan unquestioned completely",
          "Defer all scope decisions to external consultants to avoid internal disputes entirely",
          "Evaluate requested changes against objectives and use formal change control to decide"
        ],
        correctAnswer: 3,
        explanation: "Formal change control balances stakeholder needs with project constraints and scope integrity."
      },
      {
        question: "How should risk management be integrated into strategic project planning?",
        options: [
          "Concentrate only on the largest financial risks and ignore lower-impact items completely",
          "Identify, assess, and prepare response strategies for both threats and opportunities",
          "Postpone risk identification until initial delivery milestones are achieved successfully",
          "Transfer all risk to contractors regardless of feasibility or cost considerations"
        ],
        correctAnswer: 1,
        explanation: "Comprehensive risk management addresses both negative and positive uncertainties proactively."
      },
      {
        question: "Which success metric best reflects strategic value from a completed project?",
        options: [
          "Strict adherence to the baseline schedule and original task estimates consistently",
          "Completing the project under the approved budget at all costs without exception",
          "Achievement of strategic objectives and measurable business value realization",
          "High internal team satisfaction scores irrespective of business outcomes entirely"
        ],
        correctAnswer: 2,
        explanation: "Strategic success is measured by delivering intended business value and objectives."
      },
      {
        question: "What is the purpose of a lessons learned review at project close?",
        options: [
          "Assign blame for failures so that personnel decisions can be made quickly and decisively",
          "Compile an archival report of budgets and invoices for audit purposes systematically",
          "Include only positive feedback to boost team morale and avoid criticism completely",
          "Capture insights and practical recommendations to improve future project performance"
        ],
        correctAnswer: 3,
        explanation: "Lessons learned aim to create actionable improvements, not to assign blame or simply archive data."
      },
      {
        question: "How should managers balance competing project constraints when priorities conflict?",
        options: [
          "Always prioritize schedule adherence regardless of other business impacts completely",
          "Analyze trade-offs among cost, scope, time and align decisions with strategic priorities",
          "Reduce quality standards to meet budget constraints immediately without consideration",
          "Pass all constraint trade-off decisions upward to executive leadership without analysis"
        ],
        correctAnswer: 1,
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
          "Provide an exhaustive implementation-level specification for every module and class systematically",
          "Ensure the codebase uses the latest frameworks and trending technologies consistently",
          "Define the high-level structure and organizing principles that enable evolution and scalability",
          "Centralize all development decisions under a single architectural authority completely"
        ],
        correctAnswer: 2,
        explanation: "Architecture sets organizing principles and structure to support long-term scalability and change."
      },
      {
        question: "Which architecture style best supports independent scaling of components in large web systems?",
        options: [
          "A tightly integrated monolith deployed as a single artifact for simplicity and efficiency",
          "Peer-to-peer design where each node shares identical responsibilities and state consistently",
          "Client-heavy single-page applications that push complexity to browsers systematically",
          "Microservices architecture that separates concerns into independently deployable services"
        ],
        correctAnswer: 3,
        explanation: "Microservices allow targeted scaling and independent deployment of service components."
      },
      {
        question: "What value do design patterns provide in system architecture and development?",
        options: [
          "Guarantee bug-free code by enforcing a fixed set of implementation patterns consistently",
          "Offer proven structural and behavioral templates that improve maintainability and reuse",
          "Force teams to use identical coding styles regardless of problem context completely",
          "Accelerate delivery by replacing design with off-the-shelf components always systematically"
        ],
        correctAnswer: 1,
        explanation: "Patterns provide reusable solutions for common problems, improving maintainability when applied wisely."
      },
      {
        question: "Which approach is most appropriate for managing significant technical debt in a product?",
        options: [
          "Ignore the debt until it causes an unavoidable production outage completely",
          "Immediately halt all feature work until the entire codebase is refactored systematically",
          "Balance refactoring efforts against delivery needs and plan prioritized remediation cycles",
          "Outsource the debt cleanup to junior contractors without oversight or guidance"
        ],
        correctAnswer: 2,
        explanation: "Systematic prioritization allows debt reduction while maintaining delivery momentum."
      },
      {
        question: "What is the key goal of system integration testing within an architecture lifecycle?",
        options: [
          "Focus only on unit tests for each component in isolation to guarantee correctness completely",
          "Measure runtime performance of the full system under production load exclusively",
          "Satisfy compliance checklists without exercising real integration scenarios systematically",
          "Verify that independently developed components work together and meet integration requirements"
        ],
        correctAnswer: 3,
        explanation: "Integration tests validate interactions and interfaces among components, not just isolated units."
      },
      {
        question: "Which leadership approach best improves technical team performance sustainably?",
        options: [
          "Drive output solely through strict deadlines and individual productivity targets consistently",
          "Cultivate technical excellence, cross-team collaboration, and continuous learning practices",
          "Reduce investment in training to force on-the-job learning under pressure exclusively",
          "Rely only on performance bonuses to elicit higher engineering results systematically"
        ],
        correctAnswer: 1,
        explanation: "Sustainable performance combines technical standards with collaboration and ongoing development."
      },
      {
        question: "Why is thoughtful API design critical in modern system architecture?",
        options: [
          "APIs primarily serve to hide internal systems and should be limited in surface area completely",
          "APIs exist mostly for documentation purposes rather than runtime integration goals specifically",
          "APIs expose stable contracts for interoperability, enabling maintainability and developer efficiency",
          "APIs should always be as feature-rich as possible to avoid future changes systematically"
        ],
        correctAnswer: 2,
        explanation: "Well-designed APIs define stable integration points that enable independent evolution and reuse."
      },
      {
        question: "How should technology selection be performed for long-lived architectural initiatives?",
        options: [
          "Always adopt the newest technology to demonstrate technical leadership and innovation consistently",
          "Select tools based solely on current team familiarity to minimize short-term ramp-up completely",
          "Outsource selection decisions to vendors who can guarantee long-term pricing systematically",
          "Evaluate fit against requirements, team capability, ecosystem maturity, and long-term support"
        ],
        correctAnswer: 3,
        explanation: "Selection requires balancing requirements, team skills, and ecosystem sustainability over time."
      }
    ]
  },

  {
    title: "Web3 Fundamentals & Blockchain Essentials",
    description: "Comprehensive assessment of blockchain technology, cryptocurrency fundamentals, DeFi protocols, and Web3 ecosystem understanding. Tests foundational knowledge essential for Web3 projects.",
    category: "technical",
    difficulty: "intermediate",
    timeLimit: 30,
    passingScore: 80,
    badge: {
      name: "Web3 Fundamentals Expert",
      description: "Demonstrates solid understanding of blockchain technology and Web3 ecosystem",
      icon: "🔗",
      color: "#6366F1"
    },
    questions: [
      {
        question: "What is the primary innovation that blockchain technology introduced to digital transactions?",
        options: [
          "Distributed, tamper-resistant record-keeping that eliminates the need for trusted intermediaries",
          "Decentralized, immutable record-keeping without requiring trust in a central authority",
          "Centralized, secure record-keeping that improves upon traditional database systems significantly",
          "Peer-to-peer, encrypted record-keeping that enhances privacy and confidentiality completely"
        ],
        correctAnswer: 1,
        explanation: "Blockchain's core innovation is creating trustless, decentralized systems where no single entity controls the data."
      },
      {
        question: "What is the main purpose of consensus mechanisms in blockchain networks?",
        options: [
          "Accelerate transaction validation by optimizing computational efficiency across the network",
          "Minimize energy consumption by implementing eco-friendly validation protocols systematically",
          "Ensure all network participants agree on the current state of the blockchain without requiring trust",
          "Establish hierarchical decision-making structures within the blockchain ecosystem completely"
        ],
        correctAnswer: 2,
        explanation: "Consensus mechanisms enable decentralized networks to maintain agreement on transaction validity and blockchain state."
      },
      {
        question: "What is the key difference between Layer 1 and Layer 2 blockchain solutions?",
        options: [
          "Layer 1 focuses on smart contract execution while Layer 2 handles basic transaction processing",
          "Layer 1 serves institutional clients while Layer 2 targets retail and consumer applications",
          "Layer 1 prioritizes security features while Layer 2 emphasizes speed and efficiency exclusively",
          "Layer 1 is the base blockchain protocol, while Layer 2 builds on top to improve scalability and reduce costs"
        ],
        correctAnswer: 3,
        explanation: "Layer 2 solutions extend Layer 1 blockchains to address scalability limitations while maintaining security."
      },
      {
        question: "What is the primary function of smart contracts in the Web3 ecosystem?",
        options: [
          "Execute predefined logic automatically when specific conditions are met, without human intervention",
          "Provide comprehensive legal frameworks for blockchain-based business agreements systematically",
          "Optimize data storage and retrieval processes within distributed networks efficiently",
          "Create intuitive user interfaces for blockchain application interactions seamlessly"
        ],
        correctAnswer: 0,
        explanation: "Smart contracts are self-executing programs that automatically enforce agreements when conditions are satisfied."
      },
      {
        question: "What is the main purpose of tokenomics in a cryptocurrency project?",
        options: [
          "Establish initial token pricing strategies during public offering events systematically",
          "Determine maximum token supply limits and inflationary mechanisms comprehensively",
          "Define the economic model, token distribution, and incentives that drive the project's ecosystem",
          "Create market liquidity through strategic exchange partnerships and integrations"
        ],
        correctAnswer: 2,
        explanation: "Tokenomics creates the economic framework that incentivizes participation and sustains the project's ecosystem."
      },
      {
        question: "What is the primary benefit of DeFi (Decentralized Finance) protocols?",
        options: [
          "Ensure guaranteed returns that exceed traditional financial market performance consistently",
          "Remove regulatory compliance requirements for financial service operations completely",
          "Enable completely anonymous financial transactions with enhanced privacy protection",
          "Provide financial services without intermediaries, reducing costs and increasing accessibility"
        ],
        correctAnswer: 3,
        explanation: "DeFi removes intermediaries to create more accessible, transparent, and cost-effective financial services."
      },
      {
        question: "What is the purpose of gas fees in blockchain networks like Ethereum?",
        options: [
          "Compensate network validators for processing transactions and preventing spam effectively",
          "Generate sustainable revenue streams for blockchain development and maintenance systematically",
          "Create economic incentives that drive token value appreciation over time consistently",
          "Support ecosystem growth through funding for community and marketing initiatives"
        ],
        correctAnswer: 0,
        explanation: "Gas fees incentivize validators to process transactions and prevent network spam by making attacks costly."
      },
      {
        question: "What is the key innovation of NFTs (Non-Fungible Tokens) in the digital economy?",
        options: [
          "Enhance data security through advanced cryptographic identity management systems",
          "Improve transaction processing speeds for digital content and media files significantly",
          "Enable true digital ownership and scarcity of unique digital assets on blockchain networks",
          "Eliminate intellectual property concerns through automated copyright enforcement completely"
        ],
        correctAnswer: 2,
        explanation: "NFTs create verifiable ownership and scarcity for digital assets, enabling new forms of digital commerce."
      }
    ]
  },

  {
    title: "Community Building & Management",
    description: "Comprehensive assessment of community development strategies, engagement techniques, moderation best practices, and growth tactics for online communities. Tests essential skills for building and managing thriving communities.",
    category: "communication",
    difficulty: "intermediate",
    timeLimit: 30,
    passingScore: 80,
    badge: {
      name: "Community Builder",
      description: "Demonstrates expertise in community development, engagement, and management",
      icon: "👥",
      color: "#10B981"
    },
    questions: [
      {
        question: "What is the most important first step when building a new online community?",
        options: [
          "Establish comprehensive social media presence across multiple platforms for maximum visibility",
          "Define clear community purpose, values, and target audience before launching systematically",
          "Implement rapid member acquisition strategies to achieve critical mass quickly and effectively",
          "Deploy automated content management systems to ensure consistent engagement continuously"
        ],
        correctAnswer: 1,
        explanation: "Clear purpose and values provide the foundation that guides all community decisions and attracts the right members."
      },
      {
        question: "What is the primary goal of community moderation in online spaces?",
        options: [
          "Eliminate all potentially negative interactions to maintain a positive atmosphere consistently",
          "Implement comprehensive rule enforcement to minimize administrative burden systematically",
          "Maintain a safe, inclusive environment that aligns with community values and guidelines",
          "Restrict controversial discussions to prevent potential legal complications completely"
        ],
        correctAnswer: 2,
        explanation: "Effective moderation balances free expression with safety, ensuring the community remains welcoming and productive."
      },
      {
        question: "What is the key principle of community engagement that drives long-term member retention?",
        options: [
          "Provide financial rewards and incentives for active community participation consistently",
          "Establish mandatory participation requirements for community events and discussions",
          "Prioritize member acquisition over the quality of existing member interactions completely",
          "Create value for members through meaningful interactions, content, and opportunities"
        ],
        correctAnswer: 3,
        explanation: "Sustainable engagement comes from providing genuine value that members can't find elsewhere."
      },
      {
        question: "What is the most effective approach to handling conflicts within a community?",
        options: [
          "Address issues promptly, fairly, and transparently while maintaining community guidelines",
          "Minimize attention to minor conflicts to prevent escalation and maintain harmony completely",
          "Evaluate conflicts based on member contribution levels and community seniority systematically",
          "Implement immediate disciplinary actions against all parties involved in conflicts"
        ],
        correctAnswer: 0,
        explanation: "Fair, consistent conflict resolution builds trust and shows members that the community is well-managed."
      },
      {
        question: "What is the purpose of community guidelines and how should they be developed?",
        options: [
          "Establish legal safeguards for community administrators against potential litigation systematically",
          "Implement comprehensive restrictions to minimize administrative overhead and moderation requirements",
          "Establish clear expectations for behavior that reflect community values and goals",
          "Adopt proven guidelines from successful communities to expedite implementation processes"
        ],
        correctAnswer: 2,
        explanation: "Guidelines should be tailored to your community's specific purpose and values, not generic rules."
      },
      {
        question: "What is the most effective strategy for growing a community organically?",
        options: [
          "Implement comprehensive marketing campaigns across all available social media channels",
          "Establish financial incentive programs for member referrals and new sign-ups systematically",
          "Acquire member databases and implement mass invitation campaigns systematically",
          "Focus on quality content and member experiences that encourage word-of-mouth referrals"
        ],
        correctAnswer: 3,
        explanation: "Organic growth comes from creating such value that existing members naturally invite others to join."
      },
      {
        question: "What is the key to maintaining community engagement during periods of low activity?",
        options: [
          "Provide consistent value through quality content, events, and member recognition",
          "Relax moderation standards to encourage more dynamic and controversial discussions",
          "Shift focus toward member acquisition rather than engaging existing community members",
          "Implement comprehensive automation to maintain consistent activity levels without human intervention"
        ],
        correctAnswer: 0,
        explanation: "Consistent value delivery keeps members engaged even during natural activity fluctuations."
      },
      {
        question: "What is the most important metric for measuring community health beyond member count?",
        options: [
          "Quantitative measurement of daily and weekly post and comment generation systematically",
          "Member engagement rates, retention, and quality of interactions within the community",
          "Analytical tracking of new member acquisition and registration rates consistently",
          "Financial assessment of community monetization and revenue generation comprehensively"
        ],
        correctAnswer: 1,
        explanation: "Engagement and retention indicate whether members find value and want to stay active in the community."
      }
    ]
  }
];

module.exports = skillTests;
