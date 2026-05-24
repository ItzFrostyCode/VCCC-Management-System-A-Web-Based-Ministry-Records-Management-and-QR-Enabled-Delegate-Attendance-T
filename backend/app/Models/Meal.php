<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Meal extends Model
{
    use HasFactory;

    protected $table = 'meals';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $guarded = [];

    public function conference()
    {
        return $this->belongsTo(Conference::class, 'conference_id');
    }

    public function day()
    {
        return $this->belongsTo(ConferenceDay::class, 'day_id');
    }

    public function slot()
    {
        return $this->belongsTo(TimeSlot::class, 'slot_id');
    }
}
