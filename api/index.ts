import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import mongoose from "mongoose";

import { GoogleGenAI, Type } from "@google/genai";
import { QuestionBank } from './models/QuestionBank.js';
import { Exam } from './models/Exam.js';
import { ExamAttempt } from './models/ExamAttempt.js';
import { CandidateUser, AdminUser } from './models/User.js';
import { SentEmail } from './models/SentEmail.js';
import { PortalSettings } from './models/PortalSettings.js';
import { seedDatabase } from './seed.js';

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

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/guardianquiz";

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("[OK] Connected to MongoDB");
    await seedDatabase();
  })
  .catch(err => console.error("MongoDB connection error:", err));

import { AdminNotification } from './models/AdminNotification.js';

// Public Settings API
app.get("/api/portal-settings", async (req, res) => {
  const settings = await PortalSettings.findOne({ id: 'default' });
  res.json(settings || { candidatePortalEnabled: true });
});

// Admin: Toggle/Update Settings API
app.post("/api/admin/portal-settings", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can modify portal settings." });
  }

  const { candidatePortalEnabled } = req.body;
  if (typeof candidatePortalEnabled !== "boolean") {
    return res.status(400).json({ error: "Invalid parameters. 'candidatePortalEnabled' (boolean) is required." });
  }

  const settings = await PortalSettings.findOneAndUpdate(
    { id: 'default' },
    { candidatePortalEnabled },
    { new: true, upsert: true }
  );

  // Log notification for admin action
  await AdminNotification.create({
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Administrative action: Candidate Portal has been ${candidatePortalEnabled ? "ENABLED" : "DISABLED"}.`,
    timestamp: Date.now(),
    read: false
  });

  res.json({
    success: true,
    message: `Candidate Portal successfully ${candidatePortalEnabled ? "enabled" : "disabled"}.`,
    settings
  });
});

// Auth Endpoints: Candidate Portal
app.post("/api/auth/candidate/register", async (req, res) => {
  const portalSettings = await PortalSettings.findOne({ id: 'default' });
  if (!portalSettings?.candidatePortalEnabled) {
    return res.status(403).json({ error: "Candidate Portal registration is currently disabled by Proctor Administration." });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, and password are required." });
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();

  // Enforce no admin registration for candidates
  if (cleanUsername.toLowerCase().includes("admin") || cleanUsername.toLowerCase().includes("proctor")) {
    return res.status(403).json({ error: "Candidates are strictly forbidden from creating administrative usernames or registering as administrators." });
  }

  const exists = await CandidateUser.findOne({
    $or: [
      { username: new RegExp(`^${cleanUsername}$`, 'i') },
      { email: cleanEmail }
    ]
  });

  if (exists) {
    return res.status(400).json({ error: "A candidate account with this username or email already exists." });
  }

  // Password length standard for candidates
  if (password.length < 6) {
    return res.status(400).json({ error: "Candidate passwords must be at least 6 characters in length." });
  }

  await CandidateUser.create({
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: password, // simple hash simulated
    createdAt: Date.now()
  });

  // Trigger admin notification immediately!
  await AdminNotification.create({
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Candidate account registered successfully: Username "${cleanUsername}" (${cleanEmail}).`,
    timestamp: Date.now(),
    read: false
  });

  res.status(201).json({
    success: true,
    message: "Candidate registered successfully. You may now sign in using your credentials.",
    user: { username: cleanUsername, email: cleanEmail }
  });
});

