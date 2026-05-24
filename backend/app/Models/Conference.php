<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conference extends Model
{
    use HasFactory;

    protected $table = 'conferences';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false; // Based on SQL schema having only created_at

    protected $guarded = [];

    protected $casts = [
        'is_deleted' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function days()
    {
        return $this->hasMany(ConferenceDay::class, 'conference_id');
    }

    public function timeSlots()
    {
        return $this->hasMany(TimeSlot::class, 'conference_id');
    }
}
