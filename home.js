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
    // Logged in as student
    navUserArea.innerHTML = `
      <span class="user-badge">${name} (${username})</span>
      <button class="btn-logout" id="btnLogout">Logout</button>
    `;
    
    // Add "My Registrations" filter button
    filterToggles.innerHTML += `
      <button class="tab-btn" id="btnMyEvents">My Registrations</button>
    `;

    // Adjust hero button
    if (heroActions) {
      heroActions.innerHTML = `
        <a href="explore.html" class="cyber-btn">Explore Events & Photos</a>
      `;
    }

    document.getElementById("btnLogout").addEventListener("click", () => {
      localStorage.clear();
      window.location.reload();
    });
  } else {
    // Guest or other state
    navUserArea.innerHTML = `
      <a href="login.html" class="cyber-btn" style="padding: 6px 20px; font-size: 0.85rem;">Login</a>
    `;
  }
}

async function loadUserData() {
  if (!username) return;
  try {
    const studentRef = doc(db, "students", username);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const data = studentSnap.data();
      registeredEventsIds = data.registeredEvents || [];
      if (data.email) {
        localStorage.setItem("email", data.email);
      }
      if (data.name) {
        localStorage.setItem("name", data.name);
      }
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
    const hasResults = ev.results && (ev.results.first || ev.results.second || ev.results.third);
    
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

    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isClosed = ev.registrationCloseDate && todayStr > ev.registrationCloseDate;

    const regCloseHTML = ev.registrationCloseDate 
      ? `<div class="detail-item" style="grid-column: 1/-1; color: ${isClosed ? 'var(--neon-red)' : 'var(--text-sub)'};">⏳ <strong>Reg Closes:</strong> ${ev.registrationCloseDate} ${isClosed ? '(Closed)' : ''}</div>`
      : "";

    let posterHTML = `<div class="event-card-poster-fallback"><span>No Poster</span></div>`;
    if (ev.poster) {
      posterHTML = `<img src="${ev.poster}" class="event-card-poster" alt="${ev.title} poster">`;
    }

    return `
      <div class="event-card cyber-card-scan cyber-corners" id="card-${ev.id}">
        <div>
          ${posterHTML}
          <div class="event-header">
            <h3>${ev.title}</h3>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              ${isRegistered ? `<span class="reg-badge">Registered</span>` : ""}
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
            ${
              isClosed
                ? `<button class="btn-action" style="width: 100%; opacity: 0.5; cursor: not-allowed; background: #374151; border-color: #374151; color: #9ca3af;" disabled>Registration Closed</button>`
                : (username 
                    ? (isRegistered 
                        ? `<button class="btn-action btn-danger" style="width: 100%;" onclick="unregisterEvent('${ev.id}')">Leave</button>`
                        : `<button class="btn-action btn-success" style="width: 100%;" onclick="registerEvent('${ev.id}')">Register</button>`)
                    : `<button class="btn-action btn-success" style="width: 100%;" onclick="redirectToLogin()">Register</button>`)
            }
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

  modalTitle.innerText = ev.title;
  
  let modalHTML = `
    <p><strong>Description:</strong> ${ev.description}</p>
    <div class="event-details" style="margin: 20px 0; grid-template-columns: 1fr 1fr; display: grid; gap: 10px;">
      <div>📅 <strong>Date:</strong> ${ev.date || "N/A"}</div>
      <div>🕒 <strong>Time:</strong> ${ev.time || "N/A"}</div>
      <div style="grid-column: 1/-1;">📍 <strong>Venue:</strong> ${ev.venue || "N/A"}</div>
      <div style="grid-column: 1/-1;">👤 <strong>Coordinator:</strong> ${ev.coordinator || "N/A"}</div>
    </div>
    <h4>Rules & Guidelines</h4>
    <pre>${ev.rules || "No rules specified for this event."}</pre>
  `;

  if (ev.results && (ev.results.first || ev.results.second || ev.results.third)) {
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
  if (ev && ev.registrationCloseDate) {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (todayStr > ev.registrationCloseDate) {
      alert("Registration is closed for this event.");
      return;
    }
  }
  
  const registerButton = document.querySelector(`#card-${eventId} .btn-success`);
  if (registerButton) {
    registerButton.disabled = true;
    registerButton.innerText = "Registering...";
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
  if (!username) return;
  
  if (!confirm("Are you sure you want to unregister from this event?")) return;

  const leaveButton = document.querySelector(`#card-${eventId} .btn-danger`);
  if (leaveButton) {
    leaveButton.disabled = true;
    leaveButton.innerText = "Leaving...";
  }

  try {
    const studentRef = doc(db, "students", username);
    await updateDoc(studentRef, {
      registeredEvents: arrayRemove(eventId)
    });
    
    registeredEventsIds = registeredEventsIds.filter(id => id !== eventId);
    renderEvents();
  } catch (error) {
    console.error("Deregistration error:", error);
    alert("Could not remove registration. Please try again.");
    renderEvents();
  }
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

// Boot application
document.addEventListener("DOMContentLoaded", initializeApp);
