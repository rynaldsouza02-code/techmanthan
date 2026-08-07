import { db } from "./firebase-config.js?v=3.1";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Session elements
const navUserArea = document.getElementById("navUserArea");
const heroSection = document.getElementById("heroSection");
const heroActions = document.getElementById("heroActions");
const filterToggles = document.getElementById("filterToggles");
const eventGrid = document.getElementById("eventGrid");
const searchInput = document.getElementById("searchInput");

// Modal elements
const detailModal = document.getElementById("detailModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalCloseBtn = document.getElementById("modalCloseBtn");

// Local state
let eventsList = [];
let registeredEventsIds = [];
let currentFilter = "all"; // "all" or "registered"
let searchQuery = "";

// Check user login session
const username = localStorage.getItem("username"); // Registration number (e.g. BCA24079)
const name = localStorage.getItem("name");

// Seed default events if database is empty
const defaultEvents = [
  { id: "it-manager", title: "Best IT Manager", description: "Corporate tech survival. Test your management, crisis resolution, and executive pitching skills.", venue: "Auditorium / Room 205", time: "02:00 PM - 03:00 PM (Rounds: 14th & 18th Aug @ 3pm)", date: "2026-08-22", coordinator: "Mrs. Vijayashree, Mr. Shreejesh", section: "III BCA A", rounds: "1st Round: 14-08-2026 @ 3:00pm (Room 205), 2nd Round: 18-08-2026 @ 3:00pm (Room 205), Final Round: 22-08-2026 @ 2:00pm-3:00pm (Auditorium)", rules: "1. Individual event.\n2. Rounds include aptitude, crisis management, and mock interview.\n3. Executive dress code is mandatory." },
  { id: "videography", title: "Videography (Non CS)", description: "Reel into reels. Shoot and edit a cinematic reel capturing the energy of Tech Manthan.", venue: "Research Lab - Video Submission", time: "Submission by 22-08-2026", date: "2026-08-22", coordinator: "Mr. Shreekanth, Mr. Manjunath", section: "III BCA A & B", rounds: "Final Video Submission by 22-08-2026", rules: "1. Maximum length: 60 seconds.\n2. Video must showcase fest events and campus life.\n3. Non-CS students only." },
  { id: "treasure-hunt", title: "Treasure Hunt", description: "Decrypt the clues. Crack cryptographic hashes and riddles across the campus to locate the flag.", venue: "Room no: 204", time: "11:00 AM (After Inauguration)", date: "2026-08-22", coordinator: "Mrs. Vijayashree, Mrs. Wilma", section: "III BCA B", rounds: "After the Inauguration @ 11:00 AM", rules: "1. Teams of 2.\n2. Use of mobile phones is permitted for decryption only.\n3. Do not tamper with campus property." },
  { id: "coding", title: "Coding", description: "Create your own world. Solve algorithmic puzzles and write clean code to win the ultimate prize.", venue: "Research Lab", time: "12:30 PM - 02:00 PM (Rounds: 19th & 21st Aug @ 3pm)", date: "2026-08-22", coordinator: "Mr. Pranam, Ms. Shivani", section: "III BCA B", rounds: "1st Round: 19-08-2026 @ 3:00pm, 2nd Round: 21-08-2026 @ 3:00pm, 3rd Round: 22-08-2026 @ 12:30pm-2:00pm", rules: "1. Supported languages: C, C++, Java, Python.\n2. Submissions judged on correctness, efficiency, and syntax cleanliness.\n3. Plagiarism leads to instant disqualification." },
  { id: "photography", title: "Photography", description: "Capture every moment. Submit the best click capturing the cyberpunk essence of our festival.", venue: "Lab 1 - Photography Submission", time: "09:00 AM - 02:00 PM", date: "2026-08-22", coordinator: "Mrs. Pavithra, Mr. Sachin", section: "III BCA A", rounds: "Submission: 22-08-2026 9:00AM - 2:00PM", rules: "1. DSLR or high-res smartphones allowed.\n2. Submissions must contain original metadata (no heavy editing).\n3. Submit top 3 shots." },
  { id: "gaming", title: "Gaming", description: "Show the spirit. Compete head-to-head in competitive multiplayer tournaments.", venue: "Lab 1", time: "03:00 PM", date: "2026-08-12 to 2026-08-14", coordinator: "Mr. Mahesh Poojary, Mr. Akash", section: "III BCA A", rounds: "1st Round: 12-08-2026 @ 3:00pm, 2nd Round: 13-08-2026 @ 3:00pm, Final Round: 14-08-2026 @ 3:00pm", rules: "1. Teams of 4.\n2. Choose Free Fire or BGMI.\n3. Decisions of the referees are final." },
  { id: "poster-making", title: "Poster Making", description: "Design the future. Create a digital or physical flyer representing the core tech event vision.", venue: "Research Lab", time: "03:00 PM", date: "2026-08-11", coordinator: "Mrs. Wilma, Ms. Shraddha", section: "III BCA B", rounds: "Single Round: 11-08-2026 @ 3:00pm", rules: "1. Topic: Artificial Intelligence vs Humanity.\n2. Bring your own drawing materials or digital tablets.\n3. Duration: 2 hours." },
  { id: "ungoogling", title: "Ungoogling", description: "Find answers without using the search giant. Navigate alternative portals to crack clues.", venue: "Research Lab", time: "10:00 AM - 11:30 AM (Prelims: 18th Aug @ 3pm)", date: "2026-08-22", coordinator: "Mr. Pranam, Mr. Manjunath", section: "III BCA B", rounds: "1st Round: 18-08-2026 @ 3:00pm, Final Round: 22-08-2026 @ 10:00am-11:30am", rules: "1. Teams of 2.\n2. Google.com is strictly banned.\n3. Direct queries only via alternative directories." },
  { id: "speed-typing", title: "Speed Typing", description: "Test your WPM limit under intense pressure.", venue: "Research Lab", time: "Round 1: 12:00 PM, Round 2: 03:00 PM", date: "2026-08-08 & 2026-08-10", coordinator: "Mr. Harish, Mr. Mahesh Poojary, Ms. Shivani, Mrs. Nishmitha, Mrs. Nishchitha", section: "III BCA A", rounds: "1st Round: 08-08-2026 @ 12:00pm, 2nd Round: 10-08-2026 @ 3:00pm", rules: "1. No external keyboards allowed.\n2. Typing speed and accuracy will both be calculated.\n3. Winner chosen by highest WPM." },
  { id: "tech-quiz", title: "Tech Quiz", description: "Brain vs Machine. The ultimate trivia battle covering computer history, networks, and syntax.", venue: "Auditorium / Research Lab", time: "11:00 AM - 12:00 PM (Round 1: 10th Aug @ 3pm)", date: "2026-08-22", coordinator: "Mr. Harish, Mr. Sachin, Mr. Rakshith, Mr. Akash, Ms. Archana", section: "III BCA B", rounds: "1st Round: 10-08-2026 @ 3:00pm (Research Lab), Final Round: 22-08-2026 @ 11:00am-12:00pm (Auditorium)", rules: "1. Teams of 2.\n2. Prelims will be a written test.\n3. Top 6 teams qualify for the stage rounds." },
  { id: "cultural", title: "Group Dance", description: "Your time to shine. Showcase technical skits, digital presentations, or creative dances.", venue: "Auditorium", time: "12:30 PM - 02:00 PM", date: "2026-08-22", coordinator: "Ms. Megha, Ms. Rashmi", section: "III BCA A", rounds: "Stage Performance: 22-08-2026 @ 12:30pm-2:00pm", rules: "1. Minimum 5 to Maximum 10 members per team.\n2. Only 1 team per class allowed.\n3. Audio tracks must be submitted in advance." },
  { id: "it-model", title: "IT Model & Marketing with PPT", description: "Build the hardware of tomorrow. Showcase working models of modern technological frameworks.", venue: "Room No: 205", time: "First Round @ 19-08-2026", date: "2026-08-19", coordinator: "Ms. Megha, Mrs. Ramya", section: "III BCA B", rounds: "1st Round: 19-08-2026 @ Room 205", rules: "1. Maximum 3 members per team.\n2. Models must be working and related to green tech or automation.\n3. Bring all necessary equipment." },
  { id: "it-melody", title: "IT Melody", description: "Musical technology blend performance.", venue: "Auditorium", time: "02:00 PM - 04:30 PM", date: "2026-08-13", coordinator: "Mrs. Nirmala, Mr. Sachin, Mrs. Madhura", studentCoordinator: "Pratha", section: "III BCA B", rounds: "Stage Performance: 13-08-2026 @ 2:00pm-4:30pm", rules: "1. Teams of 2.\n2. Solo or Group music performance.\n3. Max 5 minutes." }
];

// Seed default organizers
const defaultOrganizers = [
  { id: "bbhcf040", name: "Mr. Mahesh Kumar", designation: "Associate Professor & HOD", department: "Computer Applications", assignedEventId: "speed-typing" },
  { id: "bbhcf041", name: "Mr. Harish Kanchan", designation: "Assistant. Professor", department: "Computer Applications", assignedEventId: "it-manager" },
  { id: "bbhcf004", name: "Mr. Giriraj Bhat", designation: "Associate Professor", department: "Computer Applications", assignedEventId: "ungoogling" },
  { id: "bbhcf042", name: "Mrs. Wilma Sharal Cornelio", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "poster-making" },
  { id: "bbhcf043", name: "Mrs. Jayalakshmi K", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "tech-quiz" },
  { id: "bbhcf044", name: "Mrs. Pavithra", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "it-model" },
  { id: "bbhcf045", name: "Mr. Shreekanth", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "treasure-hunt" },
  { id: "bbhcf046", name: "Ms. Megha", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "coding" },
  { id: "bbhcf047", name: "Ms. Rashmi Gavadi", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "cultural" },
  { id: "bbhcf048", name: "Mr. Pranam R Betrabet", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "videography" },
  { id: "bbhcf049", name: "Mrs. Nirmala B.", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "photography" },
  { id: "bbhcf050", name: "Mrs. Vijaya Shree A", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "gaming" },
  { id: "bbhcf051", name: "Ms. Shivani Adiga", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "" },
  { id: "bbhcf052", name: "Mr. Mahesh Poojari", designation: "Assistant Professor", department: "Computer Applications", assignedEventId: "" }
];

async function initializeApp() {
  seedDatabaseIfNeeded().catch(err => console.error("Non-blocking seed error:", err));
  setupSessionUI();
  await loadUserData();
  await loadEvents();
  await loadPromosForHome();
  setupEventListeners();
  await checkAndRenderChampionship();
}

async function seedDatabaseIfNeeded() {
  try {
    const hodRef = doc(db, "organizers", "bbhcf040");
    const hodSnap = await getDoc(hodRef);
    if (!hodSnap.exists()) {
      console.log("No default organizers found. Seeding database with organizers and events...");
      for (const org of defaultOrganizers) {
        await setDoc(doc(db, "organizers", org.id), {
          name: org.name,
          password: org.id.toUpperCase(), // fallback password is upper case ID
          assignedEventId: org.assignedEventId
        });
      }
      for (const ev of defaultEvents) {
        await setDoc(doc(db, "events", ev.id), ev);
      }
      console.log("Database seeded successfully!");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

function setupSessionUI() {
  const currentUsername = localStorage.getItem("username") || localStorage.getItem("user") || "";
  const currentName = localStorage.getItem("name") || currentUsername || "";

  if (currentUsername) {
    const displayName = currentName || currentUsername || "Student";
    const firstInitial = (displayName.charAt(0) || "S").toUpperCase();

    if (navUserArea) {
      navUserArea.innerHTML = `
        <div class="profile-pill-btn" id="btnProfilePill">
          <div class="avatar-circle-sm">${firstInitial}</div>
          <span class="profile-name-text">${displayName}</span>
        </div>
      `;
    }
    
    // Add "My Registrations" filter button
    if (filterToggles && !document.getElementById("btnMyEvents")) {
      filterToggles.innerHTML += `
        <button class="tab-btn" id="btnMyEvents">My Registrations</button>
      `;
    }

    // Render Student Profile Dropdown Panel
    renderProfileDropdown();

    const btnProfilePill = document.getElementById("btnProfilePill");
    if (btnProfilePill) {
      btnProfilePill.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById("studentProfileDropdown");
        if (dropdown) {
          dropdown.classList.toggle("active");
          renderProfileEventsList();
        }
      });
    }

    document.addEventListener("click", (e) => {
      const dropdown = document.getElementById("studentProfileDropdown");
      const btn = document.getElementById("btnProfilePill");
      if (dropdown && dropdown.classList.contains("active")) {
        if (!dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
          dropdown.classList.remove("active");
        }
      }
    });

  } else {
    // Guest or other state
    navUserArea.innerHTML = `
      <a href="login.html" class="cyber-btn" style="padding: 6px 20px; font-size: 0.85rem;">Login</a>
    `;
  }
}

function renderProfileDropdown() {
  let existing = document.getElementById("studentProfileDropdown");
  if (!existing) {
    existing = document.createElement("div");
    existing.id = "studentProfileDropdown";
    existing.className = "student-profile-dropdown";
    document.body.appendChild(existing);
  }

  const firstInitial = (name.charAt(0) || "S").toUpperCase();
  const userClass = localStorage.getItem("userClass") || "N/A";
  const userDOB = localStorage.getItem("userDOB") || "N/A";
  const userEmail = localStorage.getItem("email") || "";

  existing.innerHTML = `
    <div class="profile-card-header">
      <span class="profile-title-text">Profile Protocol</span>
      <span class="profile-role-badge">STUDENT</span>
    </div>

    <div class="profile-user-info">
      <div class="profile-avatar-large">${firstInitial}</div>
      <div class="profile-user-name">${name}</div>
    </div>

    <div class="profile-details-grid">
      <div class="profile-field-row">
        <span class="profile-field-label">Roll Number</span>
        <span class="profile-field-val">${username}</span>
      </div>
      <div class="profile-field-row">
        <span class="profile-field-label">Course & Sec</span>
        <span class="profile-field-val">${userClass}</span>
      </div>
      <div class="profile-field-row">
        <span class="profile-field-label">Date of Birth</span>
        <span class="profile-field-val">${userDOB}</span>
      </div>
      <div class="profile-field-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
        <span class="profile-field-label">Email Address</span>
        <div style="display: flex; gap: 6px; width: 100%;">
          <input type="email" id="profileEmailInput" class="profile-email-input" value="${userEmail}">
          <button type="button" id="btnSaveProfileEmail" class="profile-email-save-btn" title="Save Email">✓</button>
        </div>
      </div>
    </div>

    <div class="profile-events-section" style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
      <span class="profile-field-label" style="display: block; margin-bottom: 6px; color: var(--neon-cyan); font-weight: 700;">REGISTERED EVENTS</span>
      <div id="profileRegisteredEventsList" style="display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto;">
        <div style="color: var(--text-sub); font-size: 0.8rem; font-style: italic;">Loading registered events...</div>
      </div>
    </div>

    <button type="button" class="profile-logout-btn" id="btnProfileLogout">Log Out</button>
  `;

  const btnProfileLogout = document.getElementById("btnProfileLogout");
  if (btnProfileLogout) {
    btnProfileLogout.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "login.html";
    });
  }

  const btnSaveProfileEmail = document.getElementById("btnSaveProfileEmail");
  if (btnSaveProfileEmail) {
    btnSaveProfileEmail.addEventListener("click", async () => {
      const emailInput = document.getElementById("profileEmailInput");
      const newEmail = emailInput ? emailInput.value.trim() : "";
      if (!newEmail || !newEmail.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }
      try {
        const studentRef = doc(db, "students", username);
        await updateDoc(studentRef, { email: newEmail });
        localStorage.setItem("email", newEmail);
        alert("Email address updated successfully!");
      } catch (err) {
        console.error("Error updating email:", err);
        alert("Failed to update email address.");
      }
    });
  }
}

