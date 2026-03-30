// guide.js — Global Context-Aware System Help Guide
// Injected via page modules.

export function initGuide() {
  // Only inject if the user is logged in (checking for sidebar nav ensures we're inside the app)
  if (!document.querySelector('.sidebar-nav') && !document.querySelector('.app-shell')) return;

  injectGuideUI();
  bindGuideEvents();
}

function getGuideContent() {
  const path = window.location.pathname.split('/').pop() || 'index.html';

  const guides = {
    'index.html': {
      title: 'Dashboard Overview',
      content: `
        <p><strong>What is this page for?</strong><br>
        This is your central command center. It gives you a high-level view of all system metrics, recent activities, and upcoming conferences.</p>
        <p><strong>What to click:</strong><br>
        Tap on any metric card (like "Total Pastors" or "Active Churches") to check the current stats quickly. Review the Activity Log feed to see what other administrators are updating.</p>
        <p><strong>What happens after clicking:</strong><br>
        The dashboard is "read-only." You can't break anything here. Clicking items may take you to the corresponding management page to view more details.</p>
        <p><strong>What history is preserved:</strong><br>
        The Activity Log maintains a permanent, un-editable trail of who changed what and when.</p>
      `
    },
    'pastors.html': {
      title: 'Pastor Directory',
      content: `
        <p><strong>What is this page for?</strong><br>
        This page holds the master list of all pastors/ministers in the database.</p>
        <p><strong>What to click:</strong><br>
        - <strong>"Add Pastor"</strong>: Registers a brand new person into the system.<br>
        - <strong>"Edit Icon" (Pencil)</strong>: Updates typos in their name, birthdate, or contact info.<br>
        - <strong>"View Profile" (Clicking a row)</strong>: Opens the Pastor's Ministry Timeline.</p>
        <p><strong>What happens after clicking:</strong><br>
        Adding a pastor creates a permanent record. Editing a pastor updates their static bio info instantly.</p>
        <p><strong>⚠️ Do NOT edit assignments here:</strong><br>
        You cannot change a pastor's church assignment from their "Edit" button. Assignments belong on the Ministry Timeline (found by clicking into their Profile).</p>
      `
    },
    'pastor-view.html': {
      title: 'Ministry Timeline Engine',
      content: `
        <p><strong>What is this page for?</strong><br>
        This is the most powerful page in the system. It tracks the complete history of a pastor’s ministry life without overwriting their past.</p>
        
        <p><strong>What to click (Action Buttons):</strong></p>
        <ul style="padding-left:16px;">
          <li><strong>+ Rank</strong>: Adds a new authority level to their track record.</li>
          <li><strong>+ Training</strong>: Logs completed or failed ministry courses.</li>
          <li><strong style="color:var(--red);">Pullout</strong>: Pulls the pastor out of their current assignment.</li>
          <li><strong style="color:#1565c0;">Transfer Pastor</strong>: Moves the pastor to a new church.</li>
        </ul>

        <p><strong>How the Timeline Engine Works:</strong><br>
        Instead of simply changing a status dropdown, you trigger "Events".<br>
        - <strong>Transfer</strong> = Automatically "Closes" the old assignment + "Opens" the new one in one click.<br>
        - <strong>Pullout</strong> = Simply "Closes" the active assignment and marks them Undeployed.<br>
        - <strong>Rank/Training</strong> = Adds new permanent history blocks.</p>

        <p><strong>What history is preserved?</strong><br>
        Everything. Old assignments, previous ranks, and historic trainings remain forever visible on the timeline feed. You should almost never delete items here.</p>
      `
    },
    'church.html': {
      title: 'Church Directory',
      content: `
        <p><strong>What is this page for?</strong><br>
        This page lists every local and pioneering church in the organization.</p>
        <p><strong>What to click:</strong><br>
        - <strong>"Add Church"</strong>: Creates a new church location.<br>
        - <strong>"Edit"</strong>: Fixes typos in the name or address.<br>
        - <strong>"View Directory"</strong>: Takes you to the details page of that specific church.</p>
        <p><strong>What happens after clicking:</strong><br>
        The church information is updated. To assign a district or a pastor to a church, you should use the <strong>District Hierarchy</strong> page or the <strong>Pastor Profile Timeline</strong>.</p>
      `
    },
    'church-view.html': {
      title: 'Church Profile',
      content: `
        <p><strong>What is this page for?</strong><br>
        This page shows the detailed history of a specific church, including who is currently leading it and who has led it in the past.</p>
        <p><strong>What to click:</strong><br>
        Review the "Current Pastor" section to see the active leader. Review the "Pastoral History" table to see legacy leaders.</p>
        <p><strong>What happens:</strong><br>
        This page is mostly for reading. If you need to change the current pastor of this church, go to the Pastor's Profile and use the <strong>Transfer Pastor</strong> button.</p>
      `
    },
    'district.html': {
      title: 'District Management',
      content: `
        <p><strong>What is this page for?</strong><br>
        This page organizes individual churches into regional groups (Districts) and assigns a District Presbyter (Leader).</p>
        <p><strong>What to click:</strong><br>
        - <strong>"Add District"</strong>: Creates a new regional bucket.<br>
        - <strong>"+ (Add Church)"</strong>: Drops an unassigned church into this district.</p>
        <p><strong>What happens after clicking:</strong><br>
        The church is linked to the standard Regional hierarchy. You can also assign a Pastor directly to a vacant church from inside this tree view.</p>
        <p><strong>What is preserved:</strong><br>
        Adding a pastor from the district tree automatically utilizes the Timeline Engine (closing their old assignment and opening this one).</p>
      `
    },
    'assignment.html': {
      title: 'Assignment Records (Legacy)',
      content: `
        <p><strong>What is this page for?</strong><br>
        This is the raw, master list of every single assignment movement in the system.</p>
        <p><strong>What to click:</strong><br>
        You can search or filter through thousands of assignment rows to generate specific reports (e.g., "Find all Active Pioneering pastors").</p>
        <p><strong>⚠️ What should not be edited manually:</strong><br>
        It is highly recommended that you DO NOT add or edit assignments directly from this table. You should perform Transfers and Pullouts directly on the <strong>Pastor Profile</strong> page to ensure the Timeline Engine rules are followed perfectly.</p>
      `
    },
    'disciples.html': {
      title: 'Disciple Masterlist',
      content: `
        <p><strong>What is this page for?</strong><br>
        This tracks all individual disciples and links them to their direct discipler (Pastor).</p>
        <p><strong>What to click:</strong><br>
        - <strong>"Add Disciple"</strong>: Creates a new disciple and attaches them to a Pastor.<br>
        - <strong>"Generate QR"</strong>: Downloads their ID badge for conferences.</p>
      `
    },
    'conferences.html': {
      title: 'Conferences & Events',
      content: `
        <p><strong>What is this page for?</strong><br>
        This sets up global events where you track meal attendance and delegate scanning.</p>
        <p><strong>What to click:</strong><br>
        - <strong>"Create Conference"</strong>: Starts a new multi-day event.<br>
        - <strong>"Manage Event"</strong>: Opens the configuration for that specific conference.</p>
      `
    },
    'badges.html': {
      title: 'ID Badge Generator',
      content: `
        <p><strong>What is this page for?</strong><br>
        This page securely generates QR codes and prints standardized ID Badges for Pastors, Wives, and Disciples.</p>
        <p><strong>What to click:</strong><br>
        Filter by the person's category (Pastor/Wife/Disciple), select their name, and click <strong>"Download Badge"</strong>.</p>
      `
    },
    'scanner.html': {
      title: 'QR Meal Scanner',
      content: `
        <p><strong>What is this page for?</strong><br>
        The reception desk uses this page to scan attendee ID Badges during a conference.</p>
        <p><strong>What to click:</strong><br>
        Select the Active Conference and the current Meal Period (e.g., Day 1 Morning). Then click <strong>"Start Scanner"</strong> and point the camera at a QR code.</p>
        <p><strong>What happens:</strong><br>
        The system instantly verifies if the person is registered and prevents double-scanning.</p>
      `
    }
  };

  // Default fallback if page is unknown
  const defaultGuide = {
    title: 'System Guide',
    content: `
      <p><strong>What is this page for?</strong><br>
      This is a module of the VCCC Management System.</p>
      <p><strong>What to click:</strong><br>
      Look for the primary action buttons (usually red or outlined) at the top right of the page.</p>
      <p><strong>Important Rule:</strong><br>
      Always read confirmation popups carefully before deleting data, as history preservation is a core philosophy of this tool.</p>
    `
  };

  return guides[path] || defaultGuide;
}

