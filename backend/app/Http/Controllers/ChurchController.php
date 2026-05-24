<?php

namespace App\Http\Controllers;

use App\Models\Church;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ChurchController extends Controller
{
    public function index(Request $request)
    {
        $query = Church::where('is_deleted', false)
            ->with(['district', 'pioneerPastor', 'pastor']);

        if ($request->has('unassigned') && $request->unassigned == 'true') {
            $query->whereNull('district_id');
        }

        $churches = $query->orderBy('church_name')->get()->map(function($church) {
            // Append virtual properties to match legacy leftJoin payload
            $church->district_name = $church->district ? $church->district->district_name : null;
            $church->pioneer_pastor_name = $church->pioneerPastor ? $church->pioneerPastor->full_name : null;
            $church->current_pastor_name = $church->pastor ? $church->pastor->full_name : null;
            return $church;
        });

        return response()->json(['data' => $churches]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'church_name' => 'required|string|max:255',
            'church_address' => 'required|string',
            'district_id' => 'nullable|uuid',
            'pioneer_pastor_id' => 'nullable|uuid',
            'mother_church_id' => 'nullable|uuid',
            'church_scope' => 'required|in:local,international',
            'notes' => 'nullable|string'
        ]);

        $church = new Church();
        $church->id = (string) Str::uuid();
        $church->fill($validated);
        $church->save();

        return response()->json(['message' => 'Church created successfully', 'data' => $church], 201);
    }

    public function show($id)
    {
        $church = Church::where('id', $id)
            ->where('is_deleted', false)
            ->with(['district', 'pioneerPastor', 'motherChurch'])
            ->firstOrFail();

        // Append virtual properties
        $church->district_name = $church->district ? $church->district->district_name : null;
        $church->pioneer_pastor_name = $church->pioneerPastor ? $church->pioneerPastor->full_name : null;
        $church->mother_church_name = $church->motherChurch ? $church->motherChurch->church_name : null;

        return response()->json(['data' => $church]);
    }

    public function update(Request $request, $id)
    {
        $church = Church::findOrFail($id);
        
        $validated = $request->validate([
            'church_name' => 'required|string|max:255',
            'church_address' => 'required|string',
            'district_id' => 'nullable|uuid',
            'pioneer_pastor_id' => 'nullable|uuid',
            'mother_church_id' => 'nullable|uuid',
            'church_scope' => 'required|in:local,international',
            'notes' => 'nullable|string'
        ]);

        $church->update($validated);

        return response()->json(['message' => 'Church updated successfully', 'data' => $church]);
    }

    public function destroy($id)
    {
        $church = Church::findOrFail($id);
        $church->is_deleted = true;
        $church->save();

        return response()->json(['message' => 'Church deleted successfully']);
    }
}