function renderProfileEventsList() {
  const container = document.getElementById("profileRegisteredEventsList");
  if (!container) return;

  if (registeredEventsIds.length === 0) {
    container.innerHTML = `<div style="color: var(--text-sub); font-size: 0.8rem; font-style: italic;">You have not registered for any events yet.</div>`;
    return;
  }

  container.innerHTML = registeredEventsIds.map(evId => {
    const ev = eventsList.find(e => e.id === evId);
    const title = ev ? ev.title : evId;

    let promoText = "";
    if (ev && ev.roundPromotions) {
      Object.keys(ev.roundPromotions).forEach(targetRound => {
        const promo = ev.roundPromotions[targetRound];
        if (promo && promo.promotedStudents && promo.promotedStudents.includes(username)) {
          promoText = `<span style="color: #e9d5ff; font-weight: bold; font-size: 0.75rem;"> (🎉 Qualified: ${targetRound})</span>`;
        }
      });
    }

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,243,255,0.05); border: 1px solid rgba(0,243,255,0.2); padding: 5px 10px; border-radius: 6px; font-size: 0.8rem;">
        <span style="color: #fff; font-weight: 600;">⚡ ${title}${promoText}</span>
        <span style="color: var(--neon-cyan); font-weight: 700; font-size: 0.7rem;">REGISTERED</span>
      </div>
    `;
  }).join("");
}

function normalizeClassName(str) {
  if (!str) return "";
  return str.toString().trim().toUpperCase().replace(/[\.\s\(\)]+/g, " ");
}

function isRestrictedClassStudent(studentClass) {
  if (!studentClass) return false;
  const cls = studentClass.toString().trim().toUpperCase();
  const isBComOrBBA = /B\.?\s*COM|BCOM|BBA/i.test(cls);
  const isBCA = /BCA/i.test(cls);
  return isBComOrBBA && !isBCA;
}

function isVideographyEvent(ev) {
  if (!ev) return false;
  const title = (ev.title || "").toLowerCase();
  const id = (ev.id || "").toLowerCase();
  return title.includes("videography") || id.includes("videography") || title.includes("video") || id.includes("video");
}

function getClassRegistrationLimit(ev, studentClass) {
  if (!ev || !studentClass) return null;
  const normStudentClass = normalizeClassName(studentClass);

  if (ev.classLimits && typeof ev.classLimits === "object") {
    const keys = Object.keys(ev.classLimits);
    const matchedKey = keys.find(k => normalizeClassName(k) === normStudentClass);
    if (matchedKey && ev.classLimits[matchedKey] !== undefined) {
      const limit = parseInt(ev.classLimits[matchedKey]);
      if (!isNaN(limit) && limit >= 0) return limit;
    }
  }

  if (ev.maxPerClass !== undefined && ev.maxPerClass !== null) {
    const globalLimit = parseInt(ev.maxPerClass);
    if (!isNaN(globalLimit) && globalLimit > 0) return globalLimit;
  }

  return null;
}

async function loadUserData() {
  if (!username) return;
  try {
    const studentRef = doc(db, "students", username);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const data = studentSnap.data();
      registeredEventsIds = data.registeredEvents || [];
      if (data.email) localStorage.setItem("email", data.email);
      if (data.name) localStorage.setItem("name", data.name);
      if (data.class) {
        localStorage.setItem("userClass", data.class);
        localStorage.setItem("studentClass", data.class);
      }
      if (data.dob) localStorage.setItem("userDOB", data.dob);
    }
  } catch (error) {
    console.error("Error loading user data:", error);
  }
}

function loadCachedEventsFirst() {
  try {
    const raw = localStorage.getItem("cachedEventsList");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        eventsList = parsed;
        renderEvents();
      }
    }
  } catch (e) {
    console.warn("Error parsing cached events:", e);
  }
}

async function loadEvents() {
  loadCachedEventsFirst();
  try {
    onSnapshot(collection(db, "events"), (snapshot) => {
      const newEvents = [];
      snapshot.forEach((docSnap) => {
        newEvents.push(docSnap.data());
      });
      if (newEvents.length > 0) {
        eventsList = newEvents;
        try {
          localStorage.setItem("cachedEventsList", JSON.stringify(eventsList));
        } catch (err) {
          // Storage quota fallback
        }
      } else if (eventsList.length === 0) {
        eventsList = [...defaultEvents];
      }
      renderEvents();
    }, (error) => {
      console.error("Realtime events listener error:", error);
      if (eventsList.length === 0) {
        eventsList = [...defaultEvents];
        renderEvents();
      }
    });
  } catch (error) {
    console.error("Error setting up realtime events listener:", error);
    if (eventsList.length === 0) {
      eventsList = [...defaultEvents];
      renderEvents();
    }
  }
}

function formatToDDMMYYYY(dStr) {
  if (!dStr) return "N/A";
  let s = String(dStr).trim();
  if (!s) return "N/A";

  if (s.includes(" to ")) {
    const parts = s.split(" to ");
    return `${formatToDDMMYYYY(parts[0])} to ${formatToDDMMYYYY(parts[1])}`;
  }
  if (s.includes(" & ")) {
    const parts = s.split(" & ");
    return `${formatToDDMMYYYY(parts[0])} & ${formatToDDMMYYYY(parts[1])}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const p = s.split("-");
    return `${p[2]}/${p[1]}/${p[0]}`;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const p = s.split("-");
    return `${p[0]}/${p[1]}/${p[2]}`;
  }

  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
    const p = s.split("/");
    return `${p[2]}/${p[1]}/${p[0]}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    return s;
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  return s;
}

function parseToYYYYMMDD(dStr) {
  if (!dStr) return null;
  let s = dStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const parts = s.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function isRegistrationClosed(ev) {
  if (!ev || !ev.registrationCloseDate) return false;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const regCloseNorm = parseToYYYYMMDD(ev.registrationCloseDate);
  if (regCloseNorm && todayStr >= regCloseNorm) {
    return true; // Closed at 12:00 AM Midnight of registrationCloseDate
  }

  return false;
}

function renderEvents() {
  let filtered = eventsList.filter(ev => {
    const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ev.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (currentFilter === "registered") {
      return registeredEventsIds.includes(ev.id);
    }
    return true;
  });

  if (filtered.length === 0) {
    eventGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-sub);">
        ${currentFilter === "registered" ? "You have not registered for any events yet." : "No events found matching your search."}
      </div>
    `;
    return;
  }

  eventGrid.innerHTML = filtered.map(ev => {
    const isRegistered = registeredEventsIds.includes(ev.id);
    const isStarted = ev.status === "started";
    const hasResults = ev.resultsApproved && ev.results && (ev.results.first || ev.results.second || ev.results.third);
    
    let resultHTML = "";
    if (hasResults) {
      resultHTML = `
        <div class="winner-card-banner">
          <div style="font-weight: 700; color: var(--neon-purple); border-bottom: 1px solid rgba(188, 19, 254, 0.2); padding-bottom: 2px; margin-bottom: 6px; font-size: 0.75rem;">WINNERS</div>
          ${ev.results.first ? `<div><span>🥇 1st:</span> <strong>${ev.results.first}</strong></div>` : ""}
          ${ev.results.second ? `<div><span>🥈 2nd:</span> <strong>${ev.results.second}</strong></div>` : ""}
          ${ev.results.third ? `<div><span>🥉 3rd:</span> <strong>${ev.results.third}</strong></div>` : ""}
        </div>
      `;
    }

    const isClosed = isRegistrationClosed(ev);

    const regCloseHTML = ev.registrationCloseDate
      ? `<div class="detail-item" style="grid-column: 1/-1; color: ${isClosed ? 'var(--neon-red)' : 'var(--text-sub)'};">⏳ <strong>Reg Closes:</strong> 12 AM Midnight (${formatToDDMMYYYY(ev.registrationCloseDate)}) ${isClosed ? '🔴 (Closed)' : '🟢 (OPEN)'}</div>`
      : "";

    let posterHTML = `<div class="event-card-poster-fallback"><span>No Poster</span></div>`;
    if (ev.poster) {
      posterHTML = `<img src="${ev.poster}" class="event-card-poster" alt="${ev.title} poster">`;
    }

    let promotionBadgeHTML = "";
    if (username && ev.roundPromotions) {
      Object.keys(ev.roundPromotions).forEach(targetRound => {
        const promo = ev.roundPromotions[targetRound];
        if (promo && promo.promotedStudents && promo.promotedStudents.includes(username)) {
          promotionBadgeHTML += `<span class="reg-badge" style="background: rgba(168, 85, 247, 0.25); border: 1px solid var(--neon-purple); color: #e9d5ff; font-weight: bold; box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);">🎉 QUALIFIED: ${targetRound}</span>`;
        }
      });
    }

    const currentStudentClass = localStorage.getItem("studentClass") || localStorage.getItem("userClass") || "";
    const isRestrictedStudent = isRestrictedClassStudent(currentStudentClass);
    const isVideoEv = isVideographyEvent(ev);

    let actionButtonHTML = "";
    if (isClosed) {
      actionButtonHTML = `<button class="btn-action" style="width: 100%; opacity: 0.5; cursor: not-allowed; background: #374151; border-color: #374151; color: #9ca3af;" disabled>Registration Closed</button>`;
    } else if (username) {
      if (isRegistered) {
        actionButtonHTML = `<button class="btn-action btn-danger" style="width: 100%; opacity: 0.6; cursor: not-allowed;" disabled>Leave</button>
                            <p style="color: var(--text-sub); font-size: 0.75rem; margin-top: 4px; text-align: center;">Deregistration requires organizer permission.</p>`;
      } else if (isRestrictedStudent && !isVideoEv) {
        actionButtonHTML = `<button class="btn-action" style="width: 100%; opacity: 0.65; cursor: not-allowed; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--neon-red); color: #fca5a5;" disabled>Restricted to BCA (View Only)</button>
                            <p style="color: var(--neon-red); font-size: 0.72rem; margin-top: 4px; text-align: center;">B.Com & BBA students are eligible for Videography only.</p>`;
      } else {
        actionButtonHTML = `<button class="btn-action btn-success" style="width: 100%;" onclick="registerEvent('${ev.id}')">Register</button>`;
      }
    } else {
      actionButtonHTML = `<button class="btn-action btn-success" style="width: 100%;" onclick="redirectToLogin()">Register</button>`;
    }

    return `
      <div class="event-card cyber-card-scan cyber-corners" id="card-${ev.id}">
        <div>
          ${posterHTML}
          <div class="event-header">
            <h3>${ev.title}</h3>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              ${isRegistered ? `<span class="reg-badge">Registered</span>` : ""}
              ${promotionBadgeHTML}
              ${isStarted ? `<span class="reg-badge" style="background: rgba(34, 197, 94, 0.2); border: 1px solid var(--neon-green); color: var(--neon-green); box-shadow: 0 0 8px var(--neon-green); text-shadow: 0 0 5px var(--neon-green);">LIVE</span>` : ""}
            </div>
          </div>
          <p class="event-desc">${ev.description}</p>
        </div>
        
        <div>
          <div class="event-details">
            <div class="detail-item">📅 <strong>Date:</strong> ${formatToDDMMYYYY(ev.date)}</div>
            <div class="detail-item">🕒 <strong>Time:</strong> ${ev.time || "N/A"}</div>
            <div class="detail-item" style="grid-column: 1/-1;">📍 <strong>Venue:</strong> ${ev.venue || "N/A"}</div>
            ${regCloseHTML}
          </div>
          
          ${resultHTML}

          <div class="event-actions" style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
            <button class="btn-action" style="width: 100%;" onclick="showEventDetails('${ev.id}')">Rules & Details</button>
            ${actionButtonHTML}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Global functions exposed to window for onclick handlers
window.redirectToLogin = function() {
  window.location.href = "login.html";
};

window.showEventDetails = function(eventId) {
  try {
    const ev = eventsList.find(e => e.id === eventId);
    if (!ev) return;

    const isClosed = isRegistrationClosed(ev);
    const regCloseText = ev.registrationCloseDate 
      ? `12:00 AM Midnight (${formatToDDMMYYYY(ev.registrationCloseDate)}) ${isClosed ? '🔴 (Closed)' : '🟢 (OPEN)'}`
      : "No closing date set (Open)";

    if (modalTitle) modalTitle.innerText = ev.title;

    let studentCoordinatorsHTML = "";
    if (ev.studentCoordinators && ev.studentCoordinators.length > 0) {
      const scList = ev.studentCoordinators.map(sc => `<strong>${sc.name}</strong> (${sc.studentClass} - 📞 ${sc.phone})`).join(", ");
      studentCoordinatorsHTML = `<div style="grid-column: 1/-1;">🎓 <strong>Student Coordinators:</strong> ${scList}</div>`;
    }

    let qualificationNoticeHTML = "";
    if (username && ev.roundPromotions) {
      Object.keys(ev.roundPromotions).forEach(targetRound => {
        const promo = ev.roundPromotions[targetRound];
        if (promo && promo.promotedStudents && promo.promotedStudents.includes(username)) {
          qualificationNoticeHTML += `
            <div style="background: rgba(168, 85, 247, 0.15); border: 1px solid var(--neon-purple); border-radius: 8px; padding: 12px 16px; margin-bottom: 15px; color: #e9d5ff;">
              🎉 <strong>CONGRATULATIONS!</strong> You have qualified and been promoted to <strong>${targetRound}</strong> (from ${promo.fromRound})! Please report to ${ev.venue || 'the event venue'} on time.
            </div>
          `;
        }
      });
    }

    let roundsHTML = "";
    const rawRounds = Array.isArray(ev.rounds) 
      ? ev.rounds 
      : (ev.rounds && typeof ev.rounds === "object" ? Object.values(ev.rounds) : []);

    if (rawRounds && rawRounds.length > 0) {
      roundsHTML = `
        <h4 style="color: var(--neon-cyan); margin-top: 20px; font-family: 'Orbitron', sans-serif; display: flex; align-items: center; gap: 8px;">
          🎯 Event Progression & Rounds
        </h4>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
          ${rawRounds.map((rd, idx) => {
            let statusBadgeColor = "var(--neon-cyan)";
            let statusBg = "rgba(0, 243, 255, 0.1)";

            if (rd.status === "In Progress") {
              statusBadgeColor = "#38bdf8";
              statusBg = "rgba(56, 189, 248, 0.2)";
            } else if (rd.status === "Completed") {
              statusBadgeColor = "#4ade80";
              statusBg = "rgba(74, 222, 128, 0.2)";
            } else if (rd.status === "Upcoming") {
              statusBadgeColor = "#fbbf24";
              statusBg = "rgba(251, 191, 36, 0.2)";
            }

            return `
              <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: var(--neon-cyan); color: #000; font-weight: 800; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">R${idx + 1}</span>
                    <strong style="color: #fff; font-size: 0.95rem;">${rd.name || 'Round ' + (idx + 1)}</strong>
                  </div>
                  <span style="font-size: 0.72rem; font-weight: bold; color: ${statusBadgeColor}; background: ${statusBg}; border: 1px solid ${statusBadgeColor}; padding: 2px 8px; border-radius: 12px;">${rd.status || 'Upcoming'}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-sub); display: flex; gap: 15px; flex-wrap: wrap;">
                  ${rd.venue ? `<span>📍 ${rd.venue}</span>` : ''}
                  ${rd.time ? `<span>⏰ ${rd.time}</span>` : ''}
                </div>
                ${rd.desc ? `<div style="font-size: 0.82rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 6px; border-left: 2px solid var(--neon-cyan); margin-top: 4px;">${rd.desc}</div>` : ''}
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    let modalHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; align-items: start; margin-top: 15px;">
        <!-- Left Side: Event Details & Info -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${qualificationNoticeHTML}
          
          <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(0, 243, 255, 0.2); border-radius: 10px; padding: 14px 16px;">
            <div style="color: var(--neon-cyan); font-weight: bold; font-family: 'Orbitron', sans-serif; font-size: 0.8rem; letter-spacing: 1px; margin-bottom: 6px;">DESCRIPTION</div>
            <div style="color: #cbd5e1; font-size: 0.88rem; line-height: 1.5;">${ev.description || 'No description available.'}</div>
          </div>

          <div class="event-details" style="margin: 0; grid-template-columns: 1fr 1fr; display: grid; gap: 10px; background: rgba(0, 243, 255, 0.05); border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 10px; padding: 14px 16px; font-size: 0.85rem;">
            <div>📅 <strong>Date:</strong> ${formatToDDMMYYYY(ev.date)}</div>
            <div>🕒 <strong>Time:</strong> ${ev.time || "N/A"}</div>
            <div style="grid-column: 1/-1;">📍 <strong>Venue:</strong> ${ev.venue || "N/A"}</div>
            <div style="grid-column: 1/-1;">👤 <strong>Faculty Coordinator:</strong> ${ev.coordinator || "N/A"}</div>
            ${studentCoordinatorsHTML}
            <div style="grid-column: 1/-1; color: ${isClosed ? 'var(--neon-red)' : 'var(--neon-green)'};">⏳ <strong>Registration Close:</strong> ${regCloseText}</div>
          </div>

          ${roundsHTML}

          ${ev.resultsApproved && ev.results && (ev.results.first || ev.results.second || ev.results.third) ? `
            <div>
              <h4 style="margin-top: 10px; color: var(--neon-cyan); font-family: 'Orbitron', sans-serif; font-size: 0.95rem;">🏆 Event Winners</h4>
              <div class="winner-card-banner" style="font-size: 0.88rem; padding: 14px; margin-top: 6px;">
                ${ev.results.first ? `<div style="margin-bottom: 6px;">🥇 <strong>First Place:</strong> ${ev.results.first}</div>` : ""}
                ${ev.results.second ? `<div style="margin-bottom: 6px;">🥈 <strong>Second Place:</strong> ${ev.results.second}</div>` : ""}
                ${ev.results.third ? `<div>🥉 <strong>Third Place:</strong> ${ev.results.third}</div>` : ""}
              </div>
            </div>
          ` : ""}
        </div>

        <!-- Right Side: Rules & Guidelines -->
        <div style="display: flex; flex-direction: column;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-size: 1.1rem;">📋</span>
            <h4 style="margin: 0; color: var(--neon-purple); font-family: 'Orbitron', sans-serif; font-size: 1rem; letter-spacing: 1px;">Rules & Guidelines</h4>
          </div>
          <div style="background: rgba(10, 15, 30, 0.95); border: 1.5px solid var(--neon-purple); border-radius: 12px; padding: 16px; box-shadow: 0 0 20px rgba(188, 19, 254, 0.2); max-height: 480px; overflow-y: auto;">
            <pre style="white-space: pre-wrap; font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.65; color: #e2e8f0; margin: 0; font-size: 0.86rem; letter-spacing: 0.2px;">${ev.rules || "No rules specified for this event."}</pre>
          </div>
        </div>
      </div>
    `;

    if (modalBody) modalBody.innerHTML = modalHTML;
    if (detailModal) detailModal.classList.add("active");
  } catch (err) {
    console.error("Error opening event details:", err);
  }
};
window.openDetails = window.showEventDetails;

function isDuoTeamEvent(eventId) {
  if (!eventId) return false;
  const norm = eventId.toLowerCase().trim();
  return (
    norm === "coding" ||
    norm === "ungoogling" ||
    norm === "ungoogle" ||
    norm === "tech-quiz" ||
    norm === "techquiz" ||
    norm === "it-melody" ||
    norm === "itmelody" ||
    norm === "treasure-hunt" ||
    norm === "treasurehunt"
  );
}

window.registerEvent = async function(eventId) {
  if (!username) return;

  const ev = eventsList.find(e => e.id === eventId);
  if (ev && isRegistrationClosed(ev)) {
    alert("Registration for this event closed at 12:00 AM Midnight.");
    return;
  }

  const currentStudentClass = localStorage.getItem("studentClass") || localStorage.getItem("userClass") || "";
  if (isRestrictedClassStudent(currentStudentClass) && !isVideographyEvent(ev)) {
    alert(`Registration Restriction:\n\nStudents from ${currentStudentClass || "B.Com / BBA"} are eligible to register for the Videography event only.\n\nYou may view rules, guidelines, and photos for all other events.`);
    return;
  }
  
  // Special Handling for Gaming Event: Require Team of 4 + Free Fire / BGMI Selection
  if (eventId === "gaming") {
    openGamingTeamRegistrationModal(ev);
    return;
  }

  // Special Handling for Cultural Event: Require 1 Team per Class (Min 5, Max 10 Members)
  if (eventId === "cultural") {
    openCulturalTeamRegistrationModal(ev);
    return;
  }

  // Special Handling for Duo 2-Member Team Events: Coding, Ungoogling, Tech Quiz, IT Melody, Treasure Hunt
  if (isDuoTeamEvent(eventId)) {
    openDuoTeamRegistrationModal(ev);
    return;
  }

  const registerButton = document.querySelector(`#card-${eventId} .btn-success`);
  if (registerButton) {
    registerButton.disabled = true;
    registerButton.innerText = "Registering...";
  }

  // Check Class Registration Limit
  if (ev && currentStudentClass) {
    const classLimit = getClassRegistrationLimit(ev, currentStudentClass);
    if (classLimit !== null && classLimit > 0) {
      try {
        const q = query(collection(db, "students"), where("registeredEvents", "array-contains", eventId));
        const querySnap = await getDocs(q);
        
        const normClass = normalizeClassName(currentStudentClass);
        let currentClassCount = 0;
        querySnap.forEach(docSnap => {
          const st = docSnap.data();
          if (st.class && normalizeClassName(st.class) === normClass) {
            currentClassCount++;
          }
        });

        if (currentClassCount >= classLimit) {
          alert(`Class Registration Limit Reached!\n\nEvent "${ev.title}" allows a maximum of ${classLimit} student(s) from class "${currentStudentClass}".\n\nCurrently, ${currentClassCount} student(s) from your class section have already registered.`);
          if (registerButton) {
            registerButton.disabled = false;
            registerButton.innerText = "Register";
          }
          return;
        }
      } catch (err) {
        console.error("Error verifying class limits:", err);
      }
    }
  }

  try {
    const studentRef = doc(db, "students", username);
    await updateDoc(studentRef, {
      registeredEvents: arrayUnion(eventId)
    });
    
    registeredEventsIds.push(eventId);
    renderEvents();
    
    // Dispatch confirmation email in background
    if (ev) {
      sendRegistrationEmail(ev);
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("Could not complete registration. Please try again.");
    renderEvents();
  }
};

function openGamingTeamRegistrationModal(ev) {
  const modal = document.getElementById("gamingTeamModal");
  const modalClose = document.getElementById("gamingTeamModalCloseBtn");
  const form = document.getElementById("gamingTeamForm");
  const leaderNameDisplay = document.getElementById("gamingLeaderNameDisplay");
  const leaderEmailDisplay = document.getElementById("gamingLeaderEmailDisplay");

  if (!modal || !form) return;

  const studentName = localStorage.getItem("name") || username;
  const studentEmail = localStorage.getItem("email") || "No email stored";
  const currentStudentClass = localStorage.getItem("studentClass") || localStorage.getItem("userClass") || "";

  if (leaderNameDisplay) leaderNameDisplay.innerText = studentName;
  if (leaderEmailDisplay) leaderEmailDisplay.innerText = studentEmail;

  if (modalClose && !modalClose.dataset.bound) {
    modalClose.dataset.bound = "true";
    modalClose.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    const selectedRadio = form.querySelector("input[name='gameVariant']:checked");
    if (!selectedRadio) {
      alert("Please select a game: Free Fire or BGMI.");
      return;
    }

    const gameVariant = selectedRadio.value;
    const teamName = document.getElementById("gamingTeamName").value.trim();
    const member2 = document.getElementById("gamingMember2").value.trim();
    const member3 = document.getElementById("gamingMember3").value.trim();
    const member4 = document.getElementById("gamingMember4").value.trim();

    if (!teamName || !member2 || !member3 || !member4) {
      alert("Please provide the Team Name and all 4 Squad Members' full names.");
      return;
    }

    const submitBtn = document.getElementById("btnSubmitGamingTeam");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "Registering Squad...";
    }

    // Check Class Limit for Gaming Teams
    const classLimit = getClassRegistrationLimit(ev, currentStudentClass);
    if (classLimit !== null && classLimit > 0) {
      try {
        const q = query(collection(db, "students"), where("registeredEvents", "array-contains", "gaming"));
        const querySnap = await getDocs(q);
        
        const normClass = normalizeClassName(currentStudentClass);
        let currentClassTeamCount = 0;
        querySnap.forEach(docSnap => {
          const st = docSnap.data();
          if (st.class && normalizeClassName(st.class) === normClass) {
            currentClassTeamCount++;
          }
        });

        if (currentClassTeamCount >= classLimit) {
          alert(`Class Registration Limit Reached!\n\nYour class (${currentStudentClass}) has already registered ${currentClassTeamCount} team(s) for Gaming.\n\nMaximum allowed teams per class is ${classLimit}.`);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "SUBMIT GAMING SQUAD REGISTRATION";
          }
          return;
        }
      } catch (err) {
        console.error("Error checking class team limit:", err);
      }
    }

    const squadMembers = [studentName, member2, member3, member4];

    try {
      // 1. Save team in gamingTeams collection
      const teamRef = doc(db, "gamingTeams", username);
      await setDoc(teamRef, {
        eventId: "gaming",
        gameVariant: gameVariant,
        teamName: teamName,
        leaderUsername: username,
        leaderName: studentName,
        leaderEmail: studentEmail,
        studentClass: currentStudentClass,
        members: squadMembers,
        registeredAt: new Date().toISOString()
      });

      // 2. Update student document registeredEvents & gamingTeam details
      const studentRef = doc(db, "students", username);
      await updateDoc(studentRef, {
        registeredEvents: arrayUnion("gaming"),
        gamingTeam: {
          teamName: teamName,
          gameVariant: gameVariant,
          members: squadMembers
        }
      });

      registeredEventsIds.push("gaming");
      renderEvents();

      // 3. Dispatch confirmation email to Team Leader
      sendGamingTeamEmail(ev, gameVariant, teamName, squadMembers);

      modal.classList.remove("active");
      alert(`🎉 Squad Registered Successfully!\n\nTeam: ${teamName}\nGame: ${gameVariant}\nLeader: ${studentName}\n\nA confirmation email has been dispatched to ${studentEmail}.`);
    } catch (err) {
      console.error("Error registering gaming squad:", err);
      alert("Failed to register squad. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "SUBMIT GAMING SQUAD REGISTRATION";
      }
    }
  };

  modal.classList.add("active");
}

async function sendGamingTeamEmail(ev, gameVariant, teamName, members) {
  const email = localStorage.getItem("email");
  const leaderName = localStorage.getItem("name") || username;
  if (!email) return;

  const subject = `🎮 Gaming Squad Registration Confirmed: ${teamName} (${gameVariant}) - Tech Manthan 6.0`;
  const membersListHTML = members.map((m, idx) => `
    <li style="margin-bottom: 4px;">
      <strong>Member ${idx + 1}:</strong> ${m} ${idx === 0 ? '<span style="color: #06b6d4; font-size: 0.8rem; font-weight: bold;">(Team Leader)</span>' : ''}
    </li>
  `).join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #06b6d4;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">TECH MANTHAN 6.0</h1>
        <p style="color: #06b6d4; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Dr. B.B Hegde First Grade College, Kundapura</p>
      </div>
      
      <div style="padding: 30px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">🎮 Gaming Squad Registration Confirmed!</h2>
        <p>Dear <strong>${leaderName}</strong>,</p>
        <p>Your squad <strong>"${teamName}"</strong> has been successfully registered for the <strong>Gaming (${gameVariant})</strong> event at Tech Manthan 6.0!</p>
        
        <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #06b6d4; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; width: 140px; font-weight: bold; color: #475569;">🛡️ Team Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${teamName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🎯 Selected Game:</td>
              <td style="padding: 6px 0; color: #06b6d4; font-weight: bold; font-size: 15px;">${gameVariant}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📅 Event Date:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.date || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🕒 Event Time:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.time || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📍 Venue:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.venue || "N/A"}</td>
            </tr>
          </table>

          <div style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 12px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 6px;">👥 Squad Members (4 Members):</strong>
            <ul style="margin: 0; padding-left: 20px; color: #334155;">
              ${membersListHTML}
            </ul>
          </div>
        </div>
        
        <p style="margin-top: 25px;">Please ensure all 4 squad members report to the gaming venue on time with their college ID cards.</p>
        
        <p style="margin-bottom: 0;">Best regards,<br><strong>Tech Manthan 6.0 Gaming Committee</strong></p>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        This is an automated confirmation notification. Please do not reply directly to this email.
      </div>
    </div>
  `;

  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, subject, html })
    });
  } catch (err) {
    console.error("Error sending gaming squad confirmation email:", err);
  }
}

function openCulturalTeamRegistrationModal(ev) {
  const modal = document.getElementById("culturalTeamModal");
  const modalClose = document.getElementById("culturalTeamModalCloseBtn");
  const form = document.getElementById("culturalTeamForm");
  const leaderNameDisplay = document.getElementById("culturalLeaderNameDisplay");
  const leaderEmailDisplay = document.getElementById("culturalLeaderEmailDisplay");
  const membersContainer = document.getElementById("culturalMembersContainer");
  const addBtn = document.getElementById("btnAddCulturalMember");
  const countDisplay = document.getElementById("culturalCountDisplay");

  if (!modal || !form || !membersContainer) return;

  const studentName = localStorage.getItem("name") || username;
  const studentEmail = localStorage.getItem("email") || "No email stored";
  const currentStudentClass = localStorage.getItem("studentClass") || localStorage.getItem("userClass") || "";

  if (leaderNameDisplay) leaderNameDisplay.innerText = studentName;
  if (leaderEmailDisplay) leaderEmailDisplay.innerText = studentEmail;

  const updateMemberCount = () => {
    const dynamicInputs = membersContainer.querySelectorAll(".cultural-member-input");
    const totalCount = dynamicInputs.length + 1; // +1 for Leader
    if (countDisplay) countDisplay.innerText = totalCount;

    if (addBtn) {
      if (totalCount >= 10) {
        addBtn.disabled = true;
        addBtn.innerText = "🛑 Maximum 10 Participants Reached";
        addBtn.style.opacity = "0.6";
      } else {
        addBtn.disabled = false;
        addBtn.innerText = "➕ Add Participant";
        addBtn.style.opacity = "1";
      }
    }
  };

  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = "true";
    addBtn.addEventListener("click", () => {
      const dynamicInputs = membersContainer.querySelectorAll(".cultural-member-input");
      if (dynamicInputs.length + 1 >= 10) return;

      const nextNum = dynamicInputs.length + 2;
      const row = document.createElement("div");
      row.className = "cultural-dynamic-row";
      row.style.display = "flex";
      row.style.gap = "8px";
      row.style.alignItems = "center";

      row.innerHTML = `
        <input type="text" class="cultural-member-input" required placeholder="Member ${nextNum} Full Name" style="flex: 1; padding: 9px 12px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #fff; font-size: 0.85rem;">
        <button type="button" class="btn-remove-member" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; border-radius: 6px; padding: 8px 10px; cursor: pointer; font-size: 0.8rem;">❌</button>
      `;

      row.querySelector(".btn-remove-member").addEventListener("click", () => {
        const currentDynamic = membersContainer.querySelectorAll(".cultural-member-input");
        if (currentDynamic.length + 1 <= 5) {
          alert("Minimum 5 participants are required for Cultural event registration.");
          return;
        }
        row.remove();
        updateMemberCount();
      });

      membersContainer.appendChild(row);
      updateMemberCount();
    });
  }

  if (modalClose && !modalClose.dataset.bound) {
    modalClose.dataset.bound = "true";
    modalClose.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  updateMemberCount();

  form.onsubmit = async (e) => {
    e.preventDefault();

    const teamName = document.getElementById("culturalTeamName").value.trim();
    const dynamicInputs = Array.from(membersContainer.querySelectorAll(".cultural-member-input"));
    const teammates = dynamicInputs.map(inp => inp.value.trim()).filter(Boolean);
    const allMembers = [studentName, ...teammates];

    if (!teamName) {
      alert("Please enter a Performance Team Name.");
      return;
    }

    if (allMembers.length < 5) {
      alert(`Minimum 5 participants required. Current team size is ${allMembers.length}. Please add more members.`);
      return;
    }

    if (allMembers.length > 10) {
      alert(`Maximum 10 participants allowed. Current team size is ${allMembers.length}. Please remove extra members.`);
      return;
    }

    const submitBtn = document.getElementById("btnSubmitCulturalTeam");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "Registering Cultural Team...";
    }

    // Check Class Limit: Only 1 team per class allowed for Cultural Event
    try {
      const q = query(collection(db, "students"), where("registeredEvents", "array-contains", "cultural"));
      const querySnap = await getDocs(q);
      
      const normClass = normalizeClassName(currentStudentClass);
      let currentClassTeamCount = 0;
      querySnap.forEach(docSnap => {
        const st = docSnap.data();
        if (st.class && normalizeClassName(st.class) === normClass) {
          currentClassTeamCount++;
        }
      });

      if (currentClassTeamCount >= 1) {
        alert(`❌ Class Registration Limit Reached!\n\nOnly 1 team is allowed per class section for the Cultural Event.\n\nA team from your class section (${currentStudentClass}) has already been registered.`);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "SUBMIT CULTURAL TEAM REGISTRATION";
        }
        return;
      }
    } catch (err) {
      console.error("Error checking cultural class team limit:", err);
    }

    try {
      // 1. Save team in culturalTeams collection
      const teamRef = doc(db, "culturalTeams", username);
      await setDoc(teamRef, {
        eventId: "cultural",
        teamName: teamName,
        leaderUsername: username,
        leaderName: studentName,
        leaderEmail: studentEmail,
        studentClass: currentStudentClass,
        members: allMembers,
        registeredAt: new Date().toISOString()
      });

      // 2. Update student document registeredEvents & culturalTeam details
      const studentRef = doc(db, "students", username);
      await updateDoc(studentRef, {
        registeredEvents: arrayUnion("cultural"),
        culturalTeam: {
          teamName: teamName,
          members: allMembers
        }
      });

      registeredEventsIds.push("cultural");
      renderEvents();

      // 3. Dispatch confirmation email to Team Leader
      sendCulturalTeamEmail(ev, teamName, allMembers);

      modal.classList.remove("active");
      alert(`🎉 Cultural Team Registered Successfully!\n\nTeam Name: ${teamName}\nLeader: ${studentName}\nTotal Participants: ${allMembers.length}\n\nA confirmation email has been sent to ${studentEmail}.`);
    } catch (err) {
      console.error("Error registering cultural team:", err);
      alert("Failed to register cultural team. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "SUBMIT CULTURAL TEAM REGISTRATION";
      }
    }
  };

  modal.classList.add("active");
}

async function sendCulturalTeamEmail(ev, teamName, members) {
  const email = localStorage.getItem("email");
  const leaderName = localStorage.getItem("name") || username;
  if (!email) return;

  const subject = `💃 Cultural Event Registration Confirmed: ${teamName} - Tech Manthan 6.0`;
  const membersListHTML = members.map((m, idx) => `
    <li style="margin-bottom: 4px;">
      <strong>Participant ${idx + 1}:</strong> ${m} ${idx === 0 ? '<span style="color: #a855f7; font-size: 0.8rem; font-weight: bold;">(Team Leader)</span>' : ''}
    </li>
  `).join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #a855f7;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">TECH MANTHAN 6.0</h1>
        <p style="color: #a855f7; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Dr. B.B Hegde First Grade College, Kundapura</p>
      </div>
      
      <div style="padding: 30px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">💃 Cultural Performance Team Confirmed!</h2>
        <p>Dear <strong>${leaderName}</strong>,</p>
        <p>Your team <strong>"${teamName}"</strong> has been successfully registered for the <strong>Cultural Event (Group Dance)</strong> at Tech Manthan 6.0!</p>
        
        <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #a855f7; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; width: 140px; font-weight: bold; color: #475569;">🎭 Team Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${teamName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">👥 Team Size:</td>
              <td style="padding: 6px 0; color: #a855f7; font-weight: bold;">${members.length} Members (Min 5 - Max 10)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📅 Event Date:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev ? (ev.date || "N/A") : "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🕒 Event Time:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev ? (ev.time || "N/A") : "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📍 Venue:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev ? (ev.venue || "N/A") : "N/A"}</td>
            </tr>
          </table>

          <div style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 12px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 6px;">💃 Registered Participants (${members.length}):</strong>
            <ul style="margin: 0; padding-left: 20px; color: #334155;">
              ${membersListHTML}
            </ul>
          </div>
        </div>
        
        <p style="margin-top: 25px;">Please ensure all team members report to the stage venue on time with college ID cards and required audio tracks.</p>
        
        <p style="margin-bottom: 0;">Best regards,<br><strong>Tech Manthan 6.0 Cultural Committee</strong></p>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        This is an automated confirmation notification. Please do not reply directly to this email.
      </div>
    </div>
  `;

  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, subject, html })
    });
  } catch (err) {
    console.error("Error sending cultural team confirmation email:", err);
  }
}

