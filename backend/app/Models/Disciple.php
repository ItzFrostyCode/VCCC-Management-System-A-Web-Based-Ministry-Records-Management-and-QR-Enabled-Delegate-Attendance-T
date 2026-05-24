<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Disciple extends Model
{
    use HasFactory;

    protected $table = 'disciples';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'is_deleted' => 'boolean',
    ];

    public function church()
    {
        return $this->belongsTo(Church::class, 'church_id');
    }
}