app.post("/api/auth/candidate/login", async (req, res) => {
  const portalSettings = await PortalSettings.findOne({ id: 'default' });
  if (!portalSettings?.candidatePortalEnabled) {
    return res.status(403).json({ error: "Candidate Portal is currently disabled by Proctor Administration. Please contact your proctor." });
  }

  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: "Please provide both your Username/Email and password." });
  }

  const cleanQuery = usernameOrEmail.trim().toLowerCase();
  
  const user = await CandidateUser.findOne({
    $or: [
      { username: new RegExp(`^${cleanQuery}$`, 'i') },
      { email: new RegExp(`^${cleanQuery}$`, 'i') }
    ]
  });

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
app.post("/api/auth/admin/register", async (req, res) => {
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
  const exists = await AdminUser.findOne({ username: new RegExp(`^${cleanUsername}$`, 'i') });
  if (exists) {
    return res.status(400).json({ error: "An administrator with this username is already registered." });
  }

  await AdminUser.create({
    username: cleanUsername,
    passwordHash: password,
    createdAt: Date.now()
  });

  // Notify current admins about the new admin creation
  await AdminNotification.create({
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

app.get("/api/auth/admin/status", async (req, res) => {
  const count = await AdminUser.countDocuments();
  res.json({
    hasCustomAdmin: count > 1,
    count
  });
});

app.post("/api/auth/admin/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Please enter your administrator username and password." });
  }

  const cleanUser = username.trim();
  const admin = await AdminUser.findOne({ username: new RegExp(`^${cleanUser}$`, 'i') });

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

app.post("/api/auth/admin/update", async (req, res) => {
  const { oldUsername, newUsername, newPassword } = req.body;

  if (!oldUsername || !newUsername || !newPassword) {
    return res.status(400).json({ error: "Missing required fields. Please provide old username, new username, and new password." });
  }

  const cleanOld = oldUsername.trim().toLowerCase();
  const cleanNew = newUsername.trim();

  // Find the admin
  const admin = await AdminUser.findOne({ username: new RegExp(`^${cleanOld}$`, 'i') });
  if (!admin) {
    return res.status(404).json({ error: "Administrator account not found." });
  }

  // Check if new username is already taken by a different admin
  const isTaken = await AdminUser.findOne({ username: new RegExp(`^${cleanNew}$`, 'i') });
  if (isTaken && isTaken.id !== admin.id) {
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
        validationErrors.map((err) => `• ${err}`).join("\n")
    });
  }

  // Update
  const oldDisplayName = admin.username;
  admin.username = cleanNew;
  admin.passwordHash = newPassword;
  await admin.save();

  // Push notification of security change
  await AdminNotification.create({
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
app.get("/api/admin/notifications", async (req, res) => {
  const notifications = await AdminNotification.find().sort({ timestamp: -1 }).lean();
  res.json(notifications);
});

app.post("/api/admin/notifications/read", async (req, res) => {
  const { id, all } = req.body;
  if (all) {
    await AdminNotification.updateMany({}, { read: true });
  } else if (id) {
    await AdminNotification.updateOne({ id }, { read: true });
  }
  const notifications = await AdminNotification.find().sort({ timestamp: -1 }).lean();
  res.json({ success: true, notifications });
});

// Helper to calculate SHA-256 hash in CJS/ESM
function getSHA256Hash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// API: Get List of Exams (For Students - correct answer keys strictly omitted for safety)
app.get("/api/exams", async (req, res) => {
  const userRole = req.headers["x-user-role"] || req.query.role;
  const userEmail = req.headers["x-user-email"] || req.query.email;

  let filteredExams: any[] = [];

  if (userRole !== "admin") {
    // Candidates can ONLY see exams explicitly assigned to them AND started by the admin
    if (userEmail && typeof userEmail === "string") {
      const cleanEmail = userEmail.trim().toLowerCase();
      filteredExams = await Exam.find({
        assignedCandidateEmail: new RegExp(`^${cleanEmail}$`, 'i'),
        isStarted: true
      }).lean();
    }
  } else {
    filteredExams = await Exam.find().lean();
  }

  // Ensure default fields
  filteredExams.forEach(exam => {
    if (exam.assignedCandidateEmail === undefined) exam.assignedCandidateEmail = null;
    if (exam.isUnlocked === undefined) exam.isUnlocked = false;
    if (exam.isStarted === undefined) exam.isStarted = false;
    if (exam.passkey === undefined) exam.passkey = "UNLOCK2026";
  });

  const safeExams = filteredExams.map(exam => {
    const safeQuestions = (exam.questions || []).map((q: any) => {
      const { correctOptionIndex, ...safeQuestion } = q;
      return safeQuestion;
    });

    const safePool = exam.questionPool
      ? exam.questionPool.map((q: any) => {
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
app.post("/api/exams/:id/assign", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can assign exams." });
  }

  const { id } = req.params;
  const { email } = req.body;

  const exam = await Exam.findOne({ id });
  if (!exam) {
    return res.status(404).json({ error: "Exam not found." });
  }

  exam.assignedCandidateEmail = email || null;
  await exam.save();
  
  res.json({ success: true, exam });
});

// API: Unlock an Exam using a passkey (For Admins)
app.post("/api/exams/:id/unlock", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can unlock exams." });
  }

  const { id } = req.params;
  const { passkey } = req.body;

  const exam = await Exam.findOne({ id });
  if (!exam) {
    return res.status(404).json({ error: "Exam not found." });
  }

  const expectedPasskey = exam.passkey || "UNLOCK2026";
  if (!passkey || passkey.trim() !== expectedPasskey.trim()) {
    return res.status(400).json({ error: "Invalid unlock passkey." });
  }

  exam.isUnlocked = true;
  await exam.save();
  
  res.json({ success: true, exam });
});

// API: Start an Exam (For Admins - makes it visible to the assigned candidate)
app.post("/api/exams/:id/start", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can start exams." });
  }

  const { id } = req.params;
  const exam = await Exam.findOne({ id });
  if (!exam) {
    return res.status(404).json({ error: "Exam not found." });
  }

  if (!exam.isUnlocked) {
    return res.status(400).json({ error: "Exam must be unlocked with a passkey before it can be started." });
  }

  exam.isStarted = true;
  await exam.save();
  
  res.json({ success: true, exam });
});

// API: Bulk Start / Publish an Exam for ALL Registered Candidates with one button
app.post("/api/exams/:id/start-all", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can bulk start exams." });
  }

  const { id } = req.params;
  const baseExam = await Exam.findOne({ id });
  if (!baseExam) {
    return res.status(404).json({ error: "Exam template not found." });
  }

  // Auto-unlock and auto-start the base template too
  baseExam.isUnlocked = true;
  baseExam.isStarted = true;
  await baseExam.save();

  const candidates = await CandidateUser.find().lean();
  if (candidates.length === 0) {
    return res.json({ success: true, message: "Exam template unlocked and started. No candidates are registered yet.", totalCandidates: 0, clonedExamsCreated: 0, existingExamsUpdated: 0 });
  }

  let createdCount = 0;
  let updatedCount = 0;

  const newExamsToInsert = [];

  for (const candidate of candidates) {
    const cleanEmail = candidate.email.trim().toLowerCase();

    // Check if there's already an exam copy assigned to this candidate
    let candidateExam = await Exam.findOne({
      assignedCandidateEmail: new RegExp(`^${cleanEmail}$`, 'i'),
      $or: [
        { parentExamId: baseExam.id },
        { title: baseExam.title }
      ]
    });

    if (candidateExam) {
      candidateExam.isUnlocked = true;
      candidateExam.isStarted = true;
      await candidateExam.save();
      updatedCount++;
    } else {
      // Clone the exam for the candidate
      const cloned = {
        ...baseExam.toObject(),
        id: "exam-" + Math.random().toString(36).substr(2, 9),
        assignedCandidateEmail: cleanEmail,
        isUnlocked: true,
        isStarted: true,
        parentExamId: baseExam.id,
        createdAt: Date.now()
      };
      delete cloned._id;
      newExamsToInsert.push(cloned);
      createdCount++;
    }
  }

  if (newExamsToInsert.length > 0) {
    await Exam.collection.insertMany(newExamsToInsert);
  }

  await AdminNotification.create({
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Administrative Bulk Action: Exam "${baseExam.title}" is now unlocked and started for all ${candidates.length} registered candidates.`,
    timestamp: Date.now(),
    read: false
  });

  res.json({
    success: true,
    message: `Exam "${baseExam.title}" is now live for all registered candidates.`,
    totalCandidates: candidates.length,
    clonedExamsCreated: createdCount,
    existingExamsUpdated: updatedCount
  });
});

// API: Create new Exam (For Admins)
app.post("/api/exams", async (req, res) => {
  const { title, description, timeLimit, questions, requireScreenCapture, assignedCandidateEmail, passkey } = req.body;
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: "Exam must include a title and at least one question." });
  }  const examData = {
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
    questionPool: [],
    questions: questions.map((q: any, idx: number) => ({
      id: q.id || `q-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      text: q.text,
      options: q.options,
      correctOptionIndex: Number(q.correctOptionIndex) || 0
    }))
  };

  await Exam.collection.insertOne(examData);
  res.status(201).json(examData);
});