function injectGuideUI() {
  const guideData = getGuideContent();

  const fabStyle = `
    <style>
      :root { --guide-fab-bottom: 32px; }
      @media (max-width: 640px) {
        :root { --guide-fab-bottom: 90px; }
      }
      .guide-fab {
        position: fixed;
        bottom: var(--guide-fab-bottom);
        right: 32px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        cursor: pointer;
        border: 2px solid #fff;
        transition: transform 0.2s ease, box-shadow 0.2s ease, bottom 0.3s ease;
        background-color: var(--red);
        color: white;
      }
      .guide-fab:hover {
        transform: scale(1.08);
        box-shadow: 0 8px 24px rgba(232, 56, 32, 0.4);
      }
    </style>
  `;

  const fabHtml = `
    <button id="btn-global-guide" class="guide-fab" title="How does this page work?">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:28px; height:28px;">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </button>
  `;

  const modalHtml = `
    <div class="modal-overlay" id="modal-global-guide" style="z-index: 10000;">
      <div class="modal-box" style="max-width: 480px; border-top: 4px solid var(--red);">
        <div class="modal-head">
          <div class="modal-title" style="display:flex; align-items:center; gap:8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px; height:20px; color:var(--red);"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            ${guideData.title}
          </div>
          <button class="modal-close-guide" type="button" style="background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <div class="modal-body" style="font-size: 14px; line-height: 1.6; color: var(--text-2);">
          ${guideData.content}
        </div>
        <div class="modal-foot" style="margin-top:16px; padding:0; border:none; justify-content:flex-end;">
          <button type="button" class="btn btn-primary btn-close-guide">Got it</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', fabStyle);
  document.body.insertAdjacentHTML('beforeend', fabHtml);
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Bind close buttons manually (to avoid inline onclick)
  const modal = document.getElementById('modal-global-guide');
  const closeBtns = [
    modal.querySelector('.modal-close-guide'),
    modal.querySelector('.btn-close-guide'),
    modal
  ];
  closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target === btn || btn.classList.contains('modal-close-guide') || btn.classList.contains('btn-close-guide')) {
        modal.classList.remove('open');
      }
    });
  });
}

function bindGuideEvents() {
  const btn = document.getElementById('btn-global-guide');
  const modal = document.getElementById('modal-global-guide');
  
  if (btn && modal) {
    btn.addEventListener('click', () => {
      modal.classList.add('open');
    });
  }
}