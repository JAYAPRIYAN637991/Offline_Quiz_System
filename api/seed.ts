import { AdminNotification } from './models/AdminNotification.js';
import { QuestionBank } from './models/QuestionBank.js';
import { Exam } from './models/Exam.js';
import { CandidateUser, AdminUser } from './models/User.js';
import { PortalSettings } from './models/PortalSettings.js';
import { Exam as IExam, QuestionBank as IQuestionBank } from '../src/types.js';

const serverQuestionBanks: IQuestionBank[] = [
  {
    id: "bank-cybersecurity",
    name: "Cybersecurity & Cryptography Bank",
    subject: "Computer Science",
    topic: "Security",
    createdAt: Date.now(),
    questions: [
      // Easy
      {
        id: "cyber-e1",
        text: "What does HTTPS stand for in web browsing?",
        options: [
          "Hypertext Transfer Protocol Secure",
          "High-speed Transmission Process System",
          "Hyperlink Text Privacy Service",
          "Host Transfer Protocol Site"
        ],
        correctOptionIndex: 0,
        difficulty: "Easy",
        subject: "Computer Science",
        topic: "Security"
      },
      {
        id: "cyber-e2",
        text: "Which of the following is considered a secure password practice?",
        options: [
          "Using your birth year as the password",
          "Reusing the same password across all websites",
          "Using a combination of uppercase letters, lowercase letters, numbers, and special symbols",
          "Writing your password on a sticky note attached to your monitor"
        ],
        correctOptionIndex: 2,
        difficulty: "Easy",
        subject: "Computer Science",
        topic: "Security"
      },
      {
        id: "cyber-e3",
        text: "What is the primary function of a network firewall?",
        options: [
          "To speed up local download rates",
          "To monitor and filter incoming and outgoing network traffic based on security rules",
          "To automatically backup personal files",
          "To secure client email transmissions via decryption"
        ],
        correctOptionIndex: 1,
        difficulty: "Easy",
        subject: "Computer Science",
        topic: "Security"
      },
      // Medium
      {
        id: "cyber-m1",
        text: "Which of the following cryptographic standards uses a symmetric key algorithm?",
        options: [
          "RSA (Rivest-Shamir-Adleman)",
          "AES (Advanced Encryption Standard)",
          "ECC (Elliptic Curve Cryptography)",
          "Diffie-Hellman Key Exchange"
        ],
        correctOptionIndex: 1,
        difficulty: "Medium",
        subject: "Computer Science",
        topic: "Security"
      },
      {
        id: "cyber-m2",
        text: "What security vulnerability does a SQL Injection directly target?",
        options: [
          "Lack of input sanitization in database query structures",
          "Weak symmetric key sizes in transport level encryption",
          "Inefficient garbage collection in client-side runtimes",
          "Unauthorized DNS cache modifications on recursive servers"
        ],
        correctOptionIndex: 0,
        difficulty: "Medium",
        subject: "Computer Science",
        topic: "Security"
      },
      {
        id: "cyber-m3",
        text: "What is the primary operational distinction between a computer worm and a typical computer virus?",
        options: [
          "A virus requires a host program to propagate, whereas a worm spreads independently across networks.",
          "A worm infects only system hardware, while a virus is restricted to software code.",
          "A virus encrypts entire filesystems, whereas worms solely log keystrokes.",
          "A worm requires direct physical transfer via USB, while a virus propagates via web cookies."
        ],
        correctOptionIndex: 0,
        difficulty: "Medium",
        subject: "Computer Science",
        topic: "Security"
      },
      // Hard
      {
        id: "cyber-h1",
        text: "In a Zero-Knowledge Proof (ZKP), what are the two main parties involved?",
        options: [
          "The Prover and the Verifier",
          "The Cipher and the Decrypter",
          "The Sender and the Receiver",
          "The Client and the Host"
        ],
        correctOptionIndex: 0,
        difficulty: "Hard",
        subject: "Computer Science",
        topic: "Security"
      },
      {
        id: "cyber-h2",
        text: "Which of the following is an example of a collision-resistant cryptographic hash function?",
        options: [
          "MD5",
          "SHA-256",
          "DES",
          "ROT13"
        ],
        correctOptionIndex: 1,
        difficulty: "Hard",
        subject: "Computer Science",
        topic: "Security"
      },
      {
        id: "cyber-h3",
        text: "What is the main advantage of Elliptic Curve Cryptography (ECC) over RSA?",
        options: [
          "ECC is completely immune to quantum computer attacks.",
          "ECC offers equivalent security with much smaller key sizes, reducing overhead.",
          "ECC requires no public key distribution.",
          "ECC uses symmetric encryption for faster data streams."
        ],
        correctOptionIndex: 1,
        difficulty: "Hard",
        subject: "Computer Science",
        topic: "Security"
      }
    ]
  },
  {
    id: "bank-climatic",
    name: "Climatic Systems & Meteorology Bank",
    subject: "Earth Science",
    topic: "Climatology",
    createdAt: Date.now(),
    questions: [
      // Easy
      {
        id: "climate-e1",
        text: "Which atmospheric layer is closest to the Earth's surface and contains most weather phenomena?",
        options: [
          "Troposphere",
          "Stratosphere",
          "Mesosphere",
          "Thermosphere"
        ],
        correctOptionIndex: 0,
        difficulty: "Easy",
        subject: "Earth Science",
        topic: "Climatology"
      },
      {
        id: "climate-e2",
        text: "What is the primary source of energy that drives the Earth's weather systems?",
        options: [
          "Geothermal heat from the Earth's core",
          "Solar radiation from the Sun",
          "Gravitational pull from the Moon",
          "Friction from tectonic plate movement"
        ],
        correctOptionIndex: 1,
        difficulty: "Easy",
        subject: "Earth Science",
        topic: "Climatology"
      },
      {
        id: "climate-e3",
        text: "Which of the following is a primary greenhouse gas naturally present in Earth's atmosphere?",
        options: [
          "Argon",
          "Carbon Dioxide",
          "Helium",
          "Nitrogen"
        ],
        correctOptionIndex: 1,
        difficulty: "Easy",
        subject: "Earth Science",
        topic: "Climatology"
      },
      // Medium
      {
        id: "climate-m1",
        text: "The deflection of wind currents caused by the Earth's rotation is known as what?",
        options: [
          "The Bernoulli Effect",
          "The Coriolis Effect",
          "The Milankovitch Loop",
          "The Doppler Shift"
        ],
        correctOptionIndex: 1,
        difficulty: "Medium",
        subject: "Earth Science",
        topic: "Climatology"
      },
      {
        id: "climate-m2",
        text: "What ocean current serves as a primary driver of the North Atlantic drift, delivering warm equatorial water to western Europe?",
        options: [
          "The Humboldt Current",
          "The Gulf Stream",
          "The California Loop",
          "The Kurushio Current"
        ],
        correctOptionIndex: 1,
        difficulty: "Medium",
        subject: "Earth Science",
        topic: "Climatology"
      },
      {
        id: "climate-m3",
        text: "What atmospheric layer contains the ozone layer responsible for absorbing high-frequency ultraviolet light?",
        options: [
          "Troposphere",
          "Stratosphere",
          "Mesosphere",
          "Thermosphere"
        ],
        correctOptionIndex: 1,
        difficulty: "Medium",
        subject: "Earth Science",
        topic: "Climatology"
      },
      // Hard
      {
        id: "climate-h1",
        text: "Which of the following compounds has the highest Global Warming Potential (GWP) per molecule over a 100-year timescale?",
        options: [
          "Carbon Dioxide (CO2)",
          "Methane (CH4)",
          "Sulfur Hexafluoride (SF6)",
          "Nitrous Oxide (N2O)"
        ],
        correctOptionIndex: 2,
        difficulty: "Hard",
        subject: "Earth Science",
        topic: "Climatology"
      },
      {
        id: "climate-h2",
        text: "How do Milankovitch cycles contribute to long-term geological climate alterations?",
        options: [
          "By changing volcanic particulate emission speeds",
          "By inducing minor cyclical variations in the Earth's orbital shape, axial tilt, and precession direction",
          "By modifying the rate of tectonic subduction near marine trenches",
          "By shifting the salinity coefficient of global thermohaline conveyors directly"
        ],
        correctOptionIndex: 1,
        difficulty: "Hard",
        subject: "Earth Science",
        topic: "Climatology"
      },
      {
        id: "climate-h3",
        text: "What term describes the feedback loop where melting Arctic ice reduces reflectivity, leading to more heat absorption and further melting?",
        options: [
          "The Ice-Albedo Feedback",
          "The Greenhouse Acceleration Loop",
          "The Radiative Forcing Deficit",
          "The Cloud-Albedo Precession"
        ],
        correctOptionIndex: 0,
        difficulty: "Hard",
        subject: "Earth Science",
        topic: "Climatology"
      }
    ]
  }
];

