import { pastorService } from '../services/pastor.service.js';
import { timelineService } from '../services/timeline.service.js';
import { discipleService } from '../services/disciple.service.js';
import { rankService } from '../services/rank.service.js';
import { trainingService } from '../services/training.service.js';
import { assignmentService } from '../services/assignment.service.js';

export class PastorViewState {
    constructor() {
        this.pastorId = null;
        this.data = {
            pastor: null,
            history: [],
            disciples: [],
            ranks: [],
            trainings: [],
            pioneered: [],
            assignmentHistory: []
        };
    }

    async loadData(id) {
        this.pastorId = id;
        try {
            const [pastor, history, disciples, ranks, trainings, pioneered, assignmentHistory] = await Promise.all([
                pastorService.fetchById(id),
                timelineService.fetchPastorTimeline(id),
                discipleService.fetchByPastor(id),
                rankService.fetchByPastor(id),
                trainingService.fetchByPastor(id),
                pastorService.fetchPioneeredChurches(id),
                assignmentService.fetchByPastor(id)
            ]);

            this.data = { pastor, history, disciples, ranks, trainings, pioneered, assignmentHistory };
            return this.data;
        } catch (err) {
            console.error('Data load failed:', err);
            throw err;
        }
    }
}
