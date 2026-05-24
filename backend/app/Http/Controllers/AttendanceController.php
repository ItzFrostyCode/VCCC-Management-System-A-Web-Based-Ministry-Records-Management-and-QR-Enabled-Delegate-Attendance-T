<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\ConferenceDay;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    /**
     * Store a new attendance record (QR Scan).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'id'            => 'sometimes|uuid',
            'scan_uuid'     => 'required|uuid',
            'conference_id' => 'required|uuid',
            'day_id'        => 'required|uuid',
            'slot_id'       => 'required|uuid',
            'delegate_id'   => 'required|uuid',
            'delegate_type' => 'required|string|in:PASTOR,WIFE,DISCIPLE',
        ]);

        // 1. Idempotency Check (Retry Protection)
        // If this exact scan event was already processed, return 200 OK.
        $retry = Attendance::where('scan_uuid', $validated['scan_uuid'])->first();
        if ($retry) {
            return response()->json([
                'message' => 'Already synced',
                'data' => $retry
            ], 200);
        }

        // 2. Session Validation
        $day = ConferenceDay::findOrFail($validated['day_id']);
        $slot = TimeSlot::findOrFail($validated['slot_id']);
        
        // Parse end time in Philippines time explicitly
        $endSession = Carbon::parse($day->date . ' ' . $slot->end_time, 'Asia/Manila');
        $now = now()->setTimezone('Asia/Manila');
        
        if ($now->greaterThan($endSession)) {
            return response()->json([
                'message' => 'Cannot record attendance. This session has already ended.',
                'end_time' => $endSession->toDateTimeString()
            ], 403);
        }

        // 3. Atomicity & Final Verification (Double-Layer Deduplication)
        try {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($validated) {
                // Secondary Check: Business Uniqueness (Prevent double-scanning the same badge in one session)
                $existing = Attendance::where([
                    'conference_id' => $validated['conference_id'],
                    'day_id'        => $validated['day_id'],
                    'slot_id'       => $validated['slot_id'],
                    'delegate_id'   => $validated['delegate_id'],
                    'delegate_type' => $validated['delegate_type'],
                ])->lockForUpdate()->first();

                if ($existing) {
                    return response()->json([
                        'message' => 'Attendance already recorded for this session',
                        'data' => $existing
                    ], 409); // Conflict
                }

                $attendance = new Attendance();
                $attendance->id = $validated['id'] ?? (string) Str::uuid();
                $attendance->scan_uuid = $validated['scan_uuid'];
                $attendance->conference_id = $validated['conference_id'];
                $attendance->day_id = $validated['day_id'];
                $attendance->slot_id = $validated['slot_id'];
                $attendance->delegate_id = $validated['delegate_id'];
                $attendance->delegate_type = $validated['delegate_type'];
                $attendance->scanned_at = now();
                $attendance->save();

                return response()->json([
                    'message' => 'Attendance recorded successfully',
                    'data' => $attendance
                ], 201);
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Final Database Safety Net (Unique Constraint violation)
            if ($e->getCode() == '23505') {
                if (str_contains($e->getMessage(), 'scan_uuid')) {
                    return response()->json(['message' => 'Sync success (idempotent)'], 200);
                }
                return response()->json(['message' => 'Attendance already recorded for this session'], 409);
            }
            throw $e;
        }
    }

    /**
     * Get attendance records for a conference/report.
     */
    public function index(Request $request)
    {
        $query = Attendance::query();

        if ($request->has('conference_id')) {
            $query->where('conference_id', $request->conference_id);
        }

        return response()->json([
            'data' => $query->get()
        ]);
    }
}