// Exams stored securely on the server with correct answers included
const serverExams: IExam[] = [
  {
    id: "cs-ethics-security",
    title: "Computer Science Ethics & Cyber Security",
    description: "An intensive test evaluating your understanding of encryption mechanics, digital handshakes, network threat prevention, and ethical hacking rules.",
    timeLimit: 10, // 10 minutes
    createdAt: Date.now(),
    integrityHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    questions: [
      {
        id: "sec-q1",
        text: "Which of the following cryptographic standards uses a symmetric key algorithm?",
        options: [
          "RSA (Rivest-Shamir-Adleman)",
          "AES (Advanced Encryption Standard)",
          "ECC (Elliptic Curve Cryptography)",
          "Diffie-Hellman Key Exchange"
        ],
        correctOptionIndex: 1 // AES
      },
      {
        id: "sec-q2",
        text: "What is the primary operational distinction between a computer worm and a typical computer virus?",
        options: [
          "A virus requires a host program to propagate, whereas a worm spreads independently across networks.",
          "A worm infects only system hardware, while a virus is restricted to software code.",
          "A virus encrypts entire filesystems, whereas worms solely log keystrokes.",
          "A worm requires direct physical transfer via USB, while a virus propagates via web cookies."
        ],
        correctOptionIndex: 0 // virus requires host, worm propagates independently
      },
      {
        id: "sec-q3",
        text: "In public-key cryptography, if Alice wants to send an encrypted message to Bob that only Bob can read, Alice must encrypt the message using:",
        options: [
          "Alice's private key",
          "Alice's public key",
          "Bob's public key",
          "Bob's private key"
        ],
        correctOptionIndex: 2 // Bob's public key
      },
      {
        id: "sec-q4",
        text: "What security vulnerability does a SQL Injection directly target?",
        options: [
          "Lack of input sanitization in database query structures",
          "Weak symmetric key sizes in transport level encryption",
          "Inefficient garbage collection in client-side runtimes",
          "Unauthorized DNS cache modifications on recursive servers"
        ],
        correctOptionIndex: 0 // Lack of input sanitization
      },
      {
        id: "sec-q5",
        text: "Under ethical hacking frameworks, what is the core purpose of a Pen-Test (Penetration Testing)?",
        options: [
          "To copy trade secrets to compete with local companies legally",
          "To actively simulate cyberattacks to find and document vulnerabilities before malicious hackers do",
          "To design custom firewalls for direct network sales",
          "To audit corporate financial databases for regulatory tax filings"
        ],
        correctOptionIndex: 1 // Simulate attacks to find vulnerabilities
      }
    ]
  },
  {
    id: "global-climatic-systems",
    title: "Global Climatic Systems & Meteorology",
    description: "Evaluates your understanding of tropospheric pressure loops, Coriolis force impacts, carbon reservoirs, and radiative forcing mechanisms.",
    timeLimit: 12, // 12 minutes
    createdAt: Date.now(),
    integrityHash: "6c2bc6642f65a12282206aa0a010469b820cd156cf04a08fd15f606a25ba20cf",
    questions: [
      {
        id: "cli-q1",
        text: "The deflection of wind currents caused by the Earth's rotational speed is known as what?",
        options: [
          "The Bernoulli Effect",
          "The Doppler Shift",
          "The Coriolis Effect",
          "The Milankovitch Loop"
        ],
        correctOptionIndex: 2 // Coriolis
      },
      {
        id: "cli-q2",
        text: "Which of the following compounds is estimated to have the highest Global Warming Potential (GWP) per molecule over a 100-year timescale?",
        options: [
          "Carbon Dioxide (CO2)",
          "Methane (CH4)",
          "Sulfur Hexafluoride (SF6)",
          "Water Vapor (H2O)"
        ],
        correctOptionIndex: 2 // SF6
      },
      {
        id: "cli-q3",
        text: "What atmospheric layer contains the ozone layer responsible for absorbing high-frequency ultraviolet light?",
        options: [
          "Troposphere",
          "Stratosphere",
          "Mesosphere",
          "Thermosphere"
        ],
        correctOptionIndex: 1 // Stratosphere
      },
      {
        id: "cli-q4",
        text: "What ocean current serves as a primary driver of the North Atlantic drift, delivering warm equatorial water to western Europe?",
        options: [
          "The Humboldt Current",
          "The Gulf Stream",
          "The Kurushio Current",
          "The California Loop"
        ],
        correctOptionIndex: 1 // Gulf Stream
      },
      {
        id: "cli-q5",
        text: "How do Milankovitch cycles contribute to long-term geological climate alterations?",
        options: [
          "By changing volcanic particulate emission speeds",
          "By inducing minor cyclical variations in the Earth's orbital shape, axial tilt, and precession direction",
          "By modifying the rate of tectonic subduction near marine trenches",
          "By shifting the salinity coefficient of global thermohaline conveyors directly"
        ],
        correctOptionIndex: 1 // earth orbital variations
      }
    ]
  },
  {
    id: "adaptive-cybersec",
    title: "[Adaptive] Cybersecurity Engineering Quiz",
    description: "An adaptive quiz that dynamically changes its difficulty based on your performance. Answering correctly serves harder questions, while answering incorrectly falls back to easy/medium questions.",
    timeLimit: 8,
    createdAt: Date.now(),
    isAdaptive: true,
    questionBankId: "bank-cybersecurity",
    totalQuestionsCount: 5,
    integrityHash: "adaptive-hash-cybersec-2026",
    questions: [],
    questionPool: serverQuestionBanks[0].questions
  },
  {
    id: "adaptive-climate",
    title: "[Adaptive] Earth Climate Systems Quiz",
    description: "A dynamic, performance-adapted evaluation of meteorology, Coriolis forces, and long-term orbital cycles.",
    timeLimit: 8,
    createdAt: Date.now(),
    isAdaptive: true,
    questionBankId: "bank-climatic",
    totalQuestionsCount: 5,
    integrityHash: "adaptive-hash-climatic-2026",
    questions: [],
    questionPool: serverQuestionBanks[1].questions
  }
];

