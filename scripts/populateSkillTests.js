const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aquads', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const SkillTest = require('../server/models/SkillTest');

const skillTests = [
  {
    title: "English Proficiency Test",
    description: "Test your English grammar, vocabulary, and business communication skills. This test covers essential language skills needed for professional communication with clients.",
    category: "english",
    difficulty: "intermediate",
    timeLimit: 25,
    passingScore: 80,
    badge: {
      name: "English Proficient",
      description: "Demonstrates strong English communication skills",
      icon: "📚",
      color: "#3B82F6"
    },
    questions: [
      {
        question: "Which sentence demonstrates correct business email etiquette?",
        options: [
          "Hey, I need this done ASAP!",
          "Dear Mr. Johnson, I hope this email finds you well. I am writing to follow up on our previous discussion regarding the project timeline.",
          "Hi there, just checking in about the thing we talked about.",
          "Yo, what's up with that project?"
        ],
        correctAnswer: 1,
        explanation: "Professional business emails should use formal greetings, proper grammar, and clear, respectful language."
      },
      {
        question: "Choose the correct form: 'The team _____ working on the project for three weeks.'",
        options: ["has been", "have been", "is been", "are been"],
        correctAnswer: 0,
        explanation: "Use 'has been' with singular subjects like 'team' when referring to a group as a single unit."
      },
      {
        question: "What is the best way to handle a client complaint?",
        options: [
          "Ignore it and hope it goes away",
          "Respond defensively to protect your reputation",
          "Listen actively, acknowledge the issue, and propose a solution",
          "Blame someone else for the problem"
        ],
        correctAnswer: 2,
        explanation: "Active listening, acknowledgment, and problem-solving are key to effective complaint resolution."
      },
      {
        question: "Which word is a synonym for 'efficient'?",
        options: ["slow", "productive", "expensive", "difficult"],
        correctAnswer: 1,
        explanation: "Productive means achieving results effectively, similar to efficient."
      },
      {
        question: "In professional writing, which is preferred?",
        options: [
          "I'm gonna finish this project soon.",
          "I will complete this project by the deadline.",
          "I'll get it done when I can.",
          "This project is almost done."
        ],
        correctAnswer: 1,
        explanation: "Professional writing should use complete sentences and formal language."
      },
      {
        question: "What does 'ASAP' stand for in business communication?",
        options: [
          "As Soon As Possible",
          "Always Stay Alert and Prepared",
          "At Some Appropriate Point",
          "After Some Additional Planning"
        ],
        correctAnswer: 0,
        explanation: "ASAP is a common business abbreviation for 'As Soon As Possible'."
      },
      {
        question: "Which sentence uses correct punctuation?",
        options: [
          "The meeting is scheduled for 2:00 PM, please arrive on time.",
          "The meeting is scheduled for 2:00 PM please arrive on time.",
          "The meeting is scheduled for 2:00 PM; please arrive on time.",
          "The meeting is scheduled for 2:00 PM. please arrive on time."
        ],
        correctAnswer: 2,
        explanation: "Use a semicolon to connect two related independent clauses."
      },
      {
        question: "What is the purpose of a follow-up email?",
        options: [
          "To waste the client's time",
          "To show you're busy",
          "To maintain communication and ensure project progress",
          "To avoid doing actual work"
        ],
        correctAnswer: 2,
        explanation: "Follow-up emails help maintain professional relationships and keep projects on track."
      },
      {
        question: "Choose the most professional response to 'When will this be ready?'",
        options: [
          "I don't know, maybe soon?",
          "I'm working on it, chill out!",
          "I expect to complete this by Friday, March 15th. I'll send you an update by Wednesday.",
          "It'll be done when it's done."
        ],
        correctAnswer: 2,
        explanation: "Professional responses should be specific, timely, and respectful."
      },
      {
        question: "What is the best way to end a professional email?",
        options: [
          "See ya later!",
          "Best regards,",
          "TTYL,",
          "Peace out,"
        ],
        correctAnswer: 1,
        explanation: "'Best regards' is a professional and widely accepted email closing."
      }
    ]
  },
  {
    title: "Customer Service Best Practices",
    description: "Master the fundamentals of excellent customer service including complaint handling, communication skills, and problem-solving techniques.",
    category: "customer-service",
    difficulty: "beginner",
    timeLimit: 20,
    passingScore: 80,
    badge: {
      name: "Customer Service Expert",
      description: "Demonstrates excellent customer service skills",
      icon: "🎧",
      color: "#10B981"
    },
    questions: [
      {
        question: "What is the first step when handling a customer complaint?",
        options: [
          "Immediately offer a refund",
          "Listen actively and acknowledge the customer's feelings",
          "Defend your company's position",
          "Transfer the call to someone else"
        ],
        correctAnswer: 1,
        explanation: "Active listening and acknowledgment show the customer you care about their concerns."
      },
      {
        question: "Which response demonstrates empathy?",
        options: [
          "I understand how frustrating this must be for you.",
          "That's not our policy.",
          "You should have read the terms first.",
          "I can't help you with that."
        ],
        correctAnswer: 0,
        explanation: "Empathy involves understanding and acknowledging the customer's emotional state."
      },
      {
        question: "What should you do if you don't know the answer to a customer's question?",
        options: [
          "Make up an answer",
          "Tell them to figure it out themselves",
          "Find someone who knows the answer or research it",
          "Ignore the question"
        ],
        correctAnswer: 2,
        explanation: "It's better to find the correct answer than to provide incorrect information."
      },
      {
        question: "How should you handle an angry customer?",
        options: [
          "Match their anger level",
          "Stay calm, listen, and work toward a solution",
          "Hang up on them",
          "Tell them to calm down"
        ],
        correctAnswer: 1,
        explanation: "Staying calm helps de-escalate the situation and find a resolution."
      },
      {
        question: "What is the 'golden rule' of customer service?",
        options: [
          "The customer is always right",
          "Treat others as you would like to be treated",
          "Always make the sale",
          "Never admit mistakes"
        ],
        correctAnswer: 1,
        explanation: "The golden rule applies to customer service - treat customers with the same respect you'd want."
      },
      {
        question: "When should you follow up with a customer?",
        options: [
          "Never",
          "Only when they complain",
          "After resolving their issue to ensure satisfaction",
          "Only on holidays"
        ],
        correctAnswer: 2,
        explanation: "Follow-up shows you care about their satisfaction and can prevent future issues."
      },
      {
        question: "What is the best way to apologize to a customer?",
        options: [
          "Say 'sorry' quickly and move on",
          "Take responsibility, express genuine regret, and offer a solution",
          "Blame someone else",
          "Ignore the problem"
        ],
        correctAnswer: 1,
        explanation: "A proper apology includes taking responsibility and offering solutions."
      },
      {
        question: "How should you handle a customer who is being unreasonable?",
        options: [
          "Tell them they're being unreasonable",
          "Stay professional, set boundaries, and escalate if necessary",
          "Give in to all their demands",
          "Argue with them"
        ],
        correctAnswer: 1,
        explanation: "Maintain professionalism while setting appropriate boundaries."
      },
      {
        question: "What is active listening?",
        options: [
          "Waiting for your turn to speak",
          "Fully concentrating on what the customer is saying",
          "Interrupting to provide solutions",
          "Thinking about your response while they talk"
        ],
        correctAnswer: 1,
        explanation: "Active listening involves full attention and understanding of the customer's message."
      },
      {
        question: "Why is it important to exceed customer expectations?",
        options: [
          "It's not important",
          "It creates loyal customers and positive word-of-mouth",
          "It's required by law",
          "It makes your job easier"
        ],
        correctAnswer: 1,
        explanation: "Exceeding expectations builds customer loyalty and generates positive referrals."
      }
    ]
  },
  {
    title: "Communication Skills Assessment",
    description: "Test your professional communication skills including writing, active listening, and conflict resolution abilities.",
    category: "communication",
    difficulty: "intermediate",
    timeLimit: 30,
    passingScore: 80,
    badge: {
      name: "Communication Pro",
      description: "Demonstrates strong professional communication skills",
      icon: "💬",
      color: "#8B5CF6"
    },
    questions: [
      {
        question: "What is the most important element of effective communication?",
        options: [
          "Speaking quickly",
          "Using complex vocabulary",
          "Ensuring the message is understood",
          "Being brief"
        ],
        correctAnswer: 2,
        explanation: "Effective communication is measured by whether the message is understood by the recipient."
      },
      {
        question: "How should you handle a conflict with a client?",
        options: [
          "Avoid them completely",
          "Address it directly, listen to their perspective, and find common ground",
          "Blame them for the problem",
          "Ignore the conflict"
        ],
        correctAnswer: 1,
        explanation: "Direct, respectful conflict resolution leads to better relationships and solutions."
      },
      {
        question: "What is the purpose of a project brief?",
        options: [
          "To waste time",
          "To clearly define project goals, scope, and expectations",
          "To make the client happy",
          "To avoid doing work"
        ],
        correctAnswer: 1,
        explanation: "A project brief ensures all parties understand the project requirements and expectations."
      },
      {
        question: "When writing a professional email, what should you include in the subject line?",
        options: [
          "Your name only",
          "A clear, specific description of the email's purpose",
          "The word 'urgent'",
          "Nothing"
        ],
        correctAnswer: 1,
        explanation: "A clear subject line helps recipients understand the email's purpose and priority."
      },
      {
        question: "What is the best way to give constructive feedback?",
        options: [
          "Be harsh and direct",
          "Use the sandwich method: positive, improvement, positive",
          "Only point out problems",
          "Avoid giving feedback"
        ],
        correctAnswer: 1,
        explanation: "The sandwich method helps maintain relationships while providing helpful feedback."
      },
      {
        question: "How should you respond to negative feedback?",
        options: [
          "Defend yourself immediately",
          "Listen, ask clarifying questions, and thank them for the feedback",
          "Ignore it",
          "Complain to others"
        ],
        correctAnswer: 1,
        explanation: "Professional responses to feedback show maturity and a desire to improve."
      },
      {
        question: "What is the purpose of active listening?",
        options: [
          "To prepare your response",
          "To fully understand the speaker's message and perspective",
          "To show you're paying attention",
          "To interrupt with solutions"
        ],
        correctAnswer: 1,
        explanation: "Active listening ensures you understand the complete message before responding."
      },
      {
        question: "When should you use written vs. verbal communication?",
        options: [
          "Always use written",
          "Always use verbal",
          "Use written for complex information, verbal for quick updates",
          "It doesn't matter"
        ],
        correctAnswer: 2,
        explanation: "Choose the communication method based on the complexity and urgency of the information."
      },
      {
        question: "What is the best way to end a difficult conversation?",
        options: [
          "Walk away abruptly",
          "Summarize key points and agree on next steps",
          "Change the subject",
          "Ignore the other person"
        ],
        correctAnswer: 1,
        explanation: "Summarizing and agreeing on next steps ensures clarity and follow-through."
      },
      {
        question: "How can you improve your communication skills?",
        options: [
          "Practice active listening and seek feedback",
          "Speak louder",
          "Use more complex words",
          "Talk more often"
        ],
        correctAnswer: 0,
        explanation: "Continuous improvement comes from practice and feedback from others."
      }
    ]
  },
  {
    title: "Project Management Basics",
    description: "Test your understanding of fundamental project management concepts including planning, organization, and time management.",
    category: "project-management",
    difficulty: "beginner",
    timeLimit: 25,
    passingScore: 80,
    badge: {
      name: "Project Manager",
      description: "Demonstrates basic project management skills",
      icon: "📋",
      color: "#F59E0B"
    },
    questions: [
      {
        question: "What is the first step in project management?",
        options: [
          "Start working immediately",
          "Define the project scope and objectives",
          "Set a deadline",
          "Hire team members"
        ],
        correctAnswer: 1,
        explanation: "Clear scope and objectives provide direction for the entire project."
      },
      {
        question: "What is a project milestone?",
        options: [
          "A problem in the project",
          "A significant point or event in the project timeline",
          "The end of the project",
          "A team meeting"
        ],
        correctAnswer: 1,
        explanation: "Milestones help track progress and keep projects on schedule."
      },
      {
        question: "Why is time management important in projects?",
        options: [
          "To avoid working",
          "To meet deadlines and stay within budget",
          "To impress clients",
          "To make the project longer"
        ],
        correctAnswer: 1,
        explanation: "Effective time management ensures projects are completed on time and within budget."
      },
      {
        question: "What should you do if a project is behind schedule?",
        options: [
          "Ignore it",
          "Communicate with stakeholders and adjust the plan",
          "Blame the client",
          "Give up"
        ],
        correctAnswer: 1,
        explanation: "Proactive communication and plan adjustment help manage delays effectively."
      },
      {
        question: "What is the purpose of a project timeline?",
        options: [
          "To waste time",
          "To visualize project phases and deadlines",
          "To make the project longer",
          "To confuse team members"
        ],
        correctAnswer: 1,
        explanation: "Timelines help everyone understand project phases and deadlines."
      },
      {
        question: "How should you prioritize project tasks?",
        options: [
          "Do whatever you feel like",
          "Based on urgency, importance, and dependencies",
          "Only do easy tasks first",
          "Ignore priorities"
        ],
        correctAnswer: 1,
        explanation: "Effective prioritization considers urgency, importance, and task dependencies."
      },
      {
        question: "What is scope creep?",
        options: [
          "A type of project",
          "Uncontrolled changes or additions to project scope",
          "A project management tool",
          "A team member"
        ],
        correctAnswer: 1,
        explanation: "Scope creep can derail projects and should be managed carefully."
      },
      {
        question: "Why is documentation important in project management?",
        options: [
          "To waste time",
          "To provide reference, accountability, and knowledge transfer",
          "To make the project longer",
          "To confuse people"
        ],
        correctAnswer: 1,
        explanation: "Documentation ensures knowledge is preserved and can be shared with others."
      },
      {
        question: "What should you do when a project is completed?",
        options: [
          "Forget about it",
          "Conduct a review to learn from the experience",
          "Start the next project immediately",
          "Take a long vacation"
        ],
        correctAnswer: 1,
        explanation: "Project reviews help improve future projects and processes."
      },
      {
        question: "How can you improve project organization?",
        options: [
          "Use project management tools and clear communication",
          "Work harder",
          "Ignore organization",
          "Do everything at the last minute"
        ],
        correctAnswer: 0,
        explanation: "Tools and clear communication are key to effective project organization."
      }
    ]
  },
  {
    title: "Technical Skills Assessment",
    description: "Test your knowledge of web development, design principles, and technical concepts commonly used in freelancing.",
    category: "technical",
    difficulty: "intermediate",
    timeLimit: 30,
    passingScore: 80,
    badge: {
      name: "Technical Expert",
      description: "Demonstrates strong technical skills and knowledge",
      icon: "💻",
      color: "#EF4444"
    },
    questions: [
      {
        question: "What is responsive design?",
        options: [
          "A design that responds to user clicks",
          "A design that adapts to different screen sizes and devices",
          "A design that changes colors",
          "A design that moves around"
        ],
        correctAnswer: 1,
        explanation: "Responsive design ensures websites work well on all devices and screen sizes."
      },
      {
        question: "What is the purpose of version control?",
        options: [
          "To make code longer",
          "To track changes and collaborate on code",
          "To delete code",
          "To slow down development"
        ],
        correctAnswer: 1,
        explanation: "Version control helps track changes and enables team collaboration."
      },
      {
        question: "What is the difference between frontend and backend development?",
        options: [
          "There is no difference",
          "Frontend is what users see, backend is server-side logic",
          "Frontend is harder than backend",
          "Backend is more important"
        ],
        correctAnswer: 1,
        explanation: "Frontend handles user interface, backend handles server-side processing and data."
      },
      {
        question: "What is the purpose of testing in software development?",
        options: [
          "To waste time",
          "To ensure code works correctly and catch bugs early",
          "To make the project longer",
          "To impress clients"
        ],
        correctAnswer: 1,
        explanation: "Testing helps ensure quality and catch issues before they reach users."
      },
      {
        question: "What is the importance of documentation in technical projects?",
        options: [
          "It's not important",
          "It helps others understand and maintain the code",
          "It makes the code longer",
          "It's required by law"
        ],
        correctAnswer: 1,
        explanation: "Good documentation makes code maintainable and helps team collaboration."
      },
      {
        question: "What is the purpose of APIs?",
        options: [
          "To make websites slower",
          "To enable different systems to communicate and share data",
          "To hide information",
          "To make development harder"
        ],
        correctAnswer: 1,
        explanation: "APIs allow different applications to communicate and share functionality."
      },
      {
        question: "What is the importance of security in web development?",
        options: [
          "It's not important",
          "To protect user data and prevent attacks",
          "To make websites slower",
          "To impress developers"
        ],
        correctAnswer: 1,
        explanation: "Security is crucial to protect user data and maintain trust."
      },
      {
        question: "What is the purpose of optimization in web development?",
        options: [
          "To make websites slower",
          "To improve performance and user experience",
          "To make code longer",
          "To waste time"
        ],
        correctAnswer: 1,
        explanation: "Optimization improves loading times and user experience."
      },
      {
        question: "What is the importance of accessibility in web design?",
        options: [
          "It's not important",
          "To ensure websites are usable by people with disabilities",
          "To make websites look better",
          "To follow trends"
        ],
        correctAnswer: 1,
        explanation: "Accessibility ensures websites are usable by everyone, including people with disabilities."
      },
      {
        question: "What is the purpose of debugging?",
        options: [
          "To create bugs",
          "To find and fix errors in code",
          "To make code longer",
          "To waste time"
        ],
        correctAnswer: 1,
        explanation: "Debugging is essential for finding and fixing code errors."
      }
    ]
  }
];

async function populateSkillTests() {
  try {
    console.log('Starting to populate skill tests...');
    
    // Clear existing tests
    await SkillTest.deleteMany({});
    console.log('Cleared existing skill tests');
    
    // Insert new tests
    const insertedTests = await SkillTest.insertMany(skillTests);
    console.log(`Successfully inserted ${insertedTests.length} skill tests`);
    
    // Log the inserted tests
    insertedTests.forEach(test => {
      console.log(`- ${test.title} (${test.category})`);
    });
    
    console.log('Skill tests population completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error populating skill tests:', error);
    process.exit(1);
  }
}

populateSkillTests();