function openDuoTeamRegistrationModal(ev) {
  const modal = document.getElementById("duoTeamModal");
  const modalClose = document.getElementById("duoTeamModalCloseBtn");
  const form = document.getElementById("duoTeamForm");
  const titleDisplay = document.getElementById("duoEventTitle");
  const iconDisplay = document.getElementById("duoEventIcon");
  const leaderNameDisplay = document.getElementById("duoLeaderNameDisplay");
  const leaderEmailDisplay = document.getElementById("duoLeaderEmailDisplay");

  if (!modal || !form) return;

  const studentName = localStorage.getItem("name") || username;
  const studentEmail = localStorage.getItem("email") || "No email stored";
  const currentStudentClass = localStorage.getItem("studentClass") || localStorage.getItem("userClass") || "";

  if (titleDisplay) titleDisplay.innerText = `${(ev.title || "DUO EVENT").toUpperCase()} REGISTRATION`;
  if (leaderNameDisplay) leaderNameDisplay.innerText = studentName;
  if (leaderEmailDisplay) leaderEmailDisplay.innerText = studentEmail;

  const iconsMap = {
    coding: "💻",
    ungoogling: "🔍",
    "tech-quiz": "🧠",
    "it-melody": "🎵",
    "treasure-hunt": "🗺️"
  };
  if (iconDisplay) iconDisplay.innerText = iconsMap[ev.id] || "👥";

  if (modalClose && !modalClose.dataset.bound) {
    modalClose.dataset.bound = "true";
    modalClose.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    const teamName = document.getElementById("duoTeamName").value.trim();
    const member2 = document.getElementById("duoMember2").value.trim();

    if (!teamName || !member2) {
      alert("Please provide the Team Name and Teammate's Full Name.");
      return;
    }

    const submitBtn = document.getElementById("btnSubmitDuoTeam");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "Registering Duo Team...";
    }

    // Check Class Registration Limit for this event if configured by organizer
    const classLimit = getClassRegistrationLimit(ev, currentStudentClass);
    if (classLimit !== null && classLimit > 0) {
      try {
        const q = query(collection(db, "students"), where("registeredEvents", "array-contains", ev.id));
        const querySnap = await getDocs(q);
        
        const normClass = normalizeClassName(currentStudentClass);
        let currentClassCount = 0;
        querySnap.forEach(docSnap => {
          const st = docSnap.data();
          if (st.class && normalizeClassName(st.class) === normClass) {
            currentClassCount++;
          }
        });

        if (currentClassCount >= classLimit) {
          alert(`Class Registration Limit Reached!\n\nYour class (${currentStudentClass}) has already registered ${currentClassCount} team(s) for "${ev.title}".\n\nMaximum allowed teams per class is ${classLimit}.`);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "SUBMIT DUO TEAM REGISTRATION";
          }
          return;
        }
      } catch (err) {
        console.error("Error checking class duo limit:", err);
      }
    }

    const duoMembers = [studentName, member2];

    try {
      // 1. Save team in duoTeams collection
      const teamDocId = `${username}_${ev.id}`;
      const teamRef = doc(db, "duoTeams", teamDocId);
      await setDoc(teamRef, {
        eventId: ev.id,
        eventTitle: ev.title,
        teamName: teamName,
        leaderUsername: username,
        leaderName: studentName,
        leaderEmail: studentEmail,
        studentClass: currentStudentClass,
        members: duoMembers,
        registeredAt: new Date().toISOString()
      });

      // 2. Update student document registeredEvents & duoTeams data
      const studentRef = doc(db, "students", username);
      await updateDoc(studentRef, {
        registeredEvents: arrayUnion(ev.id),
        [`duoTeam_${ev.id}`]: {
          teamName: teamName,
          members: duoMembers
        }
      });

      registeredEventsIds.push(ev.id);
      renderEvents();

      // 3. Dispatch confirmation email to Team Leader
      sendDuoTeamEmail(ev, teamName, duoMembers);

      modal.classList.remove("active");
      alert(`🎉 Duo Team Registered Successfully!\n\nEvent: ${ev.title}\nTeam Name: ${teamName}\nLeader: ${studentName}\nTeammate: ${member2}\n\nA confirmation email has been sent to ${studentEmail}.`);
    } catch (err) {
      console.error("Error registering duo team:", err);
      alert("Failed to register duo team. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "SUBMIT DUO TEAM REGISTRATION";
      }
    }
  };

  modal.classList.add("active");
}

