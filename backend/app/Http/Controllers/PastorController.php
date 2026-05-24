<?php

namespace App\Http\Controllers;

use App\Models\Pastor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PastorController extends Controller
{
    public function index(Request $request)
    {
        $query = Pastor::with(['church.district'])->where('is_deleted', false);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                // ILIKE is Postgres specific for case-insensitive search
                $q->where('full_name', 'ilike', '%' . $search . '%')
                  ->orWhere('wife_name', 'ilike', '%' . $search . '%');
            });
        }

        return response()->json([
            'data' => $query->orderBy('full_name')->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'contact_number' => 'nullable|string',
            'birthdate' => 'nullable|date',
            'pastoring_start_date' => 'nullable|date',
            'wife_name' => 'nullable|string',
            'wife_birthdate' => 'nullable|date',
            'current_status_code' => 'required|string',
            'record_status' => 'required|string',
            'notes' => 'nullable|string',
            'parent_id' => 'nullable|uuid|exists:pastors,id',
            'pastor_image' => 'nullable|image|max:5120', // Max 5MB
            'wife_image' => 'nullable|image|max:5120',
        ]);

        // Standardize UUID handling since our DB expects it
        $pastor = new Pastor($validated);
        $pastor->id = (string) Str::uuid();
        
        if ($request->hasFile('pastor_image')) {
            $pastor->pastor_image_url = url(Storage::url($request->file('pastor_image')->store('pastors', 'public')));
        }
        
        if ($request->hasFile('wife_image')) {
            $pastor->wife_image_url = url(Storage::url($request->file('wife_image')->store('wives', 'public')));
        }

        $pastor->save();
        return response()->json(['message' => 'Pastor added successfully', 'data' => $pastor], 201);
    }

    public function show($id)
    {
        $pastor = Pastor::with(['mentor', 'disciples' => function($q) {
            $q->where('is_deleted', false)->orderBy('full_name');
        }])->findOrFail($id);

        return response()->json(['data' => $pastor]);
    }

    public function update(Request $request, $id)
    {
        $pastor = Pastor::findOrFail($id);
        
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'contact_number' => 'nullable|string',
            'birthdate' => 'nullable|date',
            'pastoring_start_date' => 'nullable|date',
            'wife_name' => 'nullable|string',
            'wife_birthdate' => 'nullable|date',
            'current_status_code' => 'required|string',
            'record_status' => 'required|string',
            'notes' => 'nullable|string',
            'parent_id' => 'nullable|uuid|exists:pastors,id',
            'pastor_image' => 'nullable|image|max:5120',
            'wife_image' => 'nullable|image|max:5120',
        ]);

        $pastor->fill($validated);

        if ($request->hasFile('pastor_image')) {
            // Optional: delete old image if exists
            $pastor->pastor_image_url = url(Storage::url($request->file('pastor_image')->store('pastors', 'public')));
        }
        
        if ($request->hasFile('wife_image')) {
            $pastor->wife_image_url = url(Storage::url($request->file('wife_image')->store('wives', 'public')));
        }

        $pastor->save();
        return response()->json(['message' => 'Pastor updated successfully', 'data' => $pastor]);
    }

    public function destroy($id)
    {
        $pastor = Pastor::findOrFail($id);
        // Soft delete implementation as per legacy spec
        $pastor->is_deleted = true;
        $pastor->save();
        
        return response()->json(['message' => 'Pastor deleted successfully']);
    }
}