export async function seedDatabase() {
  try {
    if (await QuestionBank.countDocuments() === 0) {
      await QuestionBank.insertMany(serverQuestionBanks);
      console.log('Seeded QuestionBanks');
    }
    if (await Exam.countDocuments() === 0) {
      await Exam.insertMany(serverExams);
      console.log('Seeded Exams');
    }
    if (await CandidateUser.countDocuments() === 0) {
      await CandidateUser.create({
        username: 'student',
        email: 'student@guardian.edu',
        passwordHash: 'Password123!'
      });
      console.log('Seeded Candidate');
    }
    if (await PortalSettings.countDocuments() === 0) {
      await PortalSettings.create({ id: 'default', candidatePortalEnabled: true });
      console.log('Seeded Settings');
    }
    if (await AdminUser.countDocuments() === 0) {
      await AdminUser.create({ username: 'admin', passwordHash: 'AdminPassword123!' });
      console.log('Seeded Admin');
    }
    if (await AdminNotification.countDocuments() === 0) {
      await AdminNotification.create({ id: 'notif-init', message: 'System initialized. Proctor firewall and offline-integrity rules activated.', timestamp: Date.now(), read: false });
      console.log('Seeded Notifications');
    }
  } catch (err) {
    console.error('Error seeding DB:', err);
  }
}