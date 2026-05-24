<?php

namespace App\Http\Controllers;

use App\Models\Conference;
use App\Models\ConferenceDay;
use App\Models\TimeSlot;
use App\Models\Meal;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class ConferenceController extends Controller
{
    public function index()
    {
        $conferences = Conference::where('is_deleted', false)
            ->orderBy('start_date', 'desc')
            ->get();
            
        return response()->json(['data' => $conferences]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'theme' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'slots_map' => 'nullable|array'
        ]);

        $conference = new Conference();
        $conference->id = (string) Str::uuid();
        $conference->title = $validated['title'];
        $conference->theme = strtoupper($validated['theme'] ?? '');
        $conference->location = strtoupper($validated['location'] ?? '');
        $conference->start_date = $validated['start_date'];
        $conference->end_date = $validated['end_date'];
        $conference->save();

        // 1. Generate Days
        $period = CarbonPeriod::create($validated['start_date'], $validated['end_date']);
        $daysData = [];
        $index = 1;
        foreach ($period as $date) {
            $daysData[] = [
                'id' => (string) Str::uuid(),
                'conference_id' => $conference->id,
                'day_index' => $index++,
                'date' => $date->format('Y-m-d')
            ];
        }
        ConferenceDay::insert($daysData);

        // 2. Generate Time Slots (Standard Morning, Afternoon, Evening)
        $slots = [
            ['name' => 'MORNING', 'start' => '06:00:00', 'end' => '09:30:00'],
            ['name' => 'AFTERNOON', 'start' => '11:00:00', 'end' => '13:00:00'],
            ['name' => 'EVENING', 'start' => '16:00:00', 'end' => '20:30:00'],
        ];
        
        $slotsData = [];
        foreach ($slots as $s) {
            $slotsData[] = [
                'id' => (string) Str::uuid(),
                'conference_id' => $conference->id,
                'name' => $s['name'],
                'start_time' => $s['start'],
                'end_time' => $s['end']
            ];
        }
        TimeSlot::insert($slotsData);

        // 3. Generate Meals (Lookup Days and Slots)
        $dbDays = ConferenceDay::where('conference_id', $conference->id)->get();
        $dbSlots = TimeSlot::where('conference_id', $conference->id)->get();
        $slotsMap = $request->slots_map ?? [];

        $mealsData = [];
        foreach ($dbDays as $day) {
            foreach ($dbSlots as $slot) {
                // Check if this slot is allowed (day-index-NAME)
                $key = "day-{$day->day_index}-{$slot->name}";
                $allowed = isset($slotsMap[$key]) ? $slotsMap[$key] : true;

                if ($allowed) {
                    $mealsData[] = [
                        'id' => (string) Str::uuid(),
                        'conference_id' => $conference->id,
                        'day_id' => $day->id,
                        'slot_id' => $slot->id,
                        'name' => $slot->name,
                        'notes' => ''
                    ];
                }
            }
        }
        
        if (!empty($mealsData)) {
            Meal::insert($mealsData);
        }

        return response()->json([
            'message' => 'Conference created successfully with days and slots',
            'data' => $conference
        ], 201);
    }

    public function show($id)
    {
        $conference = Conference::with(['days', 'timeSlots'])->findOrFail($id);
        return response()->json(['data' => $conference]);
    }

    public function update(Request $request, $id)
    {
        $conference = Conference::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'theme' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $conference->fill($validated);
        $conference->theme = strtoupper($validated['theme'] ?? '');
        $conference->location = strtoupper($validated['location'] ?? '');
        $conference->save();

        return response()->json(['message' => 'Conference updated successfully', 'data' => $conference]);
    }

    public function destroy($id)
    {
        $conference = Conference::findOrFail($id);
        
        // Soft delete based on the pattern used in other controllers
        $conference->is_deleted = true;
        $conference->save();

        return response()->json(['message' => 'Conference removed successfully']);
    }
}
