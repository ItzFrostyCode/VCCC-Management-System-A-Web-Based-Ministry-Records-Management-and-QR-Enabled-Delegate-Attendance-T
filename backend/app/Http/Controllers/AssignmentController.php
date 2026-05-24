<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Pastor;
use App\Models\Church;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AssignmentController extends Controller
{
    public function index()
    {
        $assignments = Assignment::orderBy('start_date', 'desc')->get();
        return response()->json(['data' => $assignments]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'pastor_id' => 'required|uuid',
            'transition_type' => 'required|string', 
            'effective_date' => 'required|date',
            'church_id' => 'nullable|uuid',
            'new_church_name' => 'nullable|string',
            'district_id' => 'nullable|uuid',
            'reason' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $pastor = Pastor::findOrFail($validated['pastor_id']);
        $churchId = $validated['church_id'] ?? null;
        $status = 'active';
        $assignmentType = 'pioneering';
        $pastorStatus = 'active';

        if ($validated['transition_type'] === 'pioneer') {
            $church = new Church();
            $church->id = (string) Str::uuid();
            $church->church_name = $validated['new_church_name'] ?? 'New Pioneer Church';
            $church->church_address = 'TBD';
            $church->district_id = $validated['district_id'] ?? null;
            $church->pioneer_pastor_id = $pastor->id;
            $church->save();
            $churchId = $church->id;
            $assignmentType = 'pioneering';
        } else if ($validated['transition_type'] === 'takeover') {
            $assignmentType = 'takeover';
            
            // End the previous active assignment for this church
            $previousAssignment = Assignment::where('church_id', $churchId)
                                            ->where('status_code', 'active')
                                            ->first();
            if ($previousAssignment) {
                $previousAssignment->status_code = 'ended';
                $previousAssignment->end_date = $validated['effective_date'];
                $previousAssignment->end_reason = 'transferred'; // or redirection
                $previousAssignment->save();

                // Update previous pastor's status
                $previousPastor = Pastor::find($previousAssignment->pastor_id);
                if ($previousPastor) {
                    $previousPastor->current_status_code = 'undeployed';
                    $previousPastor->save();
                }
            }
        } else if ($validated['transition_type'] === 'undeploy') {
            $status = $validated['reason'] ?? 'pullout';
            $assignmentType = 'legacy';
            $pastorStatus = 'undeployed';
        } else if ($validated['transition_type'] === 'international') {
            $church = new Church();
            $church->id = (string) Str::uuid();
            $church->church_name = $validated['new_church_name'] ?? 'International Mission';
            $church->church_address = 'International';
            $church->church_scope = 'international';
            $church->save();
            $churchId = $church->id;
            $assignmentType = 'pioneering';
        } else if ($validated['transition_type'] === 'legacy') {
             $status = 'ended';
             $assignmentType = 'legacy';
             $pastorStatus = 'deceased';
        }

        // Create assignment record if applicable
        if ($churchId && !in_array($validated['transition_type'], ['undeploy', 'legacy'])) {
            $assignment = new Assignment();
            $assignment->id = (string) Str::uuid();
            $assignment->pastor_id = $pastor->id;
            $assignment->church_id = $churchId;
            $assignment->status_code = $status;
            $assignment->assignment_type = $assignmentType;
            $assignment->start_date = $validated['effective_date'];
            $assignment->notes = $validated['notes'];
            $assignment->save();
        }

        $pastor->current_status_code = $pastorStatus;
        $pastor->save();

        return response()->json(['message' => 'Transition completed successfully']);
    }

    public function getByPastor($pastorId)
    {
        $assignments = Assignment::where('pastor_id', $pastorId)
             ->join('churches', 'assignments.church_id', '=', 'churches.id')
             ->select('assignments.*', 'churches.church_name')
             ->orderBy('assignments.start_date', 'desc')
             ->get();

        return response()->json(['data' => $assignments]);
    }

    public function getByChurch($churchId)
    {
        $assignments = Assignment::where('church_id', $churchId)
             ->join('pastors', 'assignments.pastor_id', '=', 'pastors.id')
             ->select('assignments.*', 'pastors.full_name as pastor_name')
             ->orderBy('assignments.start_date', 'desc')
             ->get();

        return response()->json(['data' => $assignments]);
    }
}
