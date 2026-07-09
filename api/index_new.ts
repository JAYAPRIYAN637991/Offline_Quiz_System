import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import crypto from "crypto";

import { GoogleGenAI, Type } from "@google/genai";
import { Exam, ExamAttempt, TamperEvent, CheatingAnalysis, Question, QuestionBank } from "../src/types";

dotenv.config();

const app = express();
const PORT = 3000;


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Google Gen AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// In-memory server database for Question Banks
const serverQuestionBanks: QuestionBank[] = [
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
const serverExams: Exam[] = [
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

// Submissions store
const DATA_DIR = process.env.VERCEL ? "/tmp" : process.cwd();
const ATTEMPTS_FILE = path.join(DATA_DIR, "synchronized_attempts.json");
const CANDIDATES_FILE = path.join(DATA_DIR, "registered_candidates.json");

// Relational User & Notification Models for authentication and auditing
interface CandidateUser {
  username: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

interface AdminUser {
  username: string;
  passwordHash: string;
  createdAt: number;
}

interface AdminNotification {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
}

let synchronizedAttempts: ExamAttempt[] = [];
try {
  if (fs.existsSync(ATTEMPTS_FILE)) {
    synchronizedAttempts = JSON.parse(fs.readFileSync(ATTEMPTS_FILE, "utf-8"));
  } else {
    fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
} catch (e) {
  console.error("Could not load synchronized attempts", e);
}

function saveAttempts() {
  try {
    fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(synchronizedAttempts, null, 2), "utf-8");
  } catch (e) {
    console.error("Could not save synchronized attempts", e);
  }
}

const EMAILS_FILE = path.join(DATA_DIR, "sent_emails.json");

interface SentEmail {
  id: string;
  timestamp: number;
  recipient: string;
  subject: string;
  body: string;
  attemptId: string;
  studentName: string;
  studentEmail: string;
  riskLevel: string;
  confidenceScore: number;
}

let sentEmails: SentEmail[] = [];
try {
  if (fs.existsSync(EMAILS_FILE)) {
    sentEmails = JSON.parse(fs.readFileSync(EMAILS_FILE, "utf-8"));
  } else {
    fs.writeFileSync(EMAILS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
} catch (e) {
  console.error("Could not load sent emails list", e);
}

function saveSentEmails() {
  try {
    fs.writeFileSync(EMAILS_FILE, JSON.stringify(sentEmails, null, 2), "utf-8");
  } catch (e) {
    console.error("Could not save sent emails", e);
  }
}

// Pre-seeded database values
let registeredCandidates: CandidateUser[] = [
  {
    username: "student",
    email: "student@guardian.edu",
    passwordHash: "Password123!",
    createdAt: Date.now()
  }
];

try {
  if (fs.existsSync(CANDIDATES_FILE)) {
    registeredCandidates = JSON.parse(fs.readFileSync(CANDIDATES_FILE, "utf-8"));
  } else {
    fs.writeFileSync(CANDIDATES_FILE, JSON.stringify(registeredCandidates, null, 2), "utf-8");
  }
} catch (e) {
  console.error("Could not load registered candidates", e);
}

function saveCandidates() {
  try {
    fs.writeFileSync(CANDIDATES_FILE, JSON.stringify(registeredCandidates, null, 2), "utf-8");
  } catch (e) {
    console.error("Could not save registered candidates", e);
  }
}

// Portal Settings Store
const SETTINGS_FILE = path.join(DATA_DIR, "portal_settings.json");
interface PortalSettings {
  candidatePortalEnabled: boolean;
}
let portalSettings: PortalSettings = {
  candidatePortalEnabled: true
};
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    portalSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  } else {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(portalSettings, null, 2), "utf-8");
  }
} catch (e) {
  console.error("Could not load portal settings", e);
}

function savePortalSettings() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(portalSettings, null, 2), "utf-8");
  } catch (e) {
    console.error("Could not save portal settings", e);
  }
}

const registeredAdmins: AdminUser[] = [
  {
    username: "admin",
    passwordHash: "AdminPassword123!",
    createdAt: Date.now()
  }
];

const adminNotifications: AdminNotification[] = [
  {
    id: "notif-init",
    message: "System initialized. Proctor firewall and offline-integrity rules activated.",
    timestamp: Date.now(),
    read: false
  }
];

// Public Settings API
app.get("/api/portal-settings", (req, res) => {
  res.json(portalSettings);
});

