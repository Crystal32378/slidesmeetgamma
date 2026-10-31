// Credentials remain in process memory only, scoped to the generating attendee.
export class GammaJobs {
  constructor({ now = Date.now, ttl = 30 * 60 * 1000 } = {}) {
    this.now = now;
    this.ttl = ttl;
    this.jobs = new Map();
  }

  set(id, { key, ownerId, participantIds }) {
    this.cleanup();
    this.jobs.set(id, { key, ownerId, participantIds, expires: this.now() + this.ttl });
  }

  get(id) {
    this.cleanup();
    return this.jobs.get(id);
  }

  cleanup() {
    for (const [id, job] of this.jobs) {
      if (job.expires <= this.now()) this.jobs.delete(id);
    }
  }

  deleteForAttendee(attendeeId) {
    for (const [id, job] of this.jobs) {
      if (job.participantIds.includes(attendeeId)) this.jobs.delete(id);
    }
  }
}
