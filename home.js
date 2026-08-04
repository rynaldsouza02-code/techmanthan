import { db } from "./firebase-config.js?v=3.1";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc
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
  { id: "speed-typing", title: "Speed Typing", description: "Test your WPM limit under intense pressure.", venue: "Lab 1", time: "10:00 AM", date: "2026-06-25", coordinator: "Mr. Mahesh Kumar", rules: "1. No external keyboards allowed.\n2. Typing speed and accuracy will both be calculated.\n3. Winner chosen by highest WPM." },
  { id: "it-manager", title: "IT Manager", description: "Corporate tech survival. Test your management, crisis resolution, and executive pitching skills.", venue: "Seminar Hall", time: "10:30 AM", date: "2026-06-25", coordinator: "Mr. Harish Kanchan", rules: "1. Individual event.\n2. Rounds include aptitude, crisis management, and mock interview.\n3. Executive dress code is mandatory." },
  { id: "ungoogling", title: "Ungoogling", description: "Find answers without using the search giant. Navigate alternative portals to crack clues.", venue: "Lab 2", time: "11:30 AM", date: "2026-06-25", coordinator: "Mr. Giriraj Bhat", rules: "1. Google.com is strictly banned.\n2. Direct queries only via alternative directories and command line tools.\n3. Time-based competition." },
  { id: "poster-making", title: "Poster Making", description: "Design the future. Create a digital or physical flyer representing the core tech event vision.", venue: "Drawing Hall", time: "01:30 PM", date: "2026-06-25", coordinator: "Mrs. Wilma Sharal Cornelio", rules: "1. Topic: Artificial Intelligence vs Humanity.\n2. Bring your own drawing materials or digital tablets.\n3. Duration: 2 hours." },
  { id: "tech-quiz", title: "Tech Quiz", description: "Brain vs Machine. The ultimate trivia battle covering computer history, networks, and syntax.", venue: "Auditorium", time: "02:00 PM", date: "2026-06-25", coordinator: "Mrs. Jayalakshmi K", rules: "1. Teams of 2.\n2. Prelims will be a written test.\n3. Top 6 teams qualify for the stage rounds." },
  { id: "it-model", title: "IT Model Making", description: "Build the hardware of tomorrow. Showcase working models of modern technological frameworks.", venue: "Lobby", time: "10:00 AM", date: "2026-06-26", coordinator: "Mrs. Pavithra", rules: "1. Maximum 3 members per team.\n2. Models must be working and related to green tech or automation.\n3. Bring all necessary equipment." },
  { id: "treasure-hunt", title: "Treasure Hunt", description: "Decrypt the clues. Crack cryptographic hashes and riddles across the campus to locate the flag.", venue: "Campus Grounds", time: "11:00 AM", date: "2026-06-26", coordinator: "Mr. Shreekanth", rules: "1. Teams of 3.\n2. Use of mobile phones is permitted for decryption only.\n3. Do not tamper with campus property." },
  { id: "coding", title: "Coding", description: "Create your own world. Solve algorithmic puzzles and write clean code to win the ultimate prize.", venue: "Lab 3", time: "01:30 PM", date: "2026-06-26", coordinator: "Ms. Megha", rules: "1. Supported languages: C, C++, Java, Python.\n2. Submissions judged on correctness, efficiency, and syntax cleanliness.\n3. Plagiarism leads to instant disqualification." },
  { id: "cultural", title: "Cultural Event", description: "Your time to shine. Showcase technical skits, digital presentations, or creative dances.", venue: "Main Stage", time: "03:00 PM", date: "2026-06-26", coordinator: "Ms. Rashmi Gavadi", rules: "1. Time limit: 8 minutes per performance.\n2. Audio tracks must be submitted to coordinators in advance.\n3. Content must be college-appropriate." },
  { id: "videography", title: "Videography", description: "Reel into reels. Shoot and edit a cinematic reel capturing the energy of Tech Manthan.", venue: "Campus-wide", time: "All Day", date: "2026-06-25", coordinator: "Mr. Pranam R Betrabet", rules: "1. Maximum length: 60 seconds.\n2. Video must showcase fests events and campus life.\n3. Submission deadline: Day 2, 2:00 PM." },
  { id: "photography", title: "Photography", description: "Capture every moment. Submit the best click capturing the cyberpunk essence of our festival.", venue: "Campus-wide", time: "All Day", date: "2026-06-25", coordinator: "Mrs. Nirmala B.", rules: "1. DSLR or high-res smartphones allowed.\n2. Submissions must contain original metadata (no heavy editing).\n3. Submit top 3 shots." },
  { id: "gaming", title: "Gaming", description: "Show the spirit. Compete head-to-head in competitive multiplayer tournaments.", venue: "Seminar Room 2", time: "11:00 AM", date: "2026-06-25", coordinator: "Mrs. Vijaya Shree A", rules: "1. Tournament style matches.\n2. Strict rule against toxicity or exploits.\n3. Decisions of the game referees are final." }
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
  await seedDatabaseIfNeeded();
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
  if (username && name) {
    const firstInitial = (name.charAt(0) || "S").toUpperCase();

    navUserArea.innerHTML = `
      <div class="profile-pill-btn" id="btnProfilePill">
        <div class="avatar-circle-sm">${firstInitial}</div>
        <span class="profile-name-text">${name}</span>
      </div>
    `;
    
    // Add "My Registrations" filter button
    if (filterToggles && !document.getElementById("btnMyEvents")) {
      filterToggles.innerHTML += `
        <button class="tab-btn" id="btnMyEvents">My Registrations</button>
      `;
    }

    // Adjust hero button
    if (heroActions) {
      heroActions.innerHTML = `
        <a href="explore.html" class="cyber-btn">Explore Events & Photos</a>
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
      window.location.reload();
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

async function loadEvents() {
  try {
    const eventsQuery = await getDocs(collection(db, "events"));
    eventsList = [];
    eventsQuery.forEach((docSnap) => {
      eventsList.push(docSnap.data());
    });
    renderEvents();
  } catch (error) {
    console.error("Error loading events:", error);
    eventGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--neon-red);">
        Failed to load events. Please refresh the page.
      </div>
    `;
  }
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
      ? `<div class="detail-item" style="grid-column: 1/-1; color: ${isClosed ? 'var(--neon-red)' : 'var(--text-sub)'};">⏳ <strong>Reg Closes:</strong> 12 AM Midnight (${ev.registrationCloseDate}) ${isClosed ? '🔴 (Closed)' : '🟢 (OPEN)'}</div>`
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
            <div class="detail-item">📅 <strong>Date:</strong> ${ev.date || "N/A"}</div>
            <div class="detail-item">🕒 <strong>Time:</strong> ${ev.time || "N/A"}</div>
            <div class="detail-item" style="grid-column: 1/-1;">📍 <strong>Venue:</strong> ${ev.venue || "N/A"}</div>
            ${regCloseHTML}
          </div>
          
          ${resultHTML}

          <div class="event-actions" style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 10px; width: 100%;">
              <button class="btn-action" style="flex: 1;" onclick="showEventDetails('${ev.id}')">Rules & Details</button>
              <button class="btn-action btn-success" style="flex: 1;" onclick="window.location.href='explore.html?event=${ev.id}'">View Photos</button>
            </div>
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
  const ev = eventsList.find(e => e.id === eventId);
  if (!ev) return;

  const isClosed = isRegistrationClosed(ev);
  const regCloseText = ev.registrationCloseDate 
    ? `12:00 AM Midnight (${ev.registrationCloseDate}) ${isClosed ? '🔴 (Closed)' : '🟢 (OPEN)'}`
    : "No closing date set (Open)";

  modalTitle.innerText = ev.title;
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

    let modalHTML = `
      ${qualificationNoticeHTML}
      <p><strong>Description:</strong> ${ev.description}</p>
      <div class="event-details" style="margin: 20px 0; grid-template-columns: 1fr 1fr; display: grid; gap: 10px;">
        <div>📅 <strong>Date:</strong> ${ev.date || "N/A"}</div>
        <div>🕒 <strong>Time:</strong> ${ev.time || "N/A"}</div>
        <div style="grid-column: 1/-1;">📍 <strong>Venue:</strong> ${ev.venue || "N/A"}</div>
        <div style="grid-column: 1/-1;">👤 <strong>Faculty Coordinator:</strong> ${ev.coordinator || "N/A"}</div>
        ${studentCoordinatorsHTML}
        <div style="grid-column: 1/-1; color: ${isClosed ? 'var(--neon-red)' : 'inherit'};">⏳ <strong>Registration Close:</strong> ${regCloseText}</div>
      </div>
      <h4>Rules & Guidelines</h4>
    <pre>${ev.rules || "No rules specified for this event."}</pre>
  `;

  if (ev.resultsApproved && ev.results && (ev.results.first || ev.results.second || ev.results.third)) {
    modalHTML += `
      <h4>Event Winners</h4>
      <div class="winner-card-banner" style="font-size: 0.9rem; padding: 15px; margin-top: 10px;">
        ${ev.results.first ? `<div style="margin-bottom: 8px;">🥇 <strong>First Place:</strong> ${ev.results.first}</div>` : ""}
        ${ev.results.second ? `<div style="margin-bottom: 8px;">🥈 <strong>Second Place:</strong> ${ev.results.second}</div>` : ""}
        ${ev.results.third ? `<div>🥉 <strong>Third Place:</strong> ${ev.results.third}</div>` : ""}
      </div>
    `;
  }

  modalBody.innerHTML = modalHTML;
  detailModal.classList.add("active");
};

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

