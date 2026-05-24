<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Church extends Model
{
    protected $table = 'churches';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'church_name', 'church_address', 'church_scope', 'notes', 'is_deleted',
        'pioneer_pastor_id', 'mother_church_id', 'district_id'
    ];

    public function pastor()
    {
        return $this->hasOneThrough(
            Pastor::class,
            Assignment::class,
            'church_id',    // Foreign key on assignments table...
            'id',           // Foreign key on pastors table...
            'id',           // Local key on churches table...
            'pastor_id'     // Local key on assignments table...
        )->where('assignments.status_code', 'active');
    }

    public function district()
    {
        return $this->belongsTo(District::class, 'district_id');
    }
    
    public function pioneerPastor()
    {
        return $this->belongsTo(Pastor::class, 'pioneer_pastor_id')->where('is_deleted', false);
    }
    
    public function motherChurch()
    {
        return $this->belongsTo(Church::class, 'mother_church_id')->where('is_deleted', false);
    }
}