async function sendDuoTeamEmail(ev, teamName, members) {
  const email = localStorage.getItem("email");
  const leaderName = localStorage.getItem("name") || username;
  if (!email) return;

  const subject = `👥 ${ev.title} Registration Confirmed: ${teamName} - Tech Manthan 6.0`;
  const membersListHTML = members.map((m, idx) => `
    <li style="margin-bottom: 4px;">
      <strong>Member ${idx + 1}:</strong> ${m} ${idx === 0 ? '<span style="color: #06b6d4; font-size: 0.8rem; font-weight: bold;">(Team Leader)</span>' : ''}
    </li>
  `).join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #06b6d4;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">TECH MANTHAN 6.0</h1>
        <p style="color: #06b6d4; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Dr. B.B Hegde First Grade College, Kundapura</p>
      </div>
      
      <div style="padding: 30px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">👥 ${ev.title} Registration Confirmed!</h2>
        <p>Dear <strong>${leaderName}</strong>,</p>
        <p>Your team <strong>"${teamName}"</strong> has been successfully registered for <strong>${ev.title}</strong> at Tech Manthan 6.0!</p>
        
        <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #06b6d4; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; width: 140px; font-weight: bold; color: #475569;">🛡️ Team Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${teamName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🎯 Event Title:</td>
              <td style="padding: 6px 0; color: #06b6d4; font-weight: bold;">${ev.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📅 Event Date:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.date || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🕒 Event Time:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.time || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📍 Venue:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.venue || "N/A"}</td>
            </tr>
          </table>

          <div style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 12px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 6px;">👥 Duo Team Roster (2 Members):</strong>
            <ul style="margin: 0; padding-left: 20px; color: #334155;">
              ${membersListHTML}
            </ul>
          </div>
        </div>
        
        <p style="margin-top: 25px;">Please ensure both team members report to the event venue on time with college ID cards.</p>
        
        <p style="margin-bottom: 0;">Best regards,<br><strong>Tech Manthan 6.0 Event Committee</strong></p>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        This is an automated confirmation notification. Please do not reply directly to this email.
      </div>
    </div>
  `;

  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, subject, html })
    });
  } catch (err) {
    console.error("Error sending duo team confirmation email:", err);
  }
}

async function sendRegistrationEmail(ev) {
  const email = localStorage.getItem("email");
  const name = localStorage.getItem("name") || "Student";
  if (!email) {
    console.log("No student email address in localStorage, skipping confirmation email.");
    return;
  }

  const subject = `Registration Confirmed: ${ev.title} - Tech Manthan 6.0`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #06b6d4;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">TECH MANTHAN 6.0</h1>
        <p style="color: #06b6d4; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Dr. B.B Hegde First Grade College, Kundapura</p>
      </div>
      
      <div style="padding: 30px; color: #334155; line-height: 1.6;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Registration Confirmed!</h2>
        <p>Dear <strong>${name}</strong>,</p>
        <p>Congratulations! You have successfully registered for the following event at Tech Manthan 6.0. Below is your event ticket detail:</p>
        
        <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #06b6d4; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; width: 120px; font-weight: bold; color: #475569;">🏆 Event Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${ev.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📅 Event Date:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.date || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">🕒 Event Time:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.time || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">📍 Venue:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.venue || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">👤 Coordinator:</td>
              <td style="padding: 6px 0; color: #0f172a;">${ev.coordinator || "N/A"}</td>
            </tr>
          </table>
        </div>
        
        ${ev.description ? `<p><strong>Description:</strong> ${ev.description}</p>` : ""}
        
        <p style="margin-top: 25px;">Please report at the venue at least 15 minutes before the start timing. Make sure to bring your student ID and registration number: <strong>${username}</strong>.</p>
        
        <p style="margin-bottom: 0;">Best regards,<br><strong>Tech Manthan 6.0 Organizing Committee</strong></p>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        This is an automated confirmation notification. Please do not reply directly to this email.
      </div>
    </div>
  `;

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, subject, html })
    });
    const resData = await res.json();
    console.log("Email dispatch status:", resData);
  } catch (error) {
    console.error("Failed to dispatch registration confirmation email:", error);
  }
}