function getEmbedMediaUrl(url) {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
  }
  return url;
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
  if (modalClose && modal) {
    modalClose.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  let promos = [];
  try {
    const promoSnap = await getDocs(collection(db, "promos"));
    promoSnap.forEach(snap => promos.push(snap.data()));
  } catch (err) {
    console.error("Error loading promos for homepage:", err);
  }

  // If no promos uploaded yet, use default festival promos matching screenshot
  if (promos.length === 0) {
    promos = [
      {
        title: "6th",
        badge: "6TH",
        subtitle: "Promo Poster",
        contentType: "image",
        thumbnail: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80",
        mediaUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80",
        description: "Official Tech Manthan 6.0 Event Launch Poster."
      },
      {
        title: "4th",
        badge: "4TH",
        subtitle: "Promo Broadcast",
        contentType: "video",
        thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
        mediaUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        description: "Special Night Event & Drone Showcase Teaser."
      },
      {
        title: "3rd",
        badge: "3RD",
        subtitle: "Promo Broadcast",
        contentType: "video",
        thumbnail: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80",
        mediaUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        description: "Cultural Festival & Grand Arena Highlights."
      },
      {
        title: "2nd",
        badge: "2ND",
        subtitle: "Promo Broadcast",
        contentType: "video",
        thumbnail: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80",
        mediaUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        description: "Official Teaser Trailer & Tech Battle Reveal."
      },
      {
        title: "1st",
        badge: "1ST",
        subtitle: "Promo Broadcast",
        contentType: "video",
        thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
        mediaUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        description: "Tech Manthan 6.0 Opening Anthem."
      }
    ];
  } else {
    promos.sort((a, b) => (b.priority || 1) - (a.priority || 1));
  }

  section.style.display = "block";

  track.innerHTML = promos.map((p, idx) => {
    const badgeText = p.badge || `${promos.length - idx}${['TH','ST','ND','RD'][(promos.length - idx)%10 > 3 ? 0 : (promos.length - idx)%10] || 'TH'}`;
    const subtitleText = p.subtitle || (p.contentType === "video" ? "Promo Broadcast" : "Promo Poster");
    const thumbUrl = p.thumbnail || p.mediaUrl || "TC1.png";
    const isVideo = p.contentType === "video";
    const iconSymbol = isVideo ? "▶" : "👁";

    return `
      <div class="promo-card-item" onclick="openPromoMedia('${(p.title || '').replace(/'/g, "\\'")}', '${p.contentType}', '${p.mediaUrl}', '${(p.description || '').replace(/'/g, "\\'")}')" style="background: rgba(11, 15, 25, 0.95); border: 1px solid rgba(0, 243, 255, 0.2); border-radius: 16px; overflow: hidden; position: relative; width: 280px; flex-shrink: 0; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.4);">
        <!-- Top Badge -->
        <div style="position: absolute; top: 12px; left: 12px; z-index: 3; background: rgba(10, 15, 30, 0.85); color: var(--neon-cyan); border: 1px solid rgba(0, 243, 255, 0.4); font-weight: 800; border-radius: 4px; padding: 3px 9px; font-size: 0.75rem; font-family: monospace; letter-spacing: 1px;">
          ${badgeText}
        </div>

        <!-- Thumbnail Aspect Box -->
        <div style="position: relative; width: 100%; height: 170px; background: #000; overflow: hidden;">
          <img src="${thumbUrl}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85; transition: transform 0.4s ease;" alt="${p.title}">
          
          <!-- Center Play / Eye Action Button -->
          <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(10, 15, 30, 0.8); border: 2px solid var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.5); color: var(--neon-cyan); display: flex; align-items: center; justify-content: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.1rem; padding-left: ${isVideo ? '3px' : '0'};">
            ${iconSymbol}
          </div>
        </div>

        <!-- Card Text Info -->
        <div style="padding: 14px 16px;">
          <h3 style="color: #fff; font-family: 'Orbitron', sans-serif; font-size: 1rem; font-weight: 700; margin: 0 0 4px 0;">${p.title}</h3>
          <p style="color: #94a3b8; font-size: 0.8rem; margin: 0; font-family: 'Inter', sans-serif;">${subtitleText}</p>
        </div>
      </div>
    `;
  }).join("");
}

