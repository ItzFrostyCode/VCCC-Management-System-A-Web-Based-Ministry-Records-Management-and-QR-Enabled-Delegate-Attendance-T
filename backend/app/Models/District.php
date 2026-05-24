<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class District extends Model
{
    protected $table = 'districts';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'district_name', 'theme_color', 'leader_pastor_id', 'notes', 'is_deleted'
    ];

    public function leader()
    {
        return $this->belongsTo(Pastor::class, 'leader_pastor_id', 'id');
    }

    public function churches()
    {
        return $this->hasMany(Church::class, 'district_id', 'id');
    }
}