window.unregisterEvent = async function(eventId) {
  alert("Self-deregistration is disabled. Only the organizers can remove you from an event.");
  return;
};

function setupEventListeners() {
  // Search box
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderEvents();
  });

  // Filter Buttons
  const btnAllEvents = document.getElementById("btnAllEvents");
  const btnMyEvents = document.getElementById("btnMyEvents");

  btnAllEvents.addEventListener("click", () => {
    btnAllEvents.classList.add("active");
    if (btnMyEvents) btnMyEvents.classList.remove("active");
    currentFilter = "all";
    renderEvents();
  });

  if (btnMyEvents) {
    btnMyEvents.addEventListener("click", () => {
      btnMyEvents.classList.add("active");
      btnAllEvents.classList.remove("active");
      currentFilter = "registered";
      renderEvents();
    });
  }

  // Close modal
  modalCloseBtn.addEventListener("click", () => {
    detailModal.classList.remove("active");
  });

  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) {
      detailModal.classList.remove("active");
    }
  });
}

async function checkAndRenderChampionship() {
  const banner = document.getElementById("championshipBanner");
  const champClassTitle = document.getElementById("champClassTitle");
  const runnerClassTitle = document.getElementById("runnerClassTitle");

  if (!banner || !champClassTitle || !runnerClassTitle) return;

  try {
    const docRef = doc(db, "settings", "championship");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().published) {
      const data = docSnap.data();
      champClassTitle.innerText = data.championClass || "None";
      runnerClassTitle.innerText = data.runnerClass || "None";
      banner.style.display = "block";
    } else {
      banner.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading championship banner:", error);
    banner.style.display = "none";
  }
}

