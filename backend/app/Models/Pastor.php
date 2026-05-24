<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pastor extends Model
{
    use HasFactory;

    protected $table = 'pastors';
    
    // Supabase standard table keys are UUID strings
    protected $keyType = 'string';
    public $incrementing = false;

    // Supabase has created_at and updated_at, but we need to ensure Laravel reads them correctly
    public $timestamps = true;

    protected $guarded = [];

    protected $casts = [
        'birthdate' => 'date',
        'pastoring_start_date' => 'date',
        'wife_birthdate' => 'date',
        'is_deleted' => 'boolean',
    ];

    public function assignments()
    {
        return $this->hasMany(Assignment::class, 'pastor_id');
    }

    public function church()
    {
        return $this->hasOneThrough(
            Church::class,
            Assignment::class,
            'pastor_id',    // Foreign key on assignments table...
            'id',           // Foreign key on churches table...
            'id',           // Local key on pastors table...
            'church_id'     // Local key on assignments table...
        )->where('assignments.status_code', 'active');
    }

    /**
     * Spiritual Father (Mentor)
     */
    public function mentor()
    {
        return $this->belongsTo(Pastor::class, 'parent_id')->where('is_deleted', false);
    }

    /**
     * Spiritual Sons (Disciples)
     */
    public function disciples()
    {
        return $this->hasMany(Pastor::class, 'parent_id')->where('is_deleted', false);
    }
}