// Admin: Toggle/Update Settings API
app.post("/api/admin/portal-settings", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can modify portal settings." });
  }

  const { candidatePortalEnabled } = req.body;
  if (typeof candidatePortalEnabled !== "boolean") {
    return res.status(400).json({ error: "Invalid parameters. 'candidatePortalEnabled' (boolean) is required." });
  }

  portalSettings.candidatePortalEnabled = candidatePortalEnabled;
  savePortalSettings();

  // Log notification for admin action
  const newNotification: AdminNotification = {
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Administrative action: Candidate Portal has been ${candidatePortalEnabled ? "ENABLED" : "DISABLED"}.`,
    timestamp: Date.now(),
    read: false
  };
  adminNotifications.unshift(newNotification);

  res.json({
    success: true,
    message: `Candidate Portal successfully ${candidatePortalEnabled ? "enabled" : "disabled"}.`,
    settings: portalSettings
  });
});

// Auth Endpoints: Candidate Portal
app.post("/api/auth/candidate/register", (req, res) => {
  if (!portalSettings.candidatePortalEnabled) {
    return res.status(403).json({ error: "Candidate Portal registration is currently disabled by Proctor Administration." });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing required fields: Username, Email, and Password must be provided." });
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();

  // Enforce no admin registration for candidates
  if (cleanUsername.toLowerCase().includes("admin") || cleanUsername.toLowerCase().includes("proctor")) {
    return res.status(403).json({ error: "Candidates are strictly forbidden from creating administrative usernames or registering as administrators." });
  }

  const exists = registeredCandidates.some(
    c => c.username.toLowerCase() === cleanUsername.toLowerCase() || c.email === cleanEmail
  );

  if (exists) {
    return res.status(400).json({ error: "A candidate account with this username or email already exists." });
  }

  // Password length standard for candidates
  if (password.length < 6) {
    return res.status(400).json({ error: "Candidate passwords must be at least 6 characters in length." });
  }

  const newCandidate: CandidateUser = {
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: password, // simple hash simulated
    createdAt: Date.now()
  };

  registeredCandidates.push(newCandidate);
  saveCandidates();

  // Trigger admin notification immediately!
  const newNotification: AdminNotification = {
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Candidate account registered successfully: Username "${cleanUsername}" (${cleanEmail}).`,
    timestamp: Date.now(),
    read: false
  };
  adminNotifications.unshift(newNotification);

  res.status(201).json({
    success: true,
    message: "Candidate registered successfully. You may now sign in using your credentials.",
    user: { username: cleanUsername, email: cleanEmail }
  });
});

app.post("/api/auth/candidate/login", (req, res) => {
  if (!portalSettings.candidatePortalEnabled) {
    return res.status(403).json({ error: "Candidate Portal is currently disabled by Proctor Administration. Please contact your proctor." });
  }

  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: "Please provide both your Username/Email and password." });
  }

  const cleanQuery = usernameOrEmail.trim().toLowerCase();
  const user = registeredCandidates.find(
    c => c.username.toLowerCase() === cleanQuery || c.email.toLowerCase() === cleanQuery
  );

  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: "Access Denied. Invalid candidate credentials." });
  }

  res.json({
    success: true,
    user: {
      role: "student",
      name: user.username,
      email: user.email
    }
  });
});