function getDirectVideoThumbnailUrl(url) {
  if (!url) return "";
  const cleaned = url.trim();

  // 1. YouTube & YouTube Shorts
  const ytMatch = cleaned.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  // 2. Google Drive video or image file
  const gdriveMatch = cleaned.match(/drive\.google\.com\/file\/d\/([^\/]+)/i) || cleaned.match(/drive\.google\.com\/uc\?.*id=([^\&]+)/i);
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gdriveMatch[1]}`;
  }

  return cleaned;
}

function getEmbedMediaUrl(url) {
  if (!url) return "";
  const cleaned = url.trim();

  // 1. YouTube Shorts: youtube.com/shorts/VIDEO_ID
  const ytShorts = cleaned.match(/youtube\.com\/shorts\/([\w-]{11})/i);
  if (ytShorts && ytShorts[1]) {
    return `https://www.youtube.com/embed/${ytShorts[1]}`;
  }

  // 2. YouTube standard & short links
  const ytStandard = cleaned.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  if (ytStandard && ytStandard[1]) {
    return `https://www.youtube.com/embed/${ytStandard[1]}`;
  }

  // 3. Google Drive file view links: drive.google.com/file/d/FILE_ID/view
  const gdrive = cleaned.match(/drive\.google\.com\/file\/d\/([^\/]+)/i);
  if (gdrive && gdrive[1]) {
    return `https://drive.google.com/file/d/${gdrive[1]}/preview`;
  }

  // 4. Vimeo links: vimeo.com/VIDEO_ID
  const vimeo = cleaned.match(/vimeo\.com\/(\d+)/i);
  if (vimeo && vimeo[1]) {
    return `https://player.vimeo.com/video/${vimeo[1]}`;
  }

  return cleaned;
}

