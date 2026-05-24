<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Assignment extends Model
{
    protected $table = 'assignments';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'pastor_id', 'church_id', 'event_type', 'status_code', 
        'start_date', 'end_date', 'notes', 'is_primary', 'precision_flag',
        'handover_id', 'role_code', 'legacy_event_type', 'assignment_type', 'end_reason'
    ];
}
