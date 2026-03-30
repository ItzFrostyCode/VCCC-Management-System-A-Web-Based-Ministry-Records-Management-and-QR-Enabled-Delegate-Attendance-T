const trainingService = {
  // Add a new training log
  async addTrainingLog(data) {
    const { pastor_id, course_name, status_code, completion_date, notes, blocker_flag, precision_flag } = data;

    const { data: newLog, error } = await db
      .from('training_log')
      .insert({
        pastor_id,
        course_name: course_name.trim(),
        status_code: status_code.trim(),
        completion_date: completion_date || null,
        precision_flag: precision_flag || 'exact',
        notes: notes ? notes.trim() : null,
        blocker_flag: Boolean(blocker_flag)
      })
      .select('id, course_name, status_code')
      .single();

    if (error) throw error;

    // Log the audit
    const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null;
    if (user) {
      await authService.logAudit(
        user.id,
        'LOG_TRAINING',
        `Logged Training for Pastor ID ${pastor_id}: ${course_name} (${status_code})`
      );
    }

    return newLog;
  }
};