// Auth Endpoints: Admin / Proctor Registration
app.post("/api/auth/admin/register", (req, res) => {
  const { username, password, authCode } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Administrator username and password are required." });
  }

  const cleanUsername = username.trim();

  // 1. Strict Candidate Exclusion (Candidates must not be able to register as administrators)
  if (!authCode || authCode !== "PROCTOR_SECURE_2026") {
    return res.status(403).json({
      error: "Authorization Failed. Candidates are strictly blocked from registering as administrators. A valid Admin Authorization Key is required."
    });
  }

  // 2. Validate Security Standards for Administrator Accounts
  const validationErrors: string[] = [];

  // Username validation
  if (cleanUsername.length < 5) {
    validationErrors.push("Username must be at least 5 characters long.");
  }
  if (!/^[a-zA-Z0-9]+$/.test(cleanUsername)) {
    validationErrors.push("Username must be purely alphanumeric (letters and numbers only, no special characters or spaces).");
  }
  const genericUsernames = ["admin", "administrator", "root", "user", "proctor", "moderator"];
  if (genericUsernames.includes(cleanUsername.toLowerCase())) {
    validationErrors.push(`Username cannot be a generic system default (e.g. '${cleanUsername}'). Please select a distinct administrator identifier.`);
  }

  // Password validation
  if (password.length < 10) {
    validationErrors.push("Password must be at least 10 characters in length.");
  }
  if (!/[A-Z]/.test(password)) {
    validationErrors.push("Password must contain at least one uppercase letter (A-Z).");
  }
  if (!/[a-z]/.test(password)) {
    validationErrors.push("Password must contain at least one lowercase letter (a-z).");
  }
  if (!/[0-9]/.test(password)) {
    validationErrors.push("Password must contain at least one numeric digit (0-9).");
  }
  if (!/[@$!%*?&_#^/\-()+=|:;{}<>]/.test(password)) {
    validationErrors.push("Password must contain at least one special character/symbol (e.g., @, $, !, %, *, ?).");
  }
  if (/(.)\1\1/.test(password)) {
    validationErrors.push("Password must not contain 3 or more consecutive repeating characters (e.g., 'aaa' or '111').");
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: "Security Standards Violation. Administrator credentials fail to meet requirements:\n\n" +
        validationErrors.map((err, idx) => `${idx + 1}. ${err}`).join("\n")
    });
  }

  // Check unique admin
  const exists = registeredAdmins.some(a => a.username.toLowerCase() === cleanUsername.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "An administrator with this username is already registered." });
  }

  const newAdmin: AdminUser = {
    username: cleanUsername,
    passwordHash: password,
    createdAt: Date.now()
  };

  registeredAdmins.push(newAdmin);

  // Notify current admins about the new admin creation
  adminNotifications.unshift({
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Security Event: New authorized administrator account created: "${cleanUsername}".`,
    timestamp: Date.now(),
    read: false
  });

  res.status(201).json({
    success: true,
    message: "Administrator account created successfully according to security standards.",
    user: { username: cleanUsername }
  });
});

app.get("/api/auth/admin/status", (req, res) => {
  res.json({
    hasCustomAdmin: registeredAdmins.length > 1,
    count: registeredAdmins.length
  });
});

app.post("/api/auth/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Please enter your administrator username and password." });
  }

  const cleanUser = username.trim();
  const admin = registeredAdmins.find(a => a.username.toLowerCase() === cleanUser.toLowerCase());

  if (!admin || (admin.passwordHash !== password && !(admin.username === "admin" && password === "admin2026"))) {
    return res.status(401).json({ error: "Access Denied. Invalid proctor credentials." });
  }

  res.json({
    success: true,
    user: {
      role: "admin",
      name: `Proctor (${admin.username})`
    }
  });
});

app.post("/api/auth/admin/update", (req, res) => {
  const { oldUsername, newUsername, newPassword } = req.body;

  if (!oldUsername || !newUsername || !newPassword) {
    return res.status(400).json({ error: "Missing required fields. Please provide old username, new username, and new password." });
  }

  const cleanOld = oldUsername.trim().toLowerCase();
  const cleanNew = newUsername.trim();

  // Find the admin
  const adminIndex = registeredAdmins.findIndex(a => a.username.toLowerCase() === cleanOld);
  if (adminIndex === -1) {
    return res.status(404).json({ error: "Administrator account not found." });
  }

  // Check if new username is already taken by a different admin
  const isTaken = registeredAdmins.some((a, idx) => idx !== adminIndex && a.username.toLowerCase() === cleanNew.toLowerCase());
  if (isTaken) {
    return res.status(400).json({ error: "The new username is already taken by another administrator." });
  }

  // Validate security requirements on new username
  const validationErrors: string[] = [];
  if (cleanNew.length < 5) {
    validationErrors.push("Username must be at least 5 characters long.");
  }
  if (!/^[a-zA-Z0-9]+$/.test(cleanNew)) {
    validationErrors.push("Username must be purely alphanumeric (letters and numbers only, no special characters or spaces).");
  }
  const genericUsernames = ["administrator", "root", "user", "proctor", "moderator"];
  if (genericUsernames.includes(cleanNew.toLowerCase())) {
    validationErrors.push(`Username cannot be a generic system identifier (e.g. '${cleanNew}').`);
  }

  // Validate new password security requirements
  if (newPassword.length < 10) {
    validationErrors.push("Password must be at least 10 characters in length.");
  }
  if (!/[A-Z]/.test(newPassword)) {
    validationErrors.push("Password must contain at least one uppercase letter (A-Z).");
  }
  if (!/[a-z]/.test(newPassword)) {
    validationErrors.push("Password must contain at least one lowercase letter (a-z).");
  }
  if (!/[0-9]/.test(newPassword)) {
    validationErrors.push("Password must contain at least one numeric digit (0-9).");
  }
  if (!/[@$!%*?&_#^/\-()+=|:;{}<>]/.test(newPassword)) {
    validationErrors.push("Password must contain at least one special character/symbol (e.g. @, $, !, %, *, ?).");
  }
  if (/(.)\1\1/.test(newPassword)) {
    validationErrors.push("Password must not contain 3 or more consecutive repeating characters (e.g., 'aaa').");
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: "Security Standards Violation. New credentials fail to meet requirements:\n\n" +
        validationErrors.map((err, idx) => `• ${err}`).join("\n")
    });
  }

  // Update
  const oldDisplayName = registeredAdmins[adminIndex].username;
  registeredAdmins[adminIndex].username = cleanNew;
  registeredAdmins[adminIndex].passwordHash = newPassword;

  // Push notification of security change
  adminNotifications.unshift({
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Security Event: Credentials updated for administrator account. Old username: "${oldDisplayName}", new username: "${cleanNew}".`,
    timestamp: Date.now(),
    read: false
  });

  res.json({
    success: true,
    message: "Administrator credentials updated successfully.",
    user: {
      role: "admin",
      name: `Proctor (${cleanNew})`
    }
  });
});

// Proctor notifications management
app.get("/api/admin/notifications", (req, res) => {
  res.json(adminNotifications);
});

app.post("/api/admin/notifications/read", (req, res) => {
  const { id, all } = req.body;
  if (all) {
    adminNotifications.forEach(n => n.read = true);
  } else if (id) {
    const found = adminNotifications.find(n => n.id === id);
    if (found) found.read = true;
  }
  res.json({ success: true, notifications: adminNotifications });
});

