<?php

namespace App\Http\Controllers;

use App\Models\Disciple;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DiscipleController extends Controller
{
    public function index(Request $request)
    {
        $query = Disciple::with(['church.district'])->where('is_deleted', false);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('full_name', 'ilike', '%' . $search . '%');
        }

        if ($request->has('church_id')) {
            $query->where('church_id', $request->church_id);
        }

        return response()->json([
            'data' => $query->orderBy('full_name')->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'church_id' => 'required|uuid|exists:churches,id',
            'disciple_image' => 'nullable|image|max:5120',
        ]);

        $disciple = new Disciple($validated);
        $disciple->id = (string) Str::uuid();

        if ($request->hasFile('disciple_image')) {
            $path = $request->file('disciple_image')->store('disciples', 'public');
            $disciple->disciple_image_url = url(Storage::url($path));
        }

        $disciple->save();
        return response()->json(['message' => 'Disciple added successfully', 'data' => $disciple], 201);
    }

    public function show($id)
    {
        $disciple = Disciple::with('church')->findOrFail($id);
        return response()->json(['data' => $disciple]);
    }

    public function update(Request $request, $id)
    {
        $disciple = Disciple::findOrFail($id);

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'church_id' => 'required|uuid|exists:churches,id',
            'disciple_image' => 'nullable|image|max:5120',
        ]);

        $disciple->fill($validated);

        if ($request->hasFile('disciple_image')) {
            $path = $request->file('disciple_image')->store('disciples', 'public');
            $disciple->disciple_image_url = url(Storage::url($path));
        }

        $disciple->save();
        return response()->json(['message' => 'Disciple updated successfully', 'data' => $disciple]);
    }

    public function destroy($id)
    {
        $disciple = Disciple::findOrFail($id);
        $disciple->is_deleted = true;
        $disciple->save();

        return response()->json(['message' => 'Disciple deleted successfully']);
    }
}
