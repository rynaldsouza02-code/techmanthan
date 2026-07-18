import { db } from "/firebase-config.js?v=3.1";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// DOM Elements
const assignedEventTitle = document.getElementById("assignedEventTitle");
const assignedEventSubtitle = document.getElementById("assignedEventSubtitle");
const noEventMessage = document.getElementById("noEventMessage");
const portalContent = document.getElementById("portalContent");
const scoringTableBody = document.getElementById("scoringTableBody");
const tableHeaders = document.getElementById("tableHeaders");
const criteriaInfo = document.getElementById("criteriaInfo");

// URL parameters parsing
const urlParams = new URLSearchParams(window.location.search);
let eventId = urlParams.get('event') ? urlParams.get('event').trim().toLowerCase() : null;
if (!eventId) {
  const pathParts = window.location.pathname.split('/');
  const jIndex = pathParts.indexOf('j');
  if (jIndex !== -1 && pathParts[jIndex + 1]) {
    eventId = pathParts[jIndex + 1].trim().toLowerCase();
  }
}

let eventData = null;
let registeredStudents = [];
let checkedInStudentIds = [];

// Initialize Console
async function init() {
  if (!eventId) {
    showNoEventError();
    return;
  }

  await loadEventData();
}

async function loadEventData() {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      showNoEventError();
      return;
    }

    eventData = eventSnap.data();
    checkedInStudentIds = eventData.checkedInStudents || [];
    
    // Update Title Info
    assignedEventTitle.innerText = `Judging: ${eventData.title}`;
    assignedEventSubtitle.innerText = `Evaluate checked-in students. Changes are saved directly.`;

    if (!eventData.criteria || eventData.criteria.length === 0) {
      criteriaInfo.innerText = "No criteria set by administrator yet.";
    } else {
      criteriaInfo.innerText = `Criteria: ${eventData.criteria.join(", ")}`;
    }

    // Set Table Headers Dynamically
    renderHeaders();

    // Fetch and load registered checked-in students
    await loadCheckedInStudents();

    noEventMessage.style.display = "none";
    portalContent.style.display = "block";
  } catch (error) {
    console.error("Error loading event judging parameters:", error);
    showNoEventError();
  }
}

function showNoEventError() {
  noEventMessage.style.display = "block";
  portalContent.style.display = "none";
}

function renderHeaders() {
  const criteria = eventData.criteria || [];
  tableHeaders.innerHTML = `
    <th>Reg No</th>
    <th>Student Name</th>
    <th>Class</th>
    ${criteria.map(c => `<th>${c}</th>`).join("")}
    <th style="color: var(--neon-blue);">Total</th>
    <th>Action</th>
  `;
}

async function loadCheckedInStudents() {
  try {
    const q = query(collection(db, "students"), where("registeredEvents", "array-contains", eventId));
    const querySnap = await getDocs(q);

    registeredStudents = [];
    querySnap.forEach(snap => {
      const data = snap.data();
      // Only load students who are checked-in by the coordinator
      if (checkedInStudentIds.includes(snap.id)) {
        registeredStudents.push({ regNo: snap.id, ...data });
      }
    });

    renderScoringSheet();
  } catch (error) {
    console.error("Error loading checked-in students:", error);
    scoringTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--neon-red);">Failed to load students list.</td></tr>`;
  }
}

function renderScoringSheet() {
  if (registeredStudents.length === 0) {
    scoringTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-sub);">No checked-in students available for evaluation yet.</td></tr>`;
    return;
  }

  const criteria = eventData.criteria || [];
  const marksSheet = eventData.marksSheet || {};

  scoringTableBody.innerHTML = registeredStudents.map(st => {
    const studentMarks = marksSheet[st.regNo] || { scores: {}, total: 0 };
    
    // Generate inputs for each criterion
    const criteriaInputsHTML = criteria.map(crit => {
      const score = studentMarks.scores[crit] !== undefined ? studentMarks.scores[crit] : "";
      return `
        <td>
          <input type="number" 
                 class="marks-input score-field-${st.regNo}" 
                 data-reg="${st.regNo}" 
                 data-criteria="${crit}" 
                 value="${score}" 
                 placeholder="0" 
                 min="0"
                 max="50"
                 style="width: 70px; text-align: center;"
          >
        </td>
      `;
    }).join("");

    return `
      <tr id="row-${st.regNo}">
        <td><strong style="color: var(--neon-purple);">${st.regNo}</strong></td>
        <td>${st.name || "N/A"}</td>
        <td>${st.class || "N/A"}</td>
        ${criteriaInputsHTML}
        <td><strong id="total-${st.regNo}" style="color: var(--neon-blue); font-size: 1rem;">${studentMarks.total || 0}</strong></td>
        <td>
          <button class="cyber-btn cyber-btn-green btn-save-row" 
                  data-reg="${st.regNo}" 
                  style="padding: 4px 10px; font-size: 0.75rem; border-radius: 4px;"
          >
            Save
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // Add event listeners to input fields to update row totals dynamically
  const inputs = document.querySelectorAll("input.marks-input");
  inputs.forEach(input => {
    input.addEventListener("input", (e) => {
      const regNo = e.target.dataset.reg;
      calculateRowTotal(regNo);
    });
  });

  // Add event listeners to row save buttons
  const saveButtons = document.querySelectorAll(".btn-save-row");
  saveButtons.forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const regNo = e.target.dataset.reg;
      await saveStudentScore(regNo, e.target);
    });
  });
}

function calculateRowTotal(regNo) {
  const fields = document.querySelectorAll(`.score-field-${regNo}`);
  let total = 0;
  fields.forEach(field => {
    total += parseFloat(field.value) || 0;
  });
  document.getElementById(`total-${regNo}`).innerText = total;
}

async function saveStudentScore(regNo, saveBtn) {
  saveBtn.disabled = true;
  saveBtn.innerText = "Saving...";

  let invalidScore = false;
  fields.forEach(field => {
    const score = parseFloat(field.value) || 0;
    if (score > 50) {
      invalidScore = true;
    }
    scores[field.dataset.criteria] = score;
    total += score;
  });

  if (invalidScore) {
    alert("Validation failed: Marks for each criterion cannot exceed 50.");
    saveBtn.disabled = false;
    saveBtn.innerText = "Save";
    return;
  }

  try {
    const eventRef = doc(db, "events", eventId);
    
    // Retrieve fresh eventData to avoid overwriting other students' marks
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      alert("Error: Event not found.");
      return;
    }
    
    const freshEventData = eventSnap.data();
    const updatedMarksSheet = freshEventData.marksSheet || {};
    
    // Update only this specific student's marks in the map
    updatedMarksSheet[regNo] = { scores, total };

    await updateDoc(eventRef, {
      marksSheet: updatedMarksSheet
    });

    // Update local copy
    eventData.marksSheet = updatedMarksSheet;

    saveBtn.innerText = "Saved ✓";
    saveBtn.style.borderColor = "var(--neon-green)";
    saveBtn.style.color = "var(--neon-green)";
    
    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.innerText = "Save";
      saveBtn.style.borderColor = "";
      saveBtn.style.color = "";
    }, 1500);

  } catch (error) {
    console.error("Error saving student marks:", error);
    alert("Failed to save marks. Check database rules.");
    saveBtn.disabled = false;
    saveBtn.innerText = "Save";
  }
}

// Start Initialization
document.addEventListener("DOMContentLoaded", init);