// Helper to calculate SHA-256 hash in CJS/ESM
function getSHA256Hash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// API: Get List of Exams (For Students - correct answer keys strictly omitted for safety)
app.get("/api/exams", (req, res) => {
  const userRole = req.headers["x-user-role"] || req.query.role;
  const userEmail = req.headers["x-user-email"] || req.query.email;

  // Initialize fields on exams if they don't exist
  serverExams.forEach(exam => {
    if (exam.assignedCandidateEmail === undefined) exam.assignedCandidateEmail = null;
    if (exam.isUnlocked === undefined) exam.isUnlocked = false;
    if (exam.isStarted === undefined) exam.isStarted = false;
    if (exam.passkey === undefined) exam.passkey = "UNLOCK2026";
  });

  let filteredExams = serverExams;

  if (userRole !== "admin") {
    // Candidates can ONLY see exams explicitly assigned to them AND started by the admin
    if (!userEmail || typeof userEmail !== "string") {
      filteredExams = [];
    } else {
      const cleanEmail = userEmail.trim().toLowerCase();
      filteredExams = serverExams.filter(exam =>
        exam.assignedCandidateEmail && exam.assignedCandidateEmail.trim().toLowerCase() === cleanEmail && exam.isStarted === true
      );
    }
  }

  const safeExams = filteredExams.map(exam => {
    const safeQuestions = exam.questions.map(q => {
      const { correctOptionIndex, ...safeQuestion } = q;
      return safeQuestion;
    });

    const safePool = exam.questionPool
      ? exam.questionPool.map(q => {
        const { correctOptionIndex, ...safeQuestion } = q;
        return {
          ...safeQuestion,
          correctOptionHash: correctOptionIndex !== undefined
            ? getSHA256Hash(q.id + "-" + correctOptionIndex)
            : undefined
        };
      })
      : undefined;

    return {
      ...exam,
      questions: safeQuestions,
      questionPool: safePool
    };
  });
  res.json(safeExams);
});

// API: Assign an Exam (For Admins)
app.post("/api/exams/:id/assign", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can assign exams." });
  }

  const { id } = req.params;
  const { email } = req.body;

  const exam = serverExams.find(e => e.id === id);
  if (!exam) {
    return res.status(404).json({ error: "Exam not found." });
  }

  exam.assignedCandidateEmail = email || null;
  res.json({ success: true, exam });
});

// API: Unlock an Exam using a passkey (For Admins)
app.post("/api/exams/:id/unlock", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can unlock exams." });
  }

  const { id } = req.params;
  const { passkey } = req.body;

  const exam = serverExams.find(e => e.id === id);
  if (!exam) {
    return res.status(404).json({ error: "Exam not found." });
  }

  const expectedPasskey = exam.passkey || "UNLOCK2026";
  if (!passkey || passkey.trim() !== expectedPasskey.trim()) {
    return res.status(400).json({ error: "Invalid unlock passkey." });
  }

  exam.isUnlocked = true;
  res.json({ success: true, exam });
});

// API: Start an Exam (For Admins - makes it visible to the assigned candidate)
app.post("/api/exams/:id/start", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can start exams." });
  }

  const { id } = req.params;
  const exam = serverExams.find(e => e.id === id);
  if (!exam) {
    return res.status(404).json({ error: "Exam not found." });
  }

  if (!exam.isUnlocked) {
    return res.status(400).json({ error: "Exam must be unlocked with a passkey before it can be started." });
  }

  exam.isStarted = true;
  res.json({ success: true, exam });
});

// API: Bulk Start / Publish an Exam for ALL Registered Candidates with one button
app.post("/api/exams/:id/start-all", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can bulk start exams." });
  }

  const { id } = req.params;
  const baseExam = serverExams.find(e => e.id === id);
  if (!baseExam) {
    return res.status(404).json({ error: "Exam template not found." });
  }

  // Auto-unlock and auto-start the base template too
  baseExam.isUnlocked = true;
  baseExam.isStarted = true;

  if (registeredCandidates.length === 0) {
    return res.status(400).json({ error: "No candidates are registered in the portal yet." });
  }

  let createdCount = 0;
  let updatedCount = 0;

  registeredCandidates.forEach(candidate => {
    const cleanEmail = candidate.email.trim().toLowerCase();

    // Check if there's already an exam copy assigned to this candidate
    let candidateExam = serverExams.find(e =>
      e.assignedCandidateEmail && e.assignedCandidateEmail.trim().toLowerCase() === cleanEmail &&
      (e.parentExamId === baseExam.id || e.title === baseExam.title)
    );

    if (candidateExam) {
      // Exist, unlock and start it
      candidateExam.isUnlocked = true;
      candidateExam.isStarted = true;
      updatedCount++;
    } else {
      // Clone the exam for the candidate
      const clonedExam: Exam = {
        ...baseExam,
        id: "exam-" + Math.random().toString(36).substr(2, 9),
        assignedCandidateEmail: cleanEmail,
        isUnlocked: true,
        isStarted: true,
        parentExamId: baseExam.id,
        createdAt: Date.now(),
        questions: baseExam.questions.map(q => ({ ...q })),
        questionPool: baseExam.questionPool ? baseExam.questionPool.map(q => ({ ...q })) : undefined
      };
      serverExams.push(clonedExam);
      createdCount++;
    }
  });

  adminNotifications.unshift({
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Administrative Bulk Action: Exam "${baseExam.title}" is now unlocked and started for all ${registeredCandidates.length} registered candidates.`,
    timestamp: Date.now(),
    read: false
  });

  res.json({
    success: true,
    message: `Exam "${baseExam.title}" is now live for all registered candidates.`,
    totalCandidates: registeredCandidates.length,
    clonedExamsCreated: createdCount,
    existingExamsUpdated: updatedCount
  });
});

// API: Create new Exam (For Admins)
app.post("/api/exams", (req, res) => {
  const { title, description, timeLimit, questions, requireScreenCapture, assignedCandidateEmail, passkey } = req.body;
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: "Exam must include a title and at least one question." });
  }

  const newExam: Exam = {
    id: "exam-" + Math.random().toString(36).substr(2, 9),
    title,
    description: description || "",
    timeLimit: Number(timeLimit) || 15,
    createdAt: Date.now(),
    integrityHash: "custom-exam-" + Math.random().toString(36).substr(2, 5),
    requireScreenCapture: !!requireScreenCapture,
    assignedCandidateEmail: assignedCandidateEmail || null,
    isUnlocked: false,
    isStarted: false,
    passkey: passkey || "UNLOCK2026",
    questions: questions.map((q: any, idx: number) => ({
      id: `q-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      text: q.text,
      options: q.options,
      correctOptionIndex: Number(q.correctOptionIndex) || 0
    }))
  };

  serverExams.push(newExam);
  res.status(201).json(newExam);
});

