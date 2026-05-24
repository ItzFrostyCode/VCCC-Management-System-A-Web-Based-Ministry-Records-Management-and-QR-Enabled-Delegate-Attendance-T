<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $table = 'attendance';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function conference()
    {
        return $this->belongsTo(Conference::class, 'conference_id');
    }
}
