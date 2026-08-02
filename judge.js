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

// Inject Excel Table Styles
const excelStyles = document.createElement("style");
excelStyles.innerHTML = `
  .excel-table {
      border-collapse: collapse !important;
      width: 100%;
  }
  .excel-table th, .excel-table td {
      border: 1px solid rgba(0, 243, 255, 0.2) !important;
      padding: 0 !important;
      height: 42px;
      vertical-align: middle;
  }
  .excel-table th {
      background: rgba(10, 15, 30, 0.85) !important;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.85rem;
      letter-spacing: 1px;
      padding: 12px 10px !important;
      color: var(--neon-blue);
      text-shadow: 0 0 5px rgba(0, 243, 255, 0.3);
  }
  .excel-table td.static-cell {
      padding: 8px 12px !important;
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
  }
  .excel-table td.total-cell {
      padding: 8px 12px !important;
      font-family: 'Orbitron', monospace;
      font-size: 1rem;
      font-weight: bold;
      color: var(--neon-blue);
      background: rgba(0, 240, 255, 0.05);
  }
  .excel-input {
      width: 100%;
      height: 100%;
      border: none !important;
      background: transparent !important;
      color: #ffffff !important;
      font-family: 'Orbitron', monospace !important;
      font-size: 1rem !important;
      text-align: center !important;
      outline: none !important;
      box-sizing: border-box;
      padding: 10px 0;
      transition: all 0.15s ease;
  }
  .excel-input::-webkit-outer-spin-button,
  .excel-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
  }
  .excel-input[type=number] {
      -moz-appearance: textfield;
  }
  .excel-table td.input-cell:focus-within {
      background: rgba(0, 240, 255, 0.1) !important;
      outline: 2px solid #00f0ff !important;
      outline-offset: -2px;
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
  }
`;
document.head.appendChild(excelStyles);

// DOM Elements
const assignedEventTitle = document.getElementById("assignedEventTitle");
const assignedEventSubtitle = document.getElementById("assignedEventSubtitle");
const noEventMessage = document.getElementById("noEventMessage");
const portalContent = document.getElementById("portalContent");
const scoringTableBody = document.getElementById("scoringTableBody");
const tableHeaders = document.getElementById("tableHeaders");
const criteriaInfo = document.getElementById("criteriaInfo");

// Judge Identification Elements
const judgeNameModal = document.getElementById("judgeNameModal");
const judgeNameForm = document.getElementById("judgeNameForm");
const judgeNameInput = document.getElementById("judgeNameInput");
const judgeUserArea = document.getElementById("judgeUserArea");
const judgeBadge = document.getElementById("judgeBadge");
const btnChangeJudge = document.getElementById("btnChangeJudge");

let currentJudgeName = sessionStorage.getItem("judgeName") || "";

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

  setupJudgeIdentity();
  await loadEventData();

  const btnSaveAll = document.getElementById("btnSaveAll");
  if (btnSaveAll) {
    btnSaveAll.addEventListener("click", saveAllScores);
  }
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
    ${criteria.map(c => `<th style="text-align: center;">${c}</th>`).join("")}
    <th style="color: var(--neon-blue); text-align: center;">Total</th>
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
    const studentEntry = marksSheet[st.regNo] || {};
    let studentMarks = { scores: {}, total: 0 };
    
    if (studentEntry.scores !== undefined) {
      studentMarks = studentEntry;
    } else if (currentJudgeName && studentEntry[currentJudgeName]) {
      studentMarks = studentEntry[currentJudgeName];
    }
    
    // Generate inputs for each criterion
    const criteriaInputsHTML = criteria.map(crit => {
      const score = studentMarks.scores[crit] !== undefined ? studentMarks.scores[crit] : "";
      return `
        <td style="text-align: center;" class="input-cell">
          <input type="number" 
                 class="marks-input excel-input score-field-${st.regNo}" 
                 data-reg="${st.regNo}" 
                 data-criteria="${crit}" 
                 value="${score}" 
                 placeholder="0" 
                 min="0"
                 max="50"
          >
        </td>
      `;
    }).join("");

    return `
      <tr id="row-${st.regNo}">
        <td class="static-cell"><strong style="color: var(--neon-purple);">${st.regNo}</strong></td>
        <td class="static-cell">${st.name || "N/A"}</td>
        <td class="static-cell">${st.class || "N/A"}</td>
        ${criteriaInputsHTML}
        <td class="total-cell" style="text-align: center;"><strong id="total-${st.regNo}">${studentMarks.total || 0}</strong></td>
      </tr>
    `;
  }).join("");

  // Add event listeners to input fields to update row totals dynamically
  const inputs = document.querySelectorAll("input.marks-input");
  inputs.forEach(input => {
    input.addEventListener("input", (e) => {
      let val = parseFloat(e.target.value);
      if (val > 50) {
        e.target.value = 50;
      } else if (val < 0) {
        e.target.value = 0;
      }
      const regNo = e.target.dataset.reg;
      calculateRowTotal(regNo);
    });
  });

  // Setup arrow-key cell navigation (like Excel)
  setupKeyboardNavigation();
}