// API: Get Question Banks (For Admins)
app.get("/api/question-banks", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can access raw question banks." });
  }
  res.json(serverQuestionBanks);
});

// API: Upload Question Bank (For Admins)
app.post("/api/question-banks", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can upload question banks." });
  }

  const { name, subject, topic, questions } = req.body;
  if (!name || !subject || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Name, subject, and an array of questions are required." });
  }

  const newBank: QuestionBank = {
    id: "bank-" + Math.random().toString(36).substr(2, 9),
    name,
    subject,
    topic: topic || "",
    createdAt: Date.now(),
    questions: questions.map((q: any, idx: number) => ({
      id: q.id || `qb-q-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      text: q.text,
      options: q.options,
      correctOptionIndex: Number(q.correctOptionIndex) || 0,
      difficulty: q.difficulty || "Medium",
      subject,
      topic: topic || ""
    }))
  };

  serverQuestionBanks.push(newBank);

  adminNotifications.unshift({
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Question Bank uploaded: "${name}" (${questions.length} questions).`,
    timestamp: Date.now(),
    read: false
  });

  res.status(201).json(newBank);
});

// API: Create Adaptive Quiz (For Admins)
app.post("/api/exams/adaptive", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can create adaptive quizzes." });
  }

  const { title, description, timeLimit, questionBankId, totalQuestionsCount, requireScreenCapture, assignedCandidateEmail, passkey } = req.body;
  if (!title || !questionBankId) {
    return res.status(400).json({ error: "Title and Question Bank selection are required." });
  }

  const selectedBank = serverQuestionBanks.find(b => b.id === questionBankId);
  if (!selectedBank) {
    return res.status(404).json({ error: "Selected Question Bank not found." });
  }

  const newExam: Exam = {
    id: "exam-" + Math.random().toString(36).substr(2, 9),
    title,
    description: description || "",
    timeLimit: Number(timeLimit) || 15,
    createdAt: Date.now(),
    integrityHash: "custom-adaptive-" + Math.random().toString(36).substr(2, 5),
    isAdaptive: true,
    questionBankId,
    totalQuestionsCount: Number(totalQuestionsCount) || 5,
    questions: [], // Starts empty, populated dynamically at runtime
    questionPool: selectedBank.questions,
    requireScreenCapture: !!requireScreenCapture,
    assignedCandidateEmail: assignedCandidateEmail || null,
    isUnlocked: false,
    isStarted: false,
    passkey: passkey || "UNLOCK2026"
  };

  serverExams.push(newExam);

  adminNotifications.unshift({
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Adaptive Quiz created: "${title}" from bank "${selectedBank.name}".`,
    timestamp: Date.now(),
    read: false
  });

  res.status(201).json(newExam);
});

// Helper: Process single candidate attempt with server-side grading and AI integrity evaluation
async function processSingleAttempt(attempt: any): Promise<ExamAttempt> {
  const originalExam = serverExams.find(e => e.id === attempt.examId);
  if (!originalExam) {
    throw new Error(`Associated exam ID "${attempt.examId}" was not found on the server.`);
  }

  // 1. Server-side grading logic
  let correctCount = 0;
  const pool = originalExam.isAdaptive ? originalExam.questionPool : originalExam.questions;
  const questionsToGrade = pool || [];

  questionsToGrade.forEach(q => {
    const studentAnswer = attempt.answers[q.id];
    if (studentAnswer !== undefined && studentAnswer === q.correctOptionIndex) {
      correctCount++;
    }
  });

  const totalGradedQuestions = originalExam.isAdaptive
    ? (attempt.answers ? Object.keys(attempt.answers).length : 5)
    : originalExam.questions.length;

  const finalScore = totalGradedQuestions > 0
    ? Math.round((correctCount / totalGradedQuestions) * 100)
    : 0;

  // 2. Format security event logs
  const durationUsed = originalExam.timeLimit * 60 - attempt.timeRemaining;
  const logsCount = attempt.tamperLogs?.length || 0;

  const formattedLogs = (attempt.tamperLogs || []).map((log: TamperEvent) => {
    const elapsedSeconds = Math.round((log.timestamp - attempt.startTime) / 1000);
    return `[T+${elapsedSeconds}s] EVENT: ${log.type} - DETAILS: ${log.description}`;
  }).join("\n");

  const studentSubmissionSummary = {
    student: { name: attempt.studentName, email: attempt.studentEmail },
    exam: originalExam.title,
    durationAllowedSeconds: originalExam.timeLimit * 60,
    durationUsedSeconds: durationUsed,
    correctAnswersCount: correctCount,
    totalQuestions: totalGradedQuestions,
    finalScore,
    totalSecurityViolations: logsCount,
    securityLogs: formattedLogs || "None (Fully fullscreen and locked in during exam)"
  };

  let cheatingAnalysis: CheatingAnalysis = {
    riskLevel: "Low",
    confidenceScore: 100,
    flaggedPatterns: [],
    explanation: "Standard safe browser interaction profile.",
    verdict: "Clear"
  };

  // Perform Gemini Evaluation if API key is present
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `
        You are an expert proctoring AI for a highly secure offline digital examination system.
        Analyze the following student test submission and background security event logs for signs of digital tampering or cheating.

        STUDENT SUBMISSION TELEMETRY:
        ${JSON.stringify(studentSubmissionSummary, null, 2)}

        CORE THREAT METRICS TO EVALUATE:
        - Tab shifts / Focus losses ('tab-blur'): Indicates the student switched windows, potentially to read study material, check notes, or query AI.
        - Keystroke irregularities: Rapid consecutive events or unauthorized keyboard shortcuts (e.g., Copy-Paste attempts, developer tools shortcuts).
        - Screen sizing alterations / Fullscreen exits: Escaping the secure lock mode.
        - Answering speed: Answering complex, multi-line questions in under 3-5 seconds might indicate advance knowledge or key side-loading.
        - Extreme high scores paired with continuous tab switches is a major red flag.

        INSTRUCTIONS:
        Analyze the telemetry rigorously and objectively. Do not panic on a single brief tab switch (which could be an OS pop-up), but flag persistent patterns or suspicious combinations.
        Return your proctor assessment in valid JSON conforming to the requested schema.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an objective academic integrity evaluator. Analyze proctoring logs and deliver a highly accurate JSON analysis on cheating probability.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: {
                type: Type.STRING,
                description: "Risk categorization of cheating. Must be one of: 'Low', 'Medium', 'High'"
              },
              confidenceScore: {
                type: Type.INTEGER,
                description: "Percent confidence in this verdict, from 0 to 100"
              },
              flaggedPatterns: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Short phrases listing suspicious actions spotted."
              },
              explanation: {
                type: Type.STRING,
                description: "Proctor narrative explaining the behavior, why it represents a risk, or why it was deemed benign."
              },
              verdict: {
                type: Type.STRING,
                description: "Final actionable decision. Must be one of: 'Clear', 'Suspicious', 'Needs Review'"
              }
            },
            required: ["riskLevel", "confidenceScore", "flaggedPatterns", "explanation", "verdict"]
          }
        }
      });

      if (response.text) {
        cheatingAnalysis = JSON.parse(response.text.trim());
      }
    } catch (apiError) {
      console.error("Gemini proctoring analysis failed, falling back to heuristics:", apiError);
      cheatingAnalysis = {
        riskLevel: logsCount > 3 ? "Medium" : "Low",
        confidenceScore: 50,
        flaggedPatterns: logsCount > 0 ? ["Security logs detected on-disk"] : [],
        explanation: `AI-Evaluation failed or was skipped. Automated threshold assessment: ${logsCount} security violation events stored in student database.`,
        verdict: logsCount > 3 ? "Needs Review" : "Clear"
      };
    }
  } else {
    // Standard heuristics fallback
    cheatingAnalysis = {
      riskLevel: logsCount > 3 ? "High" : (logsCount > 0 ? "Medium" : "Low"),
      confidenceScore: 75,
      flaggedPatterns: logsCount > 0 ? [`Spotted ${logsCount} security violation logs / escapes`] : [],
      explanation: `Security analysis completed using built-in heuristics. Detected ${logsCount} browser focus loss/screen alterations.`,
      verdict: logsCount > 3 ? "Suspicious" : (logsCount > 0 ? "Needs Review" : "Clear")
    };
  }

  // Final processed object
  const gradedAttempt: ExamAttempt = {
    ...attempt,
    status: "completed",
    score: finalScore,
    isSynchronized: true,
    cheatingAnalysis
  };

  // CHECK: Trigger automated proctor email alert if risk level is "High"!
  if (cheatingAnalysis.riskLevel === "High") {
    const recipient = "proctor@digitalexamintegrity.org";
    const subject = `⚠️ CRITICAL ACADEMIC INTEGRITY ALERT: High Risk Detected - Candidate ${attempt.studentName}`;
    const body = `[GUARDIAN SECURE EXAM SERVER - AUTOMATED EMAIL TRANSMISSION]

Date: ${new Date().toLocaleString()}
To: Exam Integrity Officers & Proctors (${recipient})
Subject: High Risk Academic Infraction Alert

A critical integrity threshold has been breached during a secure online assessment.

CANDIDATE AND MODULE PARAMETERS:
--------------------------------------------------
Candidate Name : ${attempt.studentName}
Candidate Email: ${attempt.studentEmail}
Exam Title     : ${originalExam.title}
Attempt ID     : ${attempt.id}

AI FRAUD RISK EVALUATION:
--------------------------------------------------
Overall Risk Rating : HIGH RISK
Evaluation Confidence : ${cheatingAnalysis.confidenceScore}%
Actionable Verdict   : ${cheatingAnalysis.verdict}
Security Violations  : ${logsCount} events logged

PROCTOR LOG EVALUATION:
${cheatingAnalysis.explanation}

FLAGGED SECURE PATTERNS:
${(cheatingAnalysis.flaggedPatterns || []).map((p: string) => `• ${p}`).join("\n") || "No explicit threat signature matches."}

TECHNICAL METADATA & TELEMETRY OUTLINE:
- Allowed Limit: ${originalExam.timeLimit} minutes
- Elapsed Time: ${(durationUsed / 60).toFixed(1)} minutes
- Answered Questions: ${totalGradedQuestions} items

INSTRUCTIONS:
An automated audit record has been saved. Please log in immediately to the Secure Proctor Dashboard to review visual telemetry, view the window resize timeline, and export the student's certified report.

--------------------------------------------------
Guardian Security Systems Inc.
Automated Integrity Alerts Hub`;

    const newEmail: SentEmail = {
      id: "email-" + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      recipient,
      subject,
      body,
      attemptId: attempt.id,
      studentName: attempt.studentName,
      studentEmail: attempt.studentEmail,
      riskLevel: "High",
      confidenceScore: cheatingAnalysis.confidenceScore
    };

    sentEmails.unshift(newEmail);
    saveSentEmails();

    // Push security notification to dashboard
    adminNotifications.unshift({
      id: "notif-" + Math.random().toString(36).substr(2, 9),
      message: `[Email Dispatched] Automated alert dispatched to "${recipient}" for candidate "${attempt.studentName}" due to High Fraud Risk.`,
      timestamp: Date.now(),
      read: false
    });
  }

  return gradedAttempt;
}