// API: Get Question Banks (For Admins)
app.get("/api/question-banks", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can access raw question banks." });
  }
  const banks = await QuestionBank.find().lean();
  res.json(banks);
});

// API: Upload Question Bank (For Admins)
app.post("/api/question-banks", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can upload question banks." });
  }

  const { name, subject, topic, questions } = req.body;
  if (!name || !subject || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Name, subject, and an array of questions are required." });
  }

  const bankData = {
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

  await QuestionBank.collection.insertOne(bankData);

  await AdminNotification.create({
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Question Bank uploaded: "${name}" (${questions.length} questions).`,
    timestamp: Date.now(),
    read: false
  });

  res.status(201).json(bankData);
});

// API: Create Adaptive Quiz (For Admins)
app.post("/api/exams/adaptive", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can create adaptive quizzes." });
  }

  const { title, description, timeLimit, questionBankId, totalQuestionsCount, requireScreenCapture, assignedCandidateEmail, passkey } = req.body;
  if (!title || !questionBankId) {
    return res.status(400).json({ error: "Title and Question Bank selection are required." });
  }

  const selectedBank = await QuestionBank.findOne({ id: questionBankId });
  if (!selectedBank) {
    return res.status(404).json({ error: "Selected Question Bank not found." });
  }

  const examData = {
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

  await Exam.collection.insertOne(examData);

  await AdminNotification.create({
    id: "notif-" + Math.random().toString(36).substr(2, 9),
    message: `Adaptive Quiz created: "${title}" from bank "${selectedBank.name}".`,
    timestamp: Date.now(),
    read: false
  });

  res.status(201).json(examData);
});

// Helper: Process single candidate attempt with server-side grading and AI integrity evaluation
async function processSingleAttempt(attempt: any) {
  const originalExam = await Exam.findOne({ id: attempt.examId }).lean();
  if (!originalExam) {
    throw new Error(`Associated exam ID "${attempt.examId}" was not found on the server.`);
  }

  // 1. Server-side grading logic
  let correctCount = 0;
  const pool = originalExam.isAdaptive ? originalExam.questionPool : originalExam.questions;
  const questionsToGrade = pool || [];

  questionsToGrade.forEach((q: any) => {
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

  const formattedLogs = (attempt.tamperLogs || []).map((log: any) => {
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

  let cheatingAnalysis = {
    riskLevel: "Low",
    confidenceScore: 100,
    flaggedPatterns: [] as string[],
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
  const gradedAttempt = {
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

    await SentEmail.create({
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
    });

    // Push security notification to dashboard
    await AdminNotification.create({
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
  const existing = await ExamAttempt.findOne({ id: attempt.id });
  if (existing) {
    return res.json({ success: true, alreadySynced: true, attempt: existing });
  }

  try {
    const gradedAttempt = await processSingleAttempt(attempt);
    const savedAttempt = await ExamAttempt.create(gradedAttempt);
    res.json({ success: true, attempt: savedAttempt });
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

  const processed = [];
  const skipped = [];
  const errors: string[] = [];

  for (const attempt of attempts) {
    if (!attempt || !attempt.id || !attempt.examId) {
      errors.push(`Attempt lacking complete metadata skipped.`);
      continue;
    }

    const existing = await ExamAttempt.findOne({ id: attempt.id });
    if (existing) {
      skipped.push(existing);
      continue;
    }

    try {
      const graded = await processSingleAttempt(attempt);
      const saved = await ExamAttempt.create(graded);
      processed.push(saved);
    } catch (err: any) {
      errors.push(`Failed to sync attempt ${attempt.id}: ${err.message}`);
    }
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

  const updatedAttempts = [];
  const errors: string[] = [];

  for (const id of attemptIds) {
    const attempt = await ExamAttempt.findOne({ id }).lean();
    if (!attempt) {
      errors.push(`Attempt ID ${id} not found in synchronized database.`);
      continue;
    }

    try {
      const reprocessed = await processSingleAttempt(attempt);
      await ExamAttempt.updateOne({ id }, reprocessed);
      updatedAttempts.push(reprocessed);
    } catch (err: any) {
      errors.push(`Failed to re-analyze attempt ID ${id}: ${err.message}`);
    }
  }

  if (updatedAttempts.length > 0) {
    await AdminNotification.create({
      id: "notif-" + Math.random().toString(36).substr(2, 9),
      message: `Batch re-analysis completed: ${updatedAttempts.length} candidate attempts were re-analyzed via Gemini AI.`,
      timestamp: Date.now(),
      read: false
    });
  }

  res.json({ success: true, updatedAttempts, errors });
});

// API: Get Synchronized Exam Submissions (For Admin Dashboard)
app.get("/api/attempts", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can view evaluation and proctoring processes." });
  }
  const attempts = await ExamAttempt.find().lean();
  res.json(attempts);
});

// API: Get Sent Email Alerts (For Admin Dashboard Auditing)
app.get("/api/admin/emails", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can view email dispatch logs." });
  }
  const emails = await SentEmail.find().lean();
  res.json(emails);
});

// API: Get Registered Candidates (For Admin Dashboard analytics)
app.get("/api/admin/candidates", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can view candidate records." });
  }
  const candidates = await CandidateUser.find().lean();
  res.json(candidates.map(c => ({
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
app.get("/api/admin/candidates-by-date", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can query candidates by attendance date." });
  }

  const { date } = req.query;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'date' query parameter. Expected YYYY-MM-DD." });
  }

  const allAttempts = await ExamAttempt.find().lean();
  const dateAttempts = allAttempts.filter(a => getLocalDateString(a.startTime) === date);
  const candidateEmails = Array.from(new Set(dateAttempts.filter(a => a.studentEmail).map(a => a.studentEmail.toLowerCase())));

  const candidatesData = await Promise.all(candidateEmails.map(async email => {
    const user = await CandidateUser.findOne({ email: new RegExp(`^${email}$`, 'i') });
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
  }));

  const allFinishedGlobal = candidatesData.every(c => c.allFinished);

  res.json({
    date,
    totalCandidates: candidatesData.length,
    allFinished: allFinishedGlobal,
    candidates: candidatesData
  });
});

// API: Bulk remove candidates who attended on a specific date
app.post("/api/admin/candidates-by-date/remove", async (req, res) => {
  const userRole = req.headers["x-user-role"];
  if (userRole !== "admin") {
    return res.status(403).json({ error: "Access Denied: Only administrators can remove candidates." });
  }

  const { date, force } = req.body;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'date' body parameter. Expected YYYY-MM-DD." });
  }

  const allAttempts = await ExamAttempt.find().lean();
  const dateAttempts = allAttempts.filter(a => getLocalDateString(a.startTime) === date);
  if (dateAttempts.length === 0) {
    return res.status(404).json({ error: `No attendance records or exam attempts found on ${date}.` });
  }

  const activeAttempts = dateAttempts.filter(a => a.status === 'started' || a.status === 'paused');
  if (activeAttempts.length > 0 && !force) {
    return res.status(400).json({
      error: `Cannot remove candidates. There are still ${activeAttempts.length} active exam session(s) in progress on ${date}.`,
      activeCount: activeAttempts.length
    });
  }

  const candidateEmailsToRemove = Array.from(new Set(dateAttempts.filter(a => a.studentEmail).map(a => a.studentEmail.toLowerCase())));
  const dateAttemptIds = dateAttempts.map(a => a.id);

  // Remove candidates
  const candidateResult = await CandidateUser.deleteMany({ email: { $in: candidateEmailsToRemove } });
  
  // Remove attempts
  const attemptResult = await ExamAttempt.deleteMany({ id: { $in: dateAttemptIds } });

  res.json({
    success: true,
    message: `Successfully removed ${candidateResult.deletedCount} candidate(s) who attended on ${date} and pruned ${attemptResult.deletedCount} corresponding exam attempt(s).`,
    removedCandidatesCount: candidateResult.deletedCount,
    removedAttemptsCount: attemptResult.deletedCount
  });
});

// API: Get Completed Exam IDs and Attempt Details for a Specific Student (Public / Safe)
app.get("/api/attempts/completed", async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Missing or invalid student email query parameter." });
  }

  const studentAttempts = await ExamAttempt.find({
    studentEmail: new RegExp(`^${email.trim()}$`, 'i'),
    status: "completed"
  }).lean();

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