function calculateRowTotal(regNo) {
  const fields = document.querySelectorAll(`.score-field-${regNo}`);
  let total = 0;
  fields.forEach(field => {
    total += parseFloat(field.value) || 0;
  });
  document.getElementById(`total-${regNo}`).innerText = total;
}

async function saveAllScores() {
  const btnSaveAll = document.getElementById("btnSaveAll");
  if (!btnSaveAll) return;
  
  btnSaveAll.disabled = true;
  btnSaveAll.innerText = "SAVING ALL SCORES...";

  const criteria = eventData.criteria || [];
  let invalidScore = false;
  const newMarksSheetUpdate = {};

  // Construct updated marks for all students present in the table
  for (const st of registeredStudents) {
    const fields = document.querySelectorAll(`.score-field-${st.regNo}`);
    const scores = {};
    let total = 0;
    
    fields.forEach(field => {
      const score = parseFloat(field.value) || 0;
      if (score > 50) {
        invalidScore = true;
      }
      scores[field.dataset.criteria] = score;
      total += score;
    });
    
    newMarksSheetUpdate[st.regNo] = { scores, total };
  }

  if (invalidScore) {
    alert("Validation failed: Marks for each criterion cannot exceed 50.");
    btnSaveAll.disabled = false;
    btnSaveAll.innerText = "SAVE EVALUATION SHEET";
    return;
  }

  try {
    const eventRef = doc(db, "events", eventId);
    
    // Retrieve fresh eventData to avoid overwriting other judges' marks
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      alert("Error: Event not found.");
      btnSaveAll.disabled = false;
      btnSaveAll.innerText = "SAVE EVALUATION SHEET";
      return;
    }
    
    const freshEventData = eventSnap.data();
    const updatedMarksSheet = freshEventData.marksSheet || {};
    
    const judgeKey = (currentJudgeName || "Default Judge").trim();
    
    // Merge new scores into the marksSheet map, keeping other judges' and legacy scores untouched
    for (const regNo in newMarksSheetUpdate) {
      if (!updatedMarksSheet[regNo] || updatedMarksSheet[regNo].scores !== undefined) {
        // legacy structure or empty
        updatedMarksSheet[regNo] = {};
      }
      updatedMarksSheet[regNo][judgeKey] = newMarksSheetUpdate[regNo];
    }

    await updateDoc(eventRef, {
      marksSheet: updatedMarksSheet
    });

    // Update local copy
    eventData.marksSheet = updatedMarksSheet;

    btnSaveAll.innerText = "SAVED SUCCESSFULLY ✓";
    btnSaveAll.style.borderColor = "var(--neon-green)";
    btnSaveAll.style.color = "var(--neon-green)";
    btnSaveAll.style.boxShadow = "0 0 20px rgba(57, 255, 20, 0.4)";
    
    setTimeout(() => {
      btnSaveAll.disabled = false;
      btnSaveAll.innerText = "SAVE EVALUATION SHEET";
      btnSaveAll.style.borderColor = "";
      btnSaveAll.style.color = "";
      btnSaveAll.style.boxShadow = "";
    }, 2000);

  } catch (error) {
    console.error("Error saving student marks:", error);
    alert("Failed to save marks. Check database rules.");
    btnSaveAll.disabled = false;
    btnSaveAll.innerText = "SAVE EVALUATION SHEET";
  }
}

