<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class UserController extends Controller
{
    private $supabaseUrl;
    private $supabaseKey;

    public function __construct()
    {
        $this->supabaseUrl = env('SUPABASE_URL');
        $this->supabaseKey = env('SUPABASE_SERVICE_ROLE_KEY');
    }

    /**
     * Helper to verify if the requesting user is an Admin
     */
    private function verifyAdmin(Request $request)
    {
        $token = $request->bearerToken();
        if (!$token) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Verify token with Supabase API
        $response = Http::withHeaders([
            'Authorization' => "Bearer $token",
            'apikey' => env('SUPABASE_ANON_KEY')
        ])->get("{$this->supabaseUrl}/auth/v1/user");

        if (!$response->successful()) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        $userId = $response->json()['id'];

        // Check if user is Admin in profiles table
        $profile = DB::table('profiles')->where('id', $userId)->first();
        if (!$profile || $profile->role !== 'Admin') {
            return response()->json(['message' => 'Forbidden: Admins only'], 403);
        }

        return $profile;
    }

    public function index(Request $request)
    {
        $adminCheck = $this->verifyAdmin($request);
        if ($adminCheck instanceof \Illuminate\Http\JsonResponse) return $adminCheck;

        $profiles = DB::table('profiles')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($profiles);
    }

    public function store(Request $request)
    {
        $adminCheck = $this->verifyAdmin($request);
        if ($adminCheck instanceof \Illuminate\Http\JsonResponse) return $adminCheck;

        $request->validate([
            'username' => 'required|string|unique:profiles,username',
            'full_name' => 'required|string',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:Admin,Owner,Staff,Scanner'
        ]);

        // Convert username to email format for Supabase Auth if it's not already an email
        $email = $request->username;
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = $email . '@vccc.local';
        }

        // 1. Create user in Supabase Auth via Admin API
        $authResponse = Http::withHeaders([
            'Authorization' => "Bearer {$this->supabaseKey}",
            'apikey' => $this->supabaseKey,
            'Content-Type' => 'application/json'
        ])->post("{$this->supabaseUrl}/auth/v1/admin/users", [
            'email' => $email,
            'password' => $request->password,
            'email_confirm' => true
        ]);

        if (!$authResponse->successful()) {
            return response()->json([
                'message' => 'Failed to create user in Auth',
                'error' => $authResponse->json()
            ], 400);
        }

        $userId = $authResponse->json()['id'];

        // 2. Insert into profiles table
        DB::table('profiles')->insert([
            'id' => $userId,
            'username' => $request->username,
            'full_name' => $request->full_name,
            'role' => $request->role,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json(['message' => 'User created successfully', 'id' => $userId]);
    }

    public function update(Request $request, $id)
    {
        $adminCheck = $this->verifyAdmin($request);
        if ($adminCheck instanceof \Illuminate\Http\JsonResponse) return $adminCheck;

        $request->validate([
            'full_name' => 'sometimes|string',
            'role' => 'sometimes|string|in:Admin,Owner,Staff,Scanner',
            'password' => 'sometimes|string|min:6',
            'is_active' => 'sometimes|boolean'
        ]);

        $profile = DB::table('profiles')->where('id', $id)->first();
        if (!$profile) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Update Auth if password changed
        if ($request->has('password')) {
            $authResponse = Http::withHeaders([
                'Authorization' => "Bearer {$this->supabaseKey}",
                'apikey' => $this->supabaseKey,
                'Content-Type' => 'application/json'
            ])->put("{$this->supabaseUrl}/auth/v1/admin/users/{$id}", [
                'password' => $request->password
            ]);

            if (!$authResponse->successful()) {
                return response()->json(['message' => 'Failed to update password'], 400);
            }
        }

        // Update Profile
        $updateData = ['updated_at' => now()];
        if ($request->has('full_name')) $updateData['full_name'] = $request->full_name;
        if ($request->has('role')) $updateData['role'] = $request->role;
        if ($request->has('is_active')) $updateData['is_active'] = $request->is_active;

        DB::table('profiles')->where('id', $id)->update($updateData);

        return response()->json(['message' => 'User updated successfully']);
    }
}