async function loadPromosForHome() {
  const section = document.getElementById("promoGallerySection");
  const track = document.getElementById("promoCarouselTrack");
  if (!section || !track) return;

  // Set up Prev/Next buttons
  const btnPrev = document.getElementById("btnPromoCarouselPrev");
  const btnNext = document.getElementById("btnPromoCarouselNext");

  if (btnPrev && !btnPrev.dataset.bound) {
    btnPrev.dataset.bound = "true";
    btnPrev.addEventListener("click", () => {
      track.scrollBy({ left: -320, behavior: "smooth" });
    });
  }

  if (btnNext && !btnNext.dataset.bound) {
    btnNext.dataset.bound = "true";
    btnNext.addEventListener("click", () => {
      track.scrollBy({ left: 320, behavior: "smooth" });
    });
  }

  // Set up Promo Modal Close Handler
  const modal = document.getElementById("promoMediaModal");
  const modalClose = document.getElementById("promoMediaModalCloseBtn");
  if (modalClose && modal && !modalClose.dataset.bound) {
    modalClose.dataset.bound = "true";
    const closeMediaModal = () => {
      modal.classList.remove("active");
      const modalBody = document.getElementById("promoMediaModalBody");
      if (modalBody) modalBody.innerHTML = "";
    };
    modalClose.addEventListener("click", closeMediaModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeMediaModal();
    });
  }

  let promos = [];
  try {
    const promoSnap = await getDocs(collection(db, "promos"));
    promos = promoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn("Could not fetch promos from Firestore:", err);
  }

  // Filter promos added by Admin for TECH MANTHANA 6.0 PROMO & TEASERS
  const adminPromos = promos.filter(p => {
    if (p.uploadedByRole === "admin") return true;
    if (p.uploadedByRole === "coordinator") return false;
    if (p.uploadedBy === "Administrator" || (p.uploadedBy && p.uploadedBy.toLowerCase().includes("admin"))) return true;
    return !p.uploadedByRole; // Legacy admin fallback
  });

  if (adminPromos.length === 0) {
    section.style.display = "none";
    return;
  }

  // Sort by priority
  adminPromos.sort((a, b) => (b.priority || 1) - (a.priority || 1));
  section.style.display = "block";

  // Store in global lookup for bulletproof click handler
  const promosMap = {};
  adminPromos.forEach(p => { promosMap[p.id] = p; });
  window.currentHomePromosMap = promosMap;

  track.innerHTML = adminPromos.map((p, idx) => {
    const isVideo = p.contentType === "video";
    const rawMediaUrl = p.mediaUrl || "";
    const rawThumb = p.thumbnail || rawMediaUrl;
    const thumbUrl = getDirectVideoThumbnailUrl(rawThumb);

    const lowerMediaUrl = rawMediaUrl.toLowerCase();
    const isDirectMp4 = isVideo && (lowerMediaUrl.endsWith(".mp4") || lowerMediaUrl.endsWith(".webm") || lowerMediaUrl.endsWith(".ogg") || (lowerMediaUrl.includes("firebasestorage.googleapis.com") && !lowerMediaUrl.includes("drive.google.com")));

    const badgeText = p.badge || `PROMO #${idx + 1}`;
    const subtitleText = p.subtitle || (isVideo ? "Official Video Reel" : "Official Event Poster");
    const iconSymbol = isVideo ? "▶" : "👁";

    let mediaPreviewHTML = "";
    if (isDirectMp4 && !p.thumbnail) {
      mediaPreviewHTML = `<video src="${rawMediaUrl}#t=0.5" preload="metadata" muted style="width: 100%; height: 100%; object-fit: cover; pointer-events: none; opacity: 0.85;"></video>`;
    } else {
      mediaPreviewHTML = `<img src="${thumbUrl}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85; transition: transform 0.4s ease;" alt="${p.title || 'Promo'}">`;
    }

    return `
      <div class="promo-card-item" onclick="openPromoMediaById('${p.id}')" style="background: rgba(11, 15, 25, 0.95); border: 1px solid rgba(0, 243, 255, 0.2); border-radius: 16px; overflow: hidden; position: relative; width: 280px; flex-shrink: 0; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.4);">
        <!-- Top Badge -->
        <div style="position: absolute; top: 10px; left: 10px; z-index: 3; background: rgba(10, 15, 30, 0.85); color: var(--neon-cyan); border: 1px solid rgba(0, 243, 255, 0.4); font-weight: 800; border-radius: 4px; padding: 3px 8px; font-size: 0.72rem; font-family: monospace; letter-spacing: 1px;">
          ${badgeText}
        </div>

        <!-- Thumbnail 4:3 Aspect Box -->
        <div style="position: relative; width: 100%; aspect-ratio: 4 / 3; background: #000; overflow: hidden;">
          ${mediaPreviewHTML}
          
          <!-- Center Play / Eye Action Button -->
          <div style="width: 46px; height: 46px; border-radius: 50%; background: rgba(10, 15, 30, 0.85); border: 2px solid var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.5); color: var(--neon-cyan); display: flex; align-items: center; justify-content: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.1rem; padding-left: ${isVideo ? '3px' : '0'};">
            ${iconSymbol}
          </div>
        </div>

        <!-- Card Text Info -->
        <div style="padding: 12px 14px;">
          <h3 style="color: #fff; font-family: 'Orbitron', sans-serif; font-size: 0.95rem; font-weight: 700; margin: 0 0 4px 0;">${p.title || 'Promo'}</h3>
          <p style="color: #94a3b8; font-size: 0.78rem; margin: 0; font-family: 'Inter', sans-serif;">${subtitleText}</p>
        </div>
      </div>
    `;
  }).join("");
}