function setupJudgeIdentity() {
  if (currentJudgeName) {
    // Already identified
    judgeNameModal.style.display = "none";
    judgeNameModal.classList.remove("active");
    judgeUserArea.style.display = "flex";
    judgeBadge.innerText = `Judge: ${currentJudgeName}`;
  } else {
    // Show identification overlay
    judgeNameModal.style.display = "flex";
    judgeNameModal.classList.add("active");
    judgeUserArea.style.display = "none";
  }

  // Handle identity form submission
  if (judgeNameForm) {
    judgeNameForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputVal = judgeNameInput.value.trim();
      if (!inputVal) return;

      currentJudgeName = inputVal;
      sessionStorage.setItem("judgeName", currentJudgeName);
      
      // Hide modal
      judgeNameModal.style.display = "none";
      judgeNameModal.classList.remove("active");
      
      // Show badge
      judgeUserArea.style.display = "flex";
      judgeBadge.innerText = `Judge: ${currentJudgeName}`;

      // Re-render scoring sheet to load this judge's pre-filled marks if any
      renderScoringSheet();
    });
  }

  // Handle change judge button click
  if (btnChangeJudge) {
    btnChangeJudge.addEventListener("click", () => {
      sessionStorage.removeItem("judgeName");
      currentJudgeName = "";
      judgeNameInput.value = "";
      setupJudgeIdentity();
    });
  }
}

function setupKeyboardNavigation() {
  const inputs = Array.from(document.querySelectorAll("input.excel-input"));
  
  inputs.forEach((input) => {
    input.addEventListener("keydown", (e) => {
      const criteria = eventData.criteria || [];
      const colCount = criteria.length;
      
      const currentReg = e.target.dataset.reg;
      const currentCrit = e.target.dataset.criteria;
      
      const rowIndex = registeredStudents.findIndex(st => st.regNo === currentReg);
      const colIndex = criteria.indexOf(currentCrit);
      
      let targetInput = null;
      
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        if (rowIndex < registeredStudents.length - 1) {
          const nextStudent = registeredStudents[rowIndex + 1];
          targetInput = document.querySelector(`input.excel-input[data-reg="${nextStudent.regNo}"][data-criteria="${currentCrit}"]`);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (rowIndex > 0) {
          const prevStudent = registeredStudents[rowIndex - 1];
          targetInput = document.querySelector(`input.excel-input[data-reg="${prevStudent.regNo}"][data-criteria="${currentCrit}"]`);
        }
      } else if (e.key === "ArrowRight") {
        const length = e.target.value.length;
        if (e.target.selectionStart === length) {
          e.preventDefault();
          if (colIndex < colCount - 1) {
            const nextCrit = criteria[colIndex + 1];
            targetInput = document.querySelector(`input.excel-input[data-reg="${currentReg}"][data-criteria="${nextCrit}"]`);
          } else if (rowIndex < registeredStudents.length - 1) {
            const nextStudent = registeredStudents[rowIndex + 1];
            targetInput = document.querySelector(`input.excel-input[data-reg="${nextStudent.regNo}"][data-criteria="${criteria[0]}"]`);
          }
        }
      } else if (e.key === "ArrowLeft") {
        if (e.target.selectionStart === 0) {
          e.preventDefault();
          if (colIndex > 0) {
            const prevCrit = criteria[colIndex - 1];
            targetInput = document.querySelector(`input.excel-input[data-reg="${currentReg}"][data-criteria="${prevCrit}"]`);
          } else if (rowIndex > 0) {
            const prevStudent = registeredStudents[rowIndex - 1];
            targetInput = document.querySelector(`input.excel-input[data-reg="${prevStudent.regNo}"][data-criteria="${criteria[colCount - 1]}"]`);
          }
        }
      }
      
      if (targetInput) {
        targetInput.focus();
        setTimeout(() => targetInput.select(), 50);
      }
    });
  });
}

// Start Initialization
document.addEventListener("DOMContentLoaded", init);
