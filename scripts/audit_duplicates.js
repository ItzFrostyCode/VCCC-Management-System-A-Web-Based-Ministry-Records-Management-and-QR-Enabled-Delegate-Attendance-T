/**
 * audit_duplicates.js
 * ────────────────────────────────────────────────────────────────
 * Diagnostic tool: Detect data integrity violations in the
 * `assignments` table for the VCCC Pastoral Lifecycle system.
 *
 * Checks:
 *   1. Churches with more than one ACTIVE assignment (should be 0)
 *   2. Pastors with more than one ACTIVE assignment (should be 0)
 *   3. Active assignments that have a non-null end_date (ghost records)
 *   4. Ended assignments with a null end_date (missing close data)
 *
 * Usage:
 *   node scripts/audit_duplicates.js
 *
 * Requires: SUPABASE_URL and SUPABASE_ANON_KEY set as environment vars,
 * or update the constants below directly.
 * ────────────────────────────────────────────────────────────────
 */

const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://wfeeoojneyuoeutzndie.supabase.co';
const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_KEY) {
    console.error('\n❌  SUPABASE_ANON_KEY is not set. Export it before running:\n');
    console.error('   export SUPABASE_ANON_KEY="your-anon-key-here"\n');
    process.exit(1);
}

const headers = {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json'
};

async function query(path, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${path}${params}`;
    const res  = await fetch(url, { headers });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Query failed [${res.status}]: ${body}`);
    }
    return res.json();
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function section(title) {
    console.log('\n' + '─'.repeat(60));
    console.log(`  ${title}`);
    console.log('─'.repeat(60));
}

function ok(msg)   { console.log(`  ✅  ${msg}`); }
function warn(msg) { console.log(`  ⚠️   ${msg}`); }
function fail(msg) { console.log(`  ❌  ${msg}`); }

// ──────────────────────────────────────────────
// Checks
// ──────────────────────────────────────────────

async function checkChurchDuplicates() {
    section('CHECK 1 — Churches with multiple ACTIVE assignments');

    // Fetch all active assignments with church info
    const rows = await query(
        'assignments',
        '?select=id,church_id,pastor_id,start_date,status_code,end_date,pastors(full_name),churches(church_name)' +
        '&status_code=eq.active' +
        '&order=church_id.asc,start_date.asc'
    );

    // Group by church_id
    const byChurch = {};
    for (const r of rows) {
        const key = r.church_id;
        if (!byChurch[key]) byChurch[key] = { name: r.churches?.church_name || key, records: [] };
        byChurch[key].records.push(r);
    }

    const duplicates = Object.entries(byChurch).filter(([, v]) => v.records.length > 1);

    if (duplicates.length === 0) {
        ok(`No duplicate ACTIVE assignments per church. (${Object.keys(byChurch).length} churches scanned)`);
    } else {
        fail(`Found ${duplicates.length} church(es) with multiple ACTIVE assignments!`);
        for (const [churchId, { name, records }] of duplicates) {
            warn(`Church: "${name}" (${churchId}) — ${records.length} active records`);
            for (const r of records) {
                console.log(`       → Assignment ${r.id} | Pastor: ${r.pastors?.full_name || r.pastor_id} | Start: ${r.start_date}`);
            }
        }
    }

    return duplicates;
}

async function checkPastorDuplicates() {
    section('CHECK 2 — Pastors with multiple ACTIVE assignments');

    const rows = await query(
        'assignments',
        '?select=id,church_id,pastor_id,start_date,status_code,pastors(full_name),churches(church_name)' +
        '&status_code=eq.active' +
        '&order=pastor_id.asc,start_date.asc'
    );

    const byPastor = {};
    for (const r of rows) {
        const key = r.pastor_id;
        if (!byPastor[key]) byPastor[key] = { name: r.pastors?.full_name || key, records: [] };
        byPastor[key].records.push(r);
    }

    const duplicates = Object.entries(byPastor).filter(([, v]) => v.records.length > 1);

    if (duplicates.length === 0) {
        ok(`No duplicate ACTIVE assignments per pastor. (${Object.keys(byPastor).length} pastors scanned)`);
    } else {
        fail(`Found ${duplicates.length} pastor(s) with multiple ACTIVE assignments!`);
        for (const [pastorId, { name, records }] of duplicates) {
            warn(`Pastor: "${name}" (${pastorId}) — ${records.length} active records`);
            for (const r of records) {
                console.log(`       → Assignment ${r.id} | Church: ${r.churches?.church_name || r.church_id} | Start: ${r.start_date}`);
            }
        }
    }

    return duplicates;
}

async function checkGhostActiveRecords() {
    section('CHECK 3 — Ghost ACTIVE records (active status but end_date is set)');

    const rows = await query(
        'assignments',
        '?select=id,pastor_id,church_id,status_code,end_date,pastors(full_name),churches(church_name)' +
        '&status_code=eq.active' +
        '&end_date=not.is.null'
    );

    if (rows.length === 0) {
        ok('No ghost active records found.');
    } else {
        fail(`Found ${rows.length} ghost record(s) — status=active but end_date is set:`);
        for (const r of rows) {
            warn(`  Assignment ${r.id} | Pastor: ${r.pastors?.full_name || r.pastor_id} | Church: ${r.churches?.church_name || r.church_id} | end_date: ${r.end_date}`);
        }
    }

    return rows;
}

async function checkEndedWithoutDate() {
    section('CHECK 4 — ENDED assignments missing end_date');

    const rows = await query(
        'assignments',
        '?select=id,pastor_id,church_id,status_code,start_date,end_date,end_reason,pastors(full_name),churches(church_name)' +
        '&status_code=eq.ended' +
        '&end_date=is.null' +
        '&limit=20'
    );

    if (rows.length === 0) {
        ok('All ended assignments have an end_date recorded.');
    } else {
        warn(`Found ${rows.length} ended assignment(s) missing end_date (showing up to 20):`);
        for (const r of rows) {
            console.log(`  → Assignment ${r.id} | Pastor: ${r.pastors?.full_name || r.pastor_id} | Church: ${r.churches?.church_name || r.church_id} | Start: ${r.start_date}`);
        }
    }

    return rows;
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function main() {
    console.log('\n🔍  VCCC Pastoral Assignment Integrity Audit');
    console.log(`    Connected to: ${SUPABASE_URL}`);
    console.log(`    Run at: ${new Date().toISOString()}`);

    let violations = 0;

    const churchDups  = await checkChurchDuplicates();
    const pastorDups  = await checkPastorDuplicates();
    const ghostActive = await checkGhostActiveRecords();
    const noEndDate   = await checkEndedWithoutDate();

    violations += churchDups.length + pastorDups.length + ghostActive.length;

    section('SUMMARY');
    if (violations === 0) {
        ok('Database is CLEAN — no active assignment integrity violations.');
    } else {
        fail(`${violations} violation category(ies) detected. See details above.`);
        console.log('\n  To auto-close the OLDEST duplicates and keep only the newest, run:');
        console.log('  node scripts/audit_duplicates.js --fix  (not yet implemented — review first)');
    }

    if (noEndDate.length > 0) {
        warn(`${noEndDate.length} ended row(s) have no end_date. These are historical records that may need manual review.`);
    }

    console.log('\n');
}

main().catch(err => {
    console.error('\n💥 Audit failed:', err.message);
    process.exit(1);
});
