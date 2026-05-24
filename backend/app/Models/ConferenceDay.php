<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConferenceDay extends Model
{
    use HasFactory;

    protected $table = 'conference_days';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $guarded = [];

    public function conference()
    {
        return $this->belongsTo(Conference::class, 'conference_id');
    }
}
