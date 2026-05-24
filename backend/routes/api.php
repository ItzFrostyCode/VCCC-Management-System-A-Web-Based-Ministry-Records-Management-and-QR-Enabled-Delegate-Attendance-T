<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PastorController;
use App\Http\Controllers\ChurchController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\DistrictController;
use App\Http\Controllers\DiscipleController;
use App\Http\Controllers\ConferenceController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\UserController;

Route::post('/login', [AuthController::class, 'login']);

Route::get('/users', [UserController::class, 'index']);
Route::post('/users', [UserController::class, 'store']);
Route::put('/users/{id}', [UserController::class, 'update']);

Route::get('/pastors', [PastorController::class, 'index']);
Route::post('/pastors', [PastorController::class, 'store']);
Route::get('/pastors/{id}', [PastorController::class, 'show']);
Route::put('/pastors/{id}', [PastorController::class, 'update']);
Route::delete('/pastors/{id}', [PastorController::class, 'destroy']);

Route::get('/churches', [ChurchController::class, 'index']);
Route::post('/churches', [ChurchController::class, 'store']);
Route::get('/churches/{id}', [ChurchController::class, 'show']);
Route::put('/churches/{id}', [ChurchController::class, 'update']);
Route::delete('/churches/{id}', [ChurchController::class, 'destroy']);

Route::get('/districts', [DistrictController::class, 'index']);
Route::post('/districts', [DistrictController::class, 'store']);
Route::get('/districts/{id}', [DistrictController::class, 'show']);
Route::put('/districts/{id}', [DistrictController::class, 'update']);
Route::delete('/districts/{id}', [DistrictController::class, 'destroy']);

Route::get('/assignments', [AssignmentController::class, 'index']);
Route::post('/assignments', [AssignmentController::class, 'store']);
Route::get('/pastors/{id}/assignments', [AssignmentController::class, 'getByPastor']);
Route::get('/churches/{id}/assignments', [AssignmentController::class, 'getByChurch']);

Route::get('/disciples', [DiscipleController::class, 'index']);
Route::post('/disciples', [DiscipleController::class, 'store']);
Route::get('/disciples/{id}', [DiscipleController::class, 'show']);
Route::put('/disciples/{id}', [DiscipleController::class, 'update']);
Route::delete('/disciples/{id}', [DiscipleController::class, 'destroy']);

Route::get('/conferences', [ConferenceController::class, 'index']);
Route::post('/conferences', [ConferenceController::class, 'store']);
Route::get('/conferences/{id}', [ConferenceController::class, 'show']);
Route::put('/conferences/{id}', [ConferenceController::class, 'update']);
Route::delete('/conferences/{id}', [ConferenceController::class, 'destroy']);

Route::get('/attendance', [AttendanceController::class, 'index']);
Route::post('/attendance', [AttendanceController::class, 'store']);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/test-supabase', function () {
    try {
        DB::connection()->getPdo();
        return response()->json(['status' => 'success', 'message' => 'Laravel successfully connected to your Supabase PostgreSQL DB!']);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => 'Failed to connect: ' . $e->getMessage()]);
    }
});