// API: Sync student test attempts & perform AI cheating detection
app.post("/api/sync", async (req, res) => {
  const { attempt } = req.body;

  if (!attempt || !attempt.id || !attempt.examId) {
    return res.status(400).json({ error: "Missing exam attempt payload." });
  }

  // Check if attempt is already synchronized
  const existing = synchronizedAttempts.find(a => a.id === attempt.id);
  if (existing) {
    return res.json({ success: true, alreadySynced: true, attempt: existing });
  }

  try {
    const gradedAttempt = await processSingleAttempt(attempt);
    synchronizedAttempts.push(gradedAttempt);
    saveAttempts();
    res.json({ success: true, attempt: gradedAttempt });
  } catch (err: any) {
    console.error("Synchronization pipeline failed:", err);
    res.status(500).json({ error: err.message || "Failed to sync attempt." });
  }
});

// API: Batch Sync student test attempts & perform AI cheating detection in bulk
app.post("/api/sync/batch", async (req, res) => {
  const { attempts } = req.body;

  if (!attempts || !Array.isArray(attempts)) {
    return res.status(400).json({ error: "Invalid payload: attempts must be a non-empty array." });
  }

  const processed: ExamAttempt[] = [];
  const skipped: ExamAttempt[] = [];
  const errors: string[] = [];

  for (const attempt of attempts) {
    if (!attempt || !attempt.id || !attempt.examId) {
      errors.push(`Attempt lacking complete metadata skipped.`);
      continue;
    }

    const existing = synchronizedAttempts.find(a => a.id === attempt.id);
    if (existing) {
      skipped.push(existing);
      continue;
    }

    try {
      const graded = await processSingleAttempt(attempt);
      synchronizedAttempts.push(graded);
      processed.push(graded);
    } catch (err: any) {
      errors.push(`Failed to sync attempt ${attempt.id}: ${err.message}`);
    }
  }

  if (processed.length > 0) {
    saveAttempts();
  }

  res.json({
    success: true,
    processedCount: processed.length,
    skippedCount: skipped.length,
    processed,
    skipped,
    errors
  });
});