window.openPromoMedia = function(title, contentType, mediaUrl, description) {
  const modal = document.getElementById("promoMediaModal");
  const modalTitle = document.getElementById("promoMediaModalTitle");
  const modalBody = document.getElementById("promoMediaModalBody");

  if (!modal || !modalTitle || !modalBody) return;

  modalTitle.innerText = `TECH MANTHANA 6.0 PROMO: ${title}`;

  if (contentType === "video") {
    const embedUrl = getEmbedMediaUrl(mediaUrl);
    if (embedUrl.includes("youtube.com/embed")) {
      modalBody.innerHTML = `
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; border: 1px solid var(--neon-cyan);">
          <iframe src="${embedUrl}?autoplay=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        </div>
        ${description ? `<p style="color: var(--text-sub); margin-top: 15px; font-size: 0.9rem;">${description}</p>` : ''}
      `;
    } else {
      modalBody.innerHTML = `
        <video src="${mediaUrl}" controls autoplay style="width: 100%; max-height: 450px; border-radius: 12px; border: 1px solid var(--neon-cyan); background: #000;"></video>
        ${description ? `<p style="color: var(--text-sub); margin-top: 15px; font-size: 0.9rem;">${description}</p>` : ''}
      `;
    }
  } else {
    modalBody.innerHTML = `
      <img src="${mediaUrl}" style="max-width: 100%; max-height: 500px; border-radius: 12px; border: 1px solid var(--neon-cyan); object-fit: contain;" alt="${title}">
      ${description ? `<p style="color: var(--text-sub); margin-top: 15px; font-size: 0.9rem;">${description}</p>` : ''}
    `;
  }

  modal.classList.add("active");
};

// Boot application
document.addEventListener("DOMContentLoaded", initializeApp);