window.openPromoMediaById = function(promoId) {
  const p = window.currentHomePromosMap ? window.currentHomePromosMap[promoId] : null;
  if (p) {
    openPromoMedia(p.title, p.contentType, p.mediaUrl, p.description);
  }
};

window.openPromoMedia = function(title, contentType, mediaUrl, description) {
  const modal = document.getElementById("promoMediaModal");
  const modalTitle = document.getElementById("promoMediaModalTitle");
  const modalBody = document.getElementById("promoMediaModalBody");

  if (!modal || !modalTitle || !modalBody) return;

  modalTitle.innerText = `TECH MANTHANA 6.0 PROMO: ${title || 'View Media'}`;

  if (contentType === "video") {
    const processedUrl = getEmbedMediaUrl(mediaUrl);
    const lowerUrl = processedUrl.toLowerCase();
    
    // Direct video files vs embeddable services
    const isDirectVideoFile = lowerUrl.endsWith(".mp4") || lowerUrl.endsWith(".webm") || lowerUrl.endsWith(".ogg") || (lowerUrl.includes("firebasestorage.googleapis.com") && !lowerUrl.includes("drive.google.com"));

    const isEmbedService = lowerUrl.includes("youtube.com") || lowerUrl.includes("drive.google.com") || lowerUrl.includes("vimeo.com") || !isDirectVideoFile;

    if (isEmbedService) {
      const finalEmbedUrl = lowerUrl.includes("youtube.com") 
        ? (processedUrl.includes("?") ? `${processedUrl}&autoplay=1&rel=0` : `${processedUrl}?autoplay=1&rel=0`)
        : processedUrl;

      modalBody.innerHTML = `
        <div style="position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 12px; overflow: hidden; border: 1.5px solid var(--neon-cyan); box-shadow: 0 0 25px rgba(0, 243, 255, 0.3);">
          <iframe src="${finalEmbedUrl}" style="width: 100%; height: 100%; border: none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
        ${description ? `<p style="color: var(--text-sub); margin-top: 15px; font-size: 0.9rem;">${description}</p>` : ''}
      `;
    } else {
      modalBody.innerHTML = `
        <div style="position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 12px; overflow: hidden; border: 1.5px solid var(--neon-cyan); box-shadow: 0 0 25px rgba(0, 243, 255, 0.3);">
          <video src="${mediaUrl}" controls playsinline preload="auto" autoplay style="width: 100%; height: 100%; object-fit: contain; background: #000;"></video>
        </div>
        ${description ? `<p style="color: var(--text-sub); margin-top: 15px; font-size: 0.9rem;">${description}</p>` : ''}
      `;
      const videoEl = modalBody.querySelector("video");
      if (videoEl) {
        videoEl.play().catch(err => {
          console.warn("Autoplay required user interaction:", err);
        });
      }
    }
  } else {
    const directImg = getDirectImageUrl(mediaUrl);
    modalBody.innerHTML = `
      <div style="position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 12px; overflow: hidden; border: 1.5px solid var(--neon-cyan); display: flex; align-items: center; justify-content: center;">
        <img src="${directImg}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${title || 'Poster'}">
      </div>
      ${description ? `<p style="color: var(--text-sub); margin-top: 15px; font-size: 0.9rem;">${description}</p>` : ''}
    `;
  }

  modal.classList.add("active");
};

// Boot application
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