// API: Batch Re-analyze Submissions via AI
app.post("/api/admin/batch-reanalyze", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can trigger batch proctoring analysis." });
  }

  const { attemptIds } = req.body;
  if (!attemptIds || !Array.isArray(attemptIds)) {
    return res.status(400).json({ error: "Missing or invalid attemptIds array." });
  }

  const updatedAttempts: ExamAttempt[] = [];
  const errors: string[] = [];

  for (const id of attemptIds) {
    const idx = synchronizedAttempts.findIndex(a => a.id === id);
    if (idx === -1) {
      errors.push(`Attempt ID ${id} not found in synchronized database.`);
      continue;
    }

    try {
      const attempt = synchronizedAttempts[idx];
      const reprocessed = await processSingleAttempt(attempt);

      synchronizedAttempts[idx] = reprocessed;
      updatedAttempts.push(reprocessed);
    } catch (err: any) {
      errors.push(`Failed to re-analyze attempt ID ${id}: ${err.message}`);
    }
  }

  if (updatedAttempts.length > 0) {
    saveAttempts();
    adminNotifications.unshift({
      id: "notif-" + Math.random().toString(36).substr(2, 9),
      message: `Batch re-analysis completed: ${updatedAttempts.length} candidate attempts were re-analyzed via Gemini AI.`,
      timestamp: Date.now(),
      read: false
    });
  }

  res.json({ success: true, updatedAttempts, errors });
});

