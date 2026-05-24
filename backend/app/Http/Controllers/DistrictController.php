<?php

namespace App\Http\Controllers;

use App\Models\District;
use Illuminate\Http\Request;

class DistrictController extends Controller
{
    public function index()
    {
        $districts = District::with('leader:id,full_name,pastor_image_url')
            ->withCount('churches')
            ->where('is_deleted', false)
            ->orderBy('district_name')
            ->get();

        return response()->json(['data' => $districts]);
    }

    public function store(Request $request)
    {
        $this->validate($request, [
            'district_name' => 'required|string|unique:districts,district_name',
            'theme_color' => 'nullable|string',
            'leader_pastor_id' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $district = new District();
        $district->id = (string) \Illuminate\Support\Str::uuid();
        $district->fill($request->only(['district_name', 'theme_color', 'leader_pastor_id', 'notes']));
        $district->save();

        return response()->json(['message' => 'District created successfully', 'data' => $district], 201);
    }

    public function show($id)
    {
        $district = District::with('leader:id,full_name,pastor_image_url,contact_number')
            ->where('id', $id)
            ->where('is_deleted', false)
            ->first();

        if (!$district) {
            return response()->json(['message' => 'District not found'], 404);
        }

        $churches = \App\Models\Church::where('district_id', $id)
            ->where('is_deleted', false)
            ->with('pastor')
            ->orderBy('church_name')
            ->get();

        $district->churches = $churches;

        return response()->json(['data' => $district]);
    }

    public function update(Request $request, $id)
    {
        $district = District::where('is_deleted', false)->find($id);

        if (!$district) {
            return response()->json(['message' => 'District not found'], 404);
        }

        $this->validate($request, [
            'district_name' => 'required|string',
            'theme_color' => 'nullable|string',
            'leader_pastor_id' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $district->update($request->only(['district_name', 'theme_color', 'leader_pastor_id', 'notes']));

        return response()->json(['message' => 'District updated successfully', 'data' => $district]);
    }

    public function destroy($id)
    {
        $district = District::find($id);
        if (!$district) {
            return response()->json(['message' => 'District not found'], 404);
        }

        $district->is_deleted = true;
        // Optionally, unlink churches from this district when deleted? 
        // We'll just mark district deleted, churches stay, but their district is hidden.
        $district->save();

        return response()->json(['message' => 'District deleted successfully']);
    }
}