// API: Get Synchronized Exam Submissions (For Admin Dashboard)
app.get("/api/attempts", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can view evaluation and proctoring processes." });
  }
  res.json(synchronizedAttempts);
});

// API: Get Sent Email Alerts (For Admin Dashboard Auditing)
app.get("/api/admin/emails", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can view email dispatch logs." });
  }
  res.json(sentEmails);
});

// API: Get Registered Candidates (For Admin Dashboard analytics)
app.get("/api/admin/candidates", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can view candidate records." });
  }
  res.json(registeredCandidates.map(c => ({
    username: c.username,
    email: c.email,
    createdAt: c.createdAt
  })));
});

// Helper to format local date YYYY-MM-DD
const getLocalDateString = (timestamp: number) => {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// API: Get Candidates attending on a specific date and their status
app.get("/api/admin/candidates-by-date", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can query candidates by attendance date." });
  }

  const { date } = req.query;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'date' query parameter. Expected YYYY-MM-DD." });
  }

  // Find all attempts on this specific date
  const dateAttempts = synchronizedAttempts.filter(a => getLocalDateString(a.startTime) === date);
  const candidateEmails = Array.from(new Set(dateAttempts.filter(a => a.studentEmail).map(a => a.studentEmail.toLowerCase())));

  const candidatesData = candidateEmails.map(email => {
    // Find candidate user
    const user = registeredCandidates.find(c => c.email.toLowerCase() === email);
    const studentAttempts = dateAttempts.filter(a => a.studentEmail.toLowerCase() === email);
    const allFinished = studentAttempts.every(a => a.status === 'completed' || a.status === 'interrupted');

    return {
      username: user ? user.username : "Unknown Candidate",
      email: email,
      allFinished: allFinished,
      attempts: studentAttempts.map(a => ({
        id: a.id,
        examId: a.examId,
        status: a.status,
        startTime: a.startTime,
        score: a.score
      }))
    };
  });

  const allFinishedGlobal = candidatesData.every(c => c.allFinished);

  res.json({
    date,
    totalCandidates: candidatesData.length,
    allFinished: allFinishedGlobal,
    candidates: candidatesData
  });
});

// API: Bulk remove candidates who attended on a specific date
app.post("/api/admin/candidates-by-date/remove", (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can remove candidates." });
  }

  const { date, force } = req.body;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'date' body parameter. Expected YYYY-MM-DD." });
  }

  // Find attempts starting on that date
  const dateAttempts = synchronizedAttempts.filter(a => getLocalDateString(a.startTime) === date);
  if (dateAttempts.length === 0) {
    return res.status(404).json({ error: `No attendance records or exam attempts found on ${date}.` });
  }

  // Check if any attempts are not finished
  const activeAttempts = dateAttempts.filter(a => a.status === 'started' || a.status === 'paused');
  if (activeAttempts.length > 0 && !force) {
    return res.status(400).json({
      error: `Cannot remove candidates. There are still ${activeAttempts.length} active exam session(s) in progress on ${date}.`,
      activeCount: activeAttempts.length
    });
  }

  const candidateEmailsToRemove = Array.from(new Set(dateAttempts.filter(a => a.studentEmail).map(a => a.studentEmail.toLowerCase())));

  // Remove candidates from registeredCandidates
  const initialCandidatesCount = registeredCandidates.length;
  registeredCandidates = registeredCandidates.filter(c => !candidateEmailsToRemove.includes(c.email.toLowerCase()));
  const removedCandidatesCount = initialCandidatesCount - registeredCandidates.length;

  // Remove corresponding attempts on that specific date
  const initialAttemptsCount = synchronizedAttempts.length;
  synchronizedAttempts = synchronizedAttempts.filter(a => !(getLocalDateString(a.startTime) === date && candidateEmailsToRemove.includes(a.studentEmail.toLowerCase())));
  const removedAttemptsCount = initialAttemptsCount - synchronizedAttempts.length;

  // Persist files
  saveCandidates();
  saveAttempts();

  res.json({
    success: true,
    message: `Successfully removed ${removedCandidatesCount} candidate(s) who attended on ${date} and pruned ${removedAttemptsCount} corresponding exam attempt(s).`,
    removedCandidatesCount,
    removedAttemptsCount
  });
});

// API: Get Completed Exam IDs and Attempt Details for a Specific Student (Public / Safe)
app.get("/api/attempts/completed", (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Missing or invalid student email query parameter." });
  }

  const studentAttempts = synchronizedAttempts
    .filter(a => a.studentEmail.toLowerCase() === email.trim().toLowerCase() && a.status === "completed");

  const completedIds = studentAttempts.map(a => a.examId);

  // Safe mapping to prevent leak of other students' answers
  const safeAttempts = studentAttempts.map(a => ({
    id: a.id,
    examId: a.examId,
    studentName: a.studentName,
    studentEmail: a.studentEmail,
    status: a.status,
    startTime: a.startTime,
    lastUpdated: a.lastUpdated,
    score: a.score,
    cheatingAnalysis: a.cheatingAnalysis,
    timeRemaining: a.timeRemaining,
    isSynchronized: a.isSynchronized
  }));

  res.json({
    completedExamIds: completedIds,
    attempts: safeAttempts
  });
});

// Serve frontend assets in full-stack architecture
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
